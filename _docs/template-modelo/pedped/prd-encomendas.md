# PRD — Pre-Order System (Sistema de Encomendas)

**Stack real (auditada):** Nuxt 4.4.6 (Nitro multi-target: node-server/Docker + cloudflare-module) + Vue 3.5 + TypeScript 6 + Supabase (PostgreSQL, `@nuxtjs/supabase` 2) + Pinia 3 + Tailwind CSS 4 + zod 4 + ícones `@lucide/vue`.
**Convenção de nomenclatura:** todos os **arquivos, funções, tipos, rotas, colunas novas e enums** em **inglês**. Prosa/descrições em português. Tabelas e colunas **já existentes** (`produtos`, `pedidos`, etc.) **não são renomeadas** — apenas estendidas.

---

## Investigation Report

### Premissas do PRD × realidade do repositório

| Premissa do PRD | Status | Realidade | Arquivo:linha |
|---|---|---|---|
| Stack "Nuxt (Edge)" | ❌ divergente | Deploy multi-alvo via `NITRO_PRESET`: node-server (Docker) e cloudflare-module coexistem; nada é "edge-only" | `nuxt.config.ts:41-57` |
| V-Calendar instalado/usável | ⚠️ inexistente | Não está em `package.json`; o repo tem design system próprio (Tailwind 4 tokens `bg-surface`/`border-border`, componentes `app/components/ui/*`, ícones `@lucide/vue`). Introduzir V-Calendar traria um design system estranho e risco SSR. **Decisão: componentes de calendário próprios** (ver "Decisões de arquitetura") | `package.json`, `app/components/ui/DatePicker.vue` |
| Tabela `produtos` com colunas PT | ✅ confirmado | `produtos(id, nome, preco_venda, unidade_medida, permite_fracionamento, estoque_atual, disponivel, …)` | `server/supabase/init.sql:280-301` |
| Tabela `pedidos` para FK de encomenda | ✅ confirmado | `pedidos.status` é TEXT com **FK para `kanban_coluna.chave`** (colunas dinâmicas, flags semânticas) | `server/supabase/init.sql:385-414`, `shared/types/order.ts:22-43` |
| `preorders.status` com enum próprio (pending/confirmed/…) | ❌ divergente | Status de pedido é kanban-driven; um enum paralelo criaria **duas fontes de verdade** e quebraria webhook/automação de entrega. **Decisão: encomenda usa o status do pedido (kanban)** | `server/api/admin/orders/[id]/status.put.ts:37-45` |
| Estoque com validação/baixa a preservar | ❌ divergente | **Não existe baixa de estoque server-side**; `estoque_atual` é informativo e o gate de venda é `disponivel`. Nada a alterar → compatibilidade garantida por não tocar | `server/api/orders/create.post.ts` (sem referência a estoque), `catalogPage.ts:23` |
| Carrinho com stores (Pinia) | ✅ confirmado | `useCartStore` (setup store), `CartItem { cart_key, produto_id, preco, quantidade, opcoes? }`; persistência localStorage validada com zod + TTL 24h | `app/stores/cart.ts:16-28`, `app/utils/cartStorage.ts` |
| Checkout revalida no servidor | ✅ confirmado | `/api/orders/create` (zod + sessão + loja aberta + raio + preços relidos do banco). É **aqui** que a reserva de encomenda entra | `server/api/orders/create.post.ts` |
| `useNotification` | ✅ confirmado | `const { notify, confirm } = useNotification()`; `notify.success(title, message?)` etc. | `app/composables/useNotification.ts:82-164` |
| Upload S3 | ✅ confirmado | `useImageUpload().uploadImage(file, bucket)` → `/api/admin/upload` → `server/utils/s3/*` | `app/composables/useImageUpload.ts`, `server/utils/s3/upload.ts` |
| Supabase server-side | ✅ confirmado | Rotas públicas usam `serverSupabaseServiceRole` (RLS bypass); páginas admin usam `useSupabaseClient()` direto sob RLS (`is_staff()` TO authenticated, migration 072) | `server/api/orders/create.post.ts:82`, `072_policies_escopo_authenticated.sql` |
| Migrations com convenção | ✅ confirmado | `server/supabase/migrations/NNN_descricao.sql`, cabeçalho de contexto, `BEGIN/COMMIT`, rollback documentado; última é 077 → nova é **078** | `server/supabase/migrations/` |
| RPC transacional como padrão | ✅ confirmado | Precedentes: `claim_cupom_atomico` (056), `create_integration_order` (073) com `SECURITY INVOKER SET search_path` | `073_create_integration_order_rpc.sql` |
| `SELECT COUNT(*) … FOR UPDATE` na RPC | ❌ divergente | **SQL inválido** (agregado não aceita `FOR UPDATE`). Substituído por `pg_advisory_xact_lock` por (produto, data) + `SUM(quantidade)` | ver §8 |
| `capacity_consumed INTEGER DEFAULT 1` | ❌ divergente | Capacidade contada por linha ignora `quantidade NUMERIC` (produtos por kg). **Consumo de capacidade = quantity; `daily_capacity` é NUMERIC** e `capacity_consumed` foi removido (YAGNI) | ver §4 |
| `unit` dentro de `preorder_config` | ❌ divergente | `produtos.unidade_medida` já existe (enum). Duplicar no config viola DRY. `preorders.unit` permanece só como **snapshot** no ato da compra (padrão `nome_produto_congelado`) | `init.sql:289` |
| `POST /api/preorders/reserve` público | ❌ divergente | Reserva avulsa criaria `preorders` sem pedido. A reserva acontece **exclusivamente dentro do checkout** (`/api/orders/create`) via RPC. Endpoint público de reserva removido | ver §7/§11 |
| Sidebar admin | ✅ confirmado | `navItems` em `app/layouts/admin.vue:211-217`; ícones importados de `@lucide/vue`; "Vendas" = `/admin/orders` (`DollarSign`) | `app/layouts/admin.vue:211-217` |
| Grade semanal de funcionamento | ✅ confirmado | `loja.config_horarios` — `Record<'0'..'6', { aberto, inicio, fim }>`, editada em `/admin/settings` | `shared/types/store.ts:16-23`, `app/pages/admin/settings/index.vue:918-957` |
| Webhook de status | ✅ confirmado | `PUT /api/admin/orders/[id]/status` → valida `kanban_coluna` → `dispatchWebhook('pedido.status_alterado', …)` (outbox transacional). Encomendas **herdam automaticamente** ao usar o mesmo endpoint | `status.put.ts:88-95`, `server/utils/webhook/dispatch.ts` |
| Fuso horário de "hoje" | ✅ confirmado | Operação é America/Sao_Paulo (UTC-3 fixo); util canônico em `shared/utils/datetime.ts` | `shared/utils/datetime.ts:15` |
| Catálogo | ✅ confirmado | RPC `catalog_products_page` (keyset) — precisa ser **recriada** para retornar `product_type`/`preorder_config` | `init.sql:1246-1333`, `server/utils/catalog/catalogPage.ts` |

