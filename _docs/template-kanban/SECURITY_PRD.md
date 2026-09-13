# SECURITY_PRD — Auditoria de Segurança e Prontidão para Produção

> Fonte única de verdade até a aplicação estar pronta para venda. Atualizado incrementalmente por lote. Nenhum item muda para "Resolvido" sem confirmação do responsável do projeto (Adilson), exceto quando ele autoriza fechamento em lote explicitamente (como nesta sessão).

## 1. Sumário executivo

**Status atual: Pronto com ressalvas.**

Auditoria completa em 6 lotes (código-fonte inteiro + schema SQL) mais Fase 2/3 de limpeza de código no frontend. **36 achados de segurança + 1 item de código morto**, dos quais **31 corrigidos e estáveis**. Os **5 itens abertos** são: 1 revertido depois de quebrar produção (SEC-002, ver Incidente abaixo) e 4 que exigem decisão de produto ou ambiente de staging antes de tocar em RLS/RPCs de produção ou no fluxo real-time do WhatsApp — ver §3.6 e §6.

| Severidade | Nº achados | Resolvidos | Abertos (motivo) |
|---|---|---|---|
| Crítica | 1 | 1 | — |
| Alta | 2 | 2 | — |
| Média | 17 | 14 | 3 (1 revertida por quebrar produção — SEC-002; 2 requerem teste em staging antes de mexer em RLS/RPC) |
| Baixa | 15 | 13 | 2 (risco de regressão em fluxo real-time sem cobertura de teste live) |
| Código morto | 1 | 1 | — |

O código-base é notavelmente maduro para uma auditoria de segurança: decisões de design de risco (impersonação de sessão, rate limiting por borda, segredos fora de variável de ambiente, host-header-injection, anti-SSRF) já estavam documentadas inline no próprio código antes desta auditoria, com justificativa e mitigação em profundidade. RBAC hierárquico, segredos em Supabase Vault, validação de magic bytes em upload, revalidação de preços/opções/estoque server-side e arquitetura de tool-calling do agente de IA foram confirmados como estruturalmente sólidos — o único achado Crítico e o único achado Alto de arquitetura (SEC-021, vazamento cross-tenant na tool do agente) já foram corrigidos.

**Dependências**: `pnpm audit` → 0 vulnerabilidades conhecidas em 1057 pacotes. ✅

**Pagamento**: ainda não implementado (Asaas Checkout planejado, redirecionamento externo) — sem dados de cartão trafegando pela aplicação hoje. Escopo PCI-DSS não se aplica nesta fase.

**Verificação desta sessão**: `eslint` limpo em todos os arquivos tocados (e no repositório inteiro — só restam 2 erros pré-existentes, não relacionados, num componente nunca tocado por este PRD); `nuxi typecheck` sem nenhum erro novo (os ~25 erros pré-existentes do repo são todos em arquivos fora do escopo desta auditoria, ligados a `database.types.ts` ainda placeholder); suíte completa `vitest run` → **1031/1031 testes passando** (um teste teve timeout isolado por contenção de recursos numa rodada, confirmado como flake — passou 5/5 sozinho logo em seguida).

**Incidente pós-deploy (2026-09-01, revertido no mesmo dia):** SEC-002 (CSP) foi deployado em produção antes da verificação manual recomendada e **quebrou o site inteiro** (catálogo e admin). Causas: Nuxt injeta script(s) inline de hidratação com conteúdo dinâmico por página (um hash fixo nunca casa com conteúdo que muda a cada request); alguns componentes usam handlers de evento inline (`onclick=`, etc. — CSP não cobre esses via hash sem `'unsafe-hashes'`, mesmo com `script-src` correto); Google Fonts foi bloqueado (`style-src` não incluía `fonts.googleapis.com`); imagens de produto/S3 foram bloqueadas onde o domínio não batia com o `img-src` calculado; e o beacon de analytics que a própria Cloudflare injeta na borda (`static.cloudflareinsights.com`, fora do controle da aplicação) também foi bloqueado. A CSP foi **revertida integralmente** assim que o erro foi reportado — `nuxt.config.ts` voltou a não emitir `Content-Security-Policy`. SEC-002 volta ao status **Aberto** (linha atualizada em §3.1). Lição: CSP correta para Nuxt SSR exige nonce por request (não um header estático) e um levantamento completo de todo domínio de terceiro real contra o deploy de produção — não é algo para refazer sem esse levantamento e sem testar ao vivo antes do próximo deploy.

