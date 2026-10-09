---
name: fireskill-update-spec
description: "Use when the user forgot something, wants to add, remove, correct, or change a request in an existing spec that has already been defined, planned, is being implemented, or was completed. Also use when an automatic transition detects a late change in behavior, scope, acceptance, data, security, or plan. Updates the normative source, invalidates only affected gates, and coordinates resumption; to create the initial spec use fireskill-03-specify, to resolve an ambiguity use fireskill-02-backlog, and to implement use fireskill-07-implement."
---

# Update an Existing Specification

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered questions contract`
from `fireskills/skills/Spec.md`.

Incorporate a request that emerged after the initial definition without hiding
the change, duplicating the normative source, or forcing the person to know
acts and gates.

## Orchestrate the Conversation

Upon completing this step or detecting work from another step, announce
`Pending blocker detected: <description> — action: resolving in this step` and
resolve it when it belongs to your own scope. When responsibility shifts,
announce `Automatic transition: $fireskill-update-spec → $<destination> — reason:
<reason> — expected outcome: <outcome>` and immediately load the destination
skill, without asking for confirmation or repeating the command. Continue in the
same conversation. After a necessary correction for this step, announce
`Automatic resumption: $<destination> → $fireskill-update-spec — blocker resolved:
<outcome>` and resume immediately. Re-evaluate state after each handoff to avoid
cycles. Do not ask for confirmation for handoffs; sensitive actions still require
explicit authorization.

## Confirm Input

1. Preserve the new request verbatim before interpreting it.
2. Locate the canonical spec in `specs/<state>/<NNNN>-<slug>/spec.md` and read
   its metadata, requirements, scenarios, plan, tasks, gates, and evidence.
3. Read project instructions, `.fireskills/PROJECT.md`, `.fireskills/STACK.md`,
   `.fireskills/RULES.md`, `.fireskills/DATABASE.md`, and applicable indexed research.
4. Inspect preexisting Git changes in the spec and do not attribute them to the
   current request.
5. If no spec exists, announce the blocker and load `$fireskill-02-backlog` for
   a rough idea or `$fireskill-03-specify` when there is explicit intent to
   create the slice.
6. If the spec is still in `Draft` and has never obtained `Definition Gate: Passed`,
   load `$fireskill-03-specify`; this skill only governs revising a definition
   that has already progressed.

## Classify Before Writing

Read [the classification matrix](references/change-classification.md) when the
request might alter behavior, plan, or boundaries between specs.

- For reversible internal fix without observable effect, do not edit the spec:
  record the evaluation in the task evidence and resume `$fireskill-07-implement`.
- For editorial clarification that does not alter meaning, preserve gates and
  edit only the necessary wording.
- For change in behavior, acceptance, scope, data, security, or interface,
  reopen from Act I.
- For change only in solution, tasks, or test strategy, reopen from Act II.
- For capability independent of the purpose and actors of the current slice, do
  not add it silently: load `$fireskill-02-backlog` or `$fireskill-03-specify`
  according to request maturity.
- When plausible options materially change the outcome, hand off to
  `$fireskill-02-backlog`, run the adaptive cycle, and resume this skill at the
  end of the cycle. If the user chooses `advance`, apply the confirmation and
  record defined in the central contract, reopen Act I when applicable points
  remain, do not forward the definition as approved, and do not reopen the same
  cycle in this resumption.

This skill does not create a new spec, does not decide material requirements for
the user, does not modify production code, and does not implement the request.

## Incorporate the Change

1. Confirm that the user authorized incorporating the request into the current spec.
   An explicit request to change, add, remove, or fix already constitutes this
   authorization; do not repeat confirmation.
2. Edit only `spec.md` and necessary indexed research. Do not create
   `change-request.md`, `plan.md`, `tasks.md`, `research.md`, or another parallel
   source.
3. Update all affected normative sections, preserve valid IDs and decisions, and
   never renumber existing IDs. For behavior changes, record reason, decision,
   and impacted IDs in section 17. For plan-only changes, record the reason in
   the affected plan or risk section without creating an artificial product
   decision.
4. Do not rewrite historical evidence as if it had been produced for the new
   input. Mark as pending all subsequent proof that depends on the invalidated
   version.
5. Run the impact projection:

```bash
node fireskills/skills/fireskill-update-spec/scripts/analyze_change.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md --base HEAD --mode impact
```

Use `--mode changelog` to list added, removed, and altered IDs. Classification
uses canonical headings, not section numbers; `unknown` reopens from Act I for
safety. The script is read-only and does not replace semantic comparison with
the request.

## Invalidate Only What Is Necessary

- For Act I changes, set `Status: Draft`, `Definition Gate: Pending`,
  `Plan Gate: Pending`, and `Delivery Gate: Pending`.
- For Act II changes only, set `Status: Defined`, preserve `Definition Gate: Passed`,
  and return `Plan Gate` and `Delivery Gate` to `Pending`.
- For provable editorial clarifications with no semantic change, preserve status
  and gates.
- Never keep a subsequent gate approved over an invalidated input.
- Preserve tasks and evidence that remain valid; `$fireskill-05-tasks` reconciles
  affected items and their dependencies before new RED tests.

Validate the intermediate structure:

```bash
node fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs \
  specs/<state>/<NNNN>-<slug>/spec.md --allow-draft
```

## Resume Flow

- Change from Act I: load `$fireskill-04-validate`; then proceed through tasks,
  TDD/BDD, and the step that originated the change. If backlog refinement ended
  with `advance`, do not make this handoff in the same resumption: report gaps
  and exit with pending gates.
- Change only from Act II: load `$fireskill-05-tasks`, which reconciles the
  plan, calls `$fireskill-06-tdd-bdd`, and resumes origin.
- Change detected during implementation: resume `$fireskill-07-implement` only
  after Definition and Plan Gate return to `Passed` and a valid RED test exists
  for the new or altered behavior.
- Change detected after `Complete`: traverse invalidated acts again and only
  restore `Complete` with proven Delivery Gate and DoD.

## Report

Report the preserved request, altered spec, classification, affected IDs and
sections, invalidated gates, preserved or pending evidence, and the next loaded
skill. Do not expose framework complexity before the outcome: first state that
the request was incorporated and the necessary flow will resume automatically.
