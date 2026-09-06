# Lições aprendidas — armadilhas reais deste projeto

Guia para qualquer LLM/dev que for mexer nesta base. Cada item aqui custou pelo
menos um ciclo de deploy quebrado. **Leia antes de mexer em `infra/`, em versão
de dependência, ou em qualquer coisa de deploy.**

---

## Regras de ouro

1. **Quando dois erros se alternam a cada correção, não são dois problemas — é
   uma restrição compartilhada com dois consumidores.** Diagnostique os dois
   lados *antes* de mudar qualquer coisa. Foi assim que se perdeu mais tempo
   aqui (ver `unenv` abaixo): consertar um lado quebrava o outro, em loop.

2. **A fonte da verdade é o código instalado, não a documentação.**
   `sst.dev/docs` sempre mostra a API da versão *mais recente* — componentes
   documentados lá podem não existir na versão que o projeto usa. Verifique em:
   - `.sst/platform/src/components/cloudflare/*.ts` (componentes do SST)
   - `.sst/platform/node_modules/@pulumi/cloudflare/types/input.d.ts` (schema
     real dos recursos Cloudflare)

3. **`.sst/platform/node_modules` é uma árvore de dependências separada**,
   gerenciada pelo SST. Mudar dependência do projeto **não** afeta o que roda lá
   dentro. Não tente consertar erro interno do SST mexendo no nosso
   `package.json` — foi um ciclo desperdiçado.

---

## unenv — o conflito v1/v2 (a armadilha mais cara)

**Sintomas (alternando entre si):**
```
Could not resolve "unenv/node/perf_hooks" (originally "node:perf_hooks")
```
```
Could not load .../node_modules/unenv/dist/runtime/runtime/mock/empty.mjs
(imported by virtual:#nitro-internal-pollyfills)
```

**Causa:** dois consumidores exigem majors diferentes do mesmo pacote, e ambos
resolvem a partir da raiz hoisted:

| Consumidor | Versão | Por quê |
|---|---|---|
| Nitro 2.10.4 (builds Nuxt) | **v1.10.0** | a v2 reorganizou o runtime; caminhos da v1 deixam de existir |
| Bundler do SST 4.14 | **v2** | mapeia `node:*` → `unenv/node/*`, subpaths que não existem na v1 |

**Solução (já aplicada — não desfaça):** as duas versões coexistem, cada uma
onde seu consumidor a resolve:
- `package.json` raiz declara `unenv: "2.0.0-rc.24"` → o esbuild do SST acha a v2
- `packages/app`, `packages/web` e `packages/auth-frontend` declaram
  `unenv: "1.10.0"` → bun instala cópia aninhada em cada um, e Nitro/Vite
  resolvem a v1 de dentro do pacote

**Como verificar depois de qualquer `bun install`:**
```bash
grep '"version"' node_modules/unenv/package.json                    # esperado: 2.x
grep '"version"' packages/app/node_modules/unenv/package.json       # esperado: 1.10.0
```

**Não faça:** um `overrides` global de `unenv`. Força uma versão só e quebra o
outro lado, sempre.

---

## SST — versões e API

- **`sst.cloudflare.Hyperdrive` só existe a partir da v4.14.** Não existe em
  nenhuma 3.x (nem na 4.0.0). Sintoma: `TypeError: cloudflare_exports.Hyperdrive
  is not a constructor`.
- **O binário Windows (`sst-win32-x64`) só existe a partir da 3.14.8.** Em
  versões anteriores o CLI nem roda no Windows: *"your package manager failed to
  install the right version of the SST CLI for your platform"*.
- **A v4 exige versão explícita do provider.** `providers: { cloudflare: true }`
  é rejeitado — use `cloudflare: "6.20.0"`.
- **A v4 proíbe imports no topo do `sst.config.ts`.** Mova para dentro da função
  com import dinâmico: `const { readdirSync } = await import("fs")`.
- **`"App"` é nome reservado de componente.** O Worker do app é criado como
  `AppWorker` (`infra/utils/nuxt.ts`); os demais recursos mantêm o nome original
  para não quebrar `Resource.AppNuxtHubSecret`, lido por `scripts/dev.ts`.

### `handler` **sempre** relativo, nunca `path.resolve()`

```ts
handler: "packages/functions/src/emails.ts"        // ✅
handler: path.resolve("packages/functions", "..."), // ❌
```
Um caminho absoluto quebra o staging de artefatos no Windows:
`Failed to create output directory: mkdir ...artifacts\Emails-src\C:` — o SST
junta o handler assumindo que é relativo à raiz, então a letra do drive vira
segmento de diretório.

**Exceção:** `assets.directory` aceita absoluto — o próprio SST testa com
`path.isAbsolute()` antes de juntar.

### `link` não permite apelido de binding

O nome do binding é **sempre** o nome do recurso (o SST extrai do URN em
`buildBindings()`). Não dá para linkar `AppDB` e chamar de `DB` no worker.
Consequência prática: o NuxtHub exige bindings chamados literalmente
`BLOB`/`KV`/`CACHE`, então os recursos são criados com esses nomes em
`infra/utils/nuxt.ts`. Se renomear um recurso, atualize quem lê `env.<nome>`.

### Durable Objects e Queue consumers não têm prop de alto nível

- **DO**: só via `transform.worker`. E atenção: dentro do transform,
  `args.bindings` ainda é um Output do Pulumi, não um array —
  use `$output(args.bindings ?? []).apply(...)` (ver `infra/websockets.ts`).
- **Queue consumer**: use o método nativo `queue.subscribe(...)`, não monte
  consumer na mão (ver `infra/jobs.ts`).

### Durações são string, nunca número

```ts
retryDelay: "120 seconds"   // ✅
retryDelay: 120             // ❌ → "duration.split is not a function"
```

### `dlq.retryDelay` do Queue: bug de unidade dentro do próprio SST 4.14.0

**Sintoma:**
```
[ERROR] POST ".../queues/.../consumers": 400 Bad Request
"Queue consumer (type worker) has invalid settings: retry_delay must be
between 0 and 86400 seconds."
```
mesmo passando uma string de duração válida (`"120 seconds"`).

**Causa (verificada em `.sst/platform/src/components/cloudflare/queue-worker-
subscriber.ts:151`):** o campo é documentado ali mesmo como "the number of
**seconds** to delay", mas o código chama `toMilliseconds(v)` em vez de
`toSeconds(v)` (ambas existem em `duration.ts`) antes de mandar para a
Cloudflare. `"120 seconds"` vira `120000`, e a API valida `retry_delay` em
segundos com teto de `86400` — qualquer delay real acima de ~86s estoura.
Isso é um bug do SST 4.14.0, não algo que se resolve trocando o formato do
valor que passamos.

