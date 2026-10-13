# Relatório de testes

Data da execução: 13/10/2026 · Ambiente: Linux, Node.js 22.22.0, Chromium 141 (revisão Playwright 1194), Next.js 15.5.27.

## Resumo

| Verificação | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | ✅ sem erros nem avisos |
| Tipos | `npm run typecheck` | ✅ sem erros |
| Testes automatizados | `npm test` | ✅ **77 de 77 passaram** (6 arquivos, ~35 s) |
| Build de produção | `npm run build` | ✅ compilado (17 rotas) |
| Fluxo HTTP real | servidor `next start` + PostgreSQL (PGlite via protocolo de rede) | ✅ ver seção “Teste manual ponta a ponta” |
| Verificação visual | capturas da página (390 px e 1280 px) e de PDFs | ✅ sem rolagem horizontal; layout conferido |

### Como os testes rodam
- **Banco:** cada teste cria um PostgreSQL real em memória (PGlite) e aplica o mesmo `supabase/schema.sql` usado em produção — restrições, índices únicos, RLS e transações são exercitados de verdade.
- **PDF:** gerado de verdade com Chromium e lido de volta com pdf.js (sem mocks).
- **Dublês (fakes):** apenas Supabase Storage (memória), Resend (registra mensagens e simula falhas) e falhas forçadas do renderizador.
- **Payloads da Cakto:** simulados no formato do exemplo público. **Não substituem** o teste com payload real (ver PENDENCIAS.md).

## Cobertura dos cenários obrigatórios

| Cenário pedido | Teste(s) |
|---|---|
| Nomes curtos e longos | `names` “aceita nomes curtos”, “nomes longos até 40…”; `book` PDFs de “Lu” e “Maria Eduarda Albuquerque de Bragança”, nome de 39 letras sem espaço |
| Nomes com acentos | `names` “preserva acentos…”, “normaliza NFD…”; `book` PDFs de “João Ângelo D'Ávila” e “Ñuño Łukasz Çeylin” (nome localizado no texto extraído do PDF) |
| Personalizações diferentes no mesmo e-mail | `webhook` “personalizações diferentes no mesmo e-mail…”; `jobs` “livros de personalizações diferentes no mesmo e-mail saem com o nome certo” |
| Pagamento aprovado | `webhook` “associa pelo checkout_ref…”, “modo seguro…”; `jobs` fluxo completo até o e-mail |
| Pagamento recusado | `webhook` “pagamento recusado…”, “recusa de uma tentativa antiga não desfaz aprovação” |
| Reembolso e chargeback | `webhook` “reembolso depois da aprovação…”, “chargeback…”, “eventos fora de ordem…”; `jobs` “reembolso antes da geração…”; `download` “reembolso/chargeback revoga o link…” |
| Webhook duplicado | `webhook` “webhook duplicado: processa uma vez só”, “duplicados concorrentes…”* |
| Falha na geração do PDF | `jobs` “falha na geração… tenta de novo e conclui”, “falha persistente… pode ser reprocessado”; `book` “renderizador recusa layout que transborda”, “validatePdf recusa…” |
| Falha no envio de e-mail | `jobs` “falha no envio de e-mail… MESMA chave… MESMO link”, “não envia e-mail duplicado” |
| Acesso ao PDF de outro pedido | `download` “cada token só abre o PDF do próprio pedido”, “tokens adulterados… não dão acesso”, “só o hash do token” |
| Associação incorreta pagamento ↔ personalização | `webhook` “sem referência… nunca associa por e-mail”, “referência desconhecida”, “duas referências”, “mesma personalização paga por dois pedidos”, “restrição única”, “reconciliação manual…”; `book` “validatePdf recusa PDF de outro nome” |

\* PGlite usa uma única conexão; os envios concorrentes são serializados. A proteção contra corrida real (várias conexões) vem das restrições únicas e do `SELECT … FOR UPDATE`, que não foram estressados com conexões paralelas num PostgreSQL de servidor.

## Lista completa (saída do Vitest, ordem de conclusão)