### Decisões de arquitetura alteradas (e porquê)

1. **Sem V-Calendar.** O repo não usa nenhuma lib de UI externa (só `@lucide/vue` para ícones); todos os componentes são próprios sobre tokens Tailwind (`app/components/ui/*`). Os dois calendários necessários são simples de construir e ficam 100% consistentes com dark mode/SSR/design:
   - Cliente: `PreorderDatePicker.vue` (grade mensal custom que desabilita datas inválidas — dados vêm de `GET /api/preorders/calendar`).
   - Admin: **quadro semanal estilo kanban** (colunas = dias abertos em `loja.config_horarios`), reusando o padrão visual/CSS de `app/pages/admin/orders/index.vue` (cards, `headerStyle`, `kanban-board-wrapper`).
2. **Status da encomenda = status do pedido (kanban).** `preorders` não tem coluna `status`. A troca de status na página de Encomendas usa o MESMO `PUT /api/admin/orders/[id]/status` do kanban → mesmo webhook `pedido.status_alterado`, mesma automação de entrega, zero duplicação (requisito do usuário atendido por construção). Capacidade ignora pedidos em colunas `is_cancelled` (`shared/types/order.ts:33`).
3. **Atomicidade via `pg_advisory_xact_lock` + `SUM(quantidade)`** dentro da RPC `reserve_preorders(p_order_id, p_items jsonb)` — serializa reservas por `(product_id, delivery_date)` sem bloquear o produto inteiro; o `COUNT(*) FOR UPDATE` original era inválido.
4. **Reserva embutida no checkout.** `/api/orders/create` valida (soft) antes de criar o pedido e chama a RPC após criar; se a RPC falhar (capacidade esgotada na corrida), o pedido recém-criado é **deletado (compensação; CASCADE limpa itens/preorders)** e o cliente recebe 409 amigável. O banco continua sendo a única autoridade anti-overbooking.
5. **Regras puras em `shared/utils/preorders.ts`** (mesmo padrão de `shared/utils/promotions.ts`, usado por front e back); lógica com banco em `server/utils/preorders/`. O front usa as regras só como feedback — o back é a autoridade (§16 original preservado).
6. **Dias elegíveis para entrega = dias com loja aberta** na grade `config_horarios` (regra nova, pedida pelo usuário): tanto o calendário do cliente quanto o quadro semanal do admin seguem os dias `aberto: true` definidos em `/admin/settings`.
7. **Fluxos paralelos protegidos:** integração WhatsApp (`items.post`/`items.put`/`orders.post`) e PDV admin (`/api/admin/orders/create`) passam a rejeitar produto `product_type='preorder'` (não têm coleta de data); produtos `'both'` seguem vendáveis como venda imediata. Sem isso haveria overbooking/encomenda sem data por fora do fluxo.