**Correção:** não dá para confiar em `dlq.retryDelay` para o valor real.
Sobrescreva o campo já calculado via `transform.consumer` no `.subscribe()`,
com o número puro de segundos (não uma duration string):
```ts
queue.subscribe(handler, {
  transform: {
    consumer: (args) => {
      args.settings = { ...args.settings, retryDelay: 120 }; // segundos, direto
    },
  },
});
```
Ver `infra/jobs.ts`. `batch.window` **não** tem esse problema — o campo da
Cloudflare correspondente (`maxWaitTimeMs`) já é em milissegundos mesmo, então
`toMilliseconds()` ali está certo.

### Não existe componente Nuxt no SST

Só há Astro, React Router, TanStack Start. Por isso o build do Nuxt roda como
`command.local.Command` (`infra/utils/builder.ts`) e o `sst.cloudflare.Worker`
nativo espera por ele via `dependsOn`. **Isso não é gambiarra nem caminho
duplo** — é a única forma de alimentar o Worker nativo com a saída do Nitro.

---

## Secrets

- **`CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` precisam ser variável de
  ambiente real em TODO comando `sst`** (`secret load`, `secret set`, `deploy`,
  `dev`). Não podem viver só no cofre — é com elas que o SST se autentica antes
  de conseguir *ler* o cofre. Limitação conhecida e documentada do SST.
- **`sst secret load` cria o secret com o nome literal da chave do `.env`.**
  Por isso `infra/secret.ts` usa `new sst.Secret("DATABASE_HOST", ...)` em
  SCREAMING_SNAKE_CASE, batendo com o `.env.example`. O mesmo nome vale para
  `Resource.DATABASE_HOST` no código dos workers.
  - Cuidado: a chave do objeto JS (`secretList.DatabaseHost`) é só ergonomia
    interna do `infra/`; o que importa para o SST é a **string** do construtor.
- **Secrets são por stage.** Carregar com `--stage production` não vale para o
  stage `desktop-<hostname>` do dev local. Use `--fallback` para valer em
  qualquer stage sem valor próprio:
  ```bash
  bunx sst secret load .env --fallback
  ```
  Sintoma de esquecer isso: `Invalid Hyperdrive config: origin: (database:
  cannot be blank; host: cannot be blank; ...)`.

---

## Windows

- **`command.local.Command` roda via `cmd.exe`.** Sintaxe POSIX falha em
  silêncio: `[ -z "$VAR" ] && cmd || echo skip` sempre cai no `echo`, então o
  build nunca rodava e o deploy reclamava de `index.mjs` inexistente. **Faça
  condicional em TypeScript, não na string do shell.**
- `export VAR=x` não existe no PowerShell — é `$env:VAR = "x"` (só na janela) ou
  `[Environment]::SetEnvironmentVariable("VAR","x","User")` (permanente).
- **`bun run deploy` falhando com só `✕ Unexpected error occurred` não é o
  erro real** — o SST engole a causa no terminal. Sempre olhe
  `.sst/log/sst.log` (última entrada `level=ERROR msg="exited with error"`)
  antes de investigar qualquer outra coisa.
- **`failed to remove temp log file ... open C:\Users\...\Temp\C:\movimenta-bairro\.sst\log: ...`**
  no `sst.log` é um bug de path-joining do próprio SST no Windows (concatena
  `%TEMP%` com um caminho já absoluto). É inofensivo — não impede o deploy,
  ignore.

---

## Home do SST na Cloudflare exige R2 habilitado

**Sintoma** (em `.sst/log/sst.log`, não aparece no terminal):
```
Error initializing cloudflare:
   Please enable R2 through the Cloudflare Dashboard. (10042)
```

**Causa:** com `home: "cloudflare"` em `sst.config.ts`, o SST guarda o state
(equivalente ao backend remoto do Pulumi/Terraform) num bucket R2 da própria
conta Cloudflare. Se R2 nunca foi habilitado na conta, a primeira operação
(`deploy`, `dev`, `secret load` etc.) falha nessa checagem antes de tocar em
qualquer recurso do projeto.

**Correção:** painel da Cloudflare → **R2 Object Storage** → **Enable R2**
(aceitar os termos; o free tier normalmente não exige cartão). É um passo de
conta, único, não repete depois de habilitado.

---

## Limites da Cloudflare

- **Nome de fila: máximo 63 caracteres.** O nome físico é
  `${app}-${stage}-${id}Queue-${sufixo}`, e stage de dev local usa o hostname da
  máquina — nomes lógicos longos estouram. Por isso o DLQ é `JobDLQ`, não
  `JobDeadLetterQueue`.
- **Durable Objects no plano free exigem backend SQLite:** use
  `newSqliteClasses`, não `newClasses` (erro 10097). A API de storage
  (`put`/`get`/`delete`) é idêntica nos dois — não muda código do worker.
- **Custom Domains de Worker pedem `Workers Routes: Edit` no escopo de zona** —
  **não** `DNS: Edit`. O Custom Domains cria o registro DNS sozinho.
- **Workers não abrem conexão TCP direta com Postgres** — daí o Hyperdrive
  (`infra/database.ts`).

---

## Banco de dados

- **Drizzle Kit aceita host/port/user/password/database separados** — não monte
  `DATABASE_URL`. Evita ter que percent-encodar senha com `@`/`#`
  (`packages/functions/drizzle.config.ts`).
- **Migrations não rodam por binding de Worker.** Rodam via `drizzle-kit
  migrate` num `command.local.Command`, lendo os mesmos secrets do Hyperdrive
  (`infra/utils/nuxt.ts`).
- **Supabase**: use o *Session pooler* (porta 5432). Se o projeto for recriado,
  host/user/senha mudam — recarregue os secrets. Sintoma de dado velho:
  `tenant/user <ref> not found`.
- **PostGIS** já vem habilitado na migration inicial.

---

