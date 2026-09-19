---
name: fireskill-specialist-gitflow
description: "Apply and review the Gitflow branching model (main, develop, feature/*, release/*, hotfix/*, support/*), branch naming conventions, merge policies, and release/hotfix sequencing. Use when the project explicitly adopts Gitflow or when specifically requested; use to sequence and close feature/release/hotfix branches; do not assume Gitflow from repository structure alone, do not use to resolve existing merge conflicts (use `$fireskill-specialist-merge-conflict-resolution`), and do not use to design CI/CD deployment pipelines (use `$fireskill-specialist-delivery-engineering`)."
---

# Gitflow

## When to Use

- Trigger when the project explicitly requests the Gitflow branching strategy
  (`main`/`master`, `develop`, `feature/*`, `release/*`, `hotfix/*`) or when
  `git config --get-regexp '^gitflow\.'` or project rules document this choice.
- Trigger to name, sequence, or finalize `feature/`, `release/`, or `hotfix/` branches.
- Do not trigger to propose Gitflow unprompted — branch strategies are explicit decisions;
  never infer Gitflow solely from the presence of a branch named `develop`.
- Do not trigger to resolve in-progress merge conflicts (`$fireskill-specialist-merge-conflict-resolution`)
  or design deployment pipelines (`$fireskill-specialist-delivery-engineering`).

## Workflow

1. Confirm explicit project adoption of Gitflow before applying conventions.
2. Inspect branch topology (`git branch -a`, `git config --get-regexp '^gitflow\.'`) to verify
   current configuration and existing naming conventions.
3. Align with the team on permanent branch names (`main` for production, `develop` for integration)
   and short-lived branch prefixes (`feature/`, `release/`, `hotfix/`, `support/`).
4. Record the policy in project rules (`.fireskills/RULES.md` via `$fireskill-aux-rules`),
   capturing prefixes, target branches, and merge policies.
5. Guide branch lifecycles:
   - `feature/*` branches off `develop` and merges back into `develop`.
   - `release/*` branches off `develop` and merges into both `main` and `develop`.
   - `hotfix/*` branches off `main` and merges into both `main` and `develop`.
   - Always integrate via `merge --no-ff`.
6. Coordinate release tags on `main` following the project versioning scheme (SemVer).
7. Ensure `develop` receives all bugfixes applied to `release/*` or `hotfix/*` branches
   before closing cycles — omitting this causes regressions in subsequent releases.

## Core Rules

- Use `git merge --no-ff` for all integrations of `feature/*`, `release/*`, and `hotfix/*` —
  fast-forward merges erase branch lineage essential for Gitflow release audits.
- Enforce consistent branch naming (`feature/<slug>`, `release/<version>`, `hotfix/<version-or-slug>`).
- Delete short-lived branches locally and remotely immediately upon completion.
- Never commit directly to `main` or `develop`.
- Always back-merge releases and hotfixes into `develop`.

## Antipatterns

- Adopting Gitflow on high-frequency continuous deployment projects where Trunk-Based Development is superior.
- Performing fast-forward merges that destroy release history.
- Merging hotfixes into `main` while forgetting to back-merge into `develop`.
- Keeping long-lived feature branches divergent from `develop`.

## Validation

- `git log --graph --oneline` reflects clear non-fast-forward merge topologies.
- Back-merges into `develop` verify clean synchronization with `main`.
- Clean working directory and deleted temporary branches.