### Dependências e pendências resolvidas

- **Nenhuma dependência nova** (V-Calendar descartado).
- Migration **078** é aditiva e inerte para o frontend atual (colunas novas com DEFAULT, tabelas novas, RPCs) — pode ser aplicada em produção antes do deploy do frontend.
- `app/types/database.types.ts` deve ser estendido manualmente (as migrations 076/077 pendentes impedem regeneração completa via CLI remoto sem drift).
- ⚠️ resolvidos: sem `⚠️ A CONFIRMAR` pendente nas partes implementadas.

### Correções a aplicar durante a implementação

| Arquivo | Problema | Correção |
|---|---|---|
| `app/components/ui/ProductDetailsModal.vue:124` | `foreignTable` (opção deprecada do supabase-js v2; o resto do repo usa `referencedTable`, ex. `admin/products/[id].vue:407`) | Trocar por `referencedTable` |
| `app/pages/catalog/checkout.vue:98` | `console.error(err)` — repo não usa console no client (feedback é `useNotification`) | Remover (o erro já vira `sessionErrorMsg`) |
| `app/stores/cart.ts:145-146` | Comentário quebrado/meio em inglês ("… em outra / The page uses `useStore()` directly…") | Reescrever o comentário |

---

## 0. Glossário de tradução (PT → EN)

| Português (origem) | Inglês (usar) |
|---|---|
| Sistema de Encomendas | Pre-Order System |
| encomenda / encomendas | `preorder` / `preorders` |
| tipo de venda | `product_type` — `'stock'` / `'preorder'` / `'both'` |
| configuração de encomenda | `preorder_config` |
| tipo de agendamento | `scheduling_type` — `'made_to_order'` / `'in_person_service'` |
| quantidade mínima / máxima | `min_quantity` / `max_quantity` |
| capacidade diária | `daily_capacity` |
| dias de antecedência mínima / máxima | `min_lead_days` / `max_lead_days` |
| data de entrega | `delivery_date` |
| vagas restantes | `remaining_capacity` |
| datas bloqueadas / feriados | `preorder_blocked_dates` |

> Tabelas existentes (`produtos`, `pedidos`) mantêm o nome. Colunas novas nelas seguem inglês.

---

## 1. Objetivo

Implementar o Pre-Order System coexistindo com a venda imediata **sem quebrar nada**: produtos passam a ser `stock`, `preorder` ou `both`. Encomenda = pedido normal (`pedidos`) + linhas em `preorders` (data de entrega, quantidade, snapshot de regras), com capacidade diária garantida **atomicamente no PostgreSQL**.

## 2. Guardrails

- Zero `any`; todo JSONB tem interface (`PreorderConfig`, `PreorderRulesSnapshot`).
- DRY/KISS/YAGNI/SOLID/SoC; regra de negócio centralizada (`shared/utils/preorders.ts` + `server/utils/preorders/`).
- SSR-safe, dark mode, responsivo; feedback via `useNotification`; upload só S3 (não há upload novo neste escopo).
- Backend é a autoridade; frontend só antecipa feedback.

## 3. Investigação prévia

Concluída — ver **Investigation Report** acima.

## 4. Modelagem de dados (migration `server/supabase/migrations/078_preorders.sql`)

```sql
ALTER TABLE public.produtos
  ADD COLUMN product_type text NOT NULL DEFAULT 'stock'
    CONSTRAINT produtos_product_type_check CHECK (product_type IN ('stock','preorder','both')),
  ADD COLUMN preorder_config jsonb;
```