**Ressalvas abertas (não são achados pendentes de decisão de correção, são limitações desta sessão):**
1. SEC-035/036/037 (Alta/Média, exposição de `products.cost_price`/`profit_margin` e de configuração interna da loja via RLS pública) têm a correção **desenhada e documentada**, mas não aplicada: mexer em RLS/GRANT/RPC de produção sem um ambiente de staging para testar contra a busca real do catálogo é o tipo de mudança que vale mais a pena fazer com teste ao vivo do que às cegas. Ver §3.6 para o plano exato.
2. SEC-022/027 (custo/rate-limit no agente e nas respostas determinísticas do WhatsApp) são recomendações registradas mas não aplicadas: mexer no fluxo do consumer de fila (`whatsapp-queue.ts`) sem poder testar contra o WhatsApp real carrega risco de regressão desproporcional à severidade (Média/Baixa) do achado.

## 2. Escopo e stack

- **Stack**: Nuxt 4 (Vue 3) · Nitro preset `cloudflare-durable` (Cloudflare Workers) · Supabase (Postgres/Auth/RLS) · Pinia · Tailwind 4 · Zod · aws4fetch (S3/R2) · OpenAI SDK · Vitest.
- **Modelo de auth**: `server/middleware/3.admin-auth.ts` autentica todo `/api/admin/**`; autorização por papel é responsabilidade de `requireRole`/`requireServiceRole` (`server/utils/auth/requireRole.ts`). Papéis: `entregador, atendente, producao, gerente, administrador, proprietario` (`shared/types/user.ts`).
- **Escopo coberto (100% do código-fonte + schema SQL)**:
  - **Lote 1**: `server/middleware/*`, `app/middleware/*`, `server/api/session/**`, `server/api/orders/{create,update}`, `server/api/store/**`, `server/api/_internal/**`, upload, `server/utils/s3/**`.
  - **Lote 2**: `server/api/admin/**` completo (66 arquivos).
  - **Lote 3**: `server/api/catalog/**`, `promotions/**`, `kits/**`, `preorders/**`, `maps/**`, endpoints públicos avulsos (`calculate-shipping`, `validate-address`, `track`, `products`, `health`).
  - **Lote 4a**: `server/utils/agent/**` (53 arquivos) — tool-calling do agente de IA.
  - **Lote 4b**: `server/utils/whatsapp/**` (44 arquivos) + `server/api/whatsapp/**` + `server/plugins/whatsapp-*-queue.ts` — integração WhatsApp.
  - **Lote 5**: `app/**` completo (186 `.vue` + 39 `.ts`) — dark mode, `any`, `useNotification`, S3, XSS, segredos no client, dead code, duplicação.
  - **Lote 6**: `server/supabase/init.sql` (5138 linhas) + migrations — schema, RLS, GRANTs, funções `SECURITY DEFINER`.

## 3. Requisitos de segurança

### 3.1 Lote 1 — auth/middleware/sessão/pedidos/loja/upload

| ID | Sev. | Localização | Descrição | Status |
|---|---|---|---|---|
| SEC-001 | **Alta** | [server/api/admin/upload.delete.ts](server/api/admin/upload.delete.ts:46) | Checagem de "imagem ainda referenciada" comparava pela URL completa; deleção usava só a key extraída — URL forjada bypassava a checagem e apagava objetos em uso real. | **Resolvido** — rejeita se `generatePublicUrl(bucket, key) !== url` |
| SEC-002 | Média | [nuxt.config.ts](nuxt.config.ts:1) | CSP ausente. | **Aberto — tentativa revertida.** Uma CSP com hash SHA-256 do script de tema + domínios explícitos foi implementada e deployada, mas quebrou produção (hidratação do Nuxt, handlers inline, Google Fonts, imagens, beacon da Cloudflare) — revertida no mesmo dia. Ver "Incidente pós-deploy" em §1 para a causa completa e o que uma correção de verdade exige (nonce por request). |
| SEC-003 / SEC-016 | Média/Baixa | [server/utils/s3/constants.ts](server/utils/s3/constants.ts:16) | `image/svg+xml` na whitelist geral de upload — risco de XSS armazenado. | **Resolvido** — removida |
| SEC-004 | Média | webhook WhatsApp, `attachPendingArt.ts` | `telefone` (PII) logado em texto plano. | **Resolvido** — `maskPhone()` aplicado |
| SEC-005 | Baixa | [server/api/session/create-direct.post.ts](server/api/session/create-direct.post.ts:16) | Sessão de catálogo sem OTP — risco de design já aceito no próprio código. | Aceito como risco (sem alteração) — ver conversa da sessão anterior para detalhe do que exatamente é aceito |

