---
title: "Git para o Primeiro Lançamento: Branches stage e production, do Repositório Vazio ao Ar"
date: "2026-09-25"
description: "Um manual de nível sênior para quem acabou de adquirir o Nuxfire: crie o repositório, torne a stage a branch padrão, remova a main, promova para production por fast-forward e publique sua primeira versão com segurança."
author: "Equipe Nuxfire"
category: "DevOps"
readTime: "14 min"
tags: ["Git", "GitHub", "Branching", "Release", "Deploy", "SST"]
image: "/images/blog/git-branching-stage-production.svg"
lang: pt-br
ogImage: "/images/blog/git-branching-stage-production.png"
translations:
  en: git-branching-stage-production-first-release
  pt-br: git-branches-stage-production-primeiro-lancamento
  es: git-ramas-stage-production-primer-lanzamiento
---

Você extraiu o código-fonte do Nuxfire e está prestes a publicar seu primeiro produto. Antes de rodar qualquer comando `sst`, dedique vinte minutos ao que decide se os próximos cem deploys serão tranquilos ou estressantes: **como as suas branches do Git se relacionam com o que está no ar**.

Este manual constrói um modelo pequeno e rigoroso. Todo comando Git aqui foi executado de ponta a ponta em um repositório de teste antes da publicação; as opções do GitHub CLI vêm do manual oficial. Cada etapa traz os comandos manuais e um prompt curto para colar em um agente de IA na sua IDE (Cursor, Claude Code, Copilot e similares).

## O modelo em um minuto

```text
feature/x ──▶ stage ──(validated)──▶ production
              default branch          moves ONLY by fast-forward
              you work here           = what you approved for live
```

Duas branches de longa duração e cinco regras:

1. **Todo o trabalho acontece na `stage`.** Ela é a branch padrão, então pull requests e clones caem nela.
2. **A `production` só avança por fast-forward a partir da `stage`.** Sem commits de merge e sem commits diretos.
3. **Nunca faça force-push na `production`.** Se um push for rejeitado, é a rede de segurança funcionando.
4. **Faça o deploy de produção a partir da branch `production`.** Um deploy publica o que estiver em checkout na sua máquina, então a branch em que você está é a verdade.
5. **Marque com uma tag cada release que foi ao ar** (`v1.0.0`). A branch diz "aprovado", a tag diz "confirmado no ar".

Por que não manter a `main` também? Uma terceira branch de longa duração é uma terceira resposta para "qual é o código mais recente?". O Nuxfire já chama seus estágios de deploy de `stage` e `production`, então as branches espelham esses nomes e não há nada para traduzir na sua cabeça.

## O que você precisa

- Git **2.28 ou mais novo** (para o `git init -b`). Confira com `git --version`.
- Uma conta no GitHub (pessoal ou organização). O GitHub CLI (`gh`) é opcional; cada etapa também mostra o caminho pela interface web.
- A pasta do Nuxfire extraída e o `bun install` feito, como em [Instalação](/docs/saas-starter-kit/getting-started/installation).

## Etapa 1: diga ao Git quem você é

```bash
git --version
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch stage
```

A última linha faz todo repositório novo que você criar começar na `stage`, em vez de `master` ou `main`.

**Prompt para agentes de IA:**
```text
Check `git --version` (2.28 or newer is required). Show my global git
user.name and user.email. If either is empty, ask me for the values
before setting them. Do not change anything else.
```

## Etapa 2: proteja seus segredos e faça o primeiro commit

Sua pasta já contém arquivos que **nunca** podem chegar ao Git: `.env.production` e `.env.stage` guardam credenciais reais (a verificação prévia do deploy até confere se os valores do banco estão preenchidos), e `.sst` é o estado local do deploy. O `.gitignore` do Nuxfire cobre todos eles:

```text
.env
.env.*
!.env.example
.sst
```

Crie o repositório na `stage`, prove que as regras funcionam e só então adicione tudo:

```bash
git init -b stage
git check-ignore -v .env.production .env.stage .sst
git add -A
git diff --cached --name-only | grep -E "(^|/)\.env"
```

