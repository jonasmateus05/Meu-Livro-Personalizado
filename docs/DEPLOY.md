# Deploy

A aplicação tem duas partes:

| Parte | O que roda | Onde hospedar |
|---|---|---|
| **Web** (Next.js) | página, `/api/checkout`, `/api/webhooks/cakto`, `/download`, `/api/admin/*` | Vercel (runtime Node.js) ou qualquer host Node (`npm run build && npm start`) |
| **Worker** | fila: gera PDF com Chromium, envia e-mail | Servidor/container Node com Chromium: Railway, Render, Fly.io, VPS… (use `Dockerfile.worker`) |

O webhook só grava e enfileira — rápido e compatível com serverless. A geração de PDF precisa de Chromium e alguns segundos de CPU, por isso fica no worker.

## 1. Banco (Neon) e armazenamento (R2)
Siga [`BANCO_ARMAZENAMENTO_EMAIL.md`](BANCO_ARMAZENAMENTO_EMAIL.md). Aplique `db/schema.sql` com `npm run db:migrate`.

## 2. Web na Vercel
1. Importe o repositório na Vercel (framework Next.js, comando `npm run build`).
2. Configure as variáveis de ambiente de `.env.example` (Production). Com a integração Neon (Storage → Neon) o `DATABASE_URL` *pooled* é criado automaticamente.
3. `NEXT_PUBLIC_SITE_URL` = domínio final com HTTPS (é usado nos links dos e-mails).
4. Faça o deploy e acesse `/` para conferir.
5. Webhook da Cakto: `https://SEU-DOMINIO/api/webhooks/cakto` (ver [`CAKTO.md`](CAKTO.md)).

> Em outro host Node: `npm ci && npm run build && npm start` (porta `PORT`, padrão 3000) atrás de HTTPS.

## 3. Worker em container
```bash
docker build -f Dockerfile.worker -t livro-worker .
docker run --env-file .env.production livro-worker
```
- No worker, use a mesma `DATABASE_URL` (pooled) ou a conexão direta do Neon (host sem `-pooler`).
- Variáveis necessárias no worker: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `RESEND_*`, `DOWNLOAD_*`, `NEXT_PUBLIC_SITE_URL`.
- Pode rodar mais de uma instância (a fila evita processamento duplicado).
- O worker também apaga, a cada 6 h, personalizações não pagas com mais de 30 dias e capturas de webhook expiradas.

> O `Dockerfile.worker` foi escrito para a imagem oficial `mcr.microsoft.com/playwright:v1.56.1-noble`. **Ele não foi construído/executado neste ambiente** (sem Docker disponível); valide no primeiro deploy.

### Alternativa: cron chamando `/api/jobs/run`
`GET/POST /api/jobs/run` com `Authorization: Bearer $CRON_SECRET` processa até 5 tarefas. Só funciona onde houver Chromium disponível para o processo do Next.js (servidor Node próprio). **Não funciona na Vercel sem adaptações** (o Chromium do Playwright não está disponível nas funções serverless).

## 4. Checklist de produção
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` sem erros.
- [ ] Domínio com HTTPS e `NEXT_PUBLIC_SITE_URL` correto.
- [ ] Domínio remetente verificado no Resend.
- [ ] Bucket do R2 **privado** (sem acesso público nem domínio público) e token com escopo só nesse bucket.
- [ ] Segredos longos e distintos; chaves do R2, banco e Resend apenas em variáveis de servidor (nunca `NEXT_PUBLIC_*`).
- [ ] Teste real da Cakto concluído (CAKTO.md) **antes** de `FULFILLMENT_AUTO_RELEASE=true`.
- [ ] `CAKTO_WEBHOOK_CAPTURE=false` depois do teste.
- [ ] Worker rodando e monitorado (logs `job_failed`, pedidos `failed`/`unmatched`/`needs_review` — ver OPERACAO.md).
