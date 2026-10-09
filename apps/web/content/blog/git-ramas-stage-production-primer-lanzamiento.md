---
title: "Git para su Primer Lanzamiento: Ramas stage y production, del Repositorio Vacío a Producción"
date: "2026-09-25"
description: "Un manual de nivel sénior para quien acaba de adquirir Nuxfire: cree el repositorio, haga de stage la rama predeterminada, elimine main, promueva a production con fast-forward y publique su primera versión de forma segura."
author: "Equipo Nuxfire"
category: "DevOps"
readTime: "14 min"
tags: ["Git", "GitHub", "Branching", "Release", "Deploy", "SST"]
image: "/images/blog/git-branching-stage-production.svg"
lang: es
ogImage: "/images/blog/git-branching-stage-production.png"
translations:
  en: git-branching-stage-production-first-release
  pt-br: git-branches-stage-production-primeiro-lancamento
  es: git-ramas-stage-production-primer-lanzamiento
---

Ha extraído el código fuente de Nuxfire y está a punto de desplegar su primer producto. Antes de ejecutar un solo comando `sst`, dedique veinte minutos a lo que decide si los próximos cien despliegues serán tranquilos o estresantes: **cómo se relacionan sus ramas de Git con lo que está en producción**.

Este manual construye un modelo pequeño y estricto. Cada comando de Git que aparece aquí se ejecutó de principio a fin en un repositorio de prueba antes de publicarlo; las opciones de GitHub CLI provienen de su manual oficial. Cada paso incluye los comandos manuales y un prompt corto que puede pegar en un agente de IA de su IDE (Cursor, Claude Code, Copilot y similares).

## El modelo en un minuto

```text
feature/x ──▶ stage ──(validated)──▶ production
              default branch          moves ONLY by fast-forward
              you work here           = what you approved for live
```

Dos ramas de larga duración y cinco reglas:

1. **Todo el trabajo ocurre en `stage`.** Es la rama predeterminada, así que los pull requests y los clones llegan a ella.
2. **`production` solo avanza por fast-forward desde `stage`.** Sin commits de merge y sin commits directos.
3. **Nunca haga force-push sobre `production`.** Si un push es rechazado, es la red de seguridad funcionando.
4. **Despliegue producción desde la rama `production`.** Un despliegue publica lo que tenga en checkout en su máquina, así que la rama en la que está es la verdad.
5. **Etiquete con un tag cada release que salió a producción** (`v1.0.0`). La rama dice "aprobado", el tag dice "confirmado en producción".

¿Por qué no conservar también `main`? Una tercera rama de larga duración es una tercera respuesta a "¿cuál es el código más reciente?". Nuxfire ya nombra sus etapas de despliegue `stage` y `production`, así que las ramas replican esos nombres y no hay nada que traducir mentalmente.

## Qué necesita

- Git **2.28 o superior** (para `git init -b`). Compruébelo con `git --version`.
- Una cuenta de GitHub (personal u organización). GitHub CLI (`gh`) es opcional; cada paso muestra también el camino por la interfaz web.
- La carpeta de Nuxfire extraída y `bun install` ejecutado, como en [Instalación](/docs/saas-starter-kit/getting-started/installation).

## Paso 1: dígale a Git quién es usted

```bash
git --version
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch stage
```

La última línea hace que todo repositorio nuevo que cree empiece en `stage` en lugar de `master` o `main`.

**Prompt para agentes de IA:**
```text
Check `git --version` (2.28 or newer is required). Show my global git
user.name and user.email. If either is empty, ask me for the values
before setting them. Do not change anything else.
```

## Paso 2: proteja sus secretos y haga el primer commit

Su carpeta ya contiene archivos que **nunca** deben llegar a Git: `.env.production` y `.env.stage` guardan credenciales reales (la comprobación previa del despliegue incluso verifica que los valores de la base de datos estén rellenos), y `.sst` es el estado local del despliegue. El `.gitignore` de Nuxfire los cubre:

```text
.env
.env.*
!.env.example
.sst
```

Cree el repositorio en `stage`, demuestre que las reglas funcionan y solo entonces añada todo:

```bash
git init -b stage
git check-ignore -v .env.production .env.stage .sst
git add -A
git diff --cached --name-only | grep -E "(^|/)\.env"
```

`check-ignore` debe imprimir la regla que coincide con cada archivo. El último comando debe imprimir **únicamente** `.env.example`. Si aparece cualquier otro archivo `.env*`, deténgase y corrija `.gitignore` antes de hacer el commit.

```bash
git commit -m "chore: initial commit from Nuxfire"
```

> Si alguna vez se sube un secreto en un commit, borrar el archivo no basta: sigue en el historial. Trate la credencial como comprometida, rótela primero y solo después limpie el historial.

**Prompt para agentes de IA:**
```text
In the project root, run `git init -b stage` only if there is no .git
folder. With `git check-ignore -v`, verify that .env.production,
.env.stage and .sst are ignored and that .env.example is not. Run
`git add -A` and print `git diff --cached --name-only`. STOP and warn me
if any .env* file other than .env.example is listed. If it is clean,
commit with the message "chore: initial commit from Nuxfire".
```

