# Testes

<!-- specsfy:documentator:start -->
## Resumo

- Arquivos de teste: 7.
- Runner: Vitest.
- Scripts: deploy: sst deploy; format: prettier -w .; test: vitest run; check:i18n: bun scripts/check-i18n-completeness.ts && bun scripts/check-docs-translations.ts; fireskill: bun fireskills/cli/src/main.ts; web: sst shell -- bun scripts/dev.ts web; web-remote: sst shell -- bun scripts/dev.ts web remote; app: sst shell -- bun scripts/dev.ts app; app-remote: sst shell -- bun scripts/dev.ts app remote.

| Arquivo |
| --- |
| layers\billing\server\utils\billing\event-ledger.test.ts |
| layers\billing\server\utils\billing\subscription-repository.test.ts |
| layers\billing\server\utils\stripe\status-map.test.ts |
| layers\billing\shared\utils\abilities.test.ts |
| layers\kanban\shared\utils\abilities.test.ts |
| layers\teams\server\utils\team-seats.test.ts |
| layers\teams\shared\utils\abilities.test.ts |
<!-- specsfy:documentator:end -->
