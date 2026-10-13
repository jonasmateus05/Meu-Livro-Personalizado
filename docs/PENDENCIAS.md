# Integrações que ainda dependem de credenciais ou validação real

Nada abaixo foi simulado como “pronto”. Enquanto os itens 🔴 não forem concluídos, mantenha `FULFILLMENT_AUTO_RELEASE=false` (padrão).

## 🔴 Bloqueia vendas automáticas

| # | Item | Por que está pendente | Como concluir |
|---|---|---|---|
| 1 | **Correlação Cakto ↔ personalização** | A documentação consultada não garante que algum parâmetro do link de checkout (UTM, `sck`, `src`) volte no webhook | Compra de teste real (CAKTO.md §5) com `CAKTO_WEBHOOK_CAPTURE=true`; definir `CAKTO_CORRELATION_PATH` se a referência aparecer. Se não aparecer: suporte da Cakto ou operar com reconciliação manual |
| 2 | **Formato real do webhook** | Implementado a partir do exemplo público; não foi possível abrir os sites da Cakto deste ambiente | Conferir no payload real: `secret` no corpo, `data.id`, `data.status` (“paid”), `data.customer.email`, `data.product.id` |
| 3 | **Unidade de `data.amount`** | Assumido em reais (29.9 → 2990 centavos) | Conferir no payload real; se vier em centavos, ajustar `toCents` em `lib/cakto/payload.ts` e o teste correspondente |
| 4 | **Eventos de reembolso/chargeback** | Assumido que trazem o mesmo `data.id` do pedido aprovado | Reembolsar a compra de teste e conferir que o pedido vira `revoked` |
| 5 | **Cadastro do produto e opção de entrega na Cakto** | Depende da sua conta | CAKTO.md §2 — evitar que a Cakto envie um arquivo genérico |

## 🟠 Depende de credenciais (código pronto, não executado contra o serviço real)

| # | Item | Variáveis | Validação sugerida |
|---|---|---|---|
| 6 | Banco Neon (PostgreSQL) | `DATABASE_URL` | `npm run db:migrate` e um checkout pelo site |
| 7 | Cloudflare R2 (bucket privado, upload, URL assinada) | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Liberar o pedido de teste e baixar o PDF pelo e-mail |
| 8 | Resend (domínio verificado, envio, idempotência) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Ver o e-mail no painel do Resend e na caixa de entrada (incluindo spam) |
| 9 | Hospedagem do worker com Chromium | `Dockerfile.worker` | Build e execução no provedor escolhido (não testado aqui — sem Docker) |
| 10 | Domínio HTTPS e `NEXT_PUBLIC_SITE_URL` | — | Links do e-mail apontando para o domínio final |

## 🟡 Recomendações antes de escalar
- Revisão teológica/editorial humana dos textos das 10 histórias (foram escritos seguindo as passagens indicadas, sem citações literais, mas merecem revisão por alguém da sua confiança).
- Termos de uso e política de privacidade revisados juridicamente (LGPD), incluindo prazo de retenção de pedidos.
- Proteção contra bots no `/api/checkout` além do limitador em memória (ex.: WAF/Turnstile).
- Alertas para pedidos `unmatched`, `needs_review` e `failed` (OPERACAO.md).
- `npm audit`: restam alertas em `postcss` usado internamente pelo Next.js 15 durante o build (correção só no Next 16, mudança incompatível). Não afeta o conteúdo processado em tempo de execução, mas acompanhe a atualização.
