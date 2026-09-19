---
name: fireskill-mvp-milestone-interviewer
description: Import development requirements from the MVP into milestone 1.0, backlogs, and Draft specs, preserving business context solely at the source.
---

# Exploring the MVP with Development Requirements

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered questions contract`
from `fireskills/skills/Spec.md`.

This skill orchestrates the MVP input. It imports `MVP.md` as milestone 1.0,
selects only development requirements, and creates a candidate backlog for each
selected requirement. Business context remains in the source file. Then, it loads
the responsible skills to interview each backlog and only advances when each step
has confirmed results.

## Load Available Context

1. Resolve consumer project root before reading any file. If it is a Git submodule,
   discover the superproject with `git -C <root> rev-parse --show-superproject-working-tree`.
   Non-empty output adds only this parent root to the search. Do not traverse other parents.
2. Read `MVP.md` if it exists as a regular file at the consumer root. When absent
   and root is a submodule, read `MVP.md` in the superproject. Local file takes
   precedence. Preserve the consulted source and use it as declared context, without
   replacing what the user states.
3. Before the first question, run the importer once:

   ```bash
   node \
     fireskills/skills/fireskill-mvp-milestone-interviewer/scripts/importar_mvp.mjs \
     --root <root>
   ```

   The importer creates `specs/milestones/M01.md` from `MVP.md` and only creates
   backlog and spec for themes classifiable as developable software deliverables.
   Vision, audience, principles, context, metrics, and other records without
   behavior to build remain exclusively in `MVP.md`; do not create Inboxes for
   them or copy them to the milestone.
   Before writing development files, it applies defaults only when finding an
   explicit label or unambiguous phrasing in the passage, such as `Problem`,
   `Audience`, `Outcome`, `Context`, or an objective capability phrase.
   Record these defaults in the backlog and output JSON with their basis. When the
   passage does not support an answer, preserve the gap rather than creating a
   plausible value. Each backlog preserves a record block of the imported passage.
   The backlog is `Captured` during creation, receives the Draft spec at the end,
   and points to it as `Promoted`; the spec maintains `Definition Gate: Pending`.
   If `M01.md` exists, do not overwrite any file and notify the responsible person.
4. Read `BRAND.md` following the same order: consumer root, then submodule fallback
   to superproject. Use it to keep language, audience, value proposition, and
   brand boundaries coherent during questions. Do not copy its content to derived
   artifacts.
5. Record `MVP.md` as source in each backlog created by the importer. Do not create,
   move, or edit context files.
6. Read `.fireskills/PROJECT.md`, Inboxes, existing backlogs, and specs only if
   they help avoid repetition or contradiction. They remain separate from the
   formulation received in this session.
7. Treat the JSON returned by the importer as the ordered backlog queue for the
   session. Each item will have `title`, `backlog`, and `spec`. Contextual themes
   do not enter the queue because they remain only in `MVP.md`.

Before importing, perform the same sensitive data screening used by Inbox.
If the source contains credentials, tokens, private keys, or sensitive personal data,
do not generate the milestone or reproduce the value in messages.

## Preserve the Session

1. Derive a stable identifier in the format `DESC-YYYYMMDD-<slug>` from the first
   theme received.
2. After each user response, capture semantic content in another Inbox with the
   same session and next turn. When the user responds with only `1`, `2`, or `3`,
   replace the number with the full text of the chosen option before assembling
   `--input`, `--summary`, `--signals`, and other fields. Literal input may appear
   in interaction traceability, but cannot be used as milestone context. Never edit,
   merge, or replace an earlier capture. An Inbox also records each milestone
   hypothesis presented for confirmation.
3. Provide `--sources` in every call: list the path of consulted `MVP.md` and
   `BRAND.md`, including when coming from the superproject, or indicate they were
   absent.
4. Apply `$fireskill-01-inbox` sensitive data screening before every write. If it
   blocks capture, halt conversation until safe text is provided to record.
5. Write analysis, synthesis, metadata, and any generated milestone clearly.
   If the source or literal response is in another language, preserve it as a quote
   and record your interpretation.

Use the Inbox script with capture fields and add the session:

```bash
node fireskills/skills/fireskill-01-inbox/scripts/capturar_inbox.mjs \
  --input "<full text from user>" \
  --title "<discovery topic>" \
  --session "DESC-YYYYMMDD-<slug>" \
  --turn "<sequence number>" \
  --sources "<status of MVP.md and BRAND.md>" \
    [inbox analysis fields] [--root <root>]
