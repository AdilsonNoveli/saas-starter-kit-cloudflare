---
name: fireskill-milestone-governor
description: Use to project milestone status from specs and backlog, identify missing linkages, suggest adjustments, and update only derived blocks. Do not use to invent product objectives, alter confirmed exit conditions, or complete milestones without human validation.
---

# Governing Milestones from Project Sources

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered questions contract`
from `fireskills/skills/Spec.md`.

Read `specs.md`, `specs/milestones/`, `specs/backlog/`, and existing specs.
Milestone, spec, and backlog have distinct responsibilities: a milestone describes
a demonstrable state; a spec defines a capability; a backlog records still-refinable
work.

## Project Current State

Run:

```bash
bun run fireskill milestones sync --project .
```

The command updates only marked blocks in `specs.md` and in milestone files.
It calculates completed specs by `Status: Complete` and shows backlog items
without using them to close the milestone.

## Analyze and Suggest

After projection, look for:

- spec or backlog linked to a non-existent milestone;
- milestone without confirmed exit condition;
- spec without milestone when its purpose is already known;
- dependency that makes the current sequence incoherent;
- set of specs that appears to form a new demonstrable state.

Explain the suggestion, supporting material, and effect on the map. Request
confirmation before changing structural relationships. For lack of MVP discovery,
direct conversation to `$fireskill-mvp-milestone-interviewer`; for subsequent
evolution, use `$fireskill-roadmap-milestone-interviewer`.

## Complete a Milestone

A milestone may only be declared complete when its required specs are complete
and the responsible person confirms the exit condition through a demonstration,
acceptance test, or other recorded verification. The sync command reports
progress; it does not replace this human confirmation.

## Boundaries

- Do not alter human text outside generated blocks.
- Do not move specs, edit gates, tasks, or code.
- Do not use a checklist of closed tasks as milestone acceptance.