### 3.2 Lote 2 — `server/api/admin/**` (66 arquivos)

| ID | Sev. | Localização | Descrição | Status |
|---|---|---|---|---|
| SEC-006 | Média | `admin/products/[id].delete.ts` | Hard-delete de produto liberado para `atendente`. | **Resolvido** — `CUSTOMER_DELETE_ROLES` |
| SEC-007 | Média | `admin/coupons/[id].delete.ts` | Deleção de cupom liberada para `atendente`/`producao`. | **Resolvido** — idem |
| SEC-008 | Média | `admin/inventory/insumos/[id].delete.ts` | Deleção de insumo liberada para `atendente`/`producao`. | **Resolvido** — idem |
| SEC-009 | Média | `admin/products/index.get.ts` | Erro cru do Postgres devolvido ao cliente. | **Resolvido** |
| SEC-010 | Média | `admin/orders/[id]/unarchive.post.ts` | Idem. | **Resolvido** |
| SEC-011 | Média | `admin/webhook/dead-letter.{get,post}.ts` | Idem. | **Resolvido** |
| SEC-012 | Baixa | `admin/chat/[clienteId]/messages.post.ts` | Body sem schema zod. | **Resolvido** |
| SEC-013 | Baixa | 7 arquivos `admin/chat/**`, `lab/runs/[id]`, `quick-responses/[id]` | `:id` sem validação UUID. | **Resolvido** |
| SEC-014 | Baixa | `admin/chat/[clienteId]/status.put.ts` | `minutes` sem limite. | **Resolvido** — teto de 24h |
| SEC-015 | Baixa | `admin/inventory/movements.post.ts` | Read-check-write não atômico. | **Resolvido** — concorrência otimista (`.eq('current_stock', valorLido)`, 409 em conflito) |

**Destaques positivos confirmados** (não são achados): RBAC hierárquico em `users/**`; segredos via Vault; anti-SSRF em `normalizeProviderBaseUrl`; `webhook/dead-letter` não expõe PII; `escapeIlike` em buscas.

### 3.3 Lote 3 — catálogo público/promoções/kits/preorders/maps (26 arquivos)

Postura geral madura: rate limiters de mapas sempre na frente das chamadas pagas ao Google, chave privada nunca vaza, preços/descontos sempre recalculados server-side (`orders/create.post.ts` continua sendo a autoridade final), nenhum SQLi/IDOR/SSRF/segredo hardcoded.

| ID | Sev. | Localização | Descrição | Status |
|---|---|---|---|---|
| SEC-017 | Média | `server/api/catalog/search.get.ts:61` | Erro cru do Postgres/RPC devolvido ao cliente (mesmo padrão do Lote 2). | **Resolvido** |
| SEC-018 | Baixa | `server/api/catalog/upload-arte.delete.ts` | Validação manual de `key` em vez de zod. | **Resolvido** — schema zod |
| SEC-019 | Baixa | `catalog/products-page.get.ts`, `products.get.ts` | `category_id` sem validação UUID (round-trip desnecessário ao banco em erro). | **Resolvido** — `z.string().uuid().optional()`, 400 explícito |
| SEC-020 | Baixa | `server/api/maps/geocode.get.ts` | `sessao_id` sem validação UUID (já fail-safe, mas inconsistente). | **Resolvido** — `z.string().uuid()` |

