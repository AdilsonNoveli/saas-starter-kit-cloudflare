---
name: fireskill-specialist-versioning
description: Prepare and verify the Nuxfire version via the root VERSION file and, upon authorization, the Git tag v<version>. Use when preparing a release, alongside `$fireskill-specialist-delivery-engineering` and `$fireskill-specialist-sst`.
---

# Versioning

## What Exists

- `VERSION` at root: single line `MAJOR.MINOR.PATCH` (currently `0.1.0`). `fireskills/VERSION` is the version of Fireskills itself.
- Deploy: `bun run deploy -- --stage <stage>` (`$fireskill-specialist-sst`).

## What Does NOT Exist

`SEMVER` file, Docker/OCI image, registry, changelog, and Git tags in repository. Do not create any of these without explicit request.

## Rules

- `patch`: compatible fix; `minor`: compatible capability; `major`: incompatible breaking change.
- Classify the change, propose the next version, and only then write to file.
- Preparing the version locally is free to proceed. Git tags, GitHub Releases, and deployments require explicit user authorization.
- Never reuse an already published version; always increment.

## Commands

```bash
node fireskills/specialists/fireskill-specialist-versioning/scripts/semver.mjs current
node fireskills/specialists/fireskill-specialist-versioning/scripts/semver.mjs bump patch
node fireskills/specialists/fireskill-specialist-versioning/scripts/semver.mjs verify 0.1.1
```

## Validation

- `current` and `verify` confirm the content of `VERSION`.
- Run `bun run test` before proposing the tag.
- The tag, if authorized, is `v<VERSION>` pointing to the tested commit.
