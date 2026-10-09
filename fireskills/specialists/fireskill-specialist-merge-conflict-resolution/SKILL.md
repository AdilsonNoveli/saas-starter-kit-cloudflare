---
name: fireskill-specialist-merge-conflict-resolution
description: "Resolve Git merge or rebase conflicts based on intent from both branches, distinguishing textual from semantic conflicts, preserving functionality, and validating the integrated state. Use when a Git operation is already in progress with unmerged files; do not abort operations, rewrite remote history, or discard an entire side (`ours`/`theirs` globally) without explicit authorization."
---

# Merge Conflict Resolution

## When to Use

- Trigger when an active `git merge`, `git rebase`, or `git cherry-pick` has unmerged files.
- Do not trigger to make product decisions about which feature should take precedence —
  that is a product decision; this specialist resolves the resulting code and behavior.
- Combine with `$fireskill-specialist-code-review` after resolution — integrated code
  requires the same scrutiny as any new diff.

## Workflow

1. Inspect the exact state of the operation (merge, rebase, cherry-pick), participating
   branches/commits, and unmerged paths.
2. For each conflicting hunk, deduce the intent of each side — what each change was trying
   to achieve, rather than just the literal characters.
3. Classify the conflict: textual (same line, different text), structural (same block
   reorganized), semantic (no text markers, but incompatible behavior — e.g., signature
   changed on one side, caller not updated on the other), or generated (lockfiles, build outputs).
4. Construct a combined resolution preserving both intents when compatible — the correct
   fix is rarely choosing one entire side blindly.
5. When intents are genuinely mutually exclusive, select according to integration objectives
   and document the discarded trade-off.
6. Remove all conflict markers, verify file syntax, and run targeted checks (lint, typecheck).
7. Continue the operation (`git merge --continue` or `git rebase --continue`) and run
   relevant regression test suites before pushing.

## Core Rules

- Never use blanket `git checkout --ours`/`--theirs` or `-X ours`/`-X theirs` across the board —
  each hunk may have a different correct resolution.
- Never manually edit generated files (lockfiles, build outputs, code generators) — update
  the defining manifests and regenerate.
- Preserve schema changes, migrations, tests, and API contracts from both sides when they
  do not genuinely clash.
- Audit imports, renames, and call sites even in files without conflict markers — a rename
  on one branch and a new call site on the other causes runtime breaks without Git conflict markers.
- Do not introduce unrelated refactorings during conflict resolution.
- Never execute `--abort`, force pushes, or hard resets without explicit user authorization.
- Ensure no unmerged paths remain and index is clean before concluding.

## Antipatterns

- Wholesale acceptance of `ours` or `theirs` to make conflicts disappear quickly.
- Leaving lingering conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
- Manually editing lockfiles rather than regenerating via package managers (`bun install`).
- Forgetting to run typechecks and tests across both sides of the integrated change.

## Validation

- `git status` reports clean working directory with zero unmerged paths.
- All modified files parse without syntax errors.
- Project typecheck and test suites run and pass.
