Guia de Início Rápido
Comece a usar o Movimenta Bairro.

Este guia ajuda você a configurar o ambiente de desenvolvimento e implantar o Nuxfire na sua conta Cloudflare.


Faça download do repositório para sua máquina extraia na pasta correta em seguida use qualquer IDE com LLM e use o prompt:

## CRIAR REPOSITÒRIO:

markdown
Você é o assistente técnico deste projeto. O código-fonte na pasta local precisa ser inicializado como um repositório Git do zero, estruturado com as branches oficiais e conectado ao GitHub.

Execute os passos a seguir rigorosamente nesta ordem:

1. INICIALIZAÇÃO E ORIGIN:
   - Inicialize o repositório Git local (se ainda não estiver inicializado):
     git init
   - Conecte ou atualize o remote origin para o repositório oficial:
     git remote remove origin (caso já exista algum remote incorreto)
     git remote add origin https://github.com/pedped-app/nuxfire.git

2. COMMIT INICIAL:
   - Verifique o `.gitignore` para garantir que pastas desnecessárias (`node_modules/`, `.sst/`, etc.) não sejam rastreadas.
   - Adicione todos os arquivos do projeto e faça o commit inicial:
     git add -A
     git commit -m "feat: initial commit - nuxfire"

3. ESTRUTURA DE BRANCHES:
   - Crie e mude para a branch de desenvolvimento `stage` (ela deve ser a branch ativa de trabalho):
     git branch -M stage
   - A partir de `stage`, crie a branch de produção `production`:
     git branch production
   - Confirme que você permaneceu na branch `stage`:
     git checkout stage

4. PUSH PARA O GITHUB:
   - Envie as duas branches para o repositório remoto configurando o upstream:
     git push -u origin stage
     git push -u origin production

5. VALIDAÇÃO:
   - Execute `git status`, `git branch -a` e `git remote -v` para confirmar que:
     a) O remote aponta para https://github.com/pedped-app/nuxfire.git
     b) A branch ativa é a `stage`
     c) A branch `production` foi criada com sucesso
   - Exiba o resumo final da configuração.

## INSTALAR AS DEPENDENCIAS:

