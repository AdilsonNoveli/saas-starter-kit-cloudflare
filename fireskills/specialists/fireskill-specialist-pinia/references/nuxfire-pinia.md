# Pinia no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento.
O uso hoje é **pequeno**: três stores.

## 1. Versões e registro

- `pinia` `^2.3.1` e `@pinia/nuxt` `^0.9.0` (`apps/app/package.json`); módulo em
  `apps/app/nuxt.config.ts`. Layers que têm store declaram `pinia` no próprio
  `package.json` (`teams`, `notifications`).
- **Não existe** plugin de persistência (`pinia-plugin-persistedstate` ou
  similar).

## 2. As três stores

| Store | Arquivo | Estado | Consumidores |
|---|---|---|---|
| `useTeamsStore` (id `"teams"`) | `layers/teams/app/composables/use-teams-store.ts` | `teams` (registro por **slug**), `currentTeamId`, `loaded` | `apps/app/app/middleware/1.teams.global.ts`, `TeamSwitcher*.vue`, `TeamCreateModal.vue`, páginas de settings |
| `useInviteStore` (`"invite"`) | `layers/teams/app/composables/use-invite-store.ts` | `invite` (tipado `any`) | `layers/teams/app/middleware/invite.ts`, `pages/invite/[[id]].vue` |
| `useNotificationsStore` (`"notifications"`) | `layers/notifications/app/composables/use-notifications-store.ts` | `notifications` (registro por id), `unread`, `enabled` | `NotificationsSlideover.vue`, `pages/account-settings/notifications.vue`, `plugins/ws-notifications.client.ts`, dashboard |

Além disso: `useCurrentTeam = () => storeToRefs(useTeamsStore()).currentTeam`
(atalho reativo no mesmo arquivo).

`layers/kanban` **não usa store**: `app/composables/useKanban.ts` expõe a fatia
do cliente tRPC direto. Nem todo dado de servidor precisa de store.

## 3. Convenções observadas

- **Estilo de opções**: `defineStore(id, { state: () => ({...}), getters, actions })`.
  Não há *setup store* (`defineStore(id, () => {...})`) no projeto.
- **Onde**: `layers/<layer>/app/composables/use-<nome>-store.ts` — dentro de
  `composables/`, então o Nuxt auto-importa o `useXStore` no app inteiro. O nome do
  arquivo é kebab (`use-teams-store.ts`); o export é `use<Nome>Store`; o `id` é o
  substantivo em minúsculas.
- `defineStore` é importado de `"pinia"` nos arquivos de store; `storeToRefs` é
  usado **sem import** (auto-import do `@pinia/nuxt`).
- **Estado normalizado como registro** (`Record<chave, entidade>`) com *getters*
  para lista ordenada (`ordered`, `allTeams`) e busca (`getTeam(id)`).
  Cuidado: `useTeamsStore` chaveia por **`team.slug`** (`setTeam`, `setTeams`), e
  `currentTeamId` guarda o **slug** (`setCurrentTeamId(teamSlug)` no middleware),
  apesar do nome "Id".
- **Tipos derivados do servidor**: `import type { RouterOutput } from
  "~~/server/trpc/routers"` e `RouterOutput["teams"]["get"]`. Não redeclare o tipo
  à mão (a exceção `invite: any` é dívida, não modelo).
- **Dados vêm do tRPC dentro das actions**:
  `await useTrpcClient().teams.get.query({ teamIdentifier })`, com `try/catch`
  que faz `console.error(error)` e devolve `null`/`undefined`. Mutações
  (`markAsRead`) atualizam o estado **antes** da chamada e **reconciliam** no
  erro (recalculam `unread` a partir do estado).
- Separação `set*` (síncrono, só muda estado) vs `fetch*` (assíncrono, chama a
  API e depois `set*`).

## 4. SSR e hidratação

- O estado das stores é serializado no payload do Nuxt e hidratado no cliente.
  `useTeamsStore.fetchTeam` roda no **middleware global** `1.teams.global.ts`
  (servidor no primeiro acesso, cliente nas navegações) e por isso o middleware
  **fica no Composition Root**, depois de `0.auth.global.ts` (ver
  `$fireskill-specialist-nuxfire-layers`).
- **Código de browser dentro de action é client-only.** `useNotificationsStore`
  usa `localStorage` em `initializeNotificationSettings`/`setNotificationsEnabled`;
  por isso é chamado do plugin `ws-notifications.client.ts` (sufixo `.client`) e de
  `onMounted`-like de página, nunca em código que roda no servidor.
- `useTrpcClient()` cria um cliente novo por chamada no servidor e reaproveita um
  no browser (`use-trpc-client.ts`); não guarde esse cliente no estado.
- Não há carga preguiçosa de store nem `acceptHMRUpdate` no projeto.

## 5. O que NÃO existe (não assuma)

- Persistência de estado, *setup stores*, plugins de Pinia, testes de store.
- Store para o dado do Kanban.
- Estado global fora de Pinia além de `useSession()` (`apps/app/app/utils/auth.ts`,
  baseado em `useState`) e do cookie de sessão.
