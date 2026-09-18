# Plano: três débitos pré-existentes sinalizados durante a Fase 3 / reorg `apps/`

> **Status:** itens 1 e 2 executados e verificados em 2026-09-14 (mesma sessão que escreveu este plano, continuação). Item 3 permanece só documentado — nenhuma mudança de código, decisão é manter como está. Nenhum dos três era bloqueante — o app já teve deploys manuais reais funcionando com esse débito presente.

---

## 1. `apps/web/constants/paths.json` — hand-maintained, fica velho silenciosamente

**Evidência, não suposição:** 526 linhas, JSON estático, consumido por `apps/web/app/components/folder-tree/FolderTree.global.vue` (`import paths from "~~/constants/paths.json"` — lido em build time, sem acesso a filesystem em runtime, porque `apps/web` é pré-renderizado como site estático). Pelo menos 2 entradas apontam pra arquivos que não existem mais na raiz (`AGENTS.md`, `DESIGN_SYSTEM.md` — movidos pra `_docs/` antes desta sessão). O número real de entradas mortas é maior (levantamento anterior desta sessão, durante a extração de `admin`, contou ~85 de 523 antes até da reorg de `apps/`) — não medi o total exato agora porque o número certo importa menos que a causa raiz abaixo.

**Causa raiz, não sintoma:** este arquivo é **mantido à mão**. Toda vez que alguém adiciona, remove ou renomeia um arquivo em qualquer lugar do repo, `paths.json` só reflete isso se alguém lembrar de editá-lo manualmente. `_docs/AGENTS.md` já documenta esse comportamento como perigoso ("goes stale silently and the rendered tree lies") — mas isso descreve o sintoma, não resolve.

**Recomendação — não é "corrigir as entradas mortas de novo", é eliminar a manutenção manual:**

Gerar `paths.json` em build time, varrendo o filesystem real, no mesmo padrão já estabelecido nesta sessão pra `scripts/compose-layers.ts` (gerado automaticamente, chamado no topo do `nuxt.config.ts`, zero passo manual pra lembrar). Não é um script novo e diferente — é o mesmo princípio arquitetural já provado: **dado derivável do filesystem nunca deveria ser hand-maintained**.

Passos:
1. Escrever `scripts/generate-paths.ts` (ou local equivalente dentro de `apps/web/`) que varre o repo a partir da raiz, aplicando os mesmos filtros que o `paths.json` atual parece seguir (ignora `node_modules`, `.git`, `.nuxt`, `.output`, `dist`, `.sst` — conferir o conteúdo atual pra extrair a lista de exclusão real, não adivinhar) e escreve a lista de paths no formato exato que `FolderTreeItem.vue`/`FolderTree.global.vue` esperam (strings de path, diretórios terminando em `/`, ordenação — replicar o formato atual exatamente, não redesenhar).
2. Chamar essa geração automaticamente — no `nuxt.config.ts` de `apps/web` (mesmo lugar/mesmo hook que `compose-layers.ts` já usa em `apps/app`) ou como parte do build do site.
3. Migrar `hints.json` também, se fizer sentido — ele é pequeno (poucas entradas, descrição textual por path) e provavelmente continua fazendo sentido hand-maintained (é conteúdo editorial, não uma lista de arquivo — a razão de `paths.json` estar errado não se aplica a `hints.json` do mesmo jeito), mas vale conferir se `hints.json` tem alguma entrada apontando pra um path que `paths.json` gerado automaticamente não vai mais ter (path morto em ambos) antes de decidir.
4. Verificação: gerar, comparar contra o `paths.json` atual pra ver a extensão real do drift, rodar `bun run generate` em `apps/web` e conferir visualmente (ou via `read_page`) que a árvore renderizada no `/docs/saas-starter-kit/getting-started/project-structure` bate com a estrutura real do repo.

**Feito.** `scripts/generate-paths.ts` (usa `git ls-files`, não um walk manual — já aplica `.gitignore` de graça, zero risco de a lista de exclusão do gerador divergir da real). Denylist adicional, só pra topo do repo: `.agents`, `.claude`, `_docs`, `skills-lock.json` (tooling interno/docs de trabalho deste fork, não fazem parte da árvore que um cliente do template navegaria — `bun.lock` continua incluído porque é relevante pra qualquer dev, ao contrário de `skills-lock.json`). Chamado automaticamente no topo de `apps/web/nuxt.config.ts`, mesmo padrão do `composeLayers()` em `apps/app/nuxt.config.ts`. `hints.json` conferido — nenhuma entrada morta, mantido hand-maintained como já era esperado.

Drift real medido: 525 → 712 entradas. Ganhos principais: `layers/*` inteiro (não existia no `paths.json` antigo — a árvore de Nuxt Layers da Fase 1-3 nunca tinha sido refletida), `vitest.config.mts`. Perdas: as 2 entradas mortas (`AGENTS.md`, `DESIGN_SYSTEM.md` na raiz) mais as 2 do item 2 abaixo.

