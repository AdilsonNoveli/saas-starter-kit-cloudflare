# OpenAuth no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento.

## 1. Arquitetura

- **`@openauthjs/openauth`** (`^0.3.6` em `apps/functions/package.json`; há patch
  em `patches/@openauthjs%2Fopenauth@0.3.9.patch` — amarrado à versão exata).
- Emissor num **Worker independente**: `apps/functions/src/auth.ts`, em
  `auth.<domínio>`, criado em `infra/auth.ts` com o KV `AuthKV` linkado e o
  Worker `Emails` (service binding).
- A UI é `apps/login` (build estático `nuxt generate`), servida como assets
  estáticos do mesmo Worker. Login, cadastro e recuperação são páginas
  pré-renderizadas **e** dirigidas por query string (`?state=code`); essa
  combinação quebra na hidratação, por isso estão com `{ ssr: false }` em
  `routeRules`. **Não remova `ssr: false`.**
- O app (`apps/app`) é **cliente OAuth** do emissor: `createClient` de
  `@openauthjs/openauth/client`, com `issuer`/`clientID` vindos do
  `runtimeConfig.public` (`authUrl`, `authClientID`).
- Chamadas app → `Auth` vão por **service binding** `env.Auth`
  (`server/utils/auth.ts` → `getClient`), não pela URL pública. O binding é
  relido a cada chamada, porque o primeiro acesso de um isolate pode chegar por
  um despacho interno sem binding; cachear "sem binding" prenderia o isolate no
  caminho lento.

## 2. Providers

`PasswordProvider` (com `ScryptHasher`) e `CodeProvider` sempre; `GithubProvider`
e `GoogleProvider` **só se as credenciais existirem** (`Boolean(id && secret)`,
não apenas a flag). O `apps/login` espelha essa verdade via
`NUXT_PUBLIC_GITHUB_AUTH_ENABLED` / `NUXT_PUBLIC_GOOGLE_AUTH_ENABLED`
(`infra/auth.ts`), para não exibir botão que falharia no clique.
Escopos: GitHub `read:user user:email`; Google `openid email profile`.

`getIssuer(env)` é construído **por requisição, nunca cacheado**: `issuer()`
dispara leituras de KV das chaves de assinatura e guarda promessas pendentes;
cacheado entre requisições, a primeira requisição que não as aguarda deixa
promessas eternas e todas as seguintes travam (foi o travamento de ~10 s em toda
checagem de sessão). O custo de reconstruir é baixo.

O `success` do emissor (`ctx.subject("user", {...})`):
1. obtém `{ email, name?, image?, data? }` do provider (userinfo do Google;
   `/user` e `/user/emails` do GitHub, escolhendo o e-mail primário);
2. lê/atualiza o perfil em `["users", email]` (só `createId()` num miss);
3. em conta **nova** envia o e-mail `Welcome`;
4. devolve o subject `{ id, name, email, image }`.

O e-mail de código/verificação sai por `sender(env.Emails)` (`"VerificationCode"`).

## 3. Subjects (`apps/functions/src/subjects.ts`)

`createSubjects({ user: baseUser })`, com `valibot` (`id`, `email`, `name`,
`image`, todos `string`). `FullUser` (com `createdAt`, `updatedAt`, `accounts[]`)
é o registro completo guardado no KV. O app depende de
`@nuxfire/functions/subjects`.

## 4. O que fica no KV `AuthKV` (e por que Postgres não tem `sessions`)

- Credencial de senha: chave `["email", email, "password"]` (digest Scrypt) —
  vive **só no KV**.
- Perfil de identidade: `["users", email]` = `{ id, email, name, image, accounts[] }`.
  O `id` dele vira o subject, depois `session.id` no app, depois `User.id` no
  Postgres.
- `["email", email, "subject"]` e os tokens `["oauth:refresh", subject, token]`.
- Chaves de assinatura/criptografia do emissor.

**Duas chaves independentes por usuário, ambas necessárias** (senha e perfil).
Zerar só o Postgres (`User`) ou só o KV gera **split-brain**: cadastro novo falha
com `email_taken`, ou o `createId()` novo colide em `User_email_unique` (`23505`,
o caso que `callback.ts` detecta e se recusa a mascarar). Reset de dev que toca
`User` deve limpar as duas chaves de cada e-mail na mesma passada (separador
`\x1f`, `String.fromCharCode(0x1f)` — não `:`), ou apagar o namespace inteiro de
um stage descartável.

## 5. Endpoints internos do Worker `Auth` (protegidos por segredo)

Rotas definidas em `config.ts` (caminhos compartilhados pelos dois lados):

| Constante | Caminho | Faz |
|---|---|---|
| `identityDeletePath` | `/internal/identity/delete` | Apaga credenciais, perfil e todos os refresh tokens do e-mail |
| `signOutOthersPath` | `/internal/identity/sign-out-others` | Revoga todos os refresh tokens do e-mail exceto o do chamador |
| `seedAccountPath` | `/internal/identity/seed` | Cria/redefine identidade com senha conhecida (só seed de demo) |

