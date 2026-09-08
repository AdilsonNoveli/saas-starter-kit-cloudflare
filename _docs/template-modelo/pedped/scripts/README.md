# Scripts

## Cloudflare Queues (agente WhatsApp) — provisionamento automático

`wrangler.toml` declara quatro Queues, prefixadas por `{{WORKER_NAME}}` (ver
seção de colisão abaixo): `{{WORKER_NAME}}-turno-check` + a DLQ
`{{WORKER_NAME}}-turno-check-dlq` (turno do agente, seção 2/10 de
`_docs/implementar/arquitetura-agente-whatsapp-in-app.md`) e `{{WORKER_NAME}}-midia` +
`{{WORKER_NAME}}-midia-dlq` (mídia recebida, seção 8.1 de
`_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`). Queues são recurso de
conta — `wrangler deploy` **nunca** as cria sozinho (mesma limitação de
KV/R2/D1); sem elas existirem antes, o deploy falha com
`Queue "..." does not exist`.

`scripts/ensure-cf-queues.mjs` resolve isso de forma automática e
idempotente: lê os nomes de fila direto do `wrangler.toml` (nunca
hardcoded — zero risco de esquecer de atualizar o script ao adicionar uma
fila nova) e roda `wrangler queues create` pra cada uma, tratando "já
existe" como sucesso. Roda em toda instalação/deploy, não só na primeira.

**Declarar a fila no `wrangler.toml` é suficiente.** Não existe lista de nomes
no script, e `ensure-cf-queues.spec.mjs` trava essa promessa: ele lê o
`wrangler.toml` real e falha se alguma fila declarada deixar de ser detectada.

Dois ganchos garantem que o script rode, os dois versionados no
`package.json` — nenhum depende de configuração de dashboard, que uma
instalação nova não teria:

| Gancho | Dispara em |
|---|---|
| `predeploy` | `pnpm run deploy` (deploy local) |
| `prebuild:cf` | `pnpm run build:cf` — **qualquer** build com preset Cloudflare, inclusive o do pipeline Git |

`build` (alvo Docker/node-server) fica **de fora** de propósito: aquele build
não fala com a Cloudflare e não pode passar a exigir credencial dela.

Se o campo **Deploy command** do dashboard ainda estiver no padrão
(`npx wrangler deploy`), o `prebuild:cf` já cobre — mas trocá-lo para
`pnpm run cf:ensure-queues && npx wrangler deploy` continua sendo defesa em
profundidade válida, caso o build command não passe pelo `package.json`.

### Colisão entre instalações — checagem de posse antes de criar/reusar

Cloudflare Queues são escopadas por **conta**, não por Worker. Duas
instalações (lojas diferentes, mesmo repositório) na mesma conta Cloudflare
só ficam isoladas se `CLOUDFLARE_WORKER_NAME` for **único** por instalação —
é esse nome que prefixa as quatro filas acima. Isso já quebrou em produção
uma vez (§8.1 de `_docs/em-andamento.md`): duas instalações resolveram para o
mesmo nome, e o deploy da segunda **roubou o binding de consumer** da
primeira em silêncio — o WhatsApp da primeira loja parou de processar turno,
sem erro nenhum no deploy que causou.

Por isso, antes de criar ou reusar cada fila, `ensure-cf-queues.mjs` roda
`wrangler queues info <nome>` e compara o consumer atual com o Worker sendo
implantado agora. Se a fila já existir com um consumer de **outro** Worker, o
build **falha alto** com uma mensagem explicando a colisão, em vez de seguir
e roubar o binding silenciosamente. Isso não depende de `CLOUDFLARE_WORKER_NAME`
estar definido — funciona mesmo quando a instalação usa o fallback (`name` do
`wrangler.toml`), porque a checagem olha o estado real da conta, não a
variável de ambiente.

**Isso não substitui contas Cloudflare separadas por instalação** — se possível,
prefira uma conta por loja, onde a colisão fica estruturalmente impossível.
O guard acima é a rede de segurança para quando isso não é viável.

**Sem credencial da Cloudflare o script avisa e segue** (`exit 0`) em vez de
quebrar o build: `pnpm run cf:preview` numa máquina sem `wrangler login`, ou um
CI que só compila, continuam funcionando. Um deploy de verdade sem as filas
falha logo depois, com `Queue "..." does not exist` — erro claro e no lugar
certo. Erro real (nome inválido, rate limit) continua derrubando o build.

Rodar manualmente pra depurar: `pnpm run cf:ensure-queues`.

---

# Scripts — Outbox de Webhook (Fase 3.6)

Este diretório agora contém apenas o setup do **agendamento** que aciona o
worker de drenagem do outbox. O worker em si vive na aplicação Nuxt
(`server/api/internal/webhook-worker.post.ts`) e a fila durável vive em
`public.webhook_outbox` (migration 012).

## Fluxo

1. Endpoints de pedido (`orders/create.post.ts`, `admin/pedidos/novo.post.ts`,
   `admin/pedidos/[id]/status.put.ts`) chamam `dispatchWebhook(...)`, que
   apenas **insere** uma linha em `webhook_outbox`.
2. `pg_cron` chama, a cada 1 minuto, `POST /api/internal/webhook-worker`
   protegido por `Bearer NUXT_WORKER_TOKEN`.
3. O endpoint roda `processWebhookOutbox()` — claim atômico do lote,
   POST com timeout de 10s, backoff exponencial e idempotency-key.

## Setup

1. Defina `NUXT_WORKER_TOKEN` e `NUXT_WEBHOOK_TOKEN` no ambiente da app.
2. No Supabase, configure o token e a base URL como settings do banco
   (substitua os valores reais):
   ```sql
   ALTER DATABASE postgres SET app.base_url    = 'https://meusite.com';
   ALTER DATABASE postgres SET app.worker_token = 'cole-o-NUXT_WORKER_TOKEN-aqui';
   ```
3. Aplique `scripts/setup-webhook-outbox-cron.sql` no SQL Editor do Supabase.

## Observação rápida

```sql
-- Estado da fila
SELECT status, count(*) FROM public.webhook_outbox GROUP BY status;

-- Próximos a sair
SELECT id, evento, status, tentativas, proxima_tentativa_em, ultimo_erro
FROM public.webhook_outbox
WHERE status IN ('pendente','falha')
ORDER BY proxima_tentativa_em ASC
LIMIT 10;
```

---

# Scripts — Cobertura do identificador estável do WhatsApp (FASE 0.4)

`scripts/whatsapp-lid-coverage.mjs` conta quantos `clientes` têm
`whatsapp_lid` gravado. É a métrica da definição de pronto do item (a) da
FASE 0.4 de `_docs/em-andamento.md`: o identificador estável passa a ser
gravado no primeiro turno de cada cliente que conversa pelo WhatsApp, então
a proporção **sobe a cada conversa**.

Versionado porque a comparação é o valor: a medição de antes e a de depois
precisam usar exatamente a mesma consulta. Baseline de 2026-07-29, antes da
propagação: **4 de 64 (6,3%)**, 0 lid-only.

```bash
node scripts/whatsapp-lid-coverage.mjs
```

Só lê (`count: 'exact', head: true` — não trafega linha). Precisa de
`NUXT_PUBLIC_SUPABASE_URL` e `NUXT_SUPABASE_SECRET_KEY` no `.env`.
