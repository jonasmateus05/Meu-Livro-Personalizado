# Cakto: cadastro do produto, webhook e teste de integração

> **Leia antes de vender.** O que está implementado foi baseado na documentação pública da Cakto (lista de fontes no fim). **Este ambiente de desenvolvimento não conseguiu abrir os sites da Cakto diretamente** (bloqueio de rede); as informações vieram de trechos de busca e do README do projeto inicial. Todo ponto marcado com ⚠️ precisa ser confirmado no painel e numa compra de teste real.

## 1. O que sabemos (e o que não sabemos)

| Tema | Situação |
|---|---|
| Formato do webhook de pagamento único: `{ secret, event, data: { id, refId, status, amount, paymentMethod, paidAt, customer{email…}, product{id…}, offer{id…} } }` | Exemplo público da Cakto. Implementado com leitura defensiva. ⚠️ confirmar no payload real |
| Autenticação: a chave secreta configurada no webhook vem no campo `secret` do JSON (sem HMAC em cabeçalho, segundo o exemplo) | Implementado (comparação em tempo constante). ⚠️ confirmar; se houver assinatura em cabeçalho, adicionar |
| Eventos: `purchase_approved`, `purchase_refused`, `refund`, `chargeback` (há também `pix_gerado`, `boleto_gerado`, `checkout_abandonment`, `refund_requested`…) | Os 4 primeiros são tratados; os demais são registrados e ignorados |
| Checkout pré-preenchido aceita nome, e-mail, CPF, telefone e cupom na URL | Documentado pela Cakto |
| **A Cakto devolve no webhook algum parâmetro nosso (UTM, `sck`, `src`, metadado)?** | **NÃO CONFIRMADO.** Por isso nada é liberado sem o teste abaixo |
| `amount` em reais (ex.: `29.9`) ou centavos? | ⚠️ assumido **reais** (convertido para centavos). Confirmar |
| `data.id` é o mesmo no evento de aprovação e no de reembolso/chargeback? | ⚠️ assumido que sim (o pedido é localizado por `data.id`) |

## 2. Cadastrar o produto
1. Painel Cakto → **Produtos → Adicionar produto**.
2. Nome sugerido: `A Bíblia Infantil Personalizada`.
3. Descrição verdadeira (a Cakto pede no mínimo 100 caracteres), por exemplo:
   > Livro digital infantil personalizado com o nome da criança, com dez histórias bíblicas recontadas para a faixa etária escolhida, orações simples, lições práticas e atividades para fazer em família. Produto em PDF, enviado ao e-mail informado após a confirmação do pagamento.
4. Tipo: produto digital. Defina o preço. URL da página de vendas: o seu domínio (HTTPS).
5. **Entrega:** não anexe um PDF genérico como “entregável” — o livro personalizado é entregue pelo nosso sistema. Escolha a opção de entrega da Cakto que não envie material próprio (ex.: entrega externa/por integração). ⚠️ confirmar as opções disponíveis na sua conta.
6. Publique e copie o **link de checkout** da oferta (`https://pay.cakto.com.br/...`) → `CAKTO_CHECKOUT_URL`.
7. Copie o **ID do produto** → `CAKTO_PRODUCT_ID` (o webhook de outros produtos é ignorado).
8. (Opcional) Página de obrigado/redirecionamento após a compra: `https://SEU-DOMINIO/obrigado`.

## 3. Configurar o webhook
1. Publique a aplicação com HTTPS (DEPLOY.md).
2. Gere um segredo longo: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
3. Cakto → **Integrações → Webhooks → Criar novo webhook**:
   - URL: `https://SEU-DOMINIO/api/webhooks/cakto`
   - Produto: o livro.
   - Eventos: **Compra aprovada** (`purchase_approved`), **Compra recusada** (`purchase_refused`), **Reembolso** (`refund`), **Chargeback** (`chargeback`).
   - Chave secreta: o segredo gerado → mesma string em `CAKTO_WEBHOOK_SECRET`.
4. Use **“Enviar evento de teste”** no painel. Esperado: resposta `200` e uma linha em `webhook_events`. Um evento de teste normalmente **não** traz nosso `checkout_ref`; o pedido fica `unmatched` — isso é o comportamento correto.

### Respostas do endpoint
| HTTP | Quando | A Cakto deve… |
|---|---|---|
| 200 `{received, outcome}` | processado ou ignorado de propósito | parar |
| 200 `{duplicate:true}` | evento já processado | parar |
| 400 / 401 / 413 | JSON inválido, segredo errado, payload grande | (não adianta reenviar) |
| 500 / 503 | falha temporária ou servidor sem configuração | reenviar; o evento fica `failed` e pode ser reprocessado |

## 4. Como a compra é ligada à personalização
1. Ao clicar em “Continuar para o pagamento”, `/api/checkout` grava a personalização com um `checkout_ref` aleatório (`lb_` + 24 caracteres, ~142 bits).
2. O link de checkout recebe o `checkout_ref` em `utm_content`, `sck` e `src` (configurável em `CAKTO_CHECKOUT_REF_PARAMS`).
3. No webhook, o sistema procura o formato `lb_…` em todo o payload (ou só em `CAKTO_CORRELATION_PATH`, quando definido).
4. Regras:
   - exatamente 1 referência, existente, sem outro pedido aprovado ⇒ **associado** (`awaiting_release` no modo seguro; `queued` com `FULFILLMENT_AUTO_RELEASE=true`);
   - 0 referências ⇒ `unmatched` (nada é gerado);
   - referência desconhecida, várias referências, personalização já paga, valor abaixo de `CAKTO_EXPECTED_AMOUNT_CENTS` ⇒ `needs_review`.
   - **Nunca** associa por e-mail, nome ou horário (um mesmo comprador pode comprar livros para crianças diferentes).

