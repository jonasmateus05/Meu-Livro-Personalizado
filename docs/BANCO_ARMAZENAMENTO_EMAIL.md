# Banco (Neon), armazenamento (Cloudflare R2) e e-mail (Resend)

## Banco de dados — Neon (PostgreSQL)

O código usa PostgreSQL comum pela variável `DATABASE_URL`; qualquer PostgreSQL 15+ funciona. Recomendado: **Neon** (plano gratuito, integrado à Vercel).

1. Na Vercel, abra o projeto → **Storage → Create Database → Neon** → região **São Paulo (sa-east-1)** se disponível → conecte ao projeto (Production, Preview e Development).
   - A integração cria `DATABASE_URL` (conexão *pooled*, host com `-pooler`) e outras variáveis `PG*`/`POSTGRES_*`, que o código ignora.
   - Alternativa: conta direta em https://neon.tech e copiar a *connection string* (pooled) para `DATABASE_URL`.
2. Aplique o esquema (uma vez, e de novo sempre que `db/schema.sql` mudar — é idempotente):
   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```
   ou cole `db/schema.sql` no **SQL Editor** do painel do Neon.
3. TLS: a conexão sempre verifica o certificado do servidor (o Neon usa certificado público). `DATABASE_CA_CERT` só é necessário em provedores com CA própria.
4. Segurança aplicada pelo schema: restrições de status, um pedido aprovado por personalização, token de download só como hash SHA-256, e-mail único por (pedido, versão), tarefa única por `dedupe_key`, RLS ligado em todas as tabelas. As credenciais do banco ficam apenas no servidor.
5. Retenção: o worker apaga personalizações não pagas após 30 dias e capturas de diagnóstico após 7 dias. Defina a retenção de pedidos/e-mails com seu jurídico (LGPD).

## Armazenamento dos PDFs — Cloudflare R2 (bucket privado)

1. Crie/entre na conta em https://dash.cloudflare.com → **R2 Object Storage** → ative o R2 (pode pedir um cartão, mesmo no plano gratuito).
2. **Create bucket** → nome `livros` (ou outro, em `R2_BUCKET`). **Não** habilite *Public access* nem domínio público: o bucket deve ficar **privado**.
3. **Manage R2 API Tokens → Create API token**:
   - Permissão: **Object Read & Write**.
   - Escopo: **apenas o bucket `livros`**.
   - Copie **Access Key ID** → `R2_ACCESS_KEY_ID` e **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (o segredo aparece uma única vez).
4. **Account ID** (32 caracteres, no painel do R2/visão geral da conta) → `R2_ACCOUNT_ID`.
5. Como funciona: o worker grava `orders/<id-do-pedido>/livro-v1.pdf`; a cada clique em “Baixar PDF” o servidor gera uma URL assinada válida por `SIGNED_URL_TTL_SECONDS` (padrão 120 s) que força o download com nome amigável. Não é necessário configurar CORS.

## Resend

1. Crie a conta em https://resend.com.
2. **Domains → Add Domain** (ex.: `seu-dominio.com.br`) e adicione no DNS os registros SPF/DKIM indicados; aguarde o status *Verified*.
3. **API Keys → Create API Key** com permissão *Sending access* (restrinja ao domínio) → `RESEND_API_KEY`.
4. `RESEND_FROM_EMAIL` = remetente do domínio verificado, ex.: `Bíblia Infantil <livros@seu-dominio.com.br>`.
5. `RESEND_REPLY_TO` (opcional) = caixa que recebe dúvidas de clientes.
6. Teste: com um pedido em `generated`, rode o worker e confira em Resend → Emails.

### Como o sistema evita e-mails duplicados
- Uma linha em `email_deliveries` por (pedido, tipo, versão); se estiver `sent`, não reenvia.
- Cada envio usa `Idempotency-Key: book-ready/<pedido>/v<versão>` no Resend; uma nova tentativa após falha de rede não gera segundo e-mail (dentro da janela de idempotência do Resend).
- O link do e-mail é derivado de forma determinística (HMAC) — novas tentativas mandam o mesmo link.
- Reenvio intencional: `POST /api/admin/orders/<id>/resend` cria a versão 2, com novo link.