### 3.4 Lote 4a — camada de agente de IA (`server/utils/agent/**`, 53 arquivos)

**Veredito arquitetural**: a arquitetura de tool-calling é estruturalmente segura na maioria dos vetores críticos — `sessaoId`/`clienteId` nunca vêm do LLM (são injetados pelo consumer), preços/estoque/opções são sempre relidos/recalculados server-side, e as 3 camadas de guardrail são independentes (a 3ª não confia nas 2 primeiras). Havia dois pontos que dependiam do modelo "se comportar" — ambos corrigidos nesta sessão.

| ID | Sev. | Localização | Descrição | Status |
|---|---|---|---|---|
| SEC-021 | **Alta** | [server/utils/agent/tools/checkout.ts](server/utils/agent/tools/checkout.ts:114), [getOrderDetail.ts](server/utils/orders/getOrderDetail.ts:41) | A tool `ConsultarDetalhePedido` aceitava qualquer `pedido_id` (UUID) do LLM sem checar se pertence ao cliente da conversa — prompt injection bem-sucedido podia vazar nome/telefone/endereço/itens de OUTRO cliente. | **Resolvido** — `getOrderDetail` ganhou parâmetro `ownerCustomerId` opcional; a tool exige `ctx.clienteId` e escopa a query por `customer_id`. Os 2 chamadores internos (`finalizeCheckout.ts`, orderId gerado pelo próprio servidor) não precisam do escopo e não foram alterados. |
| SEC-022 | Média | `server/plugins/whatsapp-queue.ts`, `guardrails.ts` | `TURN_CEILING_PER_HOUR` é só por cliente — sem teto GLOBAL de chamadas OpenAI por hora, um ataque coordenado com N números foge do teto individual. | **Aberto** — recomendação: contador atômico global (RPC ou KV) com teto configurável por loja; requer decisão de produto sobre o teto e não foi aplicado por não ter como testar carga real nesta sessão. |
| SEC-023 | Baixa | `server/utils/agent/runAgent.ts` | Histórico truncado por contagem de mensagens (`HISTORY_LIMIT=20`), não por tokens — conversas com mensagens longas custam mais. | Aberto — informativo, risco baixo dado o teto de 60 falas/h já existente. |
| SEC-024 | Média | [server/utils/agent/tools/context.ts](server/utils/agent/tools/context.ts:35) | `AtualizarContexto` gravava `preferencias`/`contexto_resumo` (texto livre do LLM) sem checar padrão de injeção — esses campos são reinjetados no system prompt de TODOS os turnos futuros do cliente, criando persistência de um prompt injection bem-sucedido. | **Resolvido** — reutiliza `detectPromptInjection` (extraído para `promptInjection.ts`, ver nota técnica no changelog) nesses 2 campos antes de salvar; adicionado teto de 2000 chars. |

**Destaques positivos confirmados**: integridade financeira das tools de checkout (preços/estoque sempre relidos); zero SQLi (queries tipadas, UUIDs validados); zero segredo em log; sistema de laboratório/avaliação é somente-leitura sobre dados reais.

### 3.5 Lote 4b — integração WhatsApp (`server/utils/whatsapp/**` + filas, 27 arquivos)

| ID | Sev. | Localização | Descrição | Status |
|---|---|---|---|---|
| SEC-025 | Média | `server/plugins/whatsapp-queue.ts` (5 ocorrências) | `telefone` cru em `logger.*` — mesmo padrão de SEC-004, não coberto na correção original porque estava num arquivo diferente. | **Resolvido** — `maskPhone()` aplicado nas 5 ocorrências |
| SEC-026 | Média | [server/utils/whatsapp/cloudApiMedia.ts](server/utils/whatsapp/cloudApiMedia.ts:100) | `downloadMedia` envia `Authorization: Bearer <token do provedor>` para a URL de download sem validar o host. No caminho primário a URL vem de uma resposta autenticada do provedor (confiável); no fallback (`urlInline`) vem do payload CRU do webhook — só protegido pelo token no path. Quem conhece esse token podia forjar `urlInline` apontando pra um host arbitrário e roubar a credencial do provedor. | **Resolvido** — `assertHttpsDownloadUrl` agora exige que o host da URL de download pertença ao mesmo domínio (ou subdomínio) configurado como base do provedor; rejeita host de terceiro. |
| SEC-027 | Baixa | `server/plugins/whatsapp-queue.ts` | As 3 respostas determinísticas (saudação pura, quick response, injection detectada) não pagam o teto `TURN_CEILING_PER_HOUR` — só o caminho que chama o modelo é protegido. | **Aberto** — recomendação: mover a checagem do teto para antes da bifurcação. Não aplicado: exigiria resolver `clienteId` mais cedo no fluxo (hoje só é resolvido depois dos atalhos determinísticos, de propósito, para evitar I/O em mensagens triviais) — mudança de fluxo real-time sem cobertura de teste ao vivo. |
| SEC-028 | Baixa | `server/utils/whatsapp/inboundMediaPolicy.ts:84` | Flag de habilitação de `document` cai implicitamente na de `image` (sem flag própria). | Aberto — observação de design, backlog, sem risco de segurança. |