## Checklist antes de abrir um deploy

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."
$env:CLOUDFLARE_ACCOUNT_ID = "..."
```
```bash
bun install
grep '"version"' node_modules/unenv/package.json               # 2.x
grep '"version"' packages/app/node_modules/unenv/package.json  # 1.10.0
bunx sst secret load .env --fallback   # se algum secret mudou
bun run deploy
```

---

## `bun install` deixa cópias de `node_modules` desatualizadas em sub-pacotes

**Sintoma:** erro que não faz sentido nenhum vindo de dentro do Nuxt/Vite,
tipo `Cannot read properties of undefined (reading 'builder')` em
`bundleServer`, mesmo com o `package.json` do sub-pacote apontando pra versão
certa.

**Causa:** depois de trocar a versão do `nuxt` (ou qualquer dependência) na
raiz, `bun install` às vezes não substitui uma cópia aninhada mais antiga que
já existia em `packages/<pkg>/node_modules/<dep>` (sobrou de um install
anterior). O binário do CLI acaba vindo dessa cópia velha enquanto o núcleo
(`initNuxt`, etc.) vem da cópia nova da raiz — duas versões major coexistindo
sem querer.

**Como verificar:** comparar a data/versão do `package.json` da dependência na
raiz com a do sub-pacote:
```bash
node -e "console.log(require.resolve('nuxt/package.json', {paths:['packages/web']}))"
```
Se o caminho impresso não for `node_modules/nuxt` da raiz nem um caminho
aninhado que você criou de propósito (como o `unenv` — ver acima), é lixo.

**Correção:** apagar a pasta `node_modules` do(s) sub-pacote(s) afetado(s) e
rodar `bun install` de novo a partir da raiz. Não tem flag do bun que resolve
isso sozinho de forma confiável.

---

## `dlq.retryDelay` do `Queue`: unidade errada dentro do SST 4.14.0

**Sintoma:**
```
[ERROR] POST ".../queues/.../consumers": 400 Bad Request
"Queue consumer (type worker) has invalid settings: retry_delay must be
between 0 and 86400 seconds."
```
mesmo passando uma string de duração válida (`"120 seconds"`).

**Causa (verificada em `.sst/platform/src/components/cloudflare/queue-worker-
subscriber.ts:151`):** o campo é documentado ali mesmo como "the number of
**seconds** to delay", mas o código chama `toMilliseconds(v)` em vez de
`toSeconds(v)` (ambas existem em `duration.ts`) antes de mandar para a
Cloudflare. `"120 seconds"` vira `120000`, e a API valida `retry_delay` em
segundos com teto de `86400` — qualquer delay real acima de ~86s estoura.
Bug do SST 4.14.0, não algo que se resolve trocando o formato do valor.

**Correção:** sobrescreva o campo já calculado via `transform.consumer` no
`.subscribe()`, com o número puro de segundos:
```ts
queue.subscribe(handler, {
  transform: {
    consumer: (args) => {
      args.settings = { ...args.settings, retryDelay: 120 }; // segundos, direto
    },
  },
});
```
Ver `infra/jobs.ts`. `batch.window` **não** tem esse problema — o campo da
Cloudflare correspondente (`maxWaitTimeMs`) já é em milissegundos mesmo.

---

## Upgrade do Nuxt puxa uma cascata de módulos desatualizados

**Contexto:** depois de subir pra Nuxt 4.5.2, o build do `app` quebrava com
```
[MISSING_EXPORT] "getActiveHead" is not exported by ".../unhead/dist/index.mjs"
[MISSING_EXPORT] "resolveScriptKey" is not exported by ".../unhead/dist/index.mjs"
```
e o `web` com
```
Module `@nuxt/content` version (2.13.4) does not satisfy `>=3` (requested by nuxt-og-image).
```

**Causa:** `@nuxtjs/i18n` e `@nuxt/scripts` antigos (RC/0.9.x) foram escritos
pra API do `unhead` v1/v2 (Nuxt 3); o Nuxt 4.5.2 já vem com `unhead` v3, que
renomeou/removeu esses exports. Além disso `@vueuse/nuxt@12.0.0` declara peer
`nuxt: ^3.0.0` — isso é o que fazia o `bun install` criar cópias aninhadas de
`nuxt@3.15.4` pra satisfazer o peer (a MESMA raiz do problema da seção acima).

**Correção:** atualizar para as versões que já suportam Nuxt 4/`unhead` v3
(checar `peerDependencies` no registry antes de assumir, via
`node -e "fetch(...).then(r=>r.json()).then(j=>console.log(j.peerDependencies))"`):
- `@nuxtjs/i18n` → `^10.6.0` (peer vazio, mas já usa a stack do Nuxt 4)
- `@nuxt/scripts` → `^1.3.8` (peer `@unhead/vue: ^2 || ^3`)
- `@vueuse/nuxt` → `^14.4.0` (peer `nuxt: ^3 || ^4 || ^5`) — **elimina** o
  peer-conflito que gerava o `nuxt@3.15.4` fantasma
- `@nuxtjs/seo` (só no `web`) → `^5.3.14` (peer `nuxt: ^3.16 || ^4 || ^5`)
- `nuxt-authorization` → `^0.3.5` (silenciou o aviso "disabled due to
  incompatibility issues")

**Efeito colateral do bump de `@nuxtjs/seo`:** o submódulo `nuxt-og-image`
passou a EXIGIR `@nuxt/content >= 3` (`web` estava em `2.13.4`) — isso forçou
uma migração de verdade do Content v2 → v3 (ver seção abaixo), não dava pra
só trocar a versão do seo isoladamente.

---

## Migração `@nuxt/content` v2 → v3 (necessária pelo bump do `@nuxtjs/seo`)

Migração real, não cosmética — v3 trocou a API de consulta inteira. Resumo do
que mudou no `packages/web` (docs/blog/faqs/legal pages):

- **Config movida:** de opções do módulo em `nuxt.config.ts` para um
  `content.config.ts` na raiz do pacote, com `defineCollection`/
  `defineContentConfig`. Cada "coleção" tem seu próprio `source` (glob) —
  criamos `docs`, `blog`, `faqs` e `legal` (esse último com `source: "*.md"`
  pros arquivos soltos na raiz de `content/`).
- **`queryContent(path).findOne()/.find()` → `queryCollection(name).path(p)
  .first()` / `.all()`** — não existe mais uma árvore de conteúdo única; toda
  query é escopada a UMA coleção.
- **`<ContentDoc>`, `<ContentQuery>` removidos** — vira `useAsyncData` +
  `queryCollection(...).path(route.path).first()` manual. `<ContentRenderer>`
  continua igual.
- **`fetchContentNavigation()` → `queryCollectionNavigation(name)`** (também
  escopado a uma coleção — no nosso caso, `"docs"`).
- **Campos com `_` viraram sem `_`:** `_path`→`path`, `_id`→`id`. `_file` não
  tem equivalente direto (usamos `path` pra mensagem de "adicione conteúdo
  aqui"). `_dir` (metadados de pasta) sumiu.
- **`_dir.yml` → `.navigation.yml`** (mesmo formato interno, `dot: true` já
  está hardcoded no glob do content então arquivos ocultos são pegos
  normalmente).
- **`useContentHelpers().navDirFromPath` não existe em v3** — implementamos
  uma busca recursiva própria (`findNavItemByPath` em
  `use-content-navigation.ts`) pra achar uma subárvore por path.
- **`body.toc.links` continua idêntico** — não precisou mudar nada no
  `DocsTocTree`.
- **`@nuxt/content` já reexporta `z` (zod)** — `import { defineCollection,
  defineContentConfig, z } from "@nuxt/content"`, não precisa depender de
  `zod` direto (embora adicionar como dependência explícita não fizesse mal).

**Efeito colateral: `better-sqlite3` obrigatório.** O v3 processa/indexa os
arquivos markdown num banco SQLite local em BUILD TIME (não é o banco da
aplicação — é uma ferramenta interna do `@nuxt/content`, nunca é implantado
nem acessado pelo nosso código; o banco real da app continua 100% Postgres via
Drizzle+Hyperdrive). `experimental.sqliteConnector: "bun"` não resolve sozinho
porque o passo de build nem sempre roda dentro do runtime Bun de verdade
(`process.versions.bun` pode não estar setado ali, mesmo dentro de
`bun run build`) — o jeito direto é instalar `better-sqlite3` como
devDependency do pacote que usa `@nuxt/content` e confiar no postinstall dele:
```bash
bun pm trust better-sqlite3
```
(bun bloqueia postinstall scripts por padrão; sem isso o binário nativo nunca
é baixado/compilado e o erro persiste mesmo com o pacote instalado.)

---

## `nuxt-og-image`: template community não roda em build de produção

**Sintoma:**
```
Community template "NuxtSeoSatori" must be ejected before production use.
Run: npx nuxt-og-image eject NuxtSeoSatori
```
seguido de 500 em cada rota `/_og/s/...png` durante o prerender, derrubando o
build inteiro.

**Causa:** `@nuxtjs/seo` habilita geração automática de imagem OG (preview de
link) usando um template genérico da comunidade, que a própria ferramenta
recusa a usar em produção sem "ejetar" (copiar) pra um componente local.

**Correção real** (não paliativo): `npx nuxt-og-image eject <nome-exato>` —
atenção que o nome do erro (`NuxtSeoSatori`) pode não bater com o nome que o
CLI realmente aceita; rode `npx nuxt-og-image eject` sem argumento pra listar
os nomes válidos (no nosso caso era `NuxtSeo`, não `NuxtSeoSatori`).

**O que fizemos no `web` (decisão deliberada, não definitiva):** desativamos
a geração em vez de ejetar, porque o próximo passo (`satori/standalone`) pede
mais uma dependência nativa de renderização de imagem (satori + resvg) que
não está instalada:
```ts
ogImage: { enabled: false },
```
Isso é cosmético (preview de link em rede social) e não bloqueia o deploy.
Se algum dia isso for prioridade, o caminho é: `bun add satori sharp
@resvg/resvg-js` (ou usar `@takumi-rs/*`, que o `nuxt-og-image` também aceita
como binding) e reverter esse `enabled: false`.

---

## `@nuxthub/core` muda o diretório de saída do Nitro — `dist`, não `.output`

**Sintoma:** o build (`AppBuild`) termina com "✨ Build complete!", mas o
Worker falha ao ser criado com:
```
Error: Could not resolve "C:/movimenta-bairro/packages/app/.output/server/index.mjs"
Could not resolve "sst/resource/cloudflare"
    at .sst/platform/src/components/cloudflare/worker.ts:604:17
```
Sem atribuição de recurso clara no log (não aparece como
`AppWorker → AppWorkerScript`), o que engana — parece erro genérico do
bundler, mas é só o `handler` apontando pra um arquivo que nunca existiu.

**Causa (verificada em `node_modules/@nuxthub/core/dist/module.mjs:659`):**
sempre que o módulo `@nuxthub/core` está ativo (bloco `hub: {...}` no
`nuxt.config.ts`), ele seta `nuxt.options.nitro.output.dir = "dist"`
incondicionalmente — não respeita o padrão `.output` do Nitro, e não é
configurável. Confirmado com `ls`: `packages/app/dist/server/index.mjs`
existe, `packages/app/.output/` não existe. Já `packages/web` (sem
`@nuxthub/core`) gera em `.output/server/index.mjs` normalmente.

**Correção:** `infra/utils/nuxt.ts` tinha `.output` cravado tanto no
`handler` quanto no `outputDir` do `assets.directory`, igual pros dois
pacotes. O parâmetro `app: boolean` de `deployWorker()` já é exatamente o
sinal "este pacote tem `hub:` ligado" (é o mesmo flag que decide se
BLOB/KV/CACHE são linkados) — então o nome do diretório de saída vem de lá:
```ts
const nitroOutputDirName = app ? "dist" : ".output";
```
usado tanto no `handler: `${root}/${nitroOutputDirName}/server/index.mjs`
quanto no `outputDir = path.resolve(root, nitroOutputDirName)`.

**Como verificar depois de qualquer build:**
```bash
ls packages/app/dist/server/index.mjs   # deve existir (hub: ligado)
ls packages/web/.output/server/index.mjs # deve existir (sem hub:)
```
Se algum pacote novo também ligar `hub:`, ele cai automaticamente no mesmo
`dist`; se nenhum pacote usar `@nuxthub/core` no futuro, pode voltar a
hardcodar `.output` — mas confirme lendo o `module.mjs` instalado, não por
suposição.

---

## Plugin universal fazendo fetch autenticado no SSR sem forwarding de cookie

**Sintoma:** `app.desktop-*.dev.movimentabairro.org/` e `/dashboard` voltavam
500 genérico ("500 - undefined") em TODA rota, sem stack trace (página de
erro de produção esconde detalhes de propósito). Só apareceu a causa real
com log ao vivo do Worker (`wrangler tail`, painel não tem stack trace em
prod):
```
(error) [request error] [unhandled] .../__nuxt_error?...
  url":"http://localhost/api/auth/ws-ticket"...statusCode":401...
{ message: 'e11.hasOwnProperty is not a function', statusCode: 500 }
```

**Causa (duas partes):**
1. `app/plugins/websockets.ts` era um plugin Nuxt **universal** (roda no
   SSR e no client) que fazia `await $fetch("/api/auth/ws-ticket")` sem
   `try/catch` logo no `setup()`. `$fetch` (não `useRequestFetch()`) no SSR
   não herda cookies/host da request real — por isso resolveu pra
   `http://localhost` sem sessão, `getUser()` não achou usuário, e o
   endpoint devolveu 401 corretamente. Só que ninguém tratava esse 401:
   ele escapava do `setup()` do plugin e derrubava o SSR da página inteira
   — pra QUALQUER visitante, logado ou não, já que o plugin roda em toda
   rota, não só `/dashboard`.
2. Nuxt então tenta renderizar sua própria página de erro pra esse 401 e
   quebra de novo com `e11.hasOwnProperty is not a function` — um objeto
   sem prototype (`Object.create(null)`) em algum lugar do pipeline de erro
   do próprio framework. Não investigamos mais fundo porque, resolvendo o
   problema #1, esse caminho nunca é mais exercitado — mas fica registrado
   caso um FUTURO erro não tratado no SSR volte a acionar esse mesmo bug de
   segunda ordem.

**Correção real:** websocket é 100% preocupação de navegador — não existe
motivo pra buscar ticket ou abrir conexão durante SSR. Confirmado lendo
`app/layouts/dashboard.vue`: as únicas chamadas a `$ws` (`.on`/`.unsubscribe`)
já estavam dentro de `onMounted`/`onUnmounted`, que nunca rodam no servidor.
- Renomeado `app/plugins/websockets.ts` → `websockets.client.ts` (convenção
  do Nuxt: sufixo `.client.ts` = só roda no navegador).
- Mesmo só no cliente, um visitante deslogado ainda pode acionar esse
  plugin e tomar 401 legitimamente — então a busca do ticket agora tem
  `.catch(() => null)`, e sem ticket o `ws` ainda é fornecido (com
  `send` como no-op) pra `$ws.on/.unsubscribe` nunca quebrarem por
  `$ws` ser `undefined`.

**Como depurar isso da próxima vez:** a página de erro em produção
(`.output/.../error-500`) nunca mostra a causa real de propósito. Log ao
vivo é obrigatório:
```bash
bunx wrangler tail <nome-exato-do-script>   # ver na dashboard Cloudflare
```
e reproduzir o erro em outra aba enquanto o tail está rodando.

---

## Dependência "phantom": nunca dependa de hoisting pra um pacote que seu próprio código faz `require()`/`import` direto

**Sintoma:** depois de só remover uma devDependency não usada (`wrangler`) e
rodar `bun install`, os três pacotes Nuxt (`app`, `web`, `auth-frontend`)
pararam de buildar com uma cadeia de erros diferentes em sequência:
```
Cannot find module 'tailwindcss/defaultTheme'
Cannot find module '@tailwindcss/forms'
Cannot find module '@nuxtjs/tailwindcss/merger'
```
sempre vindo de dentro de `node_modules/.cache/nuxt/.nuxt/tailwind/postcss.mjs`
ou `nuxtui-tailwind.config.cjs` — arquivos que o `@nuxt/ui`/`@nuxtjs/
tailwindcss` geram e `require()`am diretamente via Node (jiti), **fora** do
bundler (Vite/Rollup nunca vê esse `require()`, então o resolvedor do bundler
não entra em jogo).

**Causa real:** este bun (1.4.0) usa layout tipo pnpm —
`node_modules/.bun/<pacote>@<versão>/node_modules/<pacote>`, com symlinks
criados em `<pacote-consumidor>/node_modules/<dep>` **só pra dependências
declaradas explicitamente** em algum `package.json`. `tailwindcss`,
`@nuxtjs/tailwindcss`, `@tailwindcss/forms`, `@tailwindcss/aspect-ratio`,
`@tailwindcss/typography`, `@tailwindcss/container-queries` e
`@headlessui/tailwindcss` nunca foram dependências diretas de `app`/`web`/
`auth-frontend` — só chegavam de carona como dependências transitivas de
`@nuxt/ui`/`@nuxtjs/tailwindcss`. Enquanto a árvore de dependências não
mudava, o bun por acidente colocava esses symlinks em lugares que a
resolução do Node conseguia achar subindo diretórios. Qualquer mudança na
árvore (mesmo remover uma devDependency sem relação nenhuma, tipo
`wrangler`) pode reorganizar esses symlinks e quebrar tudo que dependia do
acaso.

Isso vale tanto pra `tailwind.config.ts` (que faz
`import defaultTheme from "tailwindcss/defaultTheme"` direto) quanto pro
`nuxtui-tailwind.config.cjs`/`tailwind/postcss.mjs` que o `@nuxt/ui` GERA e
`require()`a em build time — confirmado lendo
`node_modules/.bun/@nuxt+ui@2.20.0+.../node_modules/@nuxt/ui/dist/module.mjs`
linhas 61-65, que fazem `require('@tailwindcss/forms')`,
`require('@tailwindcss/aspect-ratio')`, etc. literalmente.

**Correção real (não paliativo):** declarar TODOS esses pacotes como
dependência direta, explícita, com a mesma versão que já estava resolvida
no lockfile, em `app`, `web` E `auth-frontend` (os três usam `@nuxt/ui`):
```json
"@headlessui/tailwindcss": "0.2.2",
"@nuxtjs/tailwindcss": "6.13.1",
"@tailwindcss/aspect-ratio": "0.4.2",
"@tailwindcss/container-queries": "0.1.1",
"@tailwindcss/forms": "0.5.10",
"@tailwindcss/typography": "0.5.16",
"tailwindcss": "3.4.17",
```

**Regra geral pra não cair nisso de novo:** se o SEU código (`tailwind.config.ts`,
`content.config.ts`, qualquer arquivo que faça `import`/`require` de um pacote
que não seja através do bundler) referencia um pacote diretamente, esse pacote
**tem que** estar no `package.json` do pacote que o usa — nunca confie que vai
"vir de carona" de outra dependência, mesmo que hoje funcione. Pra achar
esses casos preventivamente: `grep -rn "from \"<pkg>\|require(\"<pkg>"` nos
arquivos de config de cada pacote e comparar com o `dependencies` do
`package.json` correspondente.

---

## `.env` por stage: nomeie os arquivos, não reutilize `.env`

Em vez de manter um único `.env` e trocar valores na mão antes de cada
`sst secret load`, use um arquivo por stage (`.env.stage`, `.env.production`,
etc.) e carregue explicitamente:
```bash
bunx sst secret load .env.production --stage production
```
Nunca use `--fallback` num arquivo de produção — isso tornaria esses valores
o padrão pra QUALQUER stage sem secret próprio, misturando dev com produção.
`.gitignore` já cobre `.env*` (não é `.env` sozinho, é o padrão `.env.*`
também), então qualquer nome nesse formato já fica de fora do commit.

`.env.example` é o template canônico (todas as chaves, valores em branco,
comentado) — sirva de base pra criar cada `.env.<stage>` copiando a
estrutura, nunca inventando as chaves de novo:
```bash
cp .env.example .env.production
```

---

## Banner "demo" do template original vazando na produção

`LayoutBanner.vue` ainda tinha o banner "This is a demo landing page site
for..." apontando pra `movimentabairro.com.br` (**.com.br**, domínio
diferente do real `.org` deste projeto) — sobra direta do Nuxflare SaaS
Starter Kit original, nunca adaptado no rebranding. Isso disparava o aviso
`absolute-site-urls` do `nuxt-link-checker` em toda página (o link aponta pra
um domínio que não é o nosso).

Decisão do usuário: manter o banner, mas com `href="#"` em vez do link
externo — resolve o aviso sem decidir unilateralmente se o banner deveria
sumir (é conteúdo/produto, não bug técnico). Ver `LayoutBanner.vue`.

**Nota para quando alguém revisar isso de novo:** ainda há outras sobras de
copy do "SaaS Starter Kit" na landing page (Hero/Pricing/Testimonials —
sinalizado desde o início da sessão) que não foram tocadas — não confundir
com o banner, que já foi resolvido.

---

## `bun install` modo `isolated` (padrão) quebra o esbuild do SST no Windows

**Sintoma:** deploy real (`bun run deploy`) falhando ao empacotar QUALQUER
worker que dependa de `packages/functions` ou de libs com export map
estrito, com uma mistura confusa de erros na mesma execução:
```
Error: Cannot read file "packages/functions/node_modules/@paralleldrive/cuid2": Incorrect function.
Error: Could not resolve "crossws/adapters/cloudflare-durable"
Could not resolve "@react-email/render"
Could not resolve "jose"
Could not resolve "nodemailer"
```
`bun run build` isolado (sem SST) passava limpo — só o `sst deploy` quebrava,
porque só ele usa o esbuild embutido pra empacotar o `handler` de cada
Worker.

**Causa:** bun 1.4.0 usa por padrão o linker `isolated` (estilo pnpm) —
guarda cada pacote uma vez em `node_modules/.bun/<pacote>@<versão>/` e cria
**symlinks** em cada consumidor apontando pra lá. `"Incorrect function"` é o
erro Win32 `ERROR_INVALID_FUNCTION` — o esbuild do SST (rodando puro em
`node.exe`, fora de qualquer emulação POSIX) não lê esse tipo específico de
link/reparse point do Windows do mesmo jeito que `cat`/`fs.lstatSync`
conseguem via Git Bash. É uma incompatibilidade documentada entre esbuild e
o layout de symlinks aninhados do pnpm/bun no Windows — nada a ver com
dependência faltando (o pacote sempre esteve instalado e acessível por
outras ferramentas).

**Correção real:** trocar a estratégia de instalação inteira, não os
pacotes um por um. Criar `bunfig.toml` na raiz:
```toml
[install]
linker = "hoisted"
```
e reinstalar do zero (`rm -rf node_modules packages/*/node_modules bun.lock
&& bun install`). `hoisted` é o layout tradicional (tipo npm/yarn clássico,
arquivo real hoisted pra raiz, sem symlink aninhado por pacote) — todo
bundler baseado em Node, esbuild incluso, sempre suportou isso sem
ressalva.

**Como verificar depois de qualquer reinstalação:**
```bash
ls node_modules/.bun 2>&1        # deve dizer "No such file or directory"
node -e "console.log(require('fs').lstatSync('node_modules/@paralleldrive/cuid2').isSymbolicLink())"  # false
```
Se `node_modules/.bun` existir de novo, o modo `isolated` voltou a ser usado
(bunfig.toml foi ignorado, removido, ou uma versão nova do bun mudou o
default) — confira o `bunfig.toml` antes de qualquer outra coisa.

**Atenção:** essa troca não invalida a lição do `unenv` v1/v2 nem a das
dependências "phantom" documentadas acima — ambas continuam valendo e foram
reverificadas como intactas depois da migração pra `hoisted`.

---

## `new_sqlite_classes` não pode ser reenviado depois que a Durable Object já existe

**Sintoma:**
```
[ERROR] PUT .../workers/scripts/...websocketsscript: 400 Bad Request
"code": 10074, "message": "Cannot apply new-sqlite-class migration to class
'Websockets' that is already depended on by existing Durable Objects"
```
Só aparece depois que o Worker já foi implantado com sucesso pelo menos uma
vez (nunca no primeiro deploy — só nos seguintes).

**Tentativa errada (registrada aqui pra não repetir o raciocínio):** a
primeira hipótese foi "falta uma tag de migração pra Cloudflare saber que
já foi aplicada" — adicionei `newTag: "v1"` + `steps: [...]`. Resultado:
**erro byte-idêntico**, mesmo com o payload genuinamente diferente (esse
erro não passa pelo RPC de build do SST, é rejeição direta da API da
Cloudflare no upload do script — o `transform.worker` roda sincronamente
antes do recurso `cloudflare.WorkersScript` ser criado, então a mudança
com certeza chegou no payload). Isso prova que a causa não era falta de
tag.

**Causa real** (confirmado via busca — [Cloudflare Workers SDK
discussions](https://github.com/cloudflare/workers-sdk/discussions/13284),
[Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2026-07-09-restrict-new-kv-backed-namespaces/)):
`new_sqlite_classes`/`new_classes` são migrações de **provisionamento
único** — instruem a Cloudflare a CRIAR o namespace da Durable Object pela
primeira vez. Uma vez que o namespace existe e tem instâncias reais, essa
migração não pode ser reaplicada **nunca mais, para sempre, independente de
tag** — não é uma questão de "já foi aplicada, pula", é uma restrição de
que a operação em si é irreversível/não repetível. `infra/websockets.ts`
mandava essa migração incondicionalmente em `args.migrations` dentro de um
`transform.worker` que roda em TODO deploy — funcionou na primeira vez
(quando criou a classe) e quebrou em todas as seguintes.

**Primeira correção (incompleta):** remover `args.migrations`
completamente, já que a classe já existe no stage atual. Funciona, mas cria
uma pegadinha pro futuro: um stage genuinamente novo (ex.: primeiro deploy
de `production`) nunca teve essa Durable Object criada — sem a migração,
o binding não teria nada pra referenciar. A correção "manual" óbvia
(restaurar a linha, deployar, remover de novo) é exatamente o tipo de
passo frágil e esquecível que este projeto vem tentando eliminar a noite
toda.

**Correção final:** decidir automaticamente, consultando a própria
Cloudflare antes de construir o Worker — sem passo manual, funciona igual
pra um stage estabelecido e pra um stage novo em folha:
```ts
// infra/utils/durable-objects.ts
export async function isDurableObjectClassProvisioned(className, scriptNameSubstring) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces?per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  return data.result.some(
    (ns) => ns.class === className && ns.script.includes(scriptNameSubstring),
  );
}
```
```ts
// infra/websockets.ts — checado ANTES de construir o Worker (top-level
// await, mesmo padrão já usado em infra/app.ts), pra o transform.worker
// (síncrono) só precisar ler um boolean já resolvido:
const websocketsClassProvisioned = flags.websockets
  ? await isDurableObjectClassProvisioned("Websockets", $app.stage)
  : true;