markdown
```Você é o assistente técnico deste projeto. O repositório é um monorepo full-stack baseado em Nuxt 4, Cloudflare Workers e SST, utilizando Bun como gerenciador de pacotes oficial.
Sua tarefa é inicializar o ambiente e instalar todas as dependências do projeto corretamente:
1. GERENCIADOR OBRIGATÓRIO:
   - Utilize ESTRITAMENTE o `bun` (não utilize `npm`, `yarn` ou `pnpm`). O projeto possui `bun.lock`, configurações de workspaces (`packages/*`), dependências patchadas (`patches/`) e `trustedDependencies` configuradas para o runtime do Bun.
2. INSTALAÇÃO:
   - Execute na raiz do projeto:
     bun install
   - Nota: A instalação pode demorar alguns minutos dependendo da conexão, pois envolve pacotes nativos e os scripts de postinstall dos apps Nuxt (`nuxt prepare`). Dê tempo para o processo concluir.
3. PÓS-INSTALAÇÃO / PREPARAÇÃO:
   - Verifique se os pacotes `@nuxfire/app`, `@nuxfire/web` e `@nuxfire/auth-frontend` executaram o `nuxt prepare` com sucesso gerando os diretórios `.nuxt` e tipos do `@nuxt/content`.
   - Se algum pacote Nuxt não tiver gerado os tipos automaticamente, rode `bun run postinstall` na pasta correspondente.
4. VERIFICAÇÃO FINAL:
   - Execute `git status` para confirmar se a árvore de trabalho e o lockfile estão íntegros e reporte o status ao finalizar.
```

## Pré-requisitos

Antes de começar, você precisa de:

- Uma conta Cloudflare (plano pago — websockets e filas exige ativa "Get started with R2" colocar cartão de crédito para ativar use img em: packages\web\public\images\docs\Get-started-with-R2.webp)
- Um domínio configurado com os servidores de nomes da Cloudflare
- Uma conta cloudflare e credenciais configuradas: Acesse o dashboard da cloudflare --va em Manage accoount e depois em Account API tokens e crie um token. (use imagem: packages\web\public\images\docs\account-API-tokens4-cloudflare.webp)

- Um banco Postgres real (Supabase, RDS, ou qualquer Postgres padrão — a conexão é sempre via protocolo Postgres nativo, nunca via SDK de um provedor específico)
- Acesso ao repositório GitHub `pedped-app/nuxfire`

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

1. Mantenha ou renomeie o 'Token name' (use imagem: packages\web\public\images\docs\token-name-cloudflare.webp) 
-- em seguida clique em Edit Cloudflare Workers (use imagem: packages\web\public\images\docs\Edit-Cloudflare-Workers.webp)

2. Primeira politica Clique em **"All zones ... Account"** pra criar uma segunda política, com escopo de **zona** (Custom Domains do Workers exige isso separado da conta):
   - Troque o escopo dessa política pra **"Specified Domains"** e escolha o dominio correto (use imagem: packages\web\public\images\docs\pecified-domains.webp)
   - Selecione o domínio que vocês vão usar
   - Busque `Workers Routes` e marque **Edit** — não é `DNS: Edit`; o Custom Domains do Workers cria o registro DNS automaticamente por trás usando essa permissão (use imagem: packages\web\public\images\docs\Workers-Routes.webp)

3. Segunda política, escopo **"Entire Account"**, adicione no mínimo (buscando cada termo e marcando **Edit**) — tudo bem se vier mais coisa marcada por padrão, não atrapalha: Confirme se todas estão marcadas com edit (use imagem: packages\web\public\images\docs\edit-account.webp )

   - `Workers Scripts`
   - `Workers KV`
   - `Workers R2`
   - `Queues`
   - `Hyperdrive`

-- Clique em 'Review token' - (use a imagem: packages\web\public\images\docs\Review-token.webp)
-- Por fim confira e clique em 'Create token' (use imagem: packages\web\public\images\docs\create-token.webp)
-- Salve os tokens em um local seguro porém o que vamos usar são API token e Id user. (Use imagem: packages\web\public\images\docs\tokens.png)


3. **"Continuar para o resumo"** → **"Criar Token"**
4. Copie o valor mostrado — só aparece **uma vez**.

Guarde os dois — eles vão precisar ser variável de ambiente (veja o passo 5) **e também** entrar no `.env` que você vai carregar como secret. São as duas únicas variáveis que precisam das duas coisas ao mesmo tempo.

### 3. Clonar e instalar

```bash
git clone https://github.com/pedped-app/nuxfire.git
cd nuxfire
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

O configue deve ser preenchido com o domínio e os flags de feature. Ajuste `prodDomain`/`devDomain` para o domínio real de vocês, e desative em `flags` qualquer integração que não for usar (Stripe, Paddle, websockets, filas, IA) — reduz a quantidade de secrets necessários. 

### 5. Configure os segredos (secrets)

O projeto **não usa arquivo `.env` em produção** — segredos ficam só no cofre do próprio SST. Hoje é 100% Cloudflare/SST; deploy automatizado via GitHub Actions (ou qualquer outro CI) fica pra quando for realmente necessário — não existe caminho alternativo/paralelo por enquanto.

`CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` não podem ficar só como secret do SST — o SST exige os dois como variável de ambiente real em **todo** comando (`secret load`, `secret set`, `deploy`, `dev`...), porque é essa credencial que autentica o SST na Cloudflare antes mesmo de conseguir ler o cofre.

No **PowerShell** (padrão no Windows):
```powershell
$env:CLOUDFLARE_API_TOKEN = "seu_token"
$env:CLOUDFLARE_ACCOUNT_ID = "seu_account_id"
```

No **Linux/** (padrão no Linux):

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

Contas de demonstração (dono da plataforma e cliente de teste) **não** fazem
parte deste seed automático — são criadas por um script manual separado, ver
[contas-demo.md](./contas-demo.md).

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

---

Contas iniciais (dono da plataforma e cliente de demonstração), o script de
seed manual e o fluxo de primeiro acesso ao `/admin` (MFA obrigatório) estão
documentados em [contas-demo.md](./contas-demo.md).

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