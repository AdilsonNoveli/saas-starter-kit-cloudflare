---
name: fireskill-aux-stack
description: Monitor manifests and structural files to create or update .fireskills/STACK.md additively. Use when the context monitor reports pending stack; when framework, language, runtime, structural package, testing tool, or persistence changes; when technical documentation is incomplete; or after adding a framework, structural library, or relevant dependencies. Preserves existing human content.
---

# Maintaining the Stack

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `no questions`.
Do not formulate questions in this skill. When confirmed information is missing,
flag the pending field for the responsible conversational step.

1. Read local instructions, `.fireskills/PROJECT.md`, and existing `STACK.md`.
2. Run `node scripts/update_stack.mjs --project <root>`.
3. Verify each row against present manifests, lockfiles, and configurations.
4. Keep human decisions, notes, and sections outside the `specsfy:stack` block;
   never remove them.
5. Manually append only facts backed by an executable source and cite that source
   in the `Evidence` column.
6. If the change also affects persistence, load `$fireskill-aux-database`.
7. Run `$fireskill-setup` in monitoring mode and do not release the handoff
   while `.fireskills/STACK.md` remains pending.

Do not copy entire dependency trees. Record structural technologies, their
responsibilities, and useful evidence for agents understanding the system.