// ...dentro de transform.worker:
if (!websocketsClassProvisioned) {
  args.migrations = { newSqliteClasses: ["Websockets"] };
}
```
Filtra por `script.includes($app.stage)` porque cada stage tem seu próprio
nome de script (e portanto seu próprio namespace de Durable Object) —
sem esse filtro, o stage de dev já provisionado faria a checagem
"encontrar" a classe e pular a migração indevidamente num stage novo.

**Fail-safe caso a checagem em si falhe** (rede, permissão do token
insuficiente pra ler `durable_objects/namespaces`, etc.): assume "já
provisionado" — mantém o caminho comum (stage já estabelecido) funcionando;
um stage genuinamente novo que também falhar nessa checagem vai receber um
erro diferente e mais claro sobre o binding sem namespace, mais fácil de
depurar do que reintroduzir o 10074 permanente.

---

## Patch commitado ficou órfão depois de regenerar o lockfile do zero

**Sintoma:**
```
[ERROR] PUT .../workers/scripts/...emailsscript: 400 Bad Request
"code": 10021, "message": "Uncaught TypeError: Class extends value [object
Module] is not a constructor or null\n  at .../node_modules/nodemailer/lib/mailer/index.js"
```
Erro em **runtime na Cloudflare** (não no build local) — o worker sobe mas
quebra ao ser avaliado pela primeira vez.

**Tentativa errada (registrada aqui pra não repetir o raciocínio):**
supus que fosse um bug de interop ESM/CJS dentro do próprio `nodemailer`
nunca antes visto neste projeto, e tentei contornar com um `alias` do
esbuild (`build.esbuild.alias` no `WorkerArgs` do SST) redirecionando
`nodemailer` pra um stub. **Resultado: erro byte-idêntico**, incluindo os
mesmos números de linha no stack trace — ou seja, o `nodemailer` real
continuou sendo empacotado, o `alias` não teve efeito nenhum. Isso bate
com um bug já reportado do próprio SST onde opções de esbuild (`define`,
nesse caso — [issue #5241](https://github.com/anomalyco/sst/issues/5241))
"não são aplicadas corretamente" em `sst.cloudflare.Worker`: o campo
`build.esbuild` passa pelos tipos do TypeScript mas o bundling de verdade
roda dentro do binário compilado da CLI (via `rpc.call("Runtime.Build",
...)`, visto em `worker.ts:604` — exatamente a linha de todos os stack
traces desses erros), que pode simplesmente não implementar/repassar cada
opção. **Não confie em `build.esbuild.*` do SST sem confirmar o efeito
real no bundle** — trate como não-funcional até prova em contrário.

**Causa real:** o projeto **já tinha, desde o commit inicial**, um patch
commitado corrigindo esse EXATO bug —
`patches/nodemailer@6.10.0.patch`, mudando `const EventEmitter =
require('events')` para `const { EventEmitter } = require('events')` em 5
arquivos internos do nodemailer (o padrão clássico de "Class extends value
is not a constructor": `require('events')` sob certas interoperações
ESM/CJS retorna um module namespace object em vez da classe direta).
Durante a limpeza de hoje (`rm -rf node_modules ... bun.lock && bun
install`, ver seção do `linker: hoisted` acima), o lockfile foi
regenerado do zero e o `nodemailer` resolveu pra **6.10.1** em vez de
6.10.0. O patch do bun casa por **versão exata** — `"nodemailer@6.10.0"`
não bate mais com `"nodemailer@6.10.1"`, e o `bun install` simplesmente
IGNORA o patch em silêncio (sem aviso, sem erro) quando a versão não bate.
O bug reapareceu porque a correção de anos atrás ficou órfã, não porque é
um bug novo.

**Como verificar isso da próxima vez:**
```bash
grep '"nodemailer@' bun.lock                          # versão realmente resolvida
grep -A5 "patchedDependencies" package.json            # versão que o patch espera
# se não baterem, o patch está órfão e silenciosamente inativo
grep -n "const EventEmitter = require" node_modules/nodemailer/lib/mailer/index.js
# se essa linha aparecer (sem destructuring), o patch NÃO foi aplicado
```

**Correção:** `bun patch nodemailer` (prepara a versão atualmente
resolvida pra edição), reaplicar o mesmo diff (destructuring do
`EventEmitter` nos 5 arquivos — `lib/mailer/index.js`,
`lib/ses-transport/index.js`, `lib/smtp-pool/index.js`,
`lib/smtp-pool/pool-resource.js`, `lib/smtp-transport/index.js`), `bun
patch --commit node_modules/nodemailer`. Isso atualiza
`patchedDependencies` pra chave da versão nova e gera um novo arquivo em
`patches/`. Apaguei o patch órfão antigo (`nodemailer@6.10.0.patch`) pra
não confundir no futuro — só deve existir o patch da versão que o
`bun.lock` realmente resolve.

**Regra geral:** sempre que regenerar o `bun.lock` do zero (não só um
`bun install` incremental), reverifique CADA entrada de
`patchedDependencies` contra a versão real resolvida — patches não geram
erro quando ficam órfãos, só silenciosamente param de valer.

---

## Página estática (`nuxt generate`) dirigida por query string nunca atualiza após hidratar

**Sintoma:** cadastro por email/senha "não funciona" — usuário preenche o
formulário, o servidor processa certo (confirmado via log ao vivo e teste
manual), a URL muda pra `/signup/?email=...&state=code`, mas a tela
continua mostrando o formulário original de email/senha em vez de "digite
o código de verificação". Login por código tem o mesmo problema.

**Investigação (evidência real, não suposição):**
1. `wrangler tail` no worker Auth não mostrou nada — sinal de que a
   requisição podia nem estar chegando lá.
2. Reproduzi o cadastro eu mesmo via browser tool. Primeira tentativa:
   entrei direto em `auth.../signup` (pulando `/authorize`) → erro
   `UnknownStateError` do próprio `@openauthjs/openauth` (cookie de sessão
   OAuth ausente — **isso é esperado**, essas páginas só devem ser
   acessadas através do fluxo `/authorize` de um app cliente, nunca direto
   pela URL. Não é bug.).
3. Refiz entrando pelo app (fluxo correto, gera o cookie certo) → sem
   erro, a URL mudou certo pra `?state=code`, mas a UI não mudou.
4. Peguei o HTML puro da resposta do servidor (não o que o navegador
   renderiza) pra essa URL exata: já vinha errado — o servidor sempre
   devolve o MESMO HTML pré-gerado, com `state` vazio, não importa a query
   string (porque é um arquivo estático, gerado uma vez em build).
5. Inspecionei o Vue Router **já montado no navegador** direto
   (`app.config.globalProperties.$route.query`) — o router tinha o valor
   CERTO (`state: "code"`). O roteamento nunca esteve errado.
6. Conclusão: divergência de hidratação. O HTML pré-renderizado (sem
   query) e o que o Vue calcularia no cliente (com query) diferem
   estruturalmente (`v-if`/`template v-if` trocando de ramo) — e o Vue,
   depois de hidratar, não corrige essa divergência sozinho. A página fica
   presa pra sempre no estado do build, mesmo com a URL e o router
   corretos.

**Causa raiz:** `packages/auth-frontend`'s `/login`, `/signup`,
`/forgot-password` são ao mesmo tempo (a) pré-renderizadas estaticamente
(`nitro.prerender.routes` no `nuxt.config.ts`) e (b) inteiramente
dirigidas por query string (`?state=code`, `?err=...`) — os redirects de
`packages/functions/src/auth.ts` usam query string pra comunicar em qual
passo do fluxo o usuário está. Uma página estática só pode ter UM HTML por
caminho, gerado uma vez; query string dinâmica é fundamentalmente
incompatível com isso.

**Correção:** marcar essas três rotas como client-side-only via
`routeRules` no `nuxt.config.ts`:
```ts
routeRules: {
  "/login/**": { ssr: false },
  "/signup/**": { ssr: false },
  "/forgot-password/**": { ssr: false },
},
```
Isso faz o HTML pré-renderizado virar só uma casca vazia (`<div
id="__nuxt"></div>`) — sem conteúdo reativo pra divergir na hidratação, o
Vue monta do zero direto no cliente usando a URL real.

**Como verificar:** buildar (`bun run build`), servir `.output/public`
localmente (`bunx serve .output/public -p PORTA`) e abrir
`http://localhost:PORTA/signup/?email=x@x.com&state=code` — antes da
correção mostra o formulário errado; depois, a tela de código. Testei os
dois cenários (com e sem query) antes de considerar resolvido.

