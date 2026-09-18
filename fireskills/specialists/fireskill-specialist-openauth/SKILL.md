---
name: fireskill-specialist-openauth
description: Criar e revisar autenticação com OpenAuth.js no Nuxfire — Worker emissor (`apps/functions/src/auth.ts`), providers de senha/código/GitHub/Google, subjects, sessões e credenciais no KV `AuthKV`, cookies e callback no app, endpoints internos protegidos por segredo, rate limit de login e reset/exclusão de identidade. Use ao tocar `apps/functions/src/auth.ts`, `apps/functions/src/subjects.ts`, `apps/app/server/utils/auth.ts`, `server/api/auth/*`, `apps/login` ou `infra/auth.ts`; permissões de equipe são do `$fireskill-specialist-nuxt-authorization`, MFA/segurança geral do `$fireskill-specialist-application-security`.
---

# OpenAuth.js

## Quando usar

- Acionar ao mexer no emissor, em provider, subject, cookie de sessão, callback,
  `getUser`/`getUserSession`, página de login/cadastro/recuperação ou nos
  endpoints internos `/internal/identity/*`.
- Acionar ao depurar loop de redirect para `/authorize`, `email_taken`, `23505`
  em `User_email_unique` ou travamento de sessão.
- Acionar ao resetar dados de usuário em ambiente de dev.
- Não acionar para permissões de equipe (`nuxt-authorization`) nem para MFA/TOTP
  em si (`$fireskill-specialist-application-security`).
- Combinar com `$fireskill-specialist-cloudflare-workers` (KV, service binding),
  `$fireskill-specialist-sst` (`infra/auth.ts`, secrets), `$fireskill-specialist-drizzle`
  (`User`) e `$fireskill-specialist-nuxt-ui` (páginas do `apps/login`).

## Fluxo

1. Ler [references/nuxfire-openauth.md](references/nuxfire-openauth.md).
2. Identificar em qual lado a mudança cai: **emissor** (`apps/functions`),
   **cliente/sessão** (`apps/app/server`) ou **UI** (`apps/login`).
3. Se envolve segredo, cookie ou credencial, pensar primeiro em como falhar
   **fechado**.
4. Implementar e validar com a seção abaixo, incluindo os casos de erro.

## Regras principais

- A credencial de senha e o perfil de identidade vivem **só no KV `AuthKV`**;
  Postgres não tem tabela de sessão nem senha.
- `AuthKV` é ligado **apenas** ao Worker `Auth`. Quem está fora dele pede a
  operação pelos endpoints internos (`config.ts`: `identityDeletePath`,
  `signOutOthersPath`, `seedAccountPath`), sempre `POST` com `x-admin-secret`.
- Endpoint interno: comparação em **tempo constante**, **503** se o segredo não
  estiver configurado, **403** se não bater; nunca cair para modo sem
  autenticação. Chegar pelo service binding não autoriza nada.
- App → `Auth` por service binding `env.Auth`, relido a cada chamada; sem o
  binding, falhar com erro explícito.
- `getIssuer(env)` é construído **por requisição**; não cachear `issuer()`.
- Provider OAuth só é registrado com credenciais reais (`id && secret`); a UI do
  `apps/login` espelha a mesma verdade por variável pública.
- O usuário do Postgres é upsert por **`session.id`** (subject), nunca por e-mail.
- `getUser` nunca devolve `mfaSecret` e só expõe booleanos de admin/MFA.
- Revogar sessões casando por `properties.email`, não pelo hash do subject.
- Rate limit de credencial fica **antes** do emissor, só em `POST` das quatro
  rotas de credencial; não aplicar aos providers OAuth.
- Perfil, cookies e tokens: `nuxfire-access-token` (não httpOnly, o WebSocket
  precisa), `nuxfire-refresh-token` (httpOnly); MFA e admin em cookies próprios,
  distintos.
- `apps/login` mantém `ssr: false` nas rotas de login/cadastro/recuperação.
- Resetar `User` exige limpar **as duas** chaves do KV por e-mail
  (`["email", email, "password"]` e `["users", email]`) na mesma passada.
- Log de erro em Worker: nunca `Error` cru; extrair `message`, `name`, `stack`.
- Alteração de versão do OpenAuth: reconferir o patch em `patches/`.

## Antipadrões

- Remover `ssr: false` do login "para corrigir" hidratação.
- Cachear o issuer ou o client sem reler o binding.
- Buscar o usuário por e-mail no callback; reaproveitar linha de outro perfil ou
  reescrever `User.id` ao ver `23505`.
- Endpoint interno com fallback aberto quando falta `ADMIN_SECRET`; comparar
  segredo com `===`.
- Colocar `NUXT_AUTH_ADMIN_SECRET` sob `NUXT_PUBLIC_`.
- Truncar `User` sem limpar o KV (ou o contrário): split-brain de cadastro.
- Contar tentativas dentro dos callbacks dos providers (eles só rodam depois da
  credencial checada).
- Devolver `mfaSecret` ou o estado "MFA verificado nesta sessão" no payload de
  `/api/auth/session`.
- Trocar/desligar `getUserPermissions` degradado sem investigar: se ele logar, é
  bug real.
- Assumir NextAuth/Lucia/Clerk, tabela `sessions` ou magic link como único método.
- Confiar em `X-Forwarded-For` como IP de produção.
- Fazer `fetch` na URL pública do `Auth` a partir do app.

## Validação

- Login com senha, com código por e-mail, e com cada OAuth **configurado**;
  provider sem credencial não pode aparecer na UI.
- Cadastro → login → logout → novo login; deixar expirar o access token e
  confirmar a renovação por refresh (cookies regravados).
- Usuário com linha ausente em `User`: sessão continua válida (sem loop para
  `/authorize`).
- Rate limit: a 6ª tentativa de senha em 5 min redireciona com
  `err=too_many_requests` e `Retry-After`.
- Endpoints internos: sem segredo → 403; sem `ADMIN_SECRET` no Worker → 503.
- Excluir conta: some do KV (senha, `users`, refresh tokens) e do Postgres, e um
  novo cadastro com o mesmo e-mail funciona.
- `sign-out-others`: a sessão atual continua, as demais caem.
- Depois de reset de dev: cadastrar de novo o mesmo e-mail sem `email_taken` nem
  `23505`.
- `bun run test` (Vitest) e typecheck de `apps/app` e `apps/functions`.

## Skills relacionadas

- `$fireskill-specialist-nuxt-authorization` — o que o usuário logado pode fazer.
- `$fireskill-specialist-application-security` — MFA, segredos, cookies.
- `$fireskill-specialist-cloudflare-workers` — KV, service binding, I/O.
- `$fireskill-specialist-sst` — `infra/auth.ts`, secrets e flags de provider.
- `$fireskill-specialist-drizzle` — tabela `User` e reset de dados.
- `$fireskill-specialist-nuxt` — middleware global e `useSession`.