O `check-ignore` precisa imprimir a regra que casa com cada arquivo. O último comando precisa imprimir **somente** `.env.example`. Se qualquer outro arquivo `.env*` aparecer, pare e corrija o `.gitignore` antes de commitar.

```bash
git commit -m "chore: initial commit from Nuxfire"
```

> Se um segredo for commitado alguma vez, apagar o arquivo não basta: ele continua no histórico. Trate a credencial como comprometida, troque-a primeiro e só depois limpe o histórico.

**Prompt para agentes de IA:**
```text
In the project root, run `git init -b stage` only if there is no .git
folder. With `git check-ignore -v`, verify that .env.production,
.env.stage and .sst are ignored and that .env.example is not. Run
`git add -A` and print `git diff --cached --name-only`. STOP and warn me
if any .env* file other than .env.example is listed. If it is clean,
commit with the message "chore: initial commit from Nuxfire".
```

## Etapa 3: crie o repositório no GitHub e envie a `stage`

Crie um repositório **privado e vazio**: sem README, sem `.gitignore`, sem licença. No navegador, use **New repository**, escolha **Private** e deixe as opções de inicialização desmarcadas. Ou, pela CLI, dentro da pasta do projeto:

```bash
gh repo create my-product --private --source=. --remote=origin
```

A CLI adiciona o remoto `origin` para você. Sem ela, adicione o remoto manualmente, com a URL que o GitHub mostra:

```bash
git remote add origin git@github.com:YOUR-USER/my-product.git
```

Nos dois casos, publique a `stage` e configure o rastreamento do remoto:

```bash
git push -u origin stage
```

**Prompt para agentes de IA:**
```text
Create a PRIVATE, empty GitHub repository named <name> under <owner>
(no README, no .gitignore, no license), add it as `origin`, and push the
`stage` branch with upstream tracking. Use `gh` if it is installed;
otherwise print the exact commands for me to run. Never use --force.
```

## Etapa 4: crie a `production`

Crie a branch a partir da `stage`, no mesmo commit, publique-a e volte:

```bash
git switch -c production
git push -u origin production
git switch stage
```

Agora adicione uma trava local para que a `production` só possa avançar por fast-forward. O Git vai recusar qualquer merge que não seja um fast-forward:

```bash
git config branch.production.mergeOptions --ff-only
```

**Prompt para agentes de IA:**
```text
Create branch `production` from `stage`, push it with upstream tracking,
switch back to `stage`, then run
`git config branch.production.mergeOptions --ff-only`.
Confirm the result with `git branch -vv`.
```

## Etapa 5: torne a `stage` a branch padrão e remova a `main`

Quem decide a branch padrão é o GitHub, não o seu Git local. Mesmo em um repositório vazio ela pode continuar sendo a `main`, então confira explicitamente. O GitHub exige **mais de uma branch** para trocar a padrão, e é por isso que a `production` precisava existir antes.

No navegador: **Settings → Branches → Default branch**, clique no ícone de troca, escolha `stage`, **Update** e confirme. Pela CLI:

```bash
gh repo edit --default-branch stage
```

Depois veja o que existe no remoto e, se a `main` estiver lá (por exemplo, porque o repositório foi criado com um README), apague-a. Faça isso **depois** de trocar a padrão, nunca antes:

```bash
git ls-remote --heads origin
```

```bash
git push origin --delete main
```

Por fim, atualize o seu ponteiro local para a branch padrão do remoto:

```bash
git remote set-head origin --auto
```

Se a `main` foi criada com um README, ela tem um histórico sem relação com o seu. Não faça merge dela na `stage`; apenas apague.

**Prompt para agentes de IA:**
```text
Check which branch is the GitHub default with
`gh repo view --json defaultBranchRef`. If it is not `stage`, run
`gh repo edit --default-branch stage`. Then run
`git ls-remote --heads origin`. If `main` exists, tell me and WAIT for my
confirmation before running `git push origin --delete main`. Finish with
`git remote set-head origin --auto`.
```

