---
name: fireskill-specialist-data-modeling
description: Model data, entities, relationships, lifecycles, data quality, and persistent contracts prior to implementing changes.
---

# Product Data Modeling

Use this skill to understand and evolve persistent data models without assuming
databases or libraries. Inspect the stack, current codebase, migrations, schemas,
models, contracts, and tests before proposing modifications.

## Workflow

1. Identify entities, roles, and relationships observed in code.
2. Record fields, types, nullability, origin, lifecycle, and access permissions
   for querying and modifying data.
3. Describe uniqueness, consistency constraints, retention, soft/hard deletion,
   audit history, and migration paths where relevant.
4. Update the spec data section and route confirmed answers to
   `$fireskill-aux-database` and `.fireskills/DATABASE.md`.
5. Derive scenarios covering create, read, update, delete, authorization, and invalid
   data handling. Implementation delegates to the detected database specialist.

Do not invent speculative fields, relations, or technologies. The user confirms
what information the product needs to store when current systems do not answer.

## When to Use

- Use when altering tables, schemas, models, migrations, or persistence contracts.
- Use when mapping relationships and state lifecycles prior to drafting a spec.
- Do not use to choose a database library in isolation without project context.

## Steps

1. Read stack, migrations, schemas, models, and existing tests.
2. Separate entities, relationships, fields, and observed states.
3. Record uniqueness, retention, deletion, and historical tracking rules.
4. Compare proposals against existing queries and contracts.
5. Route confirmations to the project database specialist.
6. Require a versioned `[MIGRATION]` task for all database changes and verify
   application on a test database.

## Core Rules

- Every field documents type, origin, presence, and lifecycle.
- Every relation documents cardinality and loading strategy.
- Every migration preserves existing data or documents required transformations.

## Antipatterns

- Creating fields without demonstrable product usage.
- Altering relationships without auditing queries, factories, and tests.
- Selecting technologies prior to inspecting existing stack manifests.

## Validation

- Run unit and integration tests tied to persistent models.
- Apply migrations on a clean test database and verify resulting schema diffs.
- Confirm migration file, application command, and status verification before closing tasks.
