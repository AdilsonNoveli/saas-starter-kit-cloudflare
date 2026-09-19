---
name: fireskill-data-discovery
description: Converse in everyday language when the product needs to store information, suggest appropriate formats, and record confirmed answers in `.fireskills/DATABASE.md`.
---

# Discovering Information the System Needs to Store

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered questions contract`
from `fireskills/skills/Spec.md`.

Converse about system information without asking the user to describe databases,
tables, columns, foreign keys, or technical schemas. Use the product's own vocabulary:
what needs to be remembered, who uses it, what changes, and when it is no longer needed.

## Prepare the Conversation

1. Read the Inbox, `MVP.md` discovery, backlog, spec, or request that prompted
   the discovery.
2. Read `.fireskills/PROJECT.md` and `.fireskills/DATABASE.md` when they exist.
   Separate what is already confirmed from what still requires discussion.
3. Look only for information the system needs to store, query, compare, display,
   share, correct, or delete. Do not ask about data that does not alter user journey
   or operations.
4. Preserve sources and user formulations. A hypothesis does not become confirmed
   content in the data file.

## Ask Without Technical Jargon

In each round, select the highest-impact unconfirmed information item and follow
the central contract. Maintain a list of missing or ambiguous data items to store.
After each response, update the list and ask about the next until all are confirmed,
deferred, or closed, respecting the maximum of eight questions per area.
Prefer questions like these, tailored to the context:

- "What do you need to remember about each order, person, or interaction?"
- "Who can see or change this information?"
- "What needs to stay linked when a person places multiple orders?"
- "When does this information change, expire, or need to be deleted?"
- "What information must not be visible to other people?"

Avoid explaining internal mechanics. If the user uses technical terms, confirm
the effect on their workflow before recording the answer.

## Suggest How Each Piece of Data Should Be Recorded

After understanding the purpose, propose a simple way to record each piece of
information and ask for confirmation. Choose suggestions based on expected usage,
without naming underlying technologies or database internals:

- short text for names, titles, and codes read quickly;
- freeform text for notes and longer descriptions;
- number for quantities, measurements, and counts;
- currency/monetary value for prices, charges, and discounts;
- date or timestamp for appointments, deadlines, and occurrences;
- choice between options for status, category, or priority;
- yes/no for confirmations;
- file or image for receipts and attachments.

Present the suggestion as a product hypothesis, explain its rationale in one
sentence, and ask if it reflects actual usage. Record the `suggested format` only
after confirmation. When the same information has distinct usages, record each
usage separately.

## Record What Was Confirmed

After a confirmed answer, pass the context to the script below.
Use domain terminology and concise phrases understandable by business operators.

```bash
node fireskills/skills/fireskill-data-discovery/scripts/\
registrar_dados_conversados.mjs \
  --project <root> \
  --nome "<product information>" \
  --para-que-serve "<purpose>" \
  --o-que-guardar "<required information>" \
  --formato-sugerido "<confirmed format to record>" \
  --ligacoes "<what stays linked to what>" \
  --acesso "<who queries or modifies>" \
  --ciclo-de-vida "<when it changes, expires, or is deleted>" \
  --fontes "<paths of Inbox, backlog, MVP, or spec>"
```

Record only confirmed answers in the `Confirmed information to store` section.
Keep this section separate from what was detected in code. Do not alter the
automatically detected block and never copy real credentials or sensitive personal data.

## Handoffs

- In the backlog, conduct this discovery before declaring the brief ready when the
  journey depends on stored information.
- During MVP discovery, preserve `MVP.md` as source and load this skill for each
  missing or ambiguous data item in an imported backlog.
- In specification, load this skill if the data source does not explain what the
  journey needs to remember or who can query each piece of information.
- Inbox does not ask questions. It only preserves signals for this step.

## Boundaries

- Do not choose technology, internal structure, or implementation.
- Do not create backlog, spec, tasks, tests, or code.
- Do not fill gaps through inference.
- Do not record sensitive content.
