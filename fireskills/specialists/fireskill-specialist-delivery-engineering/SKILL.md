---
name: fireskill-specialist-delivery-engineering
description: "Design and review CI/CD pipelines, build artifacts, release strategies, environment promotions, migrations, rollouts, rollbacks, and supply chain security. Use for pipelines, workflows, environments, deploys, or delivery strategies; use to choose between rolling, blue-green, canary, or feature flag rollouts; never deploy, promote, or alter production without explicit user authorization, and use `$fireskill-specialist-observability` for rollout decision metrics."
---

# Delivery Engineering

## When to Use

- Trigger when the project has CI/CD pipelines (`*.yml`), release strategies, environment
  promotions, or rollout/rollback plans.
- Trigger to select between rolling, blue-green, canary, or feature flag releases for a given change.
- Do not trigger to define infrastructure resources or execute deployments directly
  (use `$fireskill-specialist-sst`), nor to decide which telemetry confirms rollout health
  (use `$fireskill-specialist-observability`) — focus here is pipeline architecture and promotion strategy.
- Combine with `$fireskill-specialist-application-security` when pipelines handle production
  credentials or publish signed artifacts.

## Workflow

1. In full releases or deployments, execute deployments via `$fireskill-specialist-sst`
   (`bun run deploy -- --stage <stage>`) and use `SEMVER` prepared by `$fireskill-specialist-versioning` for changelog and tags.
2. Map commits, artifacts, environments, required approvals, and promotion ownership before
   designing pipelines.
3. Make builds and test runs deterministic from versioned lockfiles — never resolve "latest"
   dependencies during build executions.
4. Produce immutable artifacts once and promote them without recompilation across environments
   (the artifact validated in staging is bit-for-bit identical to production).
5. Segregate credentials, permissions, and trust boundaries per pipeline job — build jobs
   must not possess production publishing credentials.
6. Coordinate schema migrations ensuring dual-version compatibility (old and new application
   versions coexisting during rolling deploys via expand/contract, which the repository's database change policy overrides for its own database).
7. (Repository override for database migrations: the database change policy in `.fireskills/RULES.md` overrides expand/contract and rollback planning — adjustments edit the init and the database is reset.) Define rollout strategy, objective success signals, halt criteria, and rollback mechanisms
   prior to deployment.
8. Record artifact provenance, version metadata, test evidence, and rollout outcomes in an
   auditable manner.

## Core Rules

- Apply least privilege, ephemeral credentials (OIDC/STS instead of static long-lived tokens),
  and pin pipeline actions/dependencies by exact commit hash.
- Build artifacts once, sign or generate content digests, and promote that immutable reference.
- Prevent concurrent conflicting deployments (two simultaneous deploys to the same service)
  and block deployment of commits failing test suites.
- Maintain environments via infrastructure as code; environment configurations live outside
  artifacts (env vars, secret managers), never baked into builds.
- Require functional smoke checks and active telemetry before declaring rollouts complete —
  "deployment exited code 0" is not equivalent to "service is healthy".
- Treat code rollback (reverting binaries) and data rollback (reverting migrations) as
  distinct challenges with separate execution windows.
