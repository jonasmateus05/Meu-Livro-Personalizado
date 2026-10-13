create extension if not exists pgcrypto;

create table if not exists public.personalizations (
  id uuid primary key default gen_random_uuid(),
  child_name text not null check (char_length(child_name) between 1 and 60),
  age_group text not null check (age_group in ('2-4','5-7','8-10')),
  illustration_style text not null check (illustration_style in ('colorful','watercolor')),
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','generating','ready','generation_failed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  personalization_id uuid references public.personalizations(id),
  provider text not null default 'cakto',
  provider_order_id text,
  provider_ref_id text,
  provider_product_id text,
  provider_offer_id text,
  customer_email text,
  amount numeric(12,2),
  payment_method text,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid_unmatched','paid','generating','ready','refused','refunded','chargeback','generation_failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_order_id)
);

create table if not exists public.generated_books (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','generating','ready','failed')),
  storage_path text,
  template_version text not null default 'v1',
  attempt_count integer not null default 0,
  last_error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_key text unique not null,
  event_type text not null,
  provider_order_id text,
  payload_summary jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists orders_status_idx on public.orders(status);
create index if not exists books_status_idx on public.generated_books(status);

-- These tables are written by trusted server-side code only in this starter.
alter table public.personalizations enable row level security;
alter table public.orders enable row level security;
alter table public.generated_books enable row level security;
alter table public.webhook_events enable row level security;

-- No public policies are created. Do not expose the service-role key in the browser.