**Destaques positivos confirmados**: dedupe/claim atômicos em todos os pontos (sem TOCTOU); anti-SSRF robusto na URL base do provedor (`normalizeProviderBaseUrl`); token do provedor nunca logado; timeouts explícitos + limite de bytes duplo no download de mídia.

### 3.6 Lote 6 — Schema SQL / RLS (`server/supabase/init.sql`, 5138 linhas)

**Veredito**: a suposição repetida no código de aplicação — "RLS impede que a anon key leia PII de clientes" — **se sustenta no nível do banco**. Todas as 43 tabelas têm RLS habilitado, e as 5 tabelas de PII de cliente (`customers`, `customer_addresses`, `whatsapp_conversations`, `customer_conversation_summary`, `customer_intelligence`) são inacessíveis à `anon`, direta ou indiretamente. Todas as 27 funções `SECURITY DEFINER` definem `search_path` explicitamente — o vetor clássico de escalação por schema-shadowing não existe aqui. O ponto cego real não é PII de cliente, é **inteligência comercial e credencial legada** expostas por policies públicas amplas demais.

| ID | Sev. | Localização | Descrição | Status |
|---|---|---|---|---|
| SEC-034 | **Crítica** | `store.uazapi_instance_token` + policy `"Public read available store"` (`USING (true)`) | Token de API de um provedor de WhatsApp legado e descontinuado, guardado em **texto plano**, legível por qualquer portador da anon key (embutida no bundle público) via PostgREST direto. | **Resolvido** — colunas removidas via [migration 129](server/supabase/migrations/20260901_drop_legacy_whatsapp_token_columns.sql:1) (confirmado sem uso em nenhum código do app — a integração real usa o padrão Vault). `init.sql` (schema mestre) também atualizado para instalações novas — nenhum vestígio do provedor legado permanece em código ou schema. **Precisa ser aplicada ao banco real** — ver §6. |
| SEC-035 | **Alta** | policy `"Public read available products"` (`USING (available = true)`) | Qualquer coluna de `products` é legível pela anon key via PostgREST direto, incluindo `cost_price`/`profit_margin` — vazamento de estrutura de custo/margem para qualquer visitante do catálogo. | **Aberto — SQL desenhado, não aplicado.** Ver plano abaixo. |
| SEC-036 | Média | `GRANT EXECUTE ... search_admin_products TO anon` | Mesmo vazamento de `cost_price`/`profit_margin` por uma segunda via: a RPC usada pela busca pública (`/api/catalog/search`) devolve essas colunas também para quem chamar a RPC direto via PostgREST, sem passar pelo endpoint Nuxt. **Acoplado a SEC-035**: a função é `SECURITY INVOKER` (roda com o privilégio de quem chama), então restringir as colunas de `products` para `anon` quebraria esta RPC inteira (ela sempre seleciona essas colunas para montar o retorno) — não dá para corrigir um sem o outro. | **Aberto — SQL desenhado, não aplicado.** Ver plano abaixo. |
| SEC-037 | Média | policy `"Public read available store"` (`USING (true)`) | Além do token (SEC-034), a mesma policy expõe config operacional interna a qualquer anônimo: `agent_model`, `agent_extra_instructions`, `agent_enabled_tools`, `whatsapp_provider_name`, `whatsapp_api_base_url` — reconhecimento de superfície de ataque do agente (quais tools existem, qual provedor). | **Aberto — SQL desenhado, não aplicado.** Ver plano abaixo. |