`preorder_config` (JSONB, interface `PreorderConfig`):

```json
{
  "scheduling_type": "made_to_order",
  "min_quantity": 2,
  "max_quantity": 10,
  "daily_capacity": 20,
  "min_lead_days": 2,
  "max_lead_days": 30
}
```

```sql
CREATE TABLE public.preorders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES public.produtos(id),
  delivery_date date NOT NULL,
  quantity      numeric NOT NULL CHECK (quantity > 0),
  unit          text NOT NULL,              -- snapshot de produtos.unidade_medida
  rules_snapshot jsonb NOT NULL,            -- PreorderRulesSnapshot (regras vigentes na compra)
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- Sem coluna status: o ciclo de vida é o do pedido (kanban_coluna via pedidos.status).

CREATE TABLE public.preorder_blocked_dates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL,
  product_id   uuid REFERENCES public.produtos(id) ON DELETE CASCADE,  -- NULL = global
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- UNIQUE parcial: (blocked_date) global e (blocked_date, product_id) por produto
-- (UNIQUE simples não deduplica NULL).
```

Índices: `preorders (product_id, delivery_date)` (capacidade), `preorders (delivery_date)` (quadro semanal), `preorders (order_id)`; `preorder_blocked_dates (blocked_date)`. `COMMENT ON` em tudo. Bloco `down` comentado no fim da migration (DROPs reversos + restauração da RPC do catálogo — padrão do repo).

**RLS:** RLS ON nas duas tabelas; policies `TO authenticated` com `is_staff()` (leitura/gestão pelo painel via `useSupabaseClient`, como o kanban); cliente anônimo não acessa (rotas públicas usam service role, arquitetura vigente — `072_policies_escopo_authenticated.sql`).

**Catálogo:** a mesma migration recria `catalog_products_page` adicionando `product_type` e `preorder_config` ao `RETURNS TABLE` (o frontend do catálogo precisa saber o tipo do produto). `init.sql` é atualizado em consolidação (padrão do repo).

## 5. Migrations

Uma única migration `078_preorders.sql`, reversível, com contexto no cabeçalho (padrão 073), `BEGIN/COMMIT`, GRANT/REVOKE das RPCs novas e verificação pós-aplicação comentada.

## 6. Tipos compartilhados — `shared/types/preorder.ts`

```ts
export const PRODUCT_TYPES = ['stock', 'preorder', 'both'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export type SchedulingType = 'made_to_order' | 'in_person_service'

export interface PreorderConfig {
  scheduling_type: SchedulingType
  min_quantity: number
  max_quantity: number
  daily_capacity: number
  min_lead_days: number
  max_lead_days: number
}

/** Snapshot persistido em preorders.rules_snapshot (config + preço vigente). */
export interface PreorderRulesSnapshot extends PreorderConfig {
  unit_price: number
}

export interface AvailabilityResult {
  available: boolean
  remaining_capacity: number
}

export type CalendarDayStatus = 'available' | 'full' | 'blocked' | 'closed' | 'out_of_lead_window'

export interface CalendarDay {
  date: string // YYYY-MM-DD
  status: CalendarDayStatus
  remaining_capacity: number
}
```

`ProductRow`/`CatalogProductItem` (em `shared/types/product.ts`) ganham `product_type: ProductType` e `preorder_config: PreorderConfig | null`. `database.types.ts` estendido em sincronia.

## 7. Backend / APIs

```
shared/utils/preorders.ts            # regras puras: validateQuantity, validateLeadTime,
                                     #   isDayOpen (config_horarios), clampDateWindow, spToday
server/utils/preorders/availability.ts  # getAvailability / buildCalendar (Supabase + regras puras)
server/api/preorders/availability.get.ts  # GET ?product_id&date → AvailabilityResult
server/api/preorders/calendar.get.ts      # GET ?product_id&month=YYYY-MM → CalendarDay[]
```

- Rotas finas (parse zod → util → resposta). Ambas públicas via `serverSupabaseServiceRole` + rate-limit global existente.
- `calendar` marca cada dia do mês: `closed` (dia fechado na grade `config_horarios`), `out_of_lead_window`, `blocked` (`preorder_blocked_dates` global ou do produto), `full` (SUM(quantity) ≥ daily_capacity, ignorando pedidos em coluna `is_cancelled`), senão `available` com `remaining_capacity`.
- **Não existe** endpoint público de reserva — a reserva é feita pelo checkout (§11).

