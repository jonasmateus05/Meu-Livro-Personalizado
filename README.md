# A Bíblia Infantil Personalizada

Aplicação comercial para vender um **livro bíblico infantil personalizado em PDF**: os pais escolhem o nome da criança, a faixa etária (2–4, 5–7 ou 8–10 anos) e o estilo das ilustrações; pagam na **Cakto**; o sistema gera o PDF, guarda num **bucket privado do Cloudflare R2** e envia o link seguro por e-mail via **Resend**.

> **Estado atual:** o código, o banco, o livro e os testes automatizados estão prontos e passando. **Ainda não está validado com pagamentos reais**: falta configurar as credenciais e fazer a compra de teste na Cakto descrita em [`docs/CAKTO.md`](docs/CAKTO.md). Até lá, o sistema funciona em **modo seguro** (`FULFILLMENT_AUTO_RELEASE=false`): nenhum livro é gerado sem liberação manual. Veja [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md).

## Como funciona

```text
Página de vendas ──POST /api/checkout──► cria personalização (checkout_ref aleatório)
       │                                       │
       └──────── redireciona ───────► Checkout Cakto (?utm_content=lb_…&sck=lb_…&src=lb_…)
                                               │ pagamento
Cakto ──POST /api/webhooks/cakto──► valida segredo ─► registra evento (idempotente)
                                    └► pedido aprovado ─► associa SOMENTE por checkout_ref inequívoco
                                                         ├► sem referência / ambíguo → unmatched / needs_review (nada é gerado)
                                                         └► associado → awaiting_release (modo seguro) ou fila
Worker (npm run worker) ◄── fila no Postgres (FOR UPDATE SKIP LOCKED, backoff, idempotência)
   generate_book: HTML → Chromium → verificação de layout → PDF → validação (pdf.js) → bucket privado R2
   send_book_email: token de download (hash no banco) → Resend com Idempotency-Key
Comprador ──/download/[token]──► página segura ──POST──► URL assinada de curta duração
Reembolso/chargeback ──► revoga links e cancela tarefas pendentes
```

## Estrutura

```text
app/                       Next.js (App Router)
  page.tsx                 tela inicial: só o nome da criança → /oferta?nome=...
  oferta/                  funil personalizado com o nome (prévia real do livro, personalização e oferta)
  amostra/                 amostra com marca d'água gerada no navegador
  download/[token]/        página segura de download
  obrigado/, privacidade/  páginas institucionais
  api/checkout             inicia a compra (cria personalização + URL Cakto)
  api/webhooks/cakto       recebe eventos da Cakto
  api/download/[token]     consome download e redireciona p/ URL assinada
  api/jobs/run             executa a fila (cron, protegido por CRON_SECRET)
  api/admin/*              reconciliação, liberação, reenvio, reprocessamento (ADMIN_API_TOKEN)
components/                tela do nome, funil /oferta, páginas reais do livro em iframe, amostra
lib/
  book/                    modelo editorial: histórias, ilustrações SVG, template, PDF, validação
  cakto/                   normalização do payload, webhook, URL de checkout
  jobs/                    fila, handlers (gerar PDF / enviar e-mail), runner
  orders.ts                regras de pagamento, associação e revogação
  download.ts, storage.ts, email.ts, tokens.ts, names.ts, validation.ts, config.ts, server.ts
scripts/                   worker, migração, amostra de PDF, inspeção de payload da Cakto
db/schema.sql              esquema PostgreSQL (tabelas, restrições, índices, RLS)
tests/                     Vitest + PGlite (Postgres real em memória) + Chromium real
docs/                      instalação, deploy, Neon/R2/Resend, Cakto, testes, pendências
```

## Instalação local (resumo)

Requisitos: Node.js 20.11+ e Chromium (o Playwright instala: `npx playwright install chromium`).

```bash
npm install
cp .env.example .env.local        # preencha (veja docs/BANCO_ARMAZENAMENTO_EMAIL.md e docs/CAKTO.md)
npm run db:migrate                # aplica db/schema.sql no DATABASE_URL
npm run dev                       # http://localhost:3000
npm run worker                    # em outro terminal: processa a fila
```

Gerar um PDF de exemplo sem banco nem pagamento:

```bash
npm run book:sample -- --name "Ana Lívia" --age 2-4 --style watercolor --out tmp/ana.pdf
```

Verificações:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Detalhes: [`docs/INSTALACAO.md`](docs/INSTALACAO.md) · Deploy: [`docs/DEPLOY.md`](docs/DEPLOY.md) · Neon, R2 e Resend: [`docs/BANCO_ARMAZENAMENTO_EMAIL.md`](docs/BANCO_ARMAZENAMENTO_EMAIL.md) · Cakto: [`docs/CAKTO.md`](docs/CAKTO.md) · Testes: [`docs/RELATORIO_TESTES.md`](docs/RELATORIO_TESTES.md) · Pendências: [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md) · Operação/admin: [`docs/OPERACAO.md`](docs/OPERACAO.md)

## Decisões importantes

- **Correlação pedido ↔ personalização:** não presumimos que a Cakto devolve campos personalizados. Enviamos um token aleatório (`lb_` + 24 caracteres) no link de checkout e o procuramos no payload do webhook. Só há associação com **exatamente um** token válido, existente e ainda não pago. Nunca usamos e-mail, nome ou horário. Sem token ⇒ `unmatched` (reconciliação manual).
- **Modo seguro por padrão:** mesmo associado, o pedido fica em `awaiting_release` até `FULFILLMENT_AUTO_RELEASE=true`, que só deve ser ligado depois do teste real.
- **Pagamento só pelo webhook autenticado.** O navegador nunca informa status de pagamento.
- **Livro validado antes da entrega:** verificação de transbordamento de texto, imagens, fontes e nome no navegador; depois o PDF é lido com pdf.js (nº de páginas, texto em todas as páginas, nome com acentos na capa e no miolo).
- **Conteúdo:** histórias recontadas (sem citações literais), referência bíblica em cada uma, linguagem neutra quanto ao gênero, ilustrações SVG originais e fontes OFL.
- **Dados mínimos:** a personalização guarda só nome, idade e estilo; o e-mail vem da Cakto. Personalizações não pagas são apagadas após 30 dias.