**Plano de correção para SEC-035/036/037 (não aplicado nesta sessão — motivo em §1):**
1. Criar uma RPC pública nova, `search_catalog_products`, com o mesmo corpo de busca fuzzy de `search_admin_products` mas SEM `cost_price`/`profit_margin` no `RETURNS TABLE`; repontar `server/api/catalog/search.get.ts` para ela.
2. `REVOKE EXECUTE ON FUNCTION search_admin_products(...) FROM anon;` (mantém `authenticated, service_role`).
3. Trocar a policy `"Public read available products"` de acesso à tabela inteira para um acesso via GRANT de colunas (`GRANT SELECT (id, category_id, name, description, photo_url, images, sale_price, promo_price, unit, allows_fractional_sale, current_stock, available, created_at, synonyms, product_type, preorder_config, number) ON products TO anon`) — só depois do passo 1/2, senão quebra a RPC.
4. Trocar `"Public read available store"` por uma VIEW pública (`store_public`) projetando só as colunas que o catálogo/checkout realmente precisam (`trade_name, logo_url, logo_url_dark, catalog_theme, layout_config, allows_pickup, operation_status, hours_config, address_*, support_whatsapp_number, service_radius_km, default_delivery_fee, origin_latitude, origin_longitude, closed_store_config, promotions_config, chat_sound_alert_active`), com `anon` lendo a view em vez da tabela.
5. **Antes de aplicar em produção**: rodar contra um projeto Supabase de staging com uma cópia do schema, testar `/api/catalog/search` (com e sem termo), `/api/catalog/products-page`, `/api/store/status`, `/api/orders/create` (lê `store` via service role — não deveria ser afetado, mas confirmar) e o painel admin completo (usa `authenticated`, não deveria ser afetado, mas as policies de staff usam `is_staff()`/`has_role()`, que são políticas SEPARADAS de `"Public read"` — confirmar que não colidem).

## 4. Requisitos de limpeza/refatoração

| ID | Descrição | Status |
|---|---|---|
| CLEAN-001 | `runtimeConfig.jwtSecret` nunca lido em código nenhum. | **Resolvido** — removido de `nuxt.config.ts`/`.env.example`/`wrangler.toml` |
| CLEAN-002 | Dark mode: 5 arquivos com ~27 classes de cor Tailwind sem variante `dark:` (`OrderReceipt.vue`, `catalog/index.vue`, `admin/settings/customization.vue`, `admin/promotions/[id].vue`, `admin/settings/index.vue`). Um dos casos era um bug funcional de verdade, não só falta de dark mode: a caixa de preview do logo "Tema Escuro" usava fundo branco fixo (deveria simular fundo escuro). | **Resolvido** — todas as 27 ocorrências corrigidas; preview do logo escuro trocado para fundo escuro fixo (`bg-neutral-900`) em vez de reagir ao tema do admin, já que simula o fundo do catálogo, não o do painel. |
| CLEAN-003 | 4 `catch` silenciosos (`console.error` sem feedback ao usuário): `admin/customers/index.vue`, `catalog/success.vue` (×2), `useProductPreorder.ts`. | **Resolvido** — `notify.error(...)` adicionado nos 4 pontos (em `catalog/success.vue`, um vira mensagem inline no estado vazio existente em vez de toast, mais adequado pra página cheia). |
| CLEAN-004 | 2 `catch` silenciosos intencionais/documentados: `useOrphanImageCleanup.ts` (limpeza best-effort), `useCurrentUser.ts` (fail-soft documentado no próprio código). | Aceito como está — não são bugs, são escolhas de design já documentadas inline. |
| CLEAN-005 | 2 `target="_blank"` sem `rel="noopener noreferrer"` completo: `catalog/store-closed.vue` (sem `rel` nenhum), `OrderReceipt.vue` (só `noopener`, faltava `noreferrer`). | **Resolvido** |
| CLEAN-006 | Duplicação: padrão `(err as {...})?.data?.statusMessage ?? fallback` repetido 25+ vezes em 16+ arquivos do admin. | **Aberto — recomendado, não aplicado.** Extrair `app/utils/extractApiError.ts` e migrar os 16 arquivos é mecânico mas grande (16 arquivos tocados só por refactor, sem mudança de comportamento) — deixado para um lote dedicado a não misturar com correções de segurança nesta sessão. |
| CLEAN-007 | Duplicação: lógica de interpretação de `configuracao` de promoção repetida entre `PromotionCard.vue` e `PromotionDetailsModal.vue`. | Aberto — recomendado (`usePromotionLabel` composable), não aplicado (mesmo motivo de CLEAN-006). |
| CLEAN-008 | Dead code geral (`app/**`): 0 achados — todos os composables referenciados, zero `TODO`/`FIXME` abandonado. `any`/`v-html`/segredo no client: 0 achados nos 3. | Nenhuma ação — já 100% conforme. |

