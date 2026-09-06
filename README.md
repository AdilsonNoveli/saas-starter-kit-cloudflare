# Movimenta Bairro

Monorepo Nuxt + SST, rodando 100% em Cloudflare Workers (Postgres via Hyperdrive, KV, R2, Queues, Durable Objects) — `sst.cloudflare.Worker` nativo ponta a ponta, um único caminho de deploy (sem `wrangler.toml`/`wrangler.json` gerado na mão, sem CI paralelo). Passo a passo completo de setup em [guia-rapido.md](./guia-rapido.md) — este arquivo é só a referência rápida de comandos.

## Instalar

```bash
bun install
```

## Desenvolvimento local

```bash
bun run app    # app principal (dashboard) — localhost
bun run web    # site público (landing, blog, docs) — localhost
```

Usa wrangler/miniflare pra emular os bindings da Cloudflare (KV, R2, Hyperdrive) localmente.

## Desenvolvimento remoto

Conecta nos recursos já implantados na Cloudflare em vez de emular localmente:

```bash
bun run app-remote
bun run web-remote
```

## Segredos e deploy — passo a passo

Cada stage (seu ambiente pessoal de dev, produção, etc.) tem seu próprio
arquivo de segredos, nunca um `.env` único reaproveitado. `.env.example` é o
template — todas as chaves, valores em branco, comentado.

**0. Autentique o SST na Cloudflare (obrigatório, toda sessão de terminal).**
Isto não é opcional nem é um secret do cofre — o SST precisa disso como
variável de ambiente **real** em todo comando `sst` (é assim que ele se
autentica antes de conseguir ler o cofre):

**PowerShell** (padrão no Windows):
```powershell
$env:CLOUDFLARE_API_TOKEN = "seu_token"
$env:CLOUDFLARE_ACCOUNT_ID = "seu_account_id"
```
Só vale pra essa janela. Pra deixar permanente:
```powershell
[Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "seu_token", "User")
[Environment]::SetEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID", "seu_account_id", "User")
```
(abra um terminal novo depois pra valer)

**bash/zsh** (Git Bash, Linux, macOS):
```bash
export CLOUDFLARE_API_TOKEN=seu_token
export CLOUDFLARE_ACCOUNT_ID=seu_account_id
```
Pra deixar permanente, adicione essas duas linhas no `.bashrc`/`.zshrc`.

Sem isso, `secret load` e `deploy` falham na autenticação. Onde conseguir o
token/Account ID: [guia-rapido.md](./guia-rapido.md).

**1. Ambiente de desenvolvimento (seu stage pessoal).** Preencha
`.env.stage` (copie de `.env.example` se ainda não existir) e carregue com
`--fallback` — vira o valor padrão pra qualquer stage sem secret próprio:
```bash
bunx sst secret load .env.stage --fallback
bun run deploy
```

**2. Produção.** Preencha `.env.production` com os valores **reais** de
produção (chaves live do Stripe/Paddle, banco de produção, etc. — nunca os
mesmos valores de teste do `.env.stage`) e carregue **sem** `--fallback`,
direto no stage `production`:
```bash
bunx sst secret load .env.production --stage production
bun run deploy -- --stage production
```

Os dois arquivos (`.env.stage`, `.env.production`) ficam de fora do commit
automaticamente (`.gitignore` cobre `.env*`) — mantenha-os localmente, não
apague depois de carregar, você vai precisar deles de novo quando algum
segredo mudar.

Cada deploy do worker `App` roda as migrations do banco automaticamente logo
em seguida. Único caminho de deploy hoje: `sst deploy` direto (via
`bun run deploy`) — sem CI/GitHub Actions, sem `wrangler` por fora.

## Migrations do banco

As migrations já estão versionadas em `packages/functions/src/database/migrations/`. Só é preciso gerar novas se `packages/functions/src/database/schema.ts` mudar:

```bash
cd packages/functions
DATABASE_HOST=... DATABASE_PORT=5432 DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_NAME=... \
  bunx drizzle-kit generate
```

Estratégia de rollback documentada em [packages/functions/src/database/MIGRATIONS.md](./packages/functions/src/database/MIGRATIONS.md).

## Popular dados iniciais (seed)

Nada a fazer manualmente: `packages/functions/src/database/seed.ts` roda a cada
deploy (logo depois das migrations, ver `infra/utils/nuxt.ts`) e cria o plano
Free e os papéis de sistema de forma idempotente.

Planos pagos não são seed — são criados pelo dono da plataforma em `/admin/plans`,
já com os price IDs reais do Stripe/Paddle.

## Formatar código

```bash
bun run format
```