## Etapa 6: travas no GitHub (se o seu plano tiver)

A trava local `--ff-only` não custa nada e não depende de plano. No GitHub, a proteção de branches e os rulesets dependem do seu plano e da visibilidade do repositório (os rulesets estão documentados para os planos GitHub Team e GitHub Enterprise). Se o seu plano oferecer, proteja a `production` bloqueando force pushes e restringindo exclusões. Se não, o processo e a trava local bastam, desde que você nunca faça force-push.

## Etapa 7: o dia a dia

Trabalhando sozinho, faça commit na `stage` e envie:

```bash
git switch stage
git add -A
git commit -m "feat: describe the change"
git push
```

Trabalhando em equipe, use branches curtas e pull requests para a `stage`:

```bash
git switch -c feat/billing-copy
git push -u origin feat/billing-copy
```

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`). O próprio histórico do Nuxfire os segue, o que deixa as notas de release quase de graça.

## Etapa 8: o portão antes do primeiro lançamento

Nada chega à `production` sem passar pelas mesmas verificações, sempre:

```bash
bun install
bun run test
bun run doctor -- --stage production
```

O `doctor` é a verificação prévia do deploy: valida seu token da Cloudflare, seus valores `BRAND_*`, os segredos do banco e a zona do domínio, e diz a correção exata de cada problema antes que você gaste minutos em um deploy que vai falhar.

Para um primeiro produto, faça o deploy de um **estágio de validação** antes da produção. Um estágio que não é de produção ganha seus próprios Workers, conexão de banco e segredos, e responde em `<stage>.dev.<seu-domínio>`:

```bash
bun run deploy -- --stage stage
```

O `--` é necessário para que a flag chegue ao script. O token e os segredos estão em [Acesso à Cloudflare](/docs/saas-starter-kit/getting-started/cloudflare-access), [Secrets](/docs/saas-starter-kit/getting-started/secrets) e [Deploy](/docs/saas-starter-kit/getting-started/deploy). Um pré-requisito só da produção vale conhecer desde já: o domínio raiz e o `www` **não** podem ter nenhum registro A, AAAA ou CNAME no seu DNS, senão a Cloudflare rejeita o domínio personalizado (erro `100117`).

**Prompt para agentes de IA:**
```text
Run `bun install`, `bun run test` and
`bun run doctor -- --stage production`. Report every failure with its
exact message and the fix. Do NOT deploy anything.
```

## Etapa 9: o primeiro lançamento

Tudo está verde na `stage`. Promova-a:

```bash
git status
git push origin stage
```

O `git status` precisa dizer que a árvore de trabalho está limpa. Agora avance a `production` por fast-forward para exatamente o mesmo commit, sem sair da `stage`:

```bash
git push origin stage:production
```

Esse push só é aceito se for um fast-forward puro. Confirme que as duas branches são idênticas e mude para a `production`, porque é dela que você faz o deploy:

```bash
git fetch origin
git diff --stat stage origin/production
git switch production
git pull --ff-only
```

O `diff` precisa imprimir nada. Rode a verificação prévia mais uma vez e faça o deploy:

```bash
bun run doctor -- --stage production
bun run deploy -- --stage production
```

Só depois que o deploy der certo, marque a release com uma tag e volte a trabalhar:

```bash
git tag -a v1.0.0 -m "First production release"
git push origin v1.0.0
git switch stage
```

Se o deploy falhar, não edite a `production`. Corrija adiante na `stage`, rode o portão de novo e repita o fast-forward. A branch pode ficar brevemente à frente do que está no ar, e a ausência da tag mostra exatamente isso.

**Prompt para agentes de IA:**
```text
Release checklist for the first release. Stop at the first failure:
1. `git status` must be clean and on `stage`.
2. `git push origin stage`.
3. `git push origin stage:production`. If it is rejected, STOP and show
   me `git log --oneline stage..production`. Never force.
