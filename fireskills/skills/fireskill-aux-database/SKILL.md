---
name: fireskill-aux-database
description: Monitor and maintain complete persistence documentation in .fireskills/DATABASE.md, with tabular inventory of databases, schemas, tables, fields, relations, and migrations. Use when context monitor points to pending persistence, whenever a database, table, collection, persistent model, column, index, relation, schema, or migration is created or modified, and when auditing whether the data map matches code. Preserves human notes and decisions outside the detected inventory.
---

# Maintaining the Data Map

## Mandatory Preparation

Before executing this skill, you must load `$fireskill-setup` at the project
root. In an automatic handoff, load it again before this step. Reuse the confirmed
root in the conversation and do not proceed if setup reports a pending blocker.

## Interaction Mode

Interaction mode: `no questions`.
Do not formulate questions in this skill. When confirmed information is missing,
flag the pending field for the responsible conversational step.

1. Read local instructions, `.fireskills/PROJECT.md`, `STACK.md`, and all of `DATABASE.md`.
2. Inspect schemas, migrations, persistent models, and configurations without
   revealing environment secrets or credentials.
3. Run `node scripts/update_database.mjs --project <root>`.
4. Verify the detected inventory against executable sources.
5. Complete relations, indices, constraints, ownership, retention, and purpose
   that cannot be reliably inferred; mark unknown rather than inventing.
6. Preserve all content outside the `specsfy:database` block.
7. Consider data changes incomplete until `DATABASE.md` reflects the new structure
   and relevant tests are green.
8. Run `$fireskill-setup` in monitoring mode before returning handoff and ensure
   `.fireskills/DATABASE.md` no longer appears as a pending blocker.

When `$fireskill-data-discovery` records confirmed responses, preserve the
`Confirmed information to store` section and compare it with what code reveals.
The conversation describes the product; this map continues showing what has
already been implemented.

Use Markdown tables to facilitate search and comparison. Never copy production
data, connection strings, passwords, tokens, or values from `.env`.
