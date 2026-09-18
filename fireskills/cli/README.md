# CLI `fireskill`

Motor do fluxo do Fireskills: estados de spec, esforço, progresso e milestones.
Derivado do CLI do Specsfy (`promovaweb/specsfy`, licença MIT, ver `LICENSE`),
**reduzido ao que o Fireskills usa**.

## O que veio e o que não veio

| Veio | Não veio (e por quê) |
|---|---|
| `transition`, `migrate`, `effort`, `progress`, `milestones sync`, `config`, integração opcional ClickUpfy | `install`, `update`, `upgrade`, `skills *`, `doctor`: eram o instalador; o Fireskills vive dentro do repositório |
| `test` (reescrito: executa `bun run test`, Vitest) | `test` original: só detectava Laravel + Pest |
| | `tui` (interface `neo-blessed`, 1600 linhas): opcional; `progress --watch` cobre o acompanhamento |

## Uso

Da raiz do repositório (o script `fireskill` está no `package.json` da raiz):

```bash
bun run fireskill --help
bun run fireskill progress
bun run fireskill transition 0001-meu-slug defined
```

Ou direto: `bun fireskills/cli/src/main.ts <comando>`. Bun executa o TypeScript
sem build.

## Desenvolvimento

- Dependência: `commander` (declarada em `package.json`). Neste monorepo ela é
  resolvida pelo `node_modules` da raiz (v13.1.0); numa cópia limpa, rode
  `bun install --cwd fireskills/cli`.
- Testes (Vitest, 20 casos derivados dos do upstream): `bunx vitest run` dentro de
  `fireskills/cli/`. Typecheck: `bunx tsc -p tsconfig.json --noEmit`.
- Regras de estado e transições permitidas: `src/lifecycle.ts`.
