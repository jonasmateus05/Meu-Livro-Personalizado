# Instalação local

## 1. Requisitos
- Node.js **20.11+** (testado com 22.22).
- Chromium compatível com `playwright-core@1.56.1`:
  ```bash
  npx playwright@1.56.1 install chromium
  ```
  ou aponte `CHROMIUM_EXECUTABLE_PATH` para um Chromium/Chrome já instalado.
- Um projeto Supabase (ou qualquer PostgreSQL 15+ para desenvolvimento — o bucket de storage exige Supabase).
- Conta Resend (para testar e-mails de verdade).

## 2. Dependências e variáveis
```bash
npm install
cp .env.example .env.local
```
Preencha `.env.local` seguindo [`SUPABASE_RESEND.md`](SUPABASE_RESEND.md) e [`CAKTO.md`](CAKTO.md). Para apenas ver a página e gerar PDFs, nenhuma credencial é necessária.

Gerar segredos fortes:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```
Use valores diferentes para `CAKTO_WEBHOOK_SECRET`, `DOWNLOAD_TOKEN_SECRET`, `ADMIN_API_TOKEN` e `CRON_SECRET`.

## 3. Banco
```bash
npm run db:migrate   # aplica supabase/schema.sql (+ storage.sql se for Supabase)
```
Ou cole `supabase/schema.sql` e depois `supabase/storage.sql` no SQL Editor do Supabase. Os arquivos são idempotentes.

## 4. Executar
```bash
npm run dev      # site + APIs em http://localhost:3000
npm run worker   # outro terminal: fila (gera PDF e envia e-mail)
```

## 5. Ferramentas úteis
| Comando | O que faz |
|---|---|
| `npm run book:sample -- --name "Miguel" --age 5-7 --style colorful --out tmp/m.pdf` | Gera e valida um PDF sem banco/pagamento |
| `npm run book:sample -- --screenshots public/amostras` | Regera as imagens da galeria da página |
| `npm run cakto:inspect -- --file payload.json --ref lb_...` | Analisa um payload real da Cakto (ver CAKTO.md) |
| `npm test` | Testes automatizados (PGlite + Chromium) |
| `npm run lint && npm run typecheck && npm run build` | Verificações de qualidade |

## 6. Simular um webhook localmente
Com o servidor rodando e `CAKTO_WEBHOOK_SECRET=segredo-local` no `.env.local`:
1. Na página, personalize e clique em “Continuar para o pagamento” (sem `CAKTO_CHECKOUT_URL` a API responde 503; defina uma URL `https://pay.cakto.com.br/qualquer` para obter o `checkout_ref` na URL retornada).
2. Envie um evento simulado:
```bash
curl -X POST http://localhost:3000/api/webhooks/cakto -H 'content-type: application/json' -d '{
  "secret":"segredo-local","event":"purchase_approved",
  "data":{"id":"teste-1","status":"paid","amount":29.9,"customer":{"email":"voce@exemplo.com"},
          "product":{"id":"SEU_CAKTO_PRODUCT_ID"},"utm_content":"lb_COLE_O_CHECKOUT_REF_AQUI"}}'
```
> Este JSON é uma **simulação** no formato do exemplo público da Cakto. O campo que carrega a referência em um webhook real ainda precisa ser confirmado (CAKTO.md).