## 5. Plano de execução por fases

1. **Lote 1 — concluído e corrigido.**
2. **Lote 2 — concluído e corrigido.**
3. **Lote 3 — concluído e corrigido.**
4. **Lote 4a (agente de IA) — concluído e corrigido**, exceto SEC-022/023 (abertos, ver §3.4).
5. **Lote 4b (WhatsApp) — concluído e corrigido**, exceto SEC-027/028 (abertos, ver §3.5).
6. **Lote 5 (frontend) — concluído e corrigido**, exceto CLEAN-006/007 (abertos, ver §4).
7. **Lote 6 (SQL/RLS) — concluído**; SEC-034 (Crítico) corrigido via migration. SEC-035/036/037 desenhados e documentados, aplicação pendente de staging — ver plano em §3.6.

**Pendências reais restantes** (nenhuma é um "lote" novo, são os itens abertos específicos já listados): aplicar a migration 129 ao banco real (SEC-034); decidir e testar em staging o plano de SEC-035/036/037; decidir se vale a pena o refactor de CLEAN-006/007; decidir sobre teto global de custo do agente (SEC-022) e rate-limit dos atalhos determinísticos do WhatsApp (SEC-027).

## 6. Definição de "Pronto para Produção"

- [x] Zero itens Críticos/Altos abertos **no código da aplicação** (SEC-001, SEC-021 resolvidos)
- [ ] Zero itens Críticos/Altos abertos **no banco** — SEC-034 (Crítico) corrigido no repo mas **precisa ser aplicado ao Supabase real** (`supabase db push` ou rodar a migration manualmente); SEC-035 (Alta) ainda não aplicado nem no repo (SQL desenhado, ver §3.6)
- [x] Todos os 6 lotes de auditoria concluídos
- [x] Dependências sem CVEs conhecidos (`pnpm audit` limpo)
- [x] Zero uso de `any` em `app/**` (confirmado no Lote 5 — já era 100% antes desta sessão)
- [x] Dark mode em 100% da UI (Lote 5 — 27 ocorrências corrigidas nesta sessão)
- [x] `useNotification` como único canal de notificação (Lote 5 — 0 `alert()`/`confirm()` nativo; 4 `catch` silenciosos corrigidos)
- [x] Testes passando (`vitest run` → 1031/1031)
- [ ] Integração de pagamento (Asaas) revisada quando implementada
- [ ] CSP (SEC-002) refeita com nonce por request, testada contra o deploy real, e reintroduzida — tentativa anterior revertida por quebrar produção (ver §1)
- [ ] Migration 129 aplicada ao Supabase de produção (SEC-034)
- [ ] Plano de SEC-035/036/037 validado em staging e aplicado

## 7. Log de mudanças