## Paso 3: cree el repositorio en GitHub y suba `stage`

Cree un repositorio **privado y vacío**: sin README, sin `.gitignore`, sin licencia. En el navegador use **New repository**, elija **Private** y deje sin marcar las opciones de inicialización. O con la CLI, desde la carpeta del proyecto:

```bash
gh repo create my-product --private --source=. --remote=origin
```

La CLI añade el remoto `origin` por usted. Sin ella, añádalo manualmente con la URL que le muestra GitHub:

```bash
git remote add origin git@github.com:YOUR-USER/my-product.git
```

En ambos casos, publique `stage` y configure el seguimiento del remoto:

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

## Paso 4: cree `production`

Cree la rama a partir de `stage`, en el mismo commit, publíquela y vuelva:

```bash
git switch -c production
git push -u origin production
git switch stage
```

Ahora añada una protección local para que `production` solo pueda avanzar por fast-forward. Git rechazará cualquier merge que no sea un fast-forward:

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

## Paso 5: haga de `stage` la rama predeterminada y elimine `main`

Quien decide la rama predeterminada es GitHub, no su Git local. Incluso en un repositorio vacío puede seguir siendo `main`, así que compruébelo de forma explícita. GitHub exige **más de una rama** para cambiar la predeterminada, y por eso `production` tenía que existir antes.

En el navegador: **Settings → Branches → Default branch**, pulse el icono de cambio, elija `stage`, **Update** y confirme. Con la CLI:

```bash
gh repo edit --default-branch stage
```

Después mire qué existe en el remoto y, si `main` está ahí (por ejemplo, porque el repositorio se creó con un README), elimínela. Hágalo **después** de cambiar la predeterminada, nunca antes:

```bash
git ls-remote --heads origin
```

```bash
git push origin --delete main
```

Por último, actualice su puntero local a la rama predeterminada del remoto:

```bash
git remote set-head origin --auto
```

Si `main` se creó con un README, tiene un historial sin relación con el suyo. No la fusione en `stage`; simplemente elimínela.

**Prompt para agentes de IA:**
```text
Check which branch is the GitHub default with
`gh repo view --json defaultBranchRef`. If it is not `stage`, run
`gh repo edit --default-branch stage`. Then run
`git ls-remote --heads origin`. If `main` exists, tell me and WAIT for my
confirmation before running `git push origin --delete main`. Finish with
`git remote set-head origin --auto`.
```

## Paso 6: protecciones en GitHub (si su plan las incluye)

La protección local `--ff-only` no cuesta nada y no depende de ningún plan. En GitHub, la protección de ramas y los rulesets dependen de su plan y de la visibilidad del repositorio (los rulesets están documentados para los planes GitHub Team y GitHub Enterprise). Si el suyo los ofrece, proteja `production` bloqueando los force pushes y restringiendo las eliminaciones. Si no, el proceso y la protección local bastan siempre que nunca haga force-push.

## Paso 7: el día a día

Si trabaja solo, haga commit en `stage` y súbalo:

```bash
git switch stage
git add -A
git commit -m "feat: describe the change"
git push
```

Si trabaja en equipo, use ramas cortas y pull requests hacia `stage`:

