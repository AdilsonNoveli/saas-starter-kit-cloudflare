# Contas iniciais e acesso ao `/admin`

Como criar a conta do dono da plataforma (SUPER_ADMIN) e uma conta de cliente
de demonstração, e como o primeiro acesso ao console `/admin` funciona.

## Pré-requisitos

- Migrations aplicadas (`bunx drizzle-kit migrate`, de dentro de
  `packages/functions`).
- Os dois secrets obrigatórios de `/admin/*` carregados no cofre do stage —
  sem eles as rotas `/admin/*` falham fechado, não degradam para um modo
  inseguro (ver `.env.example`):
  ```bash
  PLATFORM_MFA_SESSION_SECRET=$(openssl rand -base64 32)
  PLATFORM_ADMIN_ENCRYPTION_KEY=$(openssl rand -base64 32)
  ```
- Stage já implantado (`bun run deploy`).

## Rodando o seed de contas

`seed-demo-accounts.ts` é manual — diferente de `seed.ts` (planos/papéis do
sistema), não roda sozinho a cada deploy. Execute de dentro de
`packages/functions`, com duas variáveis derivadas do Worker de auth já
implantado (nomes exatos documentados no topo do próprio script):

- `AUTH_URL` — URL pública do Worker de auth (o mesmo valor que
  `infra/app.ts` passa ao app como `NUXT_PUBLIC_AUTH_URL`).
- `AUTH_ADMIN_SECRET` — segredo compartilhado gerado por deploy em
  `infra/auth.ts` (`adminSecret`), entregue ao app como
  `NUXT_AUTH_ADMIN_SECRET`.

```bash
AUTH_URL=... AUTH_ADMIN_SECRET=... \
  bun run src/database/seed-demo-accounts.ts \
  --owner-email=owner@nuxfire.com --owner-password=owner@12345678
```

O script é idempotente e aceita `--owner-email=` / `--owner-password=` /
`--client-email=` / `--client-password=` para sobrescrever os defaults.

## Contas criadas (defaults)

Estes são placeholders para desenvolvimento e demonstração — sobrescreva via
flags do script para qualquer uso além de teste local. Não são credenciais
para produção.

| Papel | E-mail | Senha | Observação |
|---|---|---|---|
| Dono da plataforma (SUPER_ADMIN) | `owner@nuxfire.com` | `owner@12345678` | acessa `/admin` |
| Cliente de teste | `client@nuxfire.com` | `client@12345678` | tenant "Demo Company" |

## Primeiro acesso

1. Logue com a conta do dono.
2. Acesse `/admin` — o redirecionamento para `/admin/mfa` é automático: a
   conta existe, mas nenhuma rota de admin abre até o MFA ser cadastrado.
3. Escaneie o QR code em `/admin/mfa` com Google Authenticator, Authy ou
   1Password (o QR é gerado 100% no navegador — o segredo TOTP nunca é
   enviado a um serviço externo).
4. A sessão elevada de MFA dura 30 minutos; passado esse tempo, uma nova
   verificação de código é pedida antes de qualquer ação em `/admin` (sem
   precisar re-escanear o QR).

Perda do autenticador não tem recuperação self-service hoje — exige uma
edição direta no banco para limpar `mfaEnabledAt` do admin afetado.
