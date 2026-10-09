---
name: fireskill-lessons
description: Self-evolving lessons-learned system of Fireskills. Records preventive rules from test failures, regressions, surviving mutants, and specification deviations, keeping the active playbook (.fireskills/LESSONS.md) updated to prevent repeating past mistakes.
---

# Fireskill Lessons: Self-Evolving Lessons System

`fireskill-lessons` is the evolutionary memory of Fireskills. Whenever a bug is fixed, a test fails unexpectedly, or mutation testing reveals a coverage weakness, this skill extracts an **actionable preventive rule** and records it in the system.

---

## Origin Signals

Every lesson must be grounded in an actual signal proven by code:

| Signal | Description |
|---|---|
| `ac_gap` | Spec acceptance criterion not covered or failed in production. |
| `surviving_mutant` | Test passed even after a logical mutation in code (false-positive or weak test). |
| `spec_precision_gap` | Specification contained ambiguity that led to an incorrect implementation. |
| `spec_deviation` | Implementation diverged from technical plan or violated project conventions. |
| `gate_fail` | Failure detected in one of the gates (typecheck `vue-tsc`, linter, or Vitest). |

---

## Lesson Lifecycle

1. **Candidate (`candidate`)**: Recorded for the first time. Placed under observation in the playbook.
2. **Confirmed (`confirmed`)**: Automatically promoted by the engine when recurring across 2 or more distinct slices (`sources`). Becomes a **mandatory rule** consulted before planning new slices.
3. **Quarantine (`quarantined`)**: If a lesson causes false positives or proves unviable in practice, it receives a penalty via `penalize` and is placed in quarantine.

---

## Operational Commands

```bash
# Record a new grounded lesson
bun run fireskill lesson add \
  --signal gate_fail \
  --summary "Layer import via relative path in schema" \
  --rule "Always import layer schemas via package specifier (@nuxfire/*) in apps/functions" \
  --source "0042-billing"

# List active confirmed lessons
bun run fireskill lesson list

# List all lessons (including candidates and quarantined)
bun run fireskill lesson list --all

# View quantitative summary
bun run fireskill lesson status

# Prune stale uncorroborated candidates
bun run fireskill lesson prune
```

---

## Generated and Maintained Files

- **`.fireskills/lessons.json`**: Canonical database serialized in JSON, owned by the engine.
- **`.fireskills/LESSONS.md`**: Playbook formatted in Markdown, consumed directly by agents before drafting specifications or tasks.