## 8. Concorrência — atomicidade no banco (CRÍTICO)

RPC criada na migration 078:

```sql
CREATE FUNCTION public.reserve_preorders(p_order_id uuid, p_items jsonb)
RETURNS void  LANGUAGE plpgsql  SECURITY INVOKER
SET search_path = public, pg_catalog AS $$
DECLARE v_item jsonb; v_cfg jsonb; v_capacity numeric; v_used numeric; …
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- 1. Serializa por (produto, data): dois checkouts simultâneos do mesmo dia
    --    entram em fila; produtos/dias diferentes não se bloqueiam.
    PERFORM pg_advisory_xact_lock(
      hashtextextended((v_item->>'product_id') || ':' || (v_item->>'delivery_date'), 0));

    -- 2. Regras relidas do banco (nunca do cliente).
    SELECT preorder_config INTO v_cfg FROM produtos WHERE id = …;
    v_capacity := (v_cfg->>'daily_capacity')::numeric;

    -- 3. Consumo atual: SUM(quantity) das encomendas não-canceladas do dia.
    SELECT COALESCE(SUM(pr.quantity), 0) INTO v_used
    FROM preorders pr
    JOIN pedidos pe ON pe.id = pr.order_id
    JOIN kanban_coluna kc ON kc.chave = pe.status
    WHERE pr.product_id = … AND pr.delivery_date = … AND NOT kc.is_cancelled;

    IF v_used + (v_item->>'quantity')::numeric > v_capacity THEN
      RAISE EXCEPTION 'PREORDER_CAPACITY_EXCEEDED' USING ERRCODE = 'check_violation', DETAIL = …;
    END IF;

    INSERT INTO preorders (order_id, product_id, delivery_date, quantity, unit, rules_snapshot) VALUES (…);
  END LOOP;
END $$;
```

A função também revalida min/max quantity, lead window, dia bloqueado e `product_type` — defesa em profundidade total no banco. O Nuxt apenas traduz `PREORDER_CAPACITY_EXCEEDED` (e demais `PREORDER_*`) em 409/400 amigável. **Overbooking é impossível por construção** (lock transacional + checagem + insert na mesma transação).

## 9. Componente — `app/components/catalog/PreorderDatePicker.vue`

Grade mensal própria (sem lib): consome `GET /api/preorders/calendar`, navega entre meses dentro da janela de antecedência, desabilita `closed`/`blocked`/`full`/`out_of_lead_window`/passado e mostra vagas restantes no dia selecionado. Tokens do design system, dark mode, SSR-safe (`ClientOnly` não necessário — é puro render + fetch client-side no modal).

## 10. Carrinho

- `CartItem` ganha `preorder?: { delivery_date: string }` e o `cart_key` passa a incluir a data (`produto::opcoes::data`) — o mesmo produto em datas diferentes são itens distintos.
- Fluxo de adicionar (no `ProductDetailsModal`, modo compra): para `preorder`/`both` em modo encomenda → quantidade (validada contra min/max) → `PreorderDatePicker` → checagem `availability` → adiciona. Item inválido nunca entra no carrinho.
- `cartStorage.ts`: schema zod estendido (campo opcional `preorder`) com bump de `SCHEMA_VERSION` → carrinhos antigos são descartados com segurança.

## 11. Checkout

`/api/orders/create`:
1. Schema aceita `itens[].delivery_date?` (só para produtos preorder/both em modo encomenda).
2. Pré-validação server-side (regras puras + leitura do banco): produto é encomendável, quantidade, janela, dia aberto/bloqueado — falha vira 400 antes de criar qualquer coisa.
3. Pedido criado como hoje (zero mudança no fluxo de estoque).
4. **`reserve_preorders(pedido.id, items)`** via RPC. Falha → **DELETE do pedido recém-criado** (CASCADE remove itens/opções/preorders) + rollback best-effort do cupom (padrão já existente no arquivo) + 409 "capacidade esgotada".
5. Webhook `pedido.criado` inalterado (payload passa a incluir bloco `preorders` para o consumidor n8n).
6. Guard: produto `product_type='preorder'` sem `delivery_date` → 400 (nunca vende encomenda como pronta-entrega).

## 12. Painel administrativo — página **Encomendas**

