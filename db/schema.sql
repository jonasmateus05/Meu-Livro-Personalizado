-- =============================================================================
-- Livro Bíblico Infantil Personalizado — esquema do banco (PostgreSQL 15+)
--
-- Aplique com `npm run db:migrate` (ou cole no SQL Editor do Neon).
-- O arquivo é idempotente (pode ser executado novamente) e não depende de
-- extensões: gen_random_uuid() é nativo desde o PostgreSQL 13.
--
-- Todo acesso é feito pelo servidor (DATABASE_URL). RLS fica ligado em todas
-- as tabelas sem políticas públicas; se existirem os papéis anon/authenticated
-- (Supabase), eles perdem qualquer privilégio.
--
-- Os PDFs ficam fora do banco, em um bucket privado do Cloudflare R2.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Personalizações: o que o comprador escolheu ANTES de pagar.
-- Dados mínimos: nome da criança, faixa etária e estilo. Sem e-mail, CPF etc.
-- checkout_ref é um identificador aleatório e opaco enviado ao checkout da Cakto
-- para correlacionar o pagamento com esta personalização.
-- -----------------------------------------------------------------------------
create table if not exists public.personalizations (
  id uuid primary key default gen_random_uuid(),
  checkout_ref text not null unique
    check (checkout_ref ~ '^lb_[A-Za-z0-9]{24}$'),
  child_name text not null
    check (char_length(child_name) between 1 and 40 and child_name = btrim(child_name)),
  age_group text not null check (age_group in ('2-4', '5-7', '8-10')),
  illustration_style text not null check (illustration_style in ('colorful', 'watercolor')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personalizations_status_created_idx
  on public.personalizations (status, created_at);

-- -----------------------------------------------------------------------------
-- Pedidos: criados SOMENTE a partir de webhooks autenticados da Cakto.
-- payment_status     = o que a Cakto informou.
-- fulfillment_status = em que ponto está a produção/entrega do livro.
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'cakto' check (provider = 'cakto'),
  provider_order_id text not null check (char_length(provider_order_id) between 1 and 200),
  provider_ref_id text,
  provider_product_id text,
  provider_offer_id text,
  personalization_id uuid references public.personalizations (id) on delete restrict,
  match_method text check (match_method in ('checkout_ref', 'manual')),
  customer_email text check (customer_email is null or customer_email ~ '^[^@\s]+@[^@\s]+$'),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  payment_method text,
  payment_status text not null
    check (payment_status in ('pending', 'approved', 'refused', 'refunded', 'chargeback')),
  fulfillment_status text not null default 'not_started'
    check (fulfillment_status in (
      'not_started',      -- pagamento não aprovado (ou ainda não)
      'unmatched',        -- pago, mas o payload não trouxe referência de personalização
      'needs_review',     -- pago, mas a associação é ambígua/conflitante
      'awaiting_release', -- associado; aguardando liberação manual (modo seguro)
      'queued',           -- geração enfileirada
      'generating',
      'generated',
      'emailing',
      'delivered',
      'failed',           -- tentativas esgotadas
      'revoked'           -- reembolso/chargeback: acesso bloqueado
    )),
  review_reason text,
  paid_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id),
  -- Um pedido só avança na produção se estiver associado a uma personalização.
  check (
    fulfillment_status in ('not_started', 'unmatched', 'needs_review', 'revoked')
    or personalization_id is not null
  ),
  check (match_method is null or personalization_id is not null)
);

-- No máximo UM pedido aprovado por personalização (evita gerar duas vezes o
-- mesmo livro e sinaliza cobrança duplicada para revisão).
create unique index if not exists orders_one_approved_per_personalization
  on public.orders (personalization_id)
  where personalization_id is not null and payment_status = 'approved';

create index if not exists orders_fulfillment_idx on public.orders (fulfillment_status);
create index if not exists orders_personalization_idx on public.orders (personalization_id);

-- -----------------------------------------------------------------------------
-- Livros gerados: um por pedido. O PDF fica no bucket privado do R2.
-- -----------------------------------------------------------------------------
create table if not exists public.generated_books (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  personalization_id uuid not null references public.personalizations (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'ready', 'failed', 'revoked')),
  template_version text not null,
  storage_path text unique,
  page_count integer check (page_count is null or page_count > 0),
  byte_size integer check (byte_size is null or byte_size > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  attempt_count integer not null default 0,
  last_error text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'ready' or (storage_path is not null and page_count is not null and sha256 is not null))
);

-- -----------------------------------------------------------------------------
-- Tokens de download: o e-mail leva um token opaco; aqui guardamos só o hash.
-- -----------------------------------------------------------------------------
create table if not exists public.download_tokens (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.generated_books (id) on delete cascade,
  version integer not null check (version >= 1),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  download_count integer not null default 0 check (download_count >= 0),
  max_downloads integer not null default 20 check (max_downloads > 0),
  last_downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (book_id, version)
);

-- -----------------------------------------------------------------------------
-- E-mails de entrega: uma linha por (pedido, tipo, versão) => sem duplicidade.
-- idempotency_key também é enviado ao Resend.
-- -----------------------------------------------------------------------------
create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('book_ready')),
  version integer not null default 1 check (version >= 1),
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, kind, version)
);

-- -----------------------------------------------------------------------------
-- Eventos de webhook: auditoria + idempotência + reprocessamento.
-- `normalized` guarda apenas o mínimo necessário para reprocessar.
-- -----------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'cakto' check (provider = 'cakto'),
  event_key text not null unique check (event_key ~ '^[0-9a-f]{64}$'),
  event_type text not null,
  provider_order_id text,
  normalized jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  outcome text,
  attempt_count integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists webhook_events_status_idx on public.webhook_events (status, received_at);
create index if not exists webhook_events_order_idx on public.webhook_events (provider_order_id);

-- -----------------------------------------------------------------------------
-- Capturas de payload (OPCIONAL, desligado por padrão: CAKTO_WEBHOOK_CAPTURE).
-- Serve para descobrir, numa compra de teste real, quais campos a Cakto envia.
-- Valores sensíveis são mascarados antes de gravar; expira em 7 dias.
-- -----------------------------------------------------------------------------
create table if not exists public.webhook_captures (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  redacted_payload jsonb not null,
  header_names text[] not null default '{}',
  received_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

-- -----------------------------------------------------------------------------
-- Fila de tarefas (geração do PDF, envio de e-mail).
-- dedupe_key garante que a mesma tarefa não seja enfileirada duas vezes.
-- -----------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('generate_book', 'send_book_email')),
  order_id uuid not null references public.orders (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'dead', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 50),
  run_after timestamptz not null default now(),
  locked_until timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists jobs_ready_idx on public.jobs (run_after)
  where status in ('queued', 'running');
create index if not exists jobs_order_idx on public.jobs (order_id);

-- -----------------------------------------------------------------------------
-- Segurança: RLS ligado e nenhum privilégio para papéis públicos (anon/authenticated),
-- quando existirem. O bloco condicional permite rodar em qualquer PostgreSQL.
-- -----------------------------------------------------------------------------
alter table public.personalizations enable row level security;
alter table public.orders enable row level security;
alter table public.generated_books enable row level security;
alter table public.download_tokens enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.webhook_events enable row level security;
alter table public.webhook_captures enable row level security;
alter table public.jobs enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format(
        'revoke all on public.personalizations, public.orders, public.generated_books, '
        'public.download_tokens, public.email_deliveries, public.webhook_events, '
        'public.webhook_captures, public.jobs from %I', r);
    end if;
  end loop;
end $$;

-- Nenhuma política (CREATE POLICY) é criada de propósito.