- ✅ tests/webhook.test.ts > autenticidade > recusa segredo errado ou ausente (401) e não grava nada
- ✅ tests/jobs.test.ts > fila > enfileiramento idempotente e claim exclusivo
- ✅ tests/webhook.test.ts > autenticidade > responde 503 se o segredo não estiver configurado no servidor
- ✅ tests/jobs.test.ts > fila > backoff exponencial limitado
- ✅ tests/download.test.ts > acesso seguro ao PDF > cada token só abre o PDF do próprio pedido (sem acesso ao PDF de outro pedido)
- ✅ tests/webhook.test.ts > autenticidade > recusa JSON inválido e payload sem pedido
- ✅ tests/jobs.test.ts > processamento assíncrono completo > pagamento aprovado -> PDF validado no storage privado -> e-mail com link seguro
- ✅ tests/webhook.test.ts > autenticidade > ignora produto diferente do configurado
- ✅ tests/webhook.test.ts > pagamento aprovado > associa pelo checkout_ref e enfileira a geração (auto-liberação ligada)
- ✅ tests/jobs.test.ts > processamento assíncrono completo > falha na geração do PDF: registra erro, tenta de novo e conclui
- ✅ tests/webhook.test.ts > pagamento aprovado > modo seguro: associa mas aguarda liberação manual
- ✅ tests/download.test.ts > acesso seguro ao PDF > tokens adulterados, inventados ou ids de pedido não dão acesso
- ✅ tests/webhook.test.ts > pagamento aprovado > encontra a referência mesmo dentro de uma URL codificada (ex.: checkoutUrl)
- ✅ tests/webhook.test.ts > pagamento aprovado > com CAKTO_CORRELATION_PATH, só aceita a referência no caminho configurado
- ✅ tests/jobs.test.ts > processamento assíncrono completo > falha persistente na geração: tarefa morre, pedido fica 'failed' e pode ser reprocessado
- ✅ tests/webhook.test.ts > pagamento aprovado > valor abaixo do esperado vai para revisão
- ✅ tests/download.test.ts > acesso seguro ao PDF > página de download não consome; limite de downloads e expiração são respeitados
- ✅ tests/webhook.test.ts > associação incorreta ou ambígua entre pagamento e personalização > sem referência no payload: fica 'unmatched' e NADA é gerado (nunca associa por e-mail)
- ✅ tests/jobs.test.ts > processamento assíncrono completo > falha no envio de e-mail: registra, tenta de novo com a MESMA chave de idempotência e o MESMO link
- ✅ tests/webhook.test.ts > associação incorreta ou ambígua entre pagamento e personalização > referência desconhecida (ou forjada): needs_review
- ✅ tests/webhook.test.ts > associação incorreta ou ambígua entre pagamento e personalização > duas referências no mesmo payload: needs_review
- ✅ tests/jobs.test.ts > processamento assíncrono completo > não envia e-mail duplicado (tarefa repetida, webhook repetido)
- ✅ tests/download.test.ts > acesso seguro ao PDF > reembolso/chargeback revoga o link já enviado
- ✅ tests/webhook.test.ts > associação incorreta ou ambígua entre pagamento e personalização > mesma personalização paga por dois pedidos: o segundo vai para revisão (sem livro duplicado)
- ✅ tests/webhook.test.ts > associação incorreta ou ambígua entre pagamento e personalização > personalizações diferentes no mesmo e-mail de comprador geram pedidos e livros separados e corretos
- ✅ tests/jobs.test.ts > processamento assíncrono completo > reenvio administrativo cria nova versão com novo link
- ✅ tests/download.test.ts > acesso seguro ao PDF > o banco guarda só o hash do token
- ✅ tests/webhook.test.ts > associação incorreta ou ambígua entre pagamento e personalização > reconciliação manual: associa um pedido 'unmatched' e libera; recusa associação duplicada
- ✅ tests/book.test.ts > modelo editorial > tem 10 histórias, cada uma com texto, lição, prática, oração e perguntas para as 3 idades
- ✅ tests/book.test.ts > modelo editorial > não apresenta paráfrases como citação literal (sem aspas atribuídas a personagens)
- ✅ tests/book.test.ts > modelo editorial > monta o livro completo com capa, boas-vindas, 10 histórias, atividades e oração para dormir
- ✅ tests/book.test.ts > modelo editorial > escapa o nome no HTML (sem injeção mesmo se a validação falhar)
- ✅ tests/book.test.ts > modelo editorial > caça-palavras é determinístico e inclui o nome quando cabe
- ✅ tests/book.test.ts > modelo editorial > checkLayout recusa texto transbordando, nome ausente e contagem errada de páginas
- ✅ tests/webhook.test.ts > associação incorreta ou ambígua entre pagamento e personalização > o banco impede dois pedidos aprovados na mesma personalização (restrição única)
- ✅ tests/jobs.test.ts > processamento assíncrono completo > reembolso antes da geração cancela a tarefa; nada é gerado nem enviado
- ✅ tests/webhook.test.ts > recusa, reembolso e chargeback > pagamento recusado: registra 'refused' e não gera nada
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > gera e valida o PDF de 'Lu' ('2-4', 'colorful')
- ✅ tests/webhook.test.ts > recusa, reembolso e chargeback > reembolso depois da aprovação: revoga acesso e cancela tarefas pendentes
- ✅ tests/jobs.test.ts > processamento assíncrono completo > livros de personalizações diferentes no mesmo e-mail saem com o nome certo
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > gera e valida o PDF de 'Miguel' ('5-7', 'colorful')
- ✅ tests/checkout.test.ts > início do checkout > anexa o checkout_ref nos parâmetros configurados
- ✅ tests/checkout.test.ts > início do checkout > recusa URL de checkout fora da Cakto ou sem HTTPS
- ✅ tests/checkout.test.ts > início do checkout > referências são aleatórias, únicas e no formato esperado
- ✅ tests/webhook.test.ts > recusa, reembolso e chargeback > chargeback: revoga acesso
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > gera e valida o PDF de 'Maria Eduarda Albuquerque de Bragança' ('8-10', 'colorful')
- ✅ tests/webhook.test.ts > recusa, reembolso e chargeback > eventos fora de ordem: aprovação depois do reembolso NÃO reativa o pedido
- ✅ tests/checkout.test.ts > início do checkout > grava só o mínimo (sem e-mail ou dados do comprador) e com status pendente
- ✅ tests/webhook.test.ts > recusa, reembolso e chargeback > recusa de uma tentativa antiga não desfaz aprovação
- ✅ tests/checkout.test.ts > início do checkout > o banco recusa nomes inválidos mesmo sem passar pela API
- ✅ tests/webhook.test.ts > recusa, reembolso e chargeback > eventos não tratados (ex.: pix_gerado) são registrados como ignorados
- ✅ tests/checkout.test.ts > início do checkout > limpeza remove personalizações não pagas antigas
- ✅ tests/webhook.test.ts > idempotência e novas tentativas > webhook duplicado: processa uma vez só
- ✅ tests/checkout.test.ts > segurança de configuração > comparação de segredo em tempo constante
- ✅ tests/checkout.test.ts > segurança de configuração > modo seguro (sem auto-liberação) é o padrão
- ✅ tests/checkout.test.ts > segurança de configuração > RLS está ligado e os papéis públicos não têm privilégios
- ✅ tests/names.test.ts > nome da criança — validação e normalização > aceita nomes curtos
- ✅ tests/names.test.ts > nome da criança — validação e normalização > aceita nomes longos até 40 caracteres e recusa acima disso
- ✅ tests/names.test.ts > nome da criança — validação e normalização > preserva acentos e caracteres especiais (ç, ñ, ł, hífen, apóstrofo)
- ✅ tests/names.test.ts > nome da criança — validação e normalização > normaliza NFD para NFC e espaços/invisíveis
- ✅ tests/names.test.ts > nome da criança — validação e normalização > recusa HTML, números e emojis
- ✅ tests/names.test.ts > nome da criança — validação e normalização > schema do formulário aplica as mesmas regras e o campo-isca
- ✅ tests/names.test.ts > substituição segura no modelo > escapa HTML do valor e do texto do modelo
- ✅ tests/names.test.ts > substituição segura no modelo > falha com marcador desconhecido (evita '{nmoe}' impresso)
- ✅ tests/names.test.ts > substituição segura no modelo > preserva o nome com acentos dentro do texto
- ✅ tests/names.test.ts > substituição segura no modelo > gera slugs e letras ASCII para arquivo e caça-palavras
- ✅ tests/webhook.test.ts > idempotência e novas tentativas > duplicados concorrentes não criam pedidos ou tarefas em dobro
- ✅ tests/webhook.test.ts > idempotência e novas tentativas > falha de processamento: devolve 500, registra erro e permite reprocessar
- ✅ tests/webhook.test.ts > captura de payload para o teste de integração > guarda a estrutura com dados pessoais mascarados e preserva o checkout_ref
- ✅ tests/webhook.test.ts > normalização do payload > converte valores e e-mail, sem inventar campos ausentes
- ✅ tests/webhook.test.ts > normalização do payload > não procura referência dentro do campo secret
- ✅ tests/webhook.test.ts > normalização do payload > redactPayload mascara chaves sensíveis
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > gera e valida o PDF de 'João Ângelo D\'Ávila' ('5-7', 'watercolor')
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > gera e valida o PDF de 'Ñuño Łukasz Çeylin' ('2-4', 'colorful')
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > gera e valida o PDF de 'Bartholomeuzinhoalexandrinodemontecar…' ('8-10', 'colorful')
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > validatePdf recusa PDF de outro nome (associação errada)
- ✅ tests/book.test.ts > geração real de PDF (Chromium) > o renderizador recusa um layout que transborda