- **Sidebar** (`app/layouts/admin.vue`): novo item `{ path: '/admin/preorders', icon: CalendarDays, label: 'Encomendas' }` **imediatamente abaixo de "Vendas"**, ícone de calendário da MESMA lib já usada (`@lucide/vue`).
- **Página** `app/pages/admin/preorders/index.vue` (layout `admin`):
  - **Quadro semanal estilo kanban** — colunas = **dias da semana com `aberto: true` em `loja.config_horarios`** (regra criada nesta feature; a grade segue o que está definido em `/admin/settings`). Navegação semana anterior/próxima; coluna do dia atual destacada.
  - Cards de encomenda no padrão visual dos cards do kanban de vendas (`admin/orders/index.vue`): tipo entrega, valor, cliente (abre `AdminCustomerInfoModal`), nº do pedido (abre nota térmica), produto + quantidade + unidade, badge de vagas do dia.
  - **Status**: seletor com as colunas do kanban no card → chama o MESMO `PUT /api/admin/orders/[id]/status` → **mesmo webhook `pedido.status_alterado`** e mesmas automações (requisito 5 atendido por construção).
  - Filtros: produto, cliente (busca), status; a dimensão "data" é o próprio quadro semanal.
  - Gestão de **datas bloqueadas/feriados**: modal CRUD sobre `preorder_blocked_dates` (global ou por produto) via `useSupabaseClient` sob RLS staff.
  - Capacidade: cabeçalho de cada dia mostra `reservado/capacidade` agregado por produto filtrado.
  - Dark mode + `useNotification` + responsivo (scroll horizontal como o kanban).

## 13. Cadastro de produto (`app/pages/admin/products/[id].vue`)

No card "Informações Básicas", **antes da Descrição**: seletor **"Tipo de venda"** (`UiSelect`): Venda imediata / Encomenda / Ambos. Se `preorder`/`both`, aparece card "Configuração de Encomenda" (min/max quantidade, capacidade diária, antecedência mín/máx em dias) validado com zod e gravado em `product_type`/`preorder_config` no mesmo `save()` existente.

## 14. Catálogo

- `stock`: comportamento atual intacto.
- `preorder`: CTA vira **"ENCOMENDAR"** e sempre abre o modal (fluxo de data obrigatório); botão de + direto no card não se aplica.
- `both`: card mantém "Adicionar" (compra imediata, fluxo atual) e o modal de detalhes oferece a alternativa **"Encomendar para uma data"** (toggle de modo dentro do modal) — sem ambiguidade e sem quebrar o fluxo existente.

## 15. Pedidos

Encomenda persiste `delivery_date`, `quantity`, `unit` (snapshot) e `rules_snapshot` em `preorders`, ligadas ao `pedidos` normal. Nota térmica/da tabela mostram a data de entrega quando presente.

## 16. Validações

Regras puras em `shared/utils/preorders.ts` (única fonte; front reusa como feedback). Autoridade final: RPC no PostgreSQL (§8). Erros exibidos via `useNotification` (sucesso, capacidade esgotada, data inválida, quantidade inválida).

## 17. Fluxos paralelos (compatibilidade)

- Integração WhatsApp (`/api/integration/v1/cart/items.*`, `orders.post`): rejeita `product_type='preorder'` com mensagem clara para o agente; `'both'` segue como venda imediata.
- PDV admin (`/api/admin/orders/create`): idem.
- Kanban de vendas, arquivamento, entrega, dashboard: intocados — encomenda é um pedido comum para todos eles.

## 18. Critérios de aceite

Estoque/venda imediata intactos · encomenda ponta-a-ponta (catálogo → carrinho → checkout → painel) · **teste real de concorrência: N requisições paralelas à RPC nunca ultrapassam `daily_capacity`** · quadro semanal segue dias de `/admin/settings` · webhook de status disparado nas mudanças de status de encomenda · SSR · dark mode · responsivo · tipagem estrita · `pnpm lint` e `nuxi typecheck` **zero erros/zero warnings**.

## 19. Refatoração final

Code review pós-implementação: eliminar duplicações, código morto, imports/tipos redundantes; abstrações só com ganho real.

---

## Resultado esperado

Suporte simultâneo a estoque e encomendas com regras por produto via JSONB, capacidade diária garantida por transação atômica no PostgreSQL, painel com visão semanal estilo kanban ancorada na grade de funcionamento da loja, webhooks/automação reutilizados sem duplicação e código idiomático ao repo — tudo com nomenclatura nova em inglês.