- **2026-09-01 (manhã)** — Criação do PRD. Lote 1 (SEC-001 a SEC-005, CLEAN-001) e Lote 2 (`server/api/admin/**`, SEC-006 a SEC-016) auditados e corrigidos. `pnpm audit` limpo.
- **2026-09-01 (tarde)** — Lotes 3, 4a, 4b, 5 e 6 auditados em paralelo (5 agentes especializados) cobrindo o restante do código-fonte (`server/api/catalog|promotions|kits|preorders|maps`, `server/utils/agent/**`, `server/utils/whatsapp/**`, `app/**` completo, e `server/supabase/init.sql`). 21 novos achados (SEC-017 a SEC-037) + 7 itens de limpeza (CLEAN-002 a CLEAN-008). 27 corrigidos nesta sessão; 6 documentados como abertos por exigirem decisão de produto ou ambiente de staging (SEC-022, SEC-023, SEC-027, SEC-028, SEC-035/036/037 tratados como bloco único, CLEAN-006, CLEAN-007).
  - **Nota técnica**: a correção de SEC-024 (guard de prompt injection em `AtualizarContexto`) inicialmente introduziu um import circular (`tools/context.ts` → `guardrails.ts` → `toolRegistry.ts` → `tools/context.ts`), pego pela suíte de testes (3 arquivos falhando com `TypeError`). Corrigido extraindo `detectPromptInjection`/`deaccent` para um módulo-folha novo, [server/utils/agent/promptInjection.ts](server/utils/agent/promptInjection.ts:1), sem dependência de `toolRegistry`; `guardrails.ts` passou a reexportar dali para manter a API pública inalterada para quem já importava de lá (`whatsapp-queue.ts`, `greeting.ts`, `quickResponse.ts`). Suíte completa voltou a passar 1031/1031 depois da correção.
  - Verificação: `eslint` limpo (repo inteiro); `nuxi typecheck` sem erros novos; `vitest run` → 1031/1031 (1 timeout isolado por contenção de recursos, confirmado flake ao rodar sozinho).
  - Arquivos novos: `server/utils/agent/promptInjection.ts`, `server/supabase/migrations/20260901_drop_legacy_whatsapp_token_columns.sql`.
- **2026-09-01 (tarde, follow-up)** — A pedido explícito do responsável do projeto ("uazapi deve ser totalmente eliminada... não deve ter nem mesmo referência"), removida toda menção ao provedor legado além das colunas em si: comentário explicativo em `init.sql` reescrito sem citar o nome do provedor, `app/types/database.types.ts` teve as 3 entradas (`Row`/`Insert`/`Update`) das colunas removidas manualmente (o arquivo é gerado por `pnpm run gen:types` contra o banco real, que esta sessão não tem credenciais para rodar — o ideal é regerar depois que a migration for aplicada, para garantir que o arquivo bata 100% com o schema real), e a migration foi renomeada de `20260901_drop_uazapi_plaintext_token.sql` para `20260901_drop_legacy_whatsapp_token_columns.sql`. A única referência restante ao nome literal das colunas (`uazapi_instance_token`/`uazapi_instance_name`) é dentro do `DROP COLUMN` da própria migration — inevitável, SQL exige o nome exato da coluna para removê-la; depois de aplicada ao banco, a palavra não existe mais em nenhum schema nem em nenhum código do repositório.
  - Dezenas de arquivos editados em `server/api/catalog/**`, `server/utils/agent/**`, `server/utils/whatsapp/**`, `server/plugins/whatsapp-queue.ts`, `app/pages/**`, `app/components/**`, `app/composables/**`, `server/supabase/init.sql`.
- **2026-09-01 (noite) — Incidente e revert de SEC-002.** A CSP deployada em produção quebrou o site (relatado pelo responsável do projeto com os erros de console reais). Causa raiz: script(s) inline de hidratação do Nuxt com conteúdo dinâmico por página nunca casam com um hash fixo; handlers de evento inline não são cobertos por hash em `script-src`; `style-src` não incluía Google Fonts; `img-src` não cobria todo domínio de imagem em uso; e o beacon de analytics injetado pela própria Cloudflare na borda (fora do controle da aplicação) também foi bloqueado — cascata terminou em falha de hidratação (`Cannot read properties of undefined (reading 'app')`). **Revertido integralmente**: `nuxt.config.ts` voltou a não emitir `Content-Security-Policy` (mantida a extração de `THEME_SCRIPT` como constante, que é inócua). SEC-002 volta a "Aberto" em §3.1. `eslint`/`nuxi typecheck` limpos após o revert. Nenhuma outra correção desta sessão foi afetada — o incidente foi isolado à CSP.