```
 Test Files  6 passed (6)
      Tests  77 passed (77)
```

## Teste manual ponta a ponta (HTTP)
Executado com `next start` (build de produção) e um PostgreSQL PGlite exposto por socket com o `schema.sql`:

| Passo | Resultado observado |
|---|---|
| `GET /` e `/fonts/*.woff2` | 200 |
| `POST /api/checkout` com nome `<b>` | 400 “Use apenas letras, espaços, hífen, apóstrofo ou ponto.” |
| `POST /api/checkout` com “João Ângelo” | 201 com `https://pay.cakto.com.br/oferta_teste?utm_content=lb_…&sck=lb_…&src=lb_…` |
| Webhook com segredo errado | 401 |
| Webhook `purchase_approved` com a referência | 200 `matched_awaiting_release` |
| Mesmo webhook novamente | 200 `{duplicate:true}` |
| `/api/admin/orders` sem token / com token | 401 / pedido com `child_name: "João Ângelo"`, `amount_cents: 2990` |
| `POST /api/admin/orders/<id>/release` (2×) | 200 `ok` / 409 “Pedido não aguarda liberação (queued)” |
| `/download/abc` | página “Este link não é válido…” |
| `/api/jobs/run` sem token | 401 |
| Prévia da capa no formulário (390 px) | atualiza com “Ana Lívia” em tempo real |

