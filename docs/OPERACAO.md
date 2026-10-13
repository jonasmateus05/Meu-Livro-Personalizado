# Operação e rotas administrativas

Todas exigem `Authorization: Bearer $ADMIN_API_TOKEN` (24+ caracteres). Sem token configurado, respondem 401.

| Ação | Rota |
|---|---|
| Listar pedidos (filtro opcional) | `GET /api/admin/orders?status=unmatched` (inclui personalizações pendentes para reconciliação) |
| Associar pedido pago a uma personalização | `POST /api/admin/orders/<id>/link` corpo `{"checkout_ref":"lb_..."}` |
| Liberar geração (modo seguro) | `POST /api/admin/orders/<id>/release` |
| Reenviar e-mail com novo link | `POST /api/admin/orders/<id>/resend` |
| Reprocessar evento de webhook que falhou | `POST /api/admin/webhook-events/<id>/reprocess` |
| Recolocar tarefa morta na fila | `POST /api/admin/jobs/<id>/retry` |
| Ver capturas de payload (diagnóstico) | `GET /api/admin/captures` |

## Status do pedido (`fulfillment_status`)
| Status | Significado | O que fazer |
|---|---|---|
| `not_started` | pagamento não aprovado | nada |
| `unmatched` | pago sem referência de personalização | reconciliar (`/link`) |
| `needs_review` | associação ambígua/conflitante (`review_reason`) | analisar; pode ser cobrança duplicada |
| `awaiting_release` | associado, aguardando liberação | `/release` (modo seguro) |
| `queued` → `generating` → `generated` → `emailing` → `delivered` | fluxo normal | — |
| `failed` | tarefa esgotou tentativas (`review_reason = job_dead:...`) | ver `jobs.last_error`, corrigir causa, `/api/admin/jobs/<id>/retry` |
| `revoked` | reembolso/chargeback | nada (downloads bloqueados) |

## Consultas úteis (SQL Editor)
```sql
-- pedidos que precisam de atenção
select id, provider_order_id, fulfillment_status, review_reason, customer_email, paid_at
from orders where fulfillment_status in ('unmatched','needs_review','awaiting_release','failed')
order by paid_at desc;

-- eventos de webhook com falha
select id, event_type, provider_order_id, last_error, attempt_count from webhook_events where status = 'failed';

-- fila
select kind, status, attempts, last_error, run_after from jobs where status <> 'succeeded' order by created_at desc;
```

## Reconciliação manual (pedido `unmatched`)
1. Contate o comprador (e-mail do pedido) e peça o nome da criança, a faixa etária e o horário da compra.
2. Localize a personalização pendente correspondente em `pendingPersonalizations` (`GET /api/admin/orders?status=unmatched`).
3. Em caso de dúvida, **não associe** — peça ao cliente para refazer a personalização e associe a nova.
4. `POST /api/admin/orders/<id>/link` com o `checkout_ref`.

## Logs
Logs JSON de uma linha, sem dados pessoais: `checkout_started`, `cakto_webhook_processed`, `cakto_webhook_unauthorized`, `cakto_webhook_processing_failed`, `job_failed`, `book_generated`, `book_email_sent`, `worker_batch`, `purge`. Configure alertas para `cakto_webhook_processing_failed`, `job_failed` com `dead:true` e `cakto_webhook_unauthorized` em volume.