Verificação rodada: `bun scripts/generate-paths.ts` standalone (714 entradas antes de deletar os 2 arquivos do item 2, 712 depois); `bun run typecheck` em `apps/web` (exit 0, gerador roda no load do `nuxt.config.ts`); `bun run generate` em `apps/web` (build real, Nuxt Link Checker: 0 de 43 páginas falhando); conferência visual real via browser em `/docs/saas-starter-kit/getting-started/project-structure` — `layers` aparece agora como pasta de topo (antes ausente). `_docs/AGENTS.md` atualizado (a linha que descrevia `paths.json` como "static, hand-maintained" citava exatamente o problema que este item resolveu).

---

## 2. Dois endpoints de IA sem referência nenhuma

**Evidência:** `apps/app/server/api/assistant-picture.get.ts` e `apps/app/server/api/upload/ai-assistant.ts`. Busquei por qualquer referência real (import, fetch, link) em `apps/`, `layers/`, `packages/`, `infra/`, `scripts/` — o único resultado é `apps/app/.nuxt/types/nitro-routes.d.ts`, que é **gerado automaticamente** pelo Nitro (escaneia `server/api/**` e cria o tipo de rota pra qualquer arquivo ali, exista consumidor ou não) — não é uma referência real, é só o scanner de build encontrando o arquivo.

`_docs/AGENTS.md` já documenta que os recursos de IA foram removidos do starter kit ("AI features: Removed... If you see old docs mentioning an AI chatbot/image generator, it's stale — ignore it") — esses dois arquivos são o código-fonte que sobrou dessa remoção, não a documentação.

**Recomendação:** deletar os dois arquivos. Zero consumidor, zero risco. Não precisa de mais investigação — a busca já é conclusiva.

**Feito.** `git rm` nos dois arquivos. Verificação rodada: `bun run test` na raiz (7 suites / 131 testes, todos passando), `bun run typecheck` em `apps/app` (client program, exit 0), `bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app` (server program — o que `nuxt typecheck` sozinho não cobre, ver `_docs/AGENTS.md`; exit 0, sem output). `paths.json` regenerado depois (item 1) confirma as duas entradas mortas sumiram (714 → 712).

---

## 3. `apps/app/app/components/team-dashboard/*` — ficam ou vão pra `layers/teams`?

**Evidência, e ela muda a resposta simples que eu tinha dado antes:** são 4 componentes (`TeamDashboardStats.vue`, `TeamDashboardChart.client.vue`, `TeamDashboardChart.server.vue`, `TeamDashboardActivity.vue`), todos usados só em `apps/app/app/pages/[[team]]/dashboard.vue`. Não são uniformes:

- `TeamDashboardChart.client.vue` e `TeamDashboardActivity.vue` consultam **só** `teams.listMembersAndInvites` — domínio único, teams.
- `TeamDashboardStats.vue` consulta **teams.listMembersAndInvites E billing.getBillingInfo** — dois domínios ao mesmo tempo, numa página só.

**Recomendação: manter os quatro em `apps/app`, não mover nenhum pra `layers/teams`.** Razão: são visualmente uma seção só (o dashboard da equipe), e pelo menos um deles (`Stats`) é estruturalmente cross-domain — não cabe inteiro em `layers/teams` sem também depender de `layers/billing`, o que contradiz o próprio padrão que esta migração estabeleceu (uma layer não deveria existir só pra agregar visualmente dados de outras duas). Dividir os quatro — três pra `layers/teams`, um ficando pra trás — fragmentaria uma seção visualmente coesa sem ganho real de clareza. Isso está consistente com a decisão já tomada (e já verificada, `git diff` vazio) de manter `[[team]]/dashboard.vue` em `apps/app` como conteúdo genérico do app shell durante toda a Fase 3.

**Se quiser mesmo assim mover os dois que são teams-only** (`Chart.client`, `Activity`), é tecnicamente seguro fazer isso independente do resto — mas eu não recomendo, pela razão de coesão visual acima. Documentando a opção pra você decidir, não decidindo por você.

---

## Verificação obrigatória se executar isto

- Item 1: `bun run generate` em `apps/web`, conferir que `.output/public/docs/**` ainda tem `index.html` pra toda página de doc (mesmo padrão de prova já usado nesta sessão), e que a árvore renderizada bate com o filesystem real.
- Item 2: `bun run test`, typecheck de `apps/app` (`nuxt typecheck` + `vue-tsc -p server/tsconfig.json`) — confirmar que deletar os dois arquivos não quebra nada (não deveria, zero consumidor confirmado).
- Item 3: se decidir mexer, mesma régua das extrações de Fase 3 — `.nuxt/components.d.ts` antes/depois pra provar que o nome do componente sobrevive, `nuxt build` real, não só `nuxt prepare`.

## Commits/arquivos relevantes pra retomar contexto

- `_docs/AGENTS.md`, `_docs/REFATORE_ARCHITETURE.md` — arquitetura completa (Fases 1-3 concluídas, reorg `apps/` concluída).
- `_docs/MAILER_FORK_PLAN.md` — trabalho relacionado, já em andamento em outra conversa.
- Branch `stage`, HEAD em `25677a0` no momento em que este documento foi escrito.
