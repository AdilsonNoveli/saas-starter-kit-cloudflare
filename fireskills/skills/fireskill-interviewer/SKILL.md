---
name: fireskill-interviewer
description: "Use when a spec in draft, defined, planned, in-progress, or review needs conversation to resolve gaps, recalibrate Effort, or record confirmed answers before the next transition. Do not use to capture Inbox without questions, execute implementation, approve gates, or move directories directly."
---

# Interviewing a Spec by Current State

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered questions contract`
from `fireskills/skills/Spec.md`.

Read `spec.md` by specified ID and confirm state directory. The directory is the
operational state; `Status` is its verifiable mirror. Preserve the spec as the
normative source and record only answers, choices, and justifications confirmed
by the responsible person.

## Conduct the Interview

1. Read the spec, its gates, tasks, evidence, and project context.
2. Identify the real gap that most impacts the next step and assemble a round
   according to the central contract.
3. Re-evaluate the spec after each round. Do not repeat confirmed information
   or use questions as mere ritual.
4. Update the appropriate section of the spec after confirming the response.
   When new information alters necessary capacity, also adjust Effort.
5. Transfer responsibility for validation, implementation, or transition to the
   corresponding skill. This skill does not approve gates, execute tasks, or
   move the spec.

## Adapt Focus to Directory

| Directory | Conversation Focus |
| --- | --- |
| `draft` | Problem, actors, behavior, rules, failure paths, and acceptance |
| `defined` | Ambiguity affecting plan, data, security, or tests |
| `planned` | Dependencies, task order, TDD and BDD strategy |
| `in-progress` | Late changes, execution discoveries, and scope impact |
| `review` | Observed acceptance, documentation, delivery gaps, and feedback |
| `completed` | Do not interview to alter delivery; initiate or reopen change via the correct flow |

`inbox` does not receive questions. `backlog` remains under the responsibility of
`$fireskill-02-backlog`, which calls this discovery protocol when needed.

## Update Effort

Use Effort as an estimate of reasoning capacity and required execution, never
as a deadline. Choose an integer from 1 to 10 and a short rationale:

- 1–2: Atomic change and known pattern;
- 3–4: Local change and straightforward tests;
- 5–6: Multiple files or known integration;
- 7–8: Cross-cutting change, migration, or external integration;
- 9–10: Architectural redesign, high uncertainty, or frequent human review.

Execute after confirmation:

```bash
bun run fireskill effort <spec-id> <1-10> --reason "<what changed the estimate>"
```

The command updates `Effort`, date, rationale, and history in `spec.md`.
Do not bind the estimate to a model name: use the bracket to choose execution
profile `light`, `standard`, `high`, or `maximum`.

## Integrate ClickUpfy When Present

If the project contains a `clickupfy-*` skill and the spec has a `ClickUp Task`,
load the appropriate ClickUpfy skill after a transition or Effort adjustment.
Use the mapping configured by the project or, when absent, `draft`/`defined`/`planned`
to `To Do`, `in-progress` to `In Progress`, `review` to `In Review`, and
`completed` to `Complete`.

Local state remains canonical. If remote update does not succeed, record the
pending blocker in the spec without declaring synchronization complete.

## Boundaries

- Do not invent answers, Effort, task bindings, or remote status.
- Do not edit a spec in `completed` to start a new change.
- Do not move folders via shell commands; use `bun run fireskill transition`
  only in the responsible skill after its gates pass.
- Do not require ClickUp for a spec without configured integration.