---

## `console.error(errorInstance)` vira `{}` nos logs estruturados do Workers

**Sintoma:** `console.error("Failed to send email:", { to, template, error })`
aparecia no `wrangler tail` como `error: {}` — nenhuma pista da causa real,
mesmo com o e-mail genuinamente falhando ao enviar.

**Causa:** `message`/`stack`/`name` de um `Error` são propriedades **não
enumeráveis** — quando o runtime do Workers serializa o argumento do
`console.error` pra log estruturado (JSON), essas propriedades somem,
sobrando um objeto vazio. Isso não é bug nosso, é como `Error` funciona em
JS combinado com serialização JSON — mas esconde completamente a causa
real de qualquer erro logado dessa forma ingênua.

**Correção:** nunca passar um `Error` cru pro `console.error` em código que
roda no Workers — extrair `message`/`name`/`stack` (e `cause`/`response`/
`data` se a lib usada anexar detalhe ali) explicitamente antes de logar.
Ver `packages/functions/src/emails.ts` e `packages/functions/src/sender.ts`.
**Vale pra qualquer catch block novo neste projeto** — sem isso, qualquer
investigação futura via `wrangler tail` vai bater nesse mesmo beco sem
saída.

---

## `react`/`react-dom` em versões diferentes — `@react-email/render` rejeita em runtime