Todas: `POST`, cabeçalho `x-admin-secret` comparado em **tempo constante**
(`secretsMatch`), **503** se `ADMIN_SECRET` não estiver configurado (recusa em vez
de expor endpoint sem autenticação), **403** se não bater. O segredo é gerado por
stage (`random.RandomUuid("AuthAdminSecret")`), nunca versionado, e chega ao app
como `NUXT_AUTH_ADMIN_SECRET` (sem `PUBLIC`). A URL é pública, então **chegar por
service binding não prova nada**: o segredo é a autorização.
Motivo estrutural: `AuthKV` só está ligado ao Worker `Auth`; quem está fora dele
(o app, o script de seed) precisa **pedir** a operação.
Revogação casa por `properties.email` (não pelo hash do subject), porque o hash é
recalculado das propriedades atuais e deixa de bater se o perfil mudou (ex.:
`updateProfile` trocando `name`). O refresh token do cliente é
`"{subject}:{token}"`; o último `:` separa subject de token.
`seedAccount` é idempotente e não gera novo `id` para e-mail já existente (senão
o perfil do Postgres e os `TeamMembership` ficariam órfãos).

## 6. Rate limit de credenciais

`enforceCredentialRateLimit` roda **antes** do emissor (não nos callbacks dos
providers, que só executam depois da credencial já checada), só em `POST`, nas
rotas `/password/authorize`, `/password/register`, `/password/change`,
`/code/authorize` (5 tentativas; janela de 5 min no login, 15 min nas demais).
Chave: `auth:<pathname>:<ip>:<email>`; nos passos de verificação de código, que
não trazem e-mail, o e-mail vira `-` (um balde por IP). Ao estourar: redirect 302
para a página de origem com `err=too_many_requests` e `Retry-After`. Providers
OAuth (`/github/*`, `/google/*`) ficam de fora de propósito. Implementação em
`apps/functions/src/rate-limit.ts` (KV cru, TTL mínimo 60 s; `CF-Connecting-IP`).
Não é throttle geral de API: procedures tRPC comuns **não** são limitadas.

## 7. Lado do app (`apps/app/server/`)

- Cookies: `nuxfire-access-token` (**não** httpOnly: o WebSocket do browser
  precisa dele) e `nuxfire-refresh-token` (httpOnly), `sameSite: "lax"`, 1 ano
  (`setTokens`). Sessão elevada de admin de plataforma:
  `nuxfire-platform-mfa-verified`, sessão h3 selada e **distinta** desse par.
  MFA de usuário: `nuxfire-mfa-verified` (`user-mfa-session.ts`).
- `api/auth/callback.ts`: troca `code` por tokens (`client.exchange`), grava
  cookies, lê a sessão com os tokens **explícitos** (o cookie antigo do navegador
  poderia vencer e falhar a verificação), faz **upsert de `User` por
  `session.id`** (nunca por e-mail: o e-mail é atributo mutável da identidade;
  usar e-mail duplicaria o perfil e o usuário perderia equipes e permissões) e
  redireciona ao cookie `nuxfire-redirect` ou `/`. Erro `23505` é logado como
  "identidade e perfil fora de sincronia" e relançado — não reaproveite a linha
  de outro perfil nem reescreva o `id` (nada tem FK para protegê-lo).
- `getUserSession`: sem access token retorna cedo (evita ida ao `Auth` só para
  ouvir "não logado"); `client.verify(subjects, access, { refresh })` e regrava
  os cookies se renovou.
- `getUser(event)`: perfil por **id** (mesmo critério do upsert e das permissões),
  **sem** `mfaSecret` (o resultado vai ao `/api/auth/session`), com permissões por
  equipe, `isPlatformAdmin` (só booleano) e `mfaEnabled` (booleano). Sem linha em
  `User`, cai para o subject do token (senão daria loop infinito para
  `/authorize`).
- `getUserPermissions` degrada para "sem permissões" se o banco falhar —
  guarda-corpo, não correção; se logar, é bug real.
- Rotas: `api/auth/{callback,session.get,session.delete,ws-ticket.get}`,
  `api/mfa/{challenge,setup,status,verify}`.

## 8. Exclusão de conta

`account.deleteAccount` (`apps/app/server/trpc/routers/account.ts`) chama o
endpoint interno do `Auth` pelo service binding com `x-admin-secret`; existe para
que identidade e perfil nunca fiquem fora de sincronia.

## 9. Logs

Nunca passe um `Error` cru ao `console.error` em Worker: `message`, `stack` e
`name` não são enumeráveis e o log sai como `{}`. Extraia os campos
(`{ message, name, stack }`) antes — padrão de `auth.ts`, `callback.ts`,
`emails.ts`.

## 10. O que NÃO existe

- Tabela de sessão no Postgres; NextAuth/Lucia/Clerk; magic link como único
  método (existem senha **e** código).
- Autoatendimento de recuperação de MFA: admin bloqueado exige edição direta do
  banco para limpar `mfaEnabledAt`.
- Papéis `SUPER_ADMIN`/`SUPPORT` diferenciados em permissão (o enum existe; a
  procedure ainda não os distingue).