Neste teste o upload para o Supabase Storage e o envio pelo Resend **não** foram executados (sem credenciais).

## PDFs de exemplo gerados e validados
| Nome | Idade | Estilo | Páginas | Tamanho | Tempo |
|---|---|---|---|---|---|
| Miguel | 5–7 | colorido | 44 | ~0,8 MB | ~2,8 s |
| Maria Eduarda Albuquerque de Bragança | 8–10 | aquarela | 44 | ~9,3 MB | ~12,6 s |
| Ana Lívia | 2–4 | aquarela | 41 | ~7,6 MB | ~9 s |

O estilo aquarela gera arquivos maiores porque o filtro SVG é rasterizado pelo Chromium.

## O que NÃO foi testado aqui
- Webhook real da Cakto (formato, autenticação, campo da referência, unidade de `amount`) — ver `docs/CAKTO.md`, seção 5.
- Upload/URL assinada reais no Supabase Storage; envio real pelo Resend.
- Conexão com o Supabase Postgres (pooler/TLS).
- `Dockerfile.worker` (Docker indisponível no ambiente).
- Concorrência real com múltiplas conexões/workers.
- Leitores de tela e testes de acessibilidade automatizados (a página segue boas práticas: rótulos, foco visível, `prefers-reduced-motion`, contraste, alvos de toque ≥ 44 px — mas não houve auditoria formal).
