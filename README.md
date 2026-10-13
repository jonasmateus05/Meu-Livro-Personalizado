# Livro Bíblico Infantil Personalizado — starter técnico

Base inicial Next.js App Router + Supabase + webhook Cakto. Inclui formulário de personalização, esquema SQL e endpoint que registra eventos Cakto de forma idempotente. **Não está pronto para receber vendas reais**: a associação confiável entre o pedido Cakto e a personalização ainda precisa ser comprovada num evento real.

## 1. Requisitos
- Node.js 20+
- Projeto Supabase
- Conta Cakto e produto cadastrado
- Domínio HTTPS para webhook em produção
- Conta Resend com domínio remetente verificado (necessário na fase de entrega)

## 2. Instalação local
```bash
cp .env.example .env.local
npm install
npm run dev
```
Preencha as variáveis de ambiente. A página inicial pode salvar personalizações depois de aplicar o SQL.

## 3. Configurar Supabase
1. Abra SQL Editor no Supabase.
2. Execute `supabase/schema.sql`.
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`.
4. Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` em variáveis `NEXT_PUBLIC_*`.

## 4. Cadastrar o produto na Cakto
1. Em Produtos, selecione Adicionar produto.
2. Nome sugerido: `A Bíblia Infantil Personalizada`.
3. Use descrição verdadeira, com no mínimo 100 caracteres conforme a central de ajuda da Cakto. Exemplo: `Livro digital infantil personalizado com o nome da criança, histórias bíblicas adaptadas à faixa etária, orações simples e atividades para compartilhar em família. O arquivo será produzido em PDF e enviado ao e-mail informado após a confirmação do pagamento.`
4. Defina o preço e cadastre a URL pública da página de vendas (HTTPS quando publicada).
5. Para a entrega, não configure um arquivo estático como se fosse o livro personalizado. A entrega final será pelo nosso backend após o webhook. Escolha a opção de entrega compatível com a configuração da conta e evite que a Cakto envie um material genérico antes do PDF personalizado.
6. Publique e copie o link de checkout. Coloque-o em `CAKTO_CHECKOUT_URL` quando o redirecionamento for implementado.

## 5. Configurar webhook
1. Publique o endpoint em HTTPS: `https://SEU-DOMINIO/api/webhooks/cakto`.
2. Na Cakto, vá a Integrações > Webhooks > Criar Novo Webhook.
3. Selecione o produto e o evento `purchase_approved`. Adicione também `refund` e `chargeback` para monitorar alterações pós-compra.
4. Configure uma chave secreta forte e idêntica a `CAKTO_WEBHOOK_SECRET`.
5. Use “Enviar evento de teste” e examine o JSON e os logs de entrega no painel Cakto.
6. Confirme que o payload recebido contém `secret`, `event`, `data.id`, `data.product.id`, `data.status`, `data.amount`, `data.customer.email` e `data.paidAt` (os campos exatos podem variar por evento).

## 6. BLOQUEIO obrigatório antes de vender
O exemplo publicado pela Cakto inclui `data.id` (pedido), `data.refId`, cliente, produto, oferta, status e valor, mas **não mostra um campo que carregue nosso `personalization_id`**. O endpoint atual salva aprovações como `paid_unmatched` deliberadamente. Não associe pelo e-mail nem pelo nome: um comprador pode adquirir vários livros.

Antes de produção, faça uma compra de teste e confirme se a Cakto suporta algum campo de referência/metadado que volte no webhook, ou se a API oficial permite consultar/associar a transação com segurança. Não presuma que `utm_*`, `src` ou os campos de pré-preenchimento carregam metadados arbitrários; a documentação consultada só os apresenta para rastreamento/preenchimento.

Se não houver mecanismo de correlação suportado, alternativas seguras são: um fluxo de checkout individualizado que produza um identificador verificável; ou um processo de reconciliação manual temporário. Não libere o PDF automaticamente até resolver esse ponto.

## 7. Próximas peças ainda não implementadas
- Confirmar o contrato real de correlação da Cakto.
- Rota segura para iniciar/redirecionar checkout.
- Fila/worker transacional de geração PDF e retries.
- Modelo editorial completo, textos revisados e ilustrações licenciadas.
- Upload para bucket privado Supabase Storage.
- Link de download autenticado/assinado.
- Envio via Resend, controle de tentativas e prevenção de e-mail duplicado.
- Política para reembolso/chargeback e revogação de acesso.
- Rate limiting, validação de domínio/produto e testes de segurança.

## Referências oficiais
- https://cakto-dece4a15.mintlify.app/webhooks/pagamento-unico
- https://ajuda.cakto.com.br/pt-br/articles/1-como-funcionam-os-webhooks-na-cakto-guia-completo
- https://ajuda.cakto.com.br/pt-br/articles/86-como-cadastrar-o-meu-produto-na-cakto
