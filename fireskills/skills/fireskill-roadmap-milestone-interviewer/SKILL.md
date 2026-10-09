---
name: fireskill-roadmap-milestone-interviewer
description: Use after the MVP has been accepted to interview the responsible person about product evolution, propose post-MVP milestones, and link specs without silently reopening the agreed core. Do not use to define initial MVP, execute tasks, or modify a completed spec.
---

# Interviewing Evolution After the MVP

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered questions contract`
from `fireskills/skills/Spec.md`.

Read `.fireskills/PROJECT.md`, `specs.md`, files in `specs/milestones/`, and related
specs. Start with the approved MVP and explain what part of the conversation will
be planned now.

## Conduct the Interview

1. Reaffirm the current boundary of the MVP and formulate a numbered question
   about learning, operational need, or opportunity for the next stage.
2. Reflect each round in a short synthesis and formulate the next round from the
   gaps that still prevent identifying a subsequent demonstrable state.
3. Investigate temporary MVP limitations, integrations, automations, reports,
   scale, permissions, and hypotheses that depend on real-world usage.
4. Continue until organizing a comprehensible sequence of subsequent milestones
   or until clearly recording that there is insufficient information to order the
   evolution.

## Protect What Was Already Accepted

When an answer alters the problem, core flow, boundary, or exit condition of an
MVP milestone, present the impact and request explicit confirmation.
Route changes to an existing spec to `$fireskill-update-spec`; do not rewrite
the core as a side effect of a new roadmap.

## Propose and Record Milestones

Each post-MVP milestone needs an objective, exit condition, out-of-scope items,
dependencies, and candidate specs. Record hypotheses dependent on real-world usage
in their own section, without presenting them as already confirmed requirements.

After approval, assign sequential IDs, link specs and backlog, and run:

```bash
bun run fireskill milestones sync --project .
```

Deliver a recommended order, rationale for each dependency, and next capabilities
that should enter the backlog.

## Boundaries

- Do not convert the entire backlog into a roadmap.
- Do not change the MVP without explicit confirmation.
- Do not use task percentage as a milestone completion condition.
- Do not create technical tasks or implement code.
