# Testes

<!-- specsfy:documentator:start -->
## Summary

- Test files: 35.
- Runner: Vitest.
- Scripts: doctor: bun scripts/doctor.ts; deploy: bun scripts/deploy.ts; format: prettier -w .; test: vitest run; check:i18n: bun scripts/check-i18n-completeness.ts && bun scripts/check-docs-translations.ts; check:seo: bun scripts/check-seo.ts; check:perf: bun scripts/check-perf.ts; check:copy: bun scripts/check-copy.ts; indexnow: bun scripts/indexnow.ts; generate:og: bun scripts/generate-og-images.ts; fireskill: bun fireskills/cli/src/main.ts; web: sst shell -- bun scripts/dev.ts web; web-remote: sst shell -- bun scripts/dev.ts web remote; app: sst shell -- bun scripts/dev.ts app; app-remote: sst shell -- bun scripts/dev.ts app remote.

| File |
| --- |
| layers\billing\server\utils\billing\buyer-provisioning.test.ts |
| layers\billing\server\utils\billing\event-ledger.test.ts |
| layers\billing\server\utils\billing\paddle-team-signature.test.ts |
| layers\billing\server\utils\billing\paddle-webhook-dispatch.test.ts |
| layers\billing\server\utils\billing\pending-purchase-repository.test.ts |
| layers\billing\server\utils\billing\stripe-webhook-dispatch.test.ts |
| layers\billing\server\utils\billing\subscription-repository.test.ts |
| layers\billing\server\utils\plan-buyer-team.test.ts |
| layers\billing\server\utils\plans.test.ts |
| layers\billing\server\utils\stripe\status-map.test.ts |
| layers\billing\server\utils\stripe\subscription-sync.test.ts |
| layers\billing\shared\utils\abilities.test.ts |
| layers\kanban\shared\utils\abilities.test.ts |
| layers\teams\server\utils\team-seats.test.ts |
| layers\teams\shared\utils\abilities.test.ts |
| packages\tokens\theme-color.test.ts |
| scripts\app-identity.test.ts |
| scripts\branding.test.ts |
| scripts\content-docs-drift.test.ts |
| scripts\copy-patterns.test.ts |
| scripts\copy-rules.test.ts |
| scripts\durable-objects.test.ts |
| scripts\gates-dependencies.test.ts |
| scripts\indexnow.test.ts |
| scripts\layer-dependency-direction.test.ts |
| scripts\no-explicit-any.test.ts |
| scripts\notification-rules.test.ts |
| scripts\og-images.test.ts |
| scripts\perf-rules.test.ts |
| scripts\print-migration-bootstrap.test.ts |
| scripts\redirects.test.ts |
| scripts\seo-live.test.ts |
| scripts\seo-rules.test.ts |
| scripts\specialist-evidence.test.ts |
| scripts\specialists-catalog.test.ts |
<!-- specsfy:documentator:end -->