4. `git switch production && git pull --ff-only`.
5. `bun run doctor -- --stage production`.
6. Ask me for explicit confirmation, then run
   `bun run deploy -- --stage production`.
7. Only after a successful deploy: `git tag -a v1.0.0 -m "First
   production release"` and `git push origin v1.0.0`.
8. `git switch stage`.
```

## Etapa 10: impeça as duas branches de se afastarem

O modo de falha que pega todo mundo uma vez: uma correção cai na `production` (ou um deploy sai da `stage`) e as branches deixam de descrever o mesmo código sem ninguém notar. A verificação é uma linha, e deve sempre imprimir nada:

```bash
git fetch origin
git log --oneline stage..origin/production
```

Se imprimir commits, a `production` tem trabalho que a `stage` não tem. Uma promoção será rejeitada, e isso está correto. Traga o trabalho de volta, publique e avance de novo:

```bash
git switch stage
git merge origin/production
git push origin stage
git push origin stage:production
```

Se o merge relatar conflitos, resolva-os, rode o portão de novo e commite antes de enviar. Nunca resolva isso com `--force`: você apagaria justamente os commits que quer preservar.

**Prompt para agentes de IA:**
```text
Run `git fetch origin`, then `git log --oneline stage..origin/production`.
If it prints anything: merge origin/production into stage, resolve any
conflicts together with me, run `bun run test`, push stage, then
fast-forward production with `git push origin stage:production`.
Never use --force.
```

## Voltando atrás

Não reescreva a `production`. Faça o deploy do código de uma tag anterior:

```bash
git tag --sort=-creatordate
git switch --detach v1.0.0
bun run deploy -- --stage production
git switch stage
```

Isso restaura o **código**. As migrações do banco são aplicadas a cada deploy e não são desfeitas, então planeje mudanças de schema primeiro como aditivas (adicione uma coluna, publique o código que a usa, remova a antiga depois). Em seguida, corrija adiante na `stage` e promova uma nova release.

**Prompt para agentes de IA:**
```text
Do NOT touch the `production` branch. Show me
`git tag --sort=-creatordate | head`, ask which tag to restore, run
`git switch --detach <tag>`, and ask for my explicit confirmation before
`bun run deploy -- --stage production`. Afterwards run `git switch stage`.
```

## Quando algo dá errado

| O que você vê | O que significa | O que fazer |
| --- | --- | --- |
| `[rejected] stage -> production (non-fast-forward)` | A `production` tem commits que a `stage` não tem | Etapa 10. Nunca use force. |
| `fatal: Not possible to fast-forward, aborting.` | A trava local impediu um merge na `production` | Mesma causa e mesma solução acima |
| O GitHub não deixa apagar a `main` | Em geral, ela ainda é a branch padrão | Troque a padrão para `stage` primeiro (Etapa 5) |
| Um arquivo `.env*` aparece em `git diff --cached` | Falta uma regra no `.gitignore` | Corrija antes do commit, nunca depois |
| Você fez o deploy da branch errada | O deploy publica a árvore em checkout | `git branch --show-current` antes de todo deploy |
| Erro de domínio `100117` no primeiro deploy de produção | O hostname já tem um registro DNS | Apague o registro A, AAAA ou CNAME e faça o deploy de novo |

## Checklist

- [ ] O repositório é privado e só existem `stage` e `production` no remoto
- [ ] A `stage` é a branch padrão e a `main` não existe mais
- [ ] `git config branch.production.mergeOptions` imprime `--ff-only`
- [ ] Nenhum arquivo `.env*`, exceto `.env.example`, está versionado
- [ ] `bun run test` e `bun run doctor -- --stage production` estão verdes
- [ ] `git diff --stat stage origin/production` imprime nada antes do deploy
- [ ] A release só foi marcada com tag depois que o deploy deu certo

De volta à configuração: siga para [Acesso à Cloudflare](/docs/saas-starter-kit/getting-started/cloudflare-access) para criar o token de API, depois [Secrets](/docs/saas-starter-kit/getting-started/secrets) e [Deploy](/docs/saas-starter-kit/getting-started/deploy).