```bash
git switch -c feat/billing-copy
git push -u origin feat/billing-copy
```

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`). El historial del propio Nuxfire los sigue, lo que deja las notas de release casi gratis.

## Paso 8: la puerta antes de su primer lanzamiento

Nada llega a `production` sin pasar siempre por las mismas comprobaciones:

```bash
bun install
bun run test
bun run doctor -- --stage production
```

`doctor` es la comprobación previa del despliegue: valida su token de Cloudflare, sus valores `BRAND_*`, los secretos de la base de datos y la zona del dominio, e indica la corrección exacta de cada problema antes de que pierda minutos en un despliegue que va a fallar.

Para un primer producto, despliegue una **etapa de validación** antes de producción. Una etapa que no es de producción obtiene sus propios Workers, conexión de base de datos y secretos, y responde en `<stage>.dev.<su-dominio>`:

```bash
bun run deploy -- --stage stage
```

El `--` es necesario para que la opción llegue al script. El token y los secretos se explican en [Acceso a Cloudflare](/docs/saas-starter-kit/getting-started/cloudflare-access), [Secrets](/docs/saas-starter-kit/getting-started/secrets) y [Despliegue](/docs/saas-starter-kit/getting-started/deploy). Conviene conocer desde ya un requisito exclusivo de producción: el dominio raíz y `www` **no** pueden tener ningún registro A, AAAA o CNAME en su DNS; de lo contrario, Cloudflare rechaza el dominio personalizado (error `100117`).

**Prompt para agentes de IA:**
```text
Run `bun install`, `bun run test` and
`bun run doctor -- --stage production`. Report every failure with its
exact message and the fix. Do NOT deploy anything.
```

## Paso 9: el primer lanzamiento

Todo está en verde en `stage`. Promuévala:

```bash
git status
git push origin stage
```

`git status` debe indicar que el árbol de trabajo está limpio. Ahora avance `production` por fast-forward exactamente al mismo commit, sin salir de `stage`:

```bash
git push origin stage:production
```

Ese push solo se acepta si es un fast-forward puro. Compruebe que las dos ramas son idénticas y cambie a `production`, porque es la rama desde la que despliega:

```bash
git fetch origin
git diff --stat stage origin/production
git switch production
git pull --ff-only
```

El `diff` no debe imprimir nada. Ejecute la comprobación previa una vez más y despliegue:

```bash
bun run doctor -- --stage production
bun run deploy -- --stage production
```

Solo cuando el despliegue termine bien, etiquete el release y vuelva al trabajo:

```bash
git tag -a v1.0.0 -m "First production release"
git push origin v1.0.0
git switch stage
```

Si el despliegue falla, no edite `production`. Corrija hacia adelante en `stage`, vuelva a pasar la puerta y repita el fast-forward. La rama puede quedar brevemente por delante de lo que está en producción, y la ausencia del tag se lo indica exactamente.

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

## Paso 10: evite que las dos ramas se separen

El modo de fallo que le ocurre a todo el mundo una vez: una corrección cae en `production` (o un despliegue sale de `stage`) y las ramas dejan de describir el mismo código sin que nadie lo note. La comprobación es una línea y siempre debe imprimir nada:

```bash
git fetch origin
git log --oneline stage..origin/production
```

Si imprime commits, `production` tiene trabajo que `stage` no tiene. Una promoción será rechazada, y eso es correcto. Traiga el trabajo de vuelta, publíquelo y avance de nuevo:

```bash
git switch stage
git merge origin/production
git push origin stage
git push origin stage:production
```

Si el merge informa de conflictos, resuélvalos, vuelva a pasar la puerta y haga el commit antes de subir. Nunca lo resuelva con `--force`: borraría justamente los commits que quiere conservar.

**Prompt para agentes de IA:**
```text
Run `git fetch origin`, then `git log --oneline stage..origin/production`.
If it prints anything: merge origin/production into stage, resolve any
conflicts together with me, run `bun run test`, push stage, then
fast-forward production with `git push origin stage:production`.
Never use --force.
```

## Volver atrás

No reescriba `production`. Redespliegue el código de un tag anterior:

```bash
git tag --sort=-creatordate
git switch --detach v1.0.0
bun run deploy -- --stage production
git switch stage
```

Esto restaura el **código**. Las migraciones de la base de datos se aplican en cada despliegue y no se revierten, así que planifique los cambios de esquema primero como aditivos (añada una columna, publique el código que la usa, elimine la antigua más tarde). Después corrija hacia adelante en `stage` y promueva un nuevo release.

**Prompt para agentes de IA:**
```text
Do NOT touch the `production` branch. Show me
`git tag --sort=-creatordate | head`, ask which tag to restore, run
`git switch --detach <tag>`, and ask for my explicit confirmation before
`bun run deploy -- --stage production`. Afterwards run `git switch stage`.
```

## Cuando algo sale mal

| Lo que ve | Qué significa | Qué hacer |
| --- | --- | --- |
| `[rejected] stage -> production (non-fast-forward)` | `production` tiene commits que `stage` no tiene | Paso 10. Nunca use force. |
| `fatal: Not possible to fast-forward, aborting.` | La protección local detuvo un merge en `production` | Misma causa y misma solución que arriba |
| GitHub no le deja eliminar `main` | Normalmente sigue siendo la rama predeterminada | Cambie primero la predeterminada a `stage` (Paso 5) |
| Un archivo `.env*` aparece en `git diff --cached` | Falta una regla en `.gitignore` | Corríjalo antes del commit, nunca después |
| Desplegó desde la rama equivocada | El despliegue publica el árbol en checkout | `git branch --show-current` antes de cada despliegue |
| Error de dominio `100117` en el primer despliegue de producción | El hostname ya tiene un registro DNS | Elimine el registro A, AAAA o CNAME y despliegue de nuevo |

## Lista de verificación

- [ ] El repositorio es privado y en el remoto solo existen `stage` y `production`
- [ ] `stage` es la rama predeterminada y `main` ya no existe
- [ ] `git config branch.production.mergeOptions` imprime `--ff-only`
- [ ] Ningún archivo `.env*`, salvo `.env.example`, está versionado
- [ ] `bun run test` y `bun run doctor -- --stage production` están en verde
- [ ] `git diff --stat stage origin/production` no imprime nada antes de desplegar
- [ ] El release solo se etiqueta después de que el despliegue termine bien

De vuelta a la configuración: continúe con [Acceso a Cloudflare](/docs/saas-starter-kit/getting-started/cloudflare-access) para crear el token de API, después [Secrets](/docs/saas-starter-kit/getting-started/secrets) y [Despliegue](/docs/saas-starter-kit/getting-started/deploy).
