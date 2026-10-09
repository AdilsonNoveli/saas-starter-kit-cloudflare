# Gitflow Standards and References

## Branch Topology Map

| Branch | Origin | Merge Target | Lifecycle |
| --- | --- | --- | --- |
| `main` | — | — | Permanent; mirrors production releases |
| `develop` | `main` (initial) | — | Permanent; integration branch |
| `feature/*` | `develop` | `develop` | Short-lived; one feature per branch |
| `release/*` | `develop` | `main` and `develop` | Short-lived; release hardening and version bumps |
| `hotfix/*` | `main` | `main` and `develop` | Short-lived; urgent production patches |
| `support/*` | `main` (legacy tag) | per local policy | Long-lived; legacy major version maintenance |

## `git flow` (AVH) CLI to Pure Git Commands

Pure Git commands achieve identical results without requiring custom binary extensions:

- `git flow feature start <name>` ≡
  `git checkout -b feature/<name> develop`
- `git flow feature finish <name>` ≡
  `git checkout develop && git merge --no-ff feature/<name> && git branch -d feature/<name>`
- `git flow release start <version>` ≡
  `git checkout -b release/<version> develop`
- `git flow release finish <version>` ≡
  `git checkout main && git merge --no-ff release/<version> && git tag -a <version> && git checkout develop && git merge --no-ff release/<version> && git branch -d release/<version>`
- `git flow hotfix start <version>` ≡
  `git checkout -b hotfix/<version> main`
- `git flow hotfix finish <version>` ≡
  `git checkout main && git merge --no-ff hotfix/<version> && git tag -a <version> && git checkout develop && git merge --no-ff hotfix/<version> && git branch -d hotfix/<version>`

## Detecting Project Gitflow Adoption

- `git config --get-regexp '^gitflow\.'` returns keys recorded by `git flow init`.
- `.fireskills/RULES.md`, `AGENTS.md`, or `CONTRIBUTING.md` explicitly mandate Gitflow.
- Never assume Gitflow in the absence of explicit configuration or direct user instructions.

## When Not to Use Gitflow

In 2020, Vincent Driessen (author of the original model) acknowledged that Gitflow
was designed for traditional multi-version software products. Web applications
with continuous delivery benefit far more from streamlined Trunk-Based Development
or GitHub Flow. Propose simpler alternatives when deployments occur multiple times a day.

## Authoritative Documentation

- Original Model (Vincent Driessen): https://nvie.com/posts/a-successful-git-branching-model/
- Gitflow AVH Edition: https://github.com/petervanderdoes/gitflow-avh
- git-merge documentation (`--no-ff`): https://git-scm.com/docs/git-merge
- git-tag documentation: https://git-scm.com/docs/git-tag
- Pro Git Book (Branching Workflows): https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows
- Semantic Versioning: https://semver.org/
