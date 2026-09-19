# Backlog Quality and Refinement

Read this reference when organizing, refining, prioritizing, or evaluating the readiness of
an item. The backlog connects business needs to verifiable work across
product, engineering, and testing. It is not an uncoordinated list of screens or
features and does not replace `spec.md`.

## Hierarchy and Types

Use hierarchy only to the depth that aids navigation:

```text
Product
└── Epic
    └── Feature
        ├── Story or requirement
        ├── Rule
        ├── Technical item
        └── Improvement
```

- **Epic** represents a broad, umbrella goal.
- **Feature** bounds a product capability.
- **Story or requirement** describes a smaller, verifiable delivery.
- **Rule** makes an architectural or business cross-cutting constraint explicit.
- **Technical** enables quality, operations, or dependent deliverables.
- **Improvement** enhances an existing capability.

Do not force all levels when relationships remain unknown. Record `To be clarified`
and preserve the idea.

A summary table can combine order, priority, and type:

| Order | Priority | Type | Item | Objective |
| --- | --- | --- | --- | --- |
| 1 | High | Epic | User Management | Administer system access |
| 2 | High | Story | Perform Login | Access authenticated areas |
| 3 | High | Rule | Enforce Permissions | Restrict privileged operations |
| 4 | Medium | Technical | Process Queue Notifications | Avoid slow request cycles |
| 5 | Low | Improvement | Notification Preferences | Choose notification channels |

## Adaptive Anatomy

An item may contain:

- Clear title;
- Problem context;
- User objective or story;
- Expected behavior;
- Business rules;
- Acceptance criteria;
- Security, privacy, performance, volume, audit, and observability;
- Dependencies;
- Error conditions and exceptions;
- In scope and out of scope;
- Type and priority.

Depth scales with risk and complexity. Capture first; refine when decisions
are required. Never invent fields simply to give an illusion of completeness.

### Minimum Capture

Before persisting an item, confirm only:

- Perceived problem;
- Affected or benefited person;
- Expected result or value;
- Sufficient context to distinguish the idea.

Reuse everything already clear in the request. If missing or admitting multiple
material interpretations, ask one gap per round and re-evaluate after each answer.
Do not persist placeholders in these four fields and do not invent answers.
Hierarchy, priority, detailed rules, acceptance criteria, and technical solutions
do not belong to this minimum baseline.

### Duplicates and References

Search request terms across project backlogs, specs, and documentation before
creating an item. Compare problem, persona, outcome, and context to distinguish
potential duplicates from mere lexical overlap. Specs and documentation provide
vocabulary, active decisions, and constraints; they do not replace user-declared intent.

Confirm whether a potential duplicate should receive updates or if the new idea
embodies a genuine distinction. Record useful paths and relationships in `Related references`;
never merge, move, or delete items without confirmation.

## Analysis Patterns

### Authentication

Consider account lifecycle, identity verification, credential hashing, rate limiting,
session persistence, revocation, secure error messages, and authorization.
"Create login" or "create screen" does not describe this behavior.

### Notifications

Define ownership, badge count, read timestamps, single and batch actions,
history retention, and tenant isolation. Convert "reset on read" into an objective event:
open menu, view item, or mark all as read.

### Permissions

When operations, roles, tenants, and targets intersect, use an authorization matrix.
Enforce authorization on the server, prevent self-elevation, protect invariants such as
the last administrator, and record sensitive mutations in audit logs.

| Operation | Admin | Manager | Member |
| --- | --- | --- | --- |
| List users | Yes | Same organization | No |
| Edit member | Yes | Same organization | No |
| Edit admin | Yes | No | No |
| Self-elevate role | No | No | No |

### Payments and Integrations

Describe primary flow, states and transitions, idempotency keys, webhook signature verification,
retries, external outages, entity bindings, and credential/secret protection.

Example flow: receive amount → create charge → link to customer →
present payment interface → confirm via signed webhook → transition state exactly once.
Model at least pending, paid, expired, cancelled, and failed, preventing paid charges
from reverting to pending.

### Exports and Heavy Processing

Consider filters, field-level authorization, timezones, synchronous execution thresholds,
background job delegation, expiration, notifications, and sensitive data leakage.

## Functional vs Non-Functional

A functional requirement describes what happens: authenticate, charge, notify,
export, or cancel. A non-functional requirement specifies a measurable condition of
quality and operations: latency, throughput, tenant isolation, encryption, auditability,
retention, or fault recovery.

Replace vague adjectives with verifiable conditions. Example: "respond in under
two seconds for queries up to 50,000 records under the project production baseline".

## Acceptance Criteria

Write observable conditions without prescribing internal implementation:

```gherkin
Scenario: Login with active account
  Given an active user account with valid credentials
  When the user submits correct email and password
  Then access is granted according to their role

Scenario: Replay of payment webhook
  Given a charge already confirmed as paid
  When the same signed webhook event is received again
  Then no duplicate payment is recorded
```

In initial capture, scenarios may be omitted. For a refined item,
use them whenever they provide the clearest way to make success, failure, or limits verifiable.

## Prioritization

Order items considering:

1. Value to user or business;
2. Security, privacy, or operational risk;
3. Dependencies and number of unlocked deliverables;
4. Urgency;
5. Effort;
6. Uncertainty.

Priority is relative. If multiple items seem equally high, compare them and
record sequence. Infrastructure or authorization work may precede visual features
when enabling or protecting dependent deliverables.

## Readiness Diagnosis

Before declaring an item refined, confirm:

- Problem and benefited person;
- Triggering event and produced outcome;
- Authorized actor;
- Rules, errors, and exceptions;
- Objective verification;
- Security, privacy, and performance implications;
- Out of scope boundaries;
- Dependencies and open decisions.

The agent queries material gaps one at a time. A decision affecting security,
scope, architecture, or user experience is never silently assumed.
Backlog readiness indicates the item may proceed to specification;
it does not authorize implementation without an approved spec and gates.