```

## Resolve Defaults Before Asking

After import, handle each theme in this order:

1. Re-read the original passage, `Automatically applied defaults`, the backlog,
   and milestone `M01`.
2. Keep as confirmed response every field populated by explicit MVP declaration
   or unambiguous phrasing recorded by the importer.
3. If only one option is materially compatible with the MVP, apply it as an
   obvious default and record normalized wording and source. Do not ask for
   confirmation for an answer that is already clear.
4. If there is more than one reasonable interpretation, conflict between sources,
   or missing information, do not choose silently. Turn only that point into the
   next numbered question, with the most compatible suggestion first.
5. After each response, re-evaluate all fields. Do not repeat already answered
   questions or open a question to confirm a supported default.

Questions only appear when the MVP does not answer, when the answer requires a real
choice, or when there is ambiguity or contradiction. Import results must make clear
what was resolved automatically and what still needs user input.

## Filter What Will Be Developed

Before loading `$fireskill-02-backlog`, classify the theme:

1. `Developable`: describes a capability, screen, flow, integration, data, automation,
   executable rule, or system behavior. Create backlog and Draft spec.
2. `Contextual`: describes vision, audience, positioning, principle, problem, metric,
   assumption, context, or boundary without declaring a software delivery. Preserve
   in `MVP.md`; do not create Inbox, backlog, or spec.
3. If in doubt between the two, classify as developable only when the passage itself
   contains a verifiable construction verb or object, such as `develop`, `implement`,
   `create`, `allow`, `register`, `query`, or `integrate`. Otherwise, keep the theme
   contextual and record the reason.

Do not turn a product description into a backlog simply because it might aid future
implementation. A backlog represents a deliverable to be developed in this import.

## Orchestrate Discovery Skills

For each item in the queue returned by the importer, execute this sequence without
skipping responsibilities:

1. Announce `Automatic transition: $fireskill-mvp-milestone-interviewer to $fireskill-02-backlog; reason: interview backlog derived from MVP; expected outcome: refined backlog with confirmed answers`
   and load `$fireskill-02-backlog` for the candidate backlog path.
2. First read the MVP records accompanying that backlog and use them to fill
   already declared answers. Conduct adaptive interviews only for remaining gaps,
   ambiguities, or contradictions. Preserve one question per round, resolve numeric
   choices in option text, and respect the limit of eight questions per area.
3. If backlog or interview indicates missing or ambiguous data to store, announce
   transition to `$fireskill-data-discovery`, complete the data interview, and
   resume backlog with `.fireskills/DATABASE.md` as context.
4. After each backlog, resume this skill, record item status in session summary,
   and proceed to the next backlog in the queue. Since this skill was called to
   import the MVP, load `$fireskill-03-specify` upon completing automatic refinement
   of each backlog and create a Draft spec based on it. Section 10 must keep main
   menus and navigation: use what the MVP declares and mark `Pending` when absent.
   Do not implement code, execute tasks, or promote the Definition Gate.
5. When the queue finishes, confirm that each developable theme has a backlog and
   Draft spec and that no contextual theme generated an artifact.
   Run `bun run fireskill milestones sync --project <root>` and load
   `$fireskill-milestone-governor` to check links and progress of `M01`.
   Automatic Draft generation does not authorize implementation or final validation.

## Conduct an Adaptive Conversation

1. Start with purpose, served user, and observable problem.
2. Re-read all session Inboxes after each capture. Show a concise synthesis
   separating received wording and conversation hypothesis.
3. Assemble the round according to the central contract: one numbered question,
   specific options, `Write another answer`, and `Advance`.
4. Explore only what is necessary to understand user journey, indispensable data,
   roles, rules, integrations, boundaries, demonstration, and validation. For each
   unclear piece of data to store, load `$fireskill-data-discovery` and complete
   that discovery before addressing the next point. Do not apply a rigid template
   or repeat an already preserved answer.
5. When the user ends or defers an area, capture their phrasing and indicate the
   corresponding Inbox in the synthesis. Do not fill gaps on your own.

## Close and Follow Up

Upon closing, report session identifier, `M01`, ordered list of generated backlogs
and Draft specs, confirmed answers, and points marked as `Pending`. Also state
that other themes remain in `MVP.md`. Spec generation concludes the import;
implementation, final validation, and gate promotion remain for another authorized
step.

## Boundaries

- Do not invent answers, objective, exit condition, out-of-scope items, or milestone links.
- Do not overwrite milestone 1.0 or existing backlogs.
- Do not skip the interview of any backlog generated by the importer.
- Do not implement code during import or mark a gate as Passed.
- Do not treat Inbox as a normative source.
- Do not use the roadmap interviewer to expand the MVP without confirmation.
