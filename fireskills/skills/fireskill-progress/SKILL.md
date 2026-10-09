---
name: fireskill-progress
description: Use when the user asks for overall progress, status of all specifications, percentage complete, remaining work, blockers, or next task across the Fireskills repository, or when an automatic transition requests final projection or routing based on observed state. Produces a read-only view of specs, gates, tasks, and checklists; do not use to modify specifications or implement tasks.
---

# Report Overall Progress

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `no questions`.
Do not formulate questions in this skill. Present the observed projection and
the next applicable handoff.

Read state exclusively from `specs/<state>/*/spec.md`. The report is a projection
of the source of truth, never a second source of state.

## Orchestrate the Conversation

Upon completing this step or detecting work from another step, announce
`Pending blocker detected: <description> — action: resolving in this step` and
resolve it when it belongs to your own scope. When responsibility shifts,
announce `Automatic transition: $fireskill-progress → $<destination> — reason:
<reason> — expected outcome: <outcome>` and immediately load the destination
skill, without asking for confirmation or repeating the command. Continue in the
same conversation. After a necessary correction for this step, announce
`Automatic resumption: $<destination> → $fireskill-progress — blocker resolved:
<outcome>` and resume immediately. Re-evaluate state after each handoff to avoid
cycles. Do not ask for confirmation for handoffs; sensitive actions still require
explicit authorization.

## Execute

At the repository root:

```bash
node fireskills/skills/fireskill-progress/scripts/progress.mjs .
```

For integration with other tools:

```bash
node fireskills/skills/fireskill-progress/scripts/progress.mjs . --json
```

For a single specification:

```bash
node fireskills/skills/fireskill-progress/scripts/progress.mjs . --slug <slug>
```

To observe context cost for a spec:

```bash
node fireskills/skills/fireskill-progress/scripts/analyze_context.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md --json
```

To project documentation status alongside progress:

```bash
node fireskills/skills/fireskill-setup/scripts/monitor_context.mjs \
  --project . --check

node fireskills/skills/fireskill-documentator/scripts/build_documentation.mjs \
  --project . --check
```

Treat `PENDING` as a delivery blocker and announce the handoff indicated by the
monitor. Resume this skill after the auxiliary skill updates the document or the
zero-impact evaluation is recorded and acknowledged.
If the second command indicates missing or outdated documentation, announce the
handoff to `$fireskill-documentator`, rebuild `docs/`, and resume projection.

Without `--usage-json`, the result is always labeled `estimated` and documents
the heuristic. Explicitly provided metrics are `measured`; never present an
estimate as actual usage.

## Interpret

1. Report denominators for specs, gates, tasks, and checklist items.
2. Show current act and next responsible skill, both derived from `Status`.
3. Distinguish completed specification, work in progress, and actual blocker.
4. Show the next ready `TNNN/ITEM` pair when one exists.
5. Treat a `Failed` gate, checklist inconsistency, or dependency without a ready
   path as a blocker. An isolated `In Progress` gate is not a failure.
6. Treat mandatory documentation flagged by `monitor_context.mjs` as a blocker,
   even if all checkboxes are marked.
7. Treat missing or outdated `docs/` according to `$fireskill-documentator` as a
   delivery blocker.
8. If an existing spec requires behavior or plan changes, announce the blocker
   and automatically load `$fireskill-update-spec`. Resume projection after the
   update traverses invalidated acts.
9. If no specs exist, preserve exit code 2. Captures in `specs/inbox/` and items
   in `specs/backlog/` do not count as normative progress. When the request also
   requires advancing an existing capture, announce the blocker and load
   `$fireskill-02-backlog`; when sufficient intent and definition exist, load
   `$fireskill-03-specify`.

## Preserve the Source

- Do not edit specs, checkboxes, tests, or code during queries.
- Do not count `spec.md` inside `research/`; discovery is strictly
  `specs/<state>/*/spec.md`.
- Do not invent progress from commits, files, or chat memory.
- To update state, announce and automatically load the responsible skill in the
  same conversation. Automatically resume progress after the update.

## Report

Deliver the overall summary first, then specs requiring attention, blockers,
and next work. When an actionable step exists, announce and execute the
transition automatically. Use JSON output without reinterpreting field names
when the user requests automation or structured data.

## Specialists on Demand

Read [references/specialists.md](references/specialists.md) only to propose
context for the next task. Automatically load the base skill or installed
responsible specialist; installation requires explicit user authorization.
