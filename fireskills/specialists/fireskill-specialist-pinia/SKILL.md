---
name: fireskill-specialist-pinia
description: Criar e revisar stores Pinia (`@pinia/nuxt`) no Nuxfire — stores no estilo de opções em `layers/*/app/composables/use-*-store.ts`, estado normalizado, actions que chamam `useTrpcClient()`, tipos derivados de `RouterOutput`, SSR/hidratação e código client-only. Use ao criar/alterar uma store, decidir entre store, `useState` ou composable com `useQuery`, ou depurar estado que diverge entre servidor e cliente; hoje há três stores (teams, invite, notifications).
---

# Pinia no Nuxt

## Quando usar

- Acionar ao criar/alterar store, ao decidir onde um estado compartilhado de UI
  deve viver, ou ao depurar hidratação, estado vazando entre requisições ou
  `localStorage` acessado no servidor.
- Acionar ao usar `useTeamsStore`, `useCurrentTeam`, `useNotificationsStore` ou
  `useInviteStore`.
- Não acionar para dado que só uma tela usa e que o `useQuery` do tRPC já cobre
  (`useKanban`): ver `$fireskill-specialist-trpc`. Não acionar para sessão do
  usuário (`useSession`, `useState`): `$fireskill-specialist-openauth`.
- Combinar com `$fireskill-specialist-nuxt` (middleware, plugins, SSR),
  `$fireskill-specialist-nuxfire-layers` (onde a store mora) e
  `$fireskill-specialist-typescript`.

## Fluxo

1. Ler [references/nuxfire-pinia.md](references/nuxfire-pinia.md).
2. Decidir **se precisa de store**: estado lido por vários componentes/rotas,
   com ciclo de vida próprio (equipe atual, notificações) → store. Dado de uma
   tela, refetch simples → `useQuery`/composable.
3. Copiar o padrão de `use-teams-store.ts` (estado normalizado, `set*` +
   `fetch*`, tipo de `RouterOutput`).
4. Colocar a store na layer dona do domínio e declarar `pinia` no
   `package.json` da layer.
5. Marcar o que é client-only e quem o chama.
6. Validar (seção abaixo).

## Regras principais

- Estilo de opções `defineStore(id, { state, getters, actions })`; nome
  `use<Nome>Store`, arquivo `use-<nome>-store.ts` em `app/composables/` (auto-import).
- `id` da store é o substantivo em minúsculas e único no app.
- Estado é dado serializável e normalizado (`Record<chave, entidade>`); listas
  ordenadas e buscas são *getters*.
- Tipos vêm do servidor: `RouterOutput["ns"]["proc"]`; não redeclarar à mão.
- Dado vem do tRPC dentro de actions `fetch*`, que chamam `set*`; `try/catch`
  com log e retorno `null`/`undefined` no erro. As stores atuais fazem
  `console.error(error)` com o objeto cru; numa action que pode rodar no servidor
  (middleware/SSR), extraia `message`/`name` antes, pois em Worker um `Error` cru
  sai como `{}`.
- Mutação otimista atualiza o estado antes e **reconcilia no erro**
  (`markAsRead`).
- Chave do registro e nome do campo dizem a verdade: `useTeamsStore` chaveia por
  **slug** e `currentTeamId` guarda o slug — não misture com `team.id`.
- Código de browser (`localStorage`, `window`) **só** dentro de action chamada de
  plugin `.client.ts` ou de hook de montagem; nunca no caminho do servidor.
- Não guardar o cliente tRPC, instâncias de classe ou funções no estado.
- Nada de estado por usuário em variável de módulo (vaza entre requisições no
  servidor); use a store (uma instância por requisição no SSR).
- Store que muda com a rota e precisa de ordem (`fetchTeam` no middleware global)
  fica onde a ordem é garantida: no Composition Root.
- Plugin de layer que usa store de outra origem declara `dependsOn`.

## Antipadrões

- Criar store para dado de uma tela só ou para espelhar um `useQuery`.
- Tipar o estado com `any` (a `invite` atual é dívida; não repita).
- Ler `localStorage` no `state()` ou em getter (quebra o SSR e a hidratação).
- Mutar a store fora de actions em vários lugares, espalhando a regra.
- Chamar `useTeamsStore()` no topo do módulo (fora de setup/action), quebrando o
  contexto do Nuxt.
- Duplicar em store o que já é `useSession()` ou cookie.
- Chavear por `id` sabendo que o chamador usa `slug` (e vice-versa).
- Engolir o erro sem log, ou logar o `Error` cru em código de Worker (ver
  `$fireskill-specialist-openauth`, §9).
- Assumir persistência de estado entre recargas: não existe plugin de persistência.

## Validação

- `bun run typecheck` em `apps/app`: getters e actions com tipos de
  `RouterOutput`, sem `any` novo.
- Carregar a página com SSR e sem JS: o estado renderizado no servidor coincide
  com o do cliente (sem aviso de hidratação no console).
- Navegar entre rotas e trocar de equipe: `currentTeamId`/`teams` acompanham;
  equipe inexistente redireciona para `/select-team`.
- Store com código de browser: recarregar a página no servidor não lança
  `localStorage is not defined`.
- Falha da API: a store volta a um estado consistente (ex.: `unread` recalculado).
- `bun run test` (Vitest); não há suíte de store, então acrescente uma se a
  lógica de getter/reconciliação for nova.

## Skills relacionadas

- `$fireskill-specialist-nuxt` — SSR, middleware, plugins e `useState`.
- `$fireskill-specialist-trpc` — origem dos dados e dos tipos.
- `$fireskill-specialist-nuxfire-layers` — onde a store vive e a ordem de
  middleware/plugins.
- `$fireskill-specialist-nuxt-authorization` — permissões vêm da sessão, não da
  store.
- `$fireskill-specialist-typescript` — tipos derivados.
