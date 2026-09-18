# Regras do sistema

Estas regras complementam as instruções dos agentes sem substituir specs ou
critérios de aceite. Origem: `_docs/docs/RULES.md` (regras do time, mantidas
como estão) e as regras técnicas de `_docs/docs/AGENTS.md` que foram **verificadas
no código** (o detalhe e a evidência de cada uma estão no especialista indicado).

## Arquitetura

- Separation of Concerns: um arquivo, uma responsabilidade.
- Componentização extrema; estrutura de pastas e arquivos pensada para
  manutenção.
- DRY: reutilização máxima de código. YAGNI: não implementar o que não foi pedido.
  KISS: a solução mais simples que resolve o problema.
- Domínio de negócio vive em `layers/`; `apps/app` (Composition Root) não recebe
  lógica de domínio. Ver `fireskill-specialist-nuxfire-layers`.
- "Layer ativa" tem uma única fonte: `config.ts` → `activeLayerNames`. Nunca
  decidir por presença em disco.
- Habilidades (`defineAbility`) levam o prefixo da layer; procedures tRPC não.
  O router de cada layer exporta o mapa `routers` com `satisfies`.
- Schema Drizzle: o barrel `apps/functions/src/database/schema.ts` importa cada
  layer por **especificador de pacote**, nunca por caminho relativo.

## Código e qualidade

- Tipagem forte, **zero `any`**.
- Zero código morto ou paliativo; zero funções sem propósito claro; zero
  verbosidade. Código limpo, validado e otimizado.
- Cores só semânticas do `@nuxt/ui` (`text-default`, `bg-elevated`...), nunca
  paleta bruta; tema centralizado em `packages/tokens`. Ver
  `fireskill-specialist-nuxt-ui`.
- Em Worker, nunca logar um `Error` cru: extrair `message`, `name`, `stack`.

## Testes

- Vitest é o runner (`bun run test`). Cada layer roda sozinha com o próprio
  `vitest.config.ts`; `defineAbility` é injetado por `vitest.setup.ts`.
- `nuxt typecheck` **não** cobre o servidor: rodar também
  `bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app`.
- Verde em `tsc`/`vitest`/`nuxt build` **não** prova o deploy: para o que toca
  `apps/functions` e `layers/`, o gate real é `sst deploy` num stage de teste.
- Nenhum teste roda contra o banco de desenvolvimento
  (`fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs`).

## Segurança e privacidade

- Segredos em `SCREAMING_SNAKE_CASE`, iguais em `.env.example`,
  `infra/secret.ts` e `Resource.<NOME>`; só valores públicos usam `NUXT_PUBLIC_`.
  Nunca abrir nem versionar `.env.stage` / `.env.production`.
- Rotas de segredo vazio **falham fechadas** (MFA de plataforma e de usuário).
- Endpoints internos do Worker `Auth` exigem `x-admin-secret` (tempo constante).
- `platformAdminProcedure` exige `PlatformAdmin` ativo + MFA + sessão elevada de
  30 min e nunca é derivada de `abilityProcedure`.
- Nunca ligar criação de admin ou senha conhecida ao seed/deploy.
- Reset de dados de `User` exige limpar também as duas chaves do `AuthKV`
  (`["email", email, "password"]` e `["users", email]`).

## Operação

- Deploy: `bun run deploy -- --stage <stage>` (a flag `--stage` é obrigatória;
  nunca `SST_STAGE=`). `production` é `retain` + `protect`.
- Migrações: gerar com `drizzle-kit generate` (ler o SQL); aplicar **só** pelo
  deploy. Sem migração de volta: expand/contract.
- Não desfazer, sem entender o motivo: `linker = "hoisted"`, `unenv` dividido
  (raiz v2 / apps v1), patches por versão exata, `ssr: false` nas rotas de login.
- Recursos Cloudflare opcionais nascem atrás de `flags` em `config.ts`; o código
  trata o binding ausente.
- Ver `fireskill-specialist-sst` e `fireskill-specialist-cloudflare-workers`.

## Regras específicas do projeto

- **Dark mode obrigatório em toda UI.**
- **Notificações ao usuário via `useNotification`** (`success`/`error`/`info`/
  `confirm`); nunca `window.confirm`. Há `useToast()` direto em código legado
  (ex.: `layers/teams/app/components/TeamCreateModal.vue`): migrar para
  `useNotification` ao tocar o arquivo.
- **Imagens e arquivos via Cloudflare R2** (`hubBlob()` do NuxtHub, API
  compatível com S3); não há bucket S3 da AWS no projeto.
- Ao editar qualquer arquivo, aplicar as melhorias e correções que estiverem no
  escopo tocado.
