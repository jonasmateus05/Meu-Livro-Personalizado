# Configuração do Supabase e do Resend

## Supabase

1. Crie um projeto em https://supabase.com (região próxima dos clientes, ex.: São Paulo).
2. **Banco:** SQL Editor → cole e execute `supabase/schema.sql`; depois `supabase/storage.sql`.
   - Ou localmente: `DATABASE_URL=... npm run db:migrate`.
3. **Conexão (`DATABASE_URL`):** Project Settings → Database → Connection string.
   - Web na Vercel: *Transaction pooler* (porta 6543).
   - Worker: *Session pooler* (5432) ou conexão direta.
   - Opcional e recomendado: baixe o certificado em *SSL Configuration* e coloque o conteúdo em `DATABASE_CA_CERT` (com `\n` nas quebras de linha) para verificação completa de TLS.
4. **API:** Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role (**secreta**, somente servidor/worker; nunca em `NEXT_PUBLIC_*`).
   - A chave anon não é usada por esta aplicação.
5. **Storage:** confirme em Storage que o bucket `books` existe e está **Private**. Nenhuma policy pública é necessária: o servidor usa a service role para upload e para gerar URLs assinadas curtas.
6. **Segurança aplicada pelo schema:**
   - RLS ligado em todas as tabelas e nenhuma policy ⇒ as chaves anon/authenticated não acessam nada.
   - `REVOKE ALL` para `anon` e `authenticated`.
   - Restrições: status válidos, um pedido aprovado por personalização, token de download só como hash SHA-256, e-mail único por (pedido, versão), tarefa única por `dedupe_key`.
7. **Retenção:** o worker apaga personalizações não pagas após 30 dias e capturas de diagnóstico após 7 dias. Defina com seu jurídico a retenção de pedidos/e-mails (LGPD).

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
