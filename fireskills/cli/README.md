# `fireskill` CLI

Engine for the Fireskills lifecycle: spec states, effort tracking, progress monitoring, and milestones.
Derived from the Specsfy CLI (`promovaweb/specsfy`, MIT license, see `LICENSE`),
**scoped strictly to what Fireskills actively utilizes**.

## Capabilities

| Included | Excluded (and rationale) |
|---|---|
| `transition`, `migrate`, `effort`, `progress`, `milestones sync`, `config`, optional ClickUpfy integration | `install`, `update`, `upgrade`, `skills *`, `doctor`: were upstream installer tooling; Fireskills lives directly within the repository |
| `test` (rewritten: runs `bun run test`, Vitest) | Original upstream `test`: only detected Laravel + Pest |
| | `tui` (`neo-blessed` terminal UI, 1,600 lines): omitted; `progress --watch` covers live monitoring |

## Usage

From the repository root (the `fireskill` script is configured in root `package.json`):

```bash
bun run fireskill --help
bun run fireskill progress
bun run fireskill transition 0001-my-slug defined
```

Or directly: `bun fireskills/cli/src/main.ts <command>`. Bun executes TypeScript without build steps.

## Development

- Dependency: `commander` (declared in `package.json`). In this monorepo it resolves
  via root `node_modules` (v13.1.0); in isolated setups, run `bun install --cwd fireskills/cli`.
- Tests (Vitest, 30 test cases): `bun run --cwd fireskills/cli test`. Typecheck: `bun run --cwd fireskills/cli typecheck`.
- Lifecycle rules and allowed transitions: `src/lifecycle.ts`.
