---
name: fireskill-01-inbox
description: "Use when the user submits an idea, thought, need, opportunity, or free-form text to store, capture, or revisit later. Faithfully preserves raw input, performs silent preprocessing, and immediately creates a timestamped file in `specs/inbox/`. Never asks questions, requests confirmation, or creates backlog items, specs, tasks, tests, or code."
---

# Register an Inbox Entry

## Mandatory Preparation

Before executing this skill, load `$fireskill-setup` at the repository root. In automated handoffs, reload it prior to this step. Reuse confirmed project root and do not proceed if setup reports pending blockers.

## Interaction Mode

Interaction mode: `no questions`.
Formulate zero questions in this skill. Record missing details as future review points without interrupting raw capture.

Save received input immediately into `specs/inbox/`. Treat the Inbox as a durable intake layer prior to backlog refinement: it preserves intent and organizes signals, but does not decide requirements or authorize implementation.

## Do Not Interrupt Capture

- Never ask questions, even if the submitted idea is vague, contradictory, or incomplete.
- Do not request confirmation before writing to disk.
- Do not block capture due to potential duplicates, missing context, or uncertainty.
- Record ambiguities under `Points to review in the future`; do not attempt to resolve them with the user during capture.
- After saving, report only the file path, a concise summary of parsed signals, and optional next steps. Do not start next steps automatically.

## Preserve and Preprocess

1. Silently inspect for exposed credentials, secret tokens, private keys, or sensitive personal data. If found, do not write file or prompt questions; inform that security policies require removing sensitive data and resubmitting.
2. Use all text expressing the idea as raw original input. Preserve phrasing verbatim without "correcting" or substituting words.
3. Derive a concise, faithful title and generate kebab-case slug.
4. Categorize extracted signals:
   - **Declaration:** explicit statements directly present in original input;
   - **Inference:** plausible interpretation, always labeled as such;
   - **To Review:** ambiguities, conflicts, or architectural choices to review later.
5. Extract only when grounded by evidence:
   - one-sentence summary;
   - core problem or opportunity;
   - affected users or beneficiaries;
   - desired outcome or value;
   - signals regarding scope, business rules, constraints, channels, or proposed solutions;
   - visible dependencies and risks;
   - possible future backlog or specification directions without promoting them;
   - persistent data requirements to explore in subsequent discovery.
6. Use `Not identified in original text.` when evidence is absent. Never fabricate stakeholders, priorities, deadlines, rules, or acceptance criteria.

## Create the File

Execute once:

```bash
node <skill-directory>/scripts/capturar_inbox.mjs \
  --input "<full raw input>" \
  --title "<derived title>" \
  --summary "<summary>" \
  --problem "<problem or opportunity>" \
  --people "<affected users>" \
  --value "<desired outcome or value>" \
  --signals "<extracted signals>" \
  --data "<data storage signals>" \
  --risks "<risks or dependencies>" \
  --directions "<potential future directions>" \
  --review "<points to review later>" \
  [--root <project-root>]
```

The script resolves `.fireskills/templates/custom/Inbox.md` when present, falling back to `.fireskills/templates/Inbox.md`. It creates `specs/inbox/YYYY-MM-DD-HHMMSS-<slug>.md` and never overwrites existing captures.

## Conversational Orchestration

This skill is a deliberate exception to automatic handoffs: raw capture is the terminal goal of the request and must happen without questions or transitions. After saving, suggest possible next steps:

- keep entry in Inbox for future review;
- use `$fireskill-02-backlog` to refine into a backlog item;
- use `$fireskill-data-discovery` when input suggests new data storage requirements.

Only switch skills if the user's prompt explicitly commanded subsequent steps in the same turn. In that case, announce `Automated transition: $fireskill-01-inbox → $<destination> — reason: <reason> — expected result: <result>` after capture is safely written.

## Boundaries

- Do not search for duplicates before saving.
- Never modify or delete prior inbox entries.
- Never mislabel inferences as user declarations.
- Never create `specs/backlog/`, spec state folders, tasks, research, tests, or code.
- Never treat raw inbox thoughts as normative behavioral specifications.
