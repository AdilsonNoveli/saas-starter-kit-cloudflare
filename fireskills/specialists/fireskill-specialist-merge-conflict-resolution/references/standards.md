# Standards and References for Git Conflicts

## Diagnostic Commands

- `git status`: identifies the ongoing operation (merge/rebase/cherry-pick)
  and the exact list of unmerged paths.
- `git ls-files -u`: lists the three stages of each conflict — stage 1 (common
  ancestor/base), stage 2 (ours), stage 3 (theirs) — along with their respective blobs.
- `git show :1:path`, `git show :2:path`, `git show :3:path`: shows the
  full content of each version of the conflicting file (base, ours,
  theirs respectively), useful when inline markers are insufficient to
  understand the intent of each side.
- `git log --merge`: lists commits that touched the conflicting paths
  on both sides, reconstructing the intent of each change.
- `git diff --cc` (or `git diff` during conflict): displays the current
  combined result compared to both origins in the "combined diff" format.
- `git log --oneline <base>..HEAD` and `git log --oneline <base>..<other>`:
  reconstructs what each side added since the common ancestor.

## Conflicts Without Textual Markers (The Most Dangerous)

These do not appear as `<<<<<<<` in the file, but break the build or
runtime behavior after a "clean" resolution:

- Rename on one side + a caller that still imports/calls the old name on the
  other side — Git resolves the rename automatically without conflict markers,
  yet the unadjusted caller breaks at build or runtime.
- Concurrent changes to migration/schema that individually apply without
  error, but together produce an inconsistent schema (two migrations modifying
  the same column incompatibly).
- Function signature changed on one side, and a new caller added on the
  other side using the old signature.
- Lockfile automatically resolved (or via `-X ours`) without manifests
  (`package.json`, `bun.lock`) remaining coherent with it.
- Tests added independently on both sides that now interact with each other
  (shared fixture, shared global state, colliding port).

After resolving textual markers, actively search for these patterns across
neighboring files before considering the integration complete.

## Resolution Strategies and When Each is Safe

- **Manual hunk-by-hunk merge**: safe default for the vast majority of cases;
  requires understanding the intent of each side before combining.
- **`-X ours`/`-X theirs`** (recursive merge strategy, not checkout):
  automatically resolves conflicting hunks in favor of one side without
  dropping changes from the other side in non-conflicting files — nonetheless,
  restrict to files where one side is proven authoritative (e.g., regenerable
  lockfiles), never in business logic.
- **`git checkout --ours`/`--theirs <path>`**: completely discards one
  side for that file — only use when an entire file side is definitively
  obsolete, with explicit confirmation.
- **`git rerere`**: records resolutions to automatically reapply to
  identical future conflicts (useful in long rebases with multiple commits
  generating the same conflict) — reconfirm surrounding context has not
  changed before relying on the recorded resolution.
- **Rebase vs merge**: merge preserves the history of both sides exactly
  as it happened, creating a merge commit; rebase rewrites commits from one
  side on top of another, producing a linear history but altering commit
  hashes — never rewrite (rebase/force push) commits that have already been
  published and consumed by others without coordination.

## Official Sources

- git-merge: https://git-scm.com/docs/git-merge
- git-rebase: https://git-scm.com/docs/git-rebase
- git-rerere: https://git-scm.com/docs/git-rerere
- git-diff (combined `--cc` format): https://git-scm.com/docs/git-diff
- git-ls-files: https://git-scm.com/docs/git-ls-files
- Pro Git — Basic Branching and Merging: https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging
- Pro Git — Rebasing: https://git-scm.com/book/en/v2/Git-Branching-Rebasing
