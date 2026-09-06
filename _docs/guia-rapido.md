Guia de Início Rápido
Comece a usar o Movimenta Bairro.

Este guia ajuda você a configurar o ambiente de desenvolvimento e implantar o Movimenta Bairro na sua conta Cloudflare.

## Pré-requisitos

Antes de começar, você precisa de:

- Uma conta Cloudflare (plano pago — websockets e filas exigem Workers Paid)
- Um domínio configurado com os servidores de nomes da Cloudflare
- Um banco Postgres real (Supabase, RDS, ou qualquer Postgres padrão — a conexão é sempre via protocolo Postgres nativo, nunca via SDK de um provedor específico)
- Acesso ao repositório GitHub `pedped-app/movimenta-bairro`

## Estrutura do repositório

Monorepo com vários pacotes:

- `packages/app`: aplicativo principal (dashboard, Nuxt)
- `packages/web`: site público — landing, blog, docs
- `packages/auth-frontend`: interface de login/cadastro
- `packages/functions`: código dos Cloudflare Workers (auth issuer, e-mail, websockets, jobs, cron)
- `packages/emails`: templates de e-mail (React Email)

A infraestrutura inteira (Workers, Hyperdrive, KV, R2, Queues, Durable Objects) é definida como código em `infra/*.ts` usando [SST](https://sst.dev) — `sst.cloudflare.Worker` nativo ponta a ponta, sem `wrangler.toml`, sem `wrangler.json` gerado na mão, sem `wrangler deploy` chamado por fora do SST. Um único caminho de deploy.

## Banco de dados: Postgres via Cloudflare Hyperdrive

Cloudflare Workers não seguram conexão TCP direta com Postgres — por isso o banco é acessado através do [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) (`infra/database.ts`), que faz o pooling da conexão real. A extensão `postgis` já vem habilitada na migration inicial, para features de mapa futuras.

Migrations ficam em `packages/functions/src/database/migrations/` (Drizzle Kit). Veja `packages/functions/src/database/MIGRATIONS.md` para a estratégia de rollback.

## Etapas de configuração

### 1. Instale o Bun

```bash
curl -fsSL https://bun.sh/install | bash
```
(No Windows, sem WSL: `npm install -g bun`.)

### 2. Configure o acesso à Cloudflare

**Onde criar o token**: no dashboard da Cloudflare, **Gerenciar conta → Tokens de API da conta** (ou diretamente em https://dash.cloudflare.com/profile/api-tokens) → **"+ Criar token"** → **"Criar token personalizado"**.

Na tela de política (o layout muda de vez em quando — use a caixa **"Pesquisar grupos de permissão..."** se não achar por categoria):

1. Primeira política, escopo **"Conta inteira"**, adicione no mínimo (buscando cada termo e marcando **Edit**) — tudo bem se vier mais coisa marcada por padrão, não atrapalha:
   - `Workers Scripts`
   - `Workers KV`
   - `Workers R2`
   - `Queues`
   - `Hyperdrive`
2. Clique em **"+ Adicionar política"** pra criar uma segunda política, com escopo de **zona** (Custom Domains do Workers exige isso separado da conta):
   - Troque o escopo dessa política pra **"Zona específica"** (ou "Todas as zonas", se preferir)
   - Selecione o domínio que vocês vão usar
   - Busque `Workers Routes` e marque **Edit** — não é `DNS: Edit`; o Custom Domains do Workers cria o registro DNS automaticamente por trás usando essa permissão
3. **"Continuar para o resumo"** → **"Criar Token"**
4. Copie o valor mostrado — só aparece **uma vez**.

O **Account ID** fica em outro lugar: página principal do dashboard (visão geral da conta), barra lateral direita, campo "Account ID".

Guarde os dois — eles vão precisar ser variável de ambiente (veja o passo 5) **e também** entrar no `.env` que você vai carregar como secret. São as duas únicas variáveis que precisam das duas coisas ao mesmo tempo.

### 3. Clonar e instalar

```bash
git clone https://github.com/pedped-app/movimenta-bairro.git
cd movimenta-bairro
bun install
```

As migrations do banco já estão versionadas em `packages/functions/src/database/migrations/`. Só é preciso gerar novas se você alterar `packages/functions/src/database/schema.ts`:

```bash
cd packages/functions
DATABASE_HOST=... DATABASE_PORT=5432 DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_NAME=... \
  bunx drizzle-kit generate
```

(Sem `DATABASE_URL` — o `drizzle.config.ts` já lê host/porta/usuário/senha/nome separados, evita ter que montar/escapar uma URL com senha.)

### 4. Configure `config.ts`

Já está preenchido com o domínio e os flags de feature do Movimenta Bairro. Ajuste `prodDomain`/`devDomain` para o domínio real de vocês, e desative em `flags` qualquer integração que não for usar (Stripe, Paddle, websockets, filas, IA) — reduz a quantidade de secrets necessários.

### 5. Configure os segredos (secrets)

O projeto **não usa arquivo `.env` em produção** — segredos ficam só no cofre do próprio SST. Hoje é 100% Cloudflare/SST; deploy automatizado via GitHub Actions (ou qualquer outro CI) fica pra quando for realmente necessário — não existe caminho alternativo/paralelo por enquanto.

`CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` não podem ficar só como secret do SST — o SST exige os dois como variável de ambiente real em **todo** comando (`secret load`, `secret set`, `deploy`, `dev`...), porque é essa credencial que autentica o SST na Cloudflare antes mesmo de conseguir ler o cofre.

No **PowerShell** (padrão no Windows):
```powershell
$env:CLOUDFLARE_API_TOKEN = "seu_token"
$env:CLOUDFLARE_ACCOUNT_ID = "seu_account_id"
```
Permanente: `[Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "seu_token", "User")` (e o mesmo pro Account ID) — abre terminal novo depois.

No **bash/zsh**:
```bash
export CLOUDFLARE_API_TOKEN=seu_token
export CLOUDFLARE_ACCOUNT_ID=seu_account_id
```
Permanente: adicione as duas linhas no `.bashrc`/`.zshrc`.

Depois, carregue o resto dos segredos no cofre do SST — um arquivo por
stage, nunca um `.env` único reaproveitado. `.env.example` é o template
(todas as chaves, valores em branco):

```bash
cp .env.example .env.stage
# preencha .env.stage com os valores do seu ambiente de dev
bunx sst secret load .env.stage --fallback
```

`.env.stage`/`.env.production` ficam de fora do commit automaticamente
(`.gitignore` cobre `.env*`) — mantenha-os localmente, não apague depois de
carregar.

### 6. Implante sua instância

```bash
bun run deploy
```

Implanta no seu stage de desenvolvimento (o SST usa seu nome de usuário do sistema como nome do stage por padrão).

### 7. Fluxo de trabalho de desenvolvimento

Servidor de desenvolvimento local (usa wrangler/miniflare para os bindings Cloudflare):

```bash
bun run app    # roda o app principal localmente
bun run web    # roda o site público localmente
```

Desenvolvimento remoto (conecta na infra já implantada):

```bash
bun run app-remote
```

### 8. Popular dados iniciais (seed)

Não há passo manual: `packages/functions/src/database/seed.ts` roda a cada
deploy, logo depois das migrations (ver `infra/utils/nuxt.ts`), e cria o plano
Free e os papéis/permissões de sistema — idempotente, então rodar de novo não
duplica nada.

Planos pagos ficam de fora do seed de propósito (price IDs de Stripe/Paddle são
por ambiente): eles são criados em `/admin/plans` pelo dono da plataforma.

## Stages de implantação

- **Desenvolvimento**: usa seu nome de usuário como nome do stage por padrão.
- **Produção**: preencha `.env.production` com valores reais, carregue e
  implante:
  ```bash
  bunx sst secret load .env.production --stage production
  bun run deploy -- --stage production
  ```
- **Stages customizados**: `bun run deploy -- --stage nome-custom` (o `--`
  é necessário pra passar a flag através do script do `bun run`).