**Sintoma:** email de verificação nunca chegava, sem erro visível até
corrigir o problema acima. Com o log corrigido:
```
message: 'Incompatible React versions: The "react" and "react-dom"
packages must have the exact same version. Instead got:
  - react:      19.2.8
  - react-dom:  19.0.0'
```

**Causa:** `packages/emails/package.json` declarava
`"react": "^19.0.0"` (faixa, resolve pra mais recente) e
`"react-dom": "19.0.0"` (fixo, exato) — bun resolveu cada um
independentemente pra satisfazer sua própria faixa: `react` foi pra
`19.2.8` (mais recente compatível), `react-dom` ficou preso em `19.0.0`.
Isso é válido do ponto de vista do gerenciador de pacotes (nenhum conflito
de peer dependency), mas o `@react-email/render` faz sua PRÓPRIA checagem
em runtime (`ensureCorrectIsomorphicReactVersion`) exigindo a versão
EXATA igual entre os dois — mais rígido que semver.

**Tentativa intermediária que não resolveu sozinha:** só alinhar a faixa
(`react-dom: "^19.0.0"` também) não bastou — como `19.0.0` já satisfaz
`^19.0.0`, o bun não tinha motivo pra re-resolver `react-dom` pra uma
versão nova, e ele continuou em `19.0.0` enquanto `react` seguia em
`19.2.8`. Faixas compatíveis não implicam mesma versão resolvida quando
são pacotes independentes.

**Correção real:** fixar os dois na MESMA versão exata (sem faixa):
```json
"react": "19.2.8",
"react-dom": "19.2.8"
```
Confirmado via `require.resolve` a partir de `packages/emails` — os dois
resolvem pro mesmo `node_modules/react`/`react-dom` na raiz, mesma versão.
**Regra geral: `react` e `react-dom` devem sempre ser fixados na mesma
versão exata neste projeto, nunca com faixa (`^`/`~`) independente uma da
outra** — mesmo que tecnicamente compatíveis por semver, ferramentas como
`@react-email/render` exigem igualdade literal.