## 5. TESTE DE INTEGRAÇÃO OBRIGATÓRIO (compra real de teste)

Objetivo: provar, com um payload real, se a referência volta no webhook — e em qual campo.

1. Deploy em HTTPS com:
   ```
   CAKTO_WEBHOOK_CAPTURE=true
   FULFILLMENT_AUTO_RELEASE=false
   CAKTO_CORRELATION_PATH=        (vazio)
   ```
2. Crie uma oferta de baixo valor (ou use um cupom) para o teste.
3. Na página do site, personalize (ex.: nome “Teste Integração”) e siga para o checkout **pelo botão do site** (a URL precisa conter `utm_content=lb_…`). Anote o `checkout_ref` que aparece na URL.
4. Pague (Pix é o mais rápido).
5. Inspecione o que chegou:
   ```bash
   curl -H "Authorization: Bearer $ADMIN_API_TOKEN" https://SEU-DOMINIO/api/admin/captures
   # ou, com acesso ao banco:
   DATABASE_URL=... npm run cakto:inspect -- --db --ref lb_XXXXXXXXXXXXXXXXXXXXXXXX
   ```
   O script lista **todos os caminhos** do JSON e diz onde a referência aparece. Os dados pessoais já vêm mascarados.
6. Confira também:
   - unidade de `data.amount` (reais × centavos) — ajuste `toCents` em `lib/cakto/payload.ts` se for centavos;
   - valor de `data.status` na aprovação;
   - nome do campo do e-mail do comprador.

### Resultado A — a referência aparece em um campo
1. Defina `CAKTO_CORRELATION_PATH` com o caminho mostrado (ex.: `data.utm_content` ou `data.checkoutUrl`).
2. Confirme que o pedido ficou `awaiting_release` com a personalização certa: `GET /api/admin/orders?status=awaiting_release`.
3. Libere: `POST /api/admin/orders/<id>/release` → o worker gera o PDF e envia o e-mail. Abra o e-mail, baixe o PDF e confira o nome.
4. Faça o **reembolso** da compra de teste na Cakto → o pedido deve ficar `revoked` e o link de download deve parar de funcionar. Repita com uma segunda compra para conferir o `data.id` do evento de reembolso.
5. Só então: `FULFILLMENT_AUTO_RELEASE=true` e `CAKTO_WEBHOOK_CAPTURE=false`. Registre o resultado em `docs/RELATORIO_TESTES.md`.

### Resultado B — a referência NÃO aparece
**Não ligue a liberação automática.** Opções, em ordem de preferência:
1. Perguntar ao suporte da Cakto qual parâmetro de rastreamento/metadado é devolvido no webhook ou consultável pela API de pedidos; se existir, ajustar `CAKTO_CHECKOUT_REF_PARAMS`/`CAKTO_CORRELATION_PATH` (ou implementar a consulta à API) e repetir o teste.
2. Operar com **reconciliação manual** (já implementada): pedidos pagos ficam `unmatched`; a equipe identifica a personalização com o cliente e associa com `POST /api/admin/orders/<id>/link` (ver OPERACAO.md). A geração é liberada na hora.
3. Avaliar outro fluxo de checkout que gere um identificador verificável por compra.

## 6. Reembolso e chargeback
- `refund` / `chargeback` ⇒ `payment_status` atualizado, `fulfillment_status = revoked`, tarefas pendentes canceladas, tokens de download revogados (a página informa “link desativado”).
- Eventos fora de ordem são tratados: aprovação recebida depois de um reembolso não reativa o pedido; recusa de tentativa antiga não desfaz aprovação.
- O PDF já baixado não pode ser “recuperado” — a revogação impede novos downloads.

## Fontes consultadas
- Exemplo de payload de pagamento único: https://cakto-dece4a15.mintlify.app/webhooks/pagamento-unico
- Eventos disponíveis: https://cakto-dece4a15.mintlify.app/webhooks/eventos e https://docs.cakto.com.br/api-reference/webhooks/test-webhook
- Criar webhook / segredo: https://docs.cakto.com.br/api-reference/webhooks/create
- Receber a primeira venda: https://docs.cakto.com.br/comece-aqui/receber-primeira-venda
- Criar checkout: https://docs.cakto.com.br/comece-aqui/criar-checkout
- Checkout pré-preenchido pela URL: https://ajuda.cakto.com.br/pt-br/articles/61-como-usar-a-url-para-criar-um-checkout-pre-preenchido-na-cakto
- Guia de webhooks: https://ajuda.cakto.com.br/pt-br/articles/1-como-funcionam-os-webhooks-na-cakto-guia-completo
- Cadastro de produto: https://ajuda.cakto.com.br/pt-br/articles/86-como-cadastrar-o-meu-produto-na-cakto
