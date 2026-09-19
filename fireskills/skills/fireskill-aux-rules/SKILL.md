---
name: fireskill-aux-rules
description: Monitor and help discover, formulate, and record durable rules in .fireskills/RULES.md without altering or removing existing rules. Use when context monitor points to rule review; when the user wants to add project rules; when a recurring convention needs to become an explicit instruction; or when reviewing conflicts and duplicates. Does not invent rules or promote preferences without confirmation.
---

# Maintaining Project Rules

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `questions`.
Before formulating any question, read and apply the `Numbered questions contract`
from `fireskills/skills/Spec.md`.

1. Read local instructions, `.fireskills/PROJECT.md`, and all existing `RULES.md`.
2. Distinguish declared rule, inference, and suggestion.
3. When the formulation is not confirmed, select a real question and apply the
   central contract for numbered questions.
4. Formulate verifiable rules, with clear verb and boundary.
5. Execute:

```bash
node scripts/add_rule.mjs \
  --project <root> \
  --section "<topic>" \
  --rule "<confirmed rule>"
```

6. Review the result, preserving ordering, comments, and previous rules.
7. Flag conflicts without silently choosing which rule prevails.
8. Run `$fireskill-setup` in monitoring mode before returning handoff. If no new
   rule is needed, record rationale in task evidence and explicitly acknowledge review.

Do not use `RULES.md` as a substitute for `AGENTS.md`, a spec, or acceptance criteria.
Do not record secrets, tokens, or personal data.
