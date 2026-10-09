# MCR-10 — Categorial Requirements Method

> Methodology for engaging with users, analyzing specifications, and refining user stories through Aristotle's categories.

**Version:** 1.0  
**Date:** July 24, 2026  
**Status:** stable reference  
**Audience:** product managers, analysts, designers, software engineers, and AI assistants  
**Language:** English  

"Stable reference" denotes that structure, vocabulary, and protocol are
ready for active use and versioning. It does not imply that empirical efficacy has
been demonstrated scientifically; validation hypotheses reside in section 20.

---

## 1. Overview

The **MCR-10 — Categorial Requirements Method** is a methodology for discovery, analysis, and refinement of software requirements inspired by Aristotle's *Categories*.

Its objective is to transform incomplete narratives, user stories, requests, transcripts, and preliminary specifications into clear, traceable, and verifiable assertions.

The method departs from a fundamental distinction: isolated words and expressions may name actors, objects, attributes, or actions, but do not yet constitute a verifiable specification. For an assertion to be confirmed, negated, or tested, these components must be combined with precision.

MCR-10 executes this progression through three movements:

1. **Deconstruct:** break the narrative into smaller terms, concepts, and assertions.
2. **Categorize:** analyze content across the ten Aristotelian categories.
3. **Recompose:** transform elements into rules, flows, acceptance criteria, and verifiable test scenarios.

The methodology can be used by analysts, product managers, developers, designers, product squads, or artificial intelligence assistants.

The method is a contemporary adaptation. The categories provide analytical lenses to examine declarations; they never replace user research, value engineering, technical rigor, security controls, or human judgment.

---

## 2. Objectives

MCR-10 was created to:

- reduce ambiguity before it transforms into conflicting system behaviors;
- expose actors, entities, attributes, relations, bounds, contexts, states, permissions, actions, and side effects;
- guide the analyst in formulating high-impact questions without turning the dialogue into a mechanical interrogation;
- distinguish declared user statements from inferences made by the analyst or AI assistant;
- identify decisions, working hypotheses, conflicts, and open questions;
- transform intent into assertions that can be objectively confirmed or refuted;
- produce acceptance criteria directly linked to originating business rules;
- maintain traceability between user dialogue, recorded decisions, and final specifications.

The method never replaces user decision-making. Its purpose is to render visible what was declared, what remains implicit, what is ambiguous, and what must still be decided.

---

## 3. Methodology Boundaries

MCR-10 does not unilaterally determine:

- business priority;
- technical feasibility;
- commercial value of a feature;
- optimal user experience design;
- organizational security policy;
- architectural solutions to implement.

Nor does it require that all ten categories be present in every user story. When a category is irrelevant, it must be marked as **not applicable**, accompanied by a concise rationale.

The categories function as investigative lenses, never as a rigid checklist.

### 3.1 Proportional Use by Vertical Slice

Rigor remains constant, but investigative depth varies with risk:

| Profile | Recommended Use | Minimum Depth |
|---|---|---|
| Lite | small, reversible bug fix | core purpose, critical categories, one assertion, one test scenario |
| Standard | typical feature | applicable matrix, vocabulary, rules, failure modes, Gherkin scenarios |
| Critical | financial transactions, authorization, privacy, irreversible data, migrations | full justified matrix, sources, risks, rollback strategy, human sign-off |

No profile permits fabricating answers or omitting a P1 blocking question. The profile
reduces irrelevant documentation overhead, never the quality of decisions.

---

## 4. Conceptual Foundations

The methodology draws on three distinctions found in the *Categories* and adds explicitly
identified modern lenses. Academic debate exists regarding whether the original list classifies
words, predications, or entities, how it was derived, and its completeness. MCR-10 does not
depend on resolving this debate: it employs the distinctions as analytical heuristics and
verifies their practical utility in software engineering.

### 4.1 Purpose and Intent

Prior to categorial analysis, identify the practical purpose of the request:

- what observable problem motivated the request;
- who experiences the problem;
- what change would make the delivery considered useful;
- how the user will recognize that the outcome has been achieved;
- whether the requested solution is the core intent or merely a hypothesized implementation.

Purpose is not presented as an eleventh Aristotelian category; it is an additional
lens of MCR-10 for software systems. The method does not presume access to "real intent"
as a mental state: it formulates an operational interpretation and seeks user confirmation.

### 4.2 Homonymous, Synonymous, and Paronymous Terms

Before analyzing requested behavior, confirm that all stakeholders use the same terms
with the identical meaning.

#### Homonymy

Homonymy occurs when the same term is used with differing definitions.

In a specification, words like `user`, `customer`, `account`, `project`, `approval`, and `manage`
can take on divergent meanings depending on persona or module.

Example:

- for sales, `customer` might mean the contracted enterprise organization;
- for support, `customer` might mean the individual end user submitting a ticket;
- for the database, `customer` might represent an account record.

When homonymy is detected, concepts must be separated, formally defined, or renamed.

#### Synonymy or Univocal Predication

In Aristotelian terminology, things are termed synonymously or univocally when they share
both name and corresponding definition. In requirements analysis, this distinction helps
verify that a canonical term maintains the same meaning when applied across different contexts.

The goal is not to eliminate natural language variation, but to confirm that the same word
does not silently shift definitions across teams, flows, or documents.

#### Terminological Equivalence

When different terms, such as `workspace` and `team space`, represent the identical concept,
MCR-10 records modern terminological equivalence. This normalization is essential in software,
though distinct from the Aristotelian definition of synonymy.

#### Paronymy

Paronyms are derived, related terms that should not be treated as interchangeable concepts.

Examples:

- `approval`, `to approve`, `approved`, and `approver`;
- `permission`, `permitted`, and `to authorize`;
- `revocation`, `revoked`, and `to revoke`.

In requirements analysis, this distinction isolates:

- an entity;
- an action;
- a state;
- an attribute;
- the role executing the action.

### 4.3 Simple Expressions and Assertions

Terms such as `manager`, `token`, `active`, `revoke`, and `yesterday` hold meaning,
but alone do not constitute testable requirements.

Combining terms yields an assertion:

> An authenticated manager can revoke their own token.

This assertion can now be investigated:

- can any manager perform this?
- must the token be currently active?
- is revocation immediate?
- can managers revoke tokens belonging to other users?
- what happens to in-flight API requests?

The operational principle of MCR-10 is:

> A requirement is only sufficiently defined when its terms have been combined into an assertion that can be confirmed, refuted, or observed.

### 4.4 Type, Instance, and Attribute

The Aristotelian relations of **being said of a subject** and **being in a subject** prevent two common modeling errors:

1. confusing a type with an instance;
2. treating an attribute or state as an independent entity without necessity.

In the MCR-10 adaptation:

- **being said of** guides classification relationships: a `manager` is a type of `user`;
- **being in** guides dependent properties: the state `suspended` resides in an account;
- modeling proposed by the analyst remains a hypothesis until explicitly confirmed.

### 4.5 Modern Adaptation for Software

MCR-10 uses categories by operational analogy. The table distinguishes the core question and modern software application:

| Category | Core Question | Modern Software Adaptation |
|---|---|---|
| Substance | Who or what? | actor, entity, aggregate, value object, external service, identity |
| Quantity | How much or how many? | cardinality, bounds, volume, precision, quota, capacity |
| Quality | Of what nature or quality? | attributes, invariants, validation rules, measurable non-functional requirements |
| Relation | In relation to what? | ownership, association, dependency, multi-tenancy, hierarchy, resource authorization |
| Place | Where? | channel, module, environment, region, device, trust boundary |
| Time | When? | sequence, duration, expiration, timeout, retention, concurrency, temporal consistency |
| Position | In what state or arrangement? | lifecycle state, workflow stage, sort order, configuration; modern extension of posture |
| Possession / Having | What does it have? | role, permission, credential, tier, capability, available balance; modern extension of "having" |
| Action | What does it do? | command, event, trigger, input, idempotency, cancellation, rollback |
| Affection | What receives the action? | observable outcome, state mutation, error, side effect, audit log, compensation |

Purpose, risk, privacy, ethics, observability, evidence, and reversibility are modern
cross-cutting concerns. They must be investigated when applicable, without attributing them
to the original philosophical text.

---

## 5. The Ten Categories of MCR-10

### 5.1 Substance — Who or What?

Substance identifies the subject matter under discussion.

In requirements analysis, it corresponds to:

- actors;
- entities;
- domain objects;
- types;
- instances;
- core domain concepts.

Guiding questions:

- Who participates in the behavior?
- What exactly is being created, modified, or queried?
- When the user says `request`, does that represent a process type or an individual record?
- Are there human actors and automated system actors?
- Is this an independent entity or merely an attribute of another entity?

Risk indicators:

- unidentified actor;
- core concept lacking definition;
- type confused with instance;
- attribute treated as an independent entity without justification;
- two different entities represented by the identical name.

### 5.2 Quantity — How Much or How Many?

Quantity investigates limits, cardinality, volume, frequency, size, and precision.

It encompasses:

- minimum and maximum bounds;
- limits per user or account;
- file or field character limits;
- execution frequency;
- pagination;
- batch sizes;
- quotas;
- financial thresholds;
- decimal precision.

Guiding questions:

- How many records can exist?
- Can each user have one or multiple items?
- Is there a quota per account, plan, or time window?
- What is the maximum payload or upload size?
- Does processing occur individually or in batches?
- What data volume must the solution handle?

Risk indicators:

- apparently unbounded quantities;
- undocumented rate or size limits;
- unknown scaling requirements;
- volume-based billing without explicit rules;
- ambiguous cardinality;
- divergent behavior on first, last, or solitary items.

### 5.3 Quality — How is it Characterized?

Quality describes characteristics, attributes, and conditions rendering something valid or acceptable.

It encompasses:

- properties;
- formats;
- security requirements;
- performance thresholds;
- availability;
- readability;
- precision;
- accessibility standards;
- data integrity;
- validation rules.

Guiding questions:

- What defines a correct outcome?
- What specifically constitutes `fast`, `secure`, `valid`, or `complete`?
- Which attributes are mandatory?
- How is an invalid result detected?
- What is the minimum acceptable quality standard?

Risk indicators:

- subjective expressions like "works nicely";
- quality goals lacking measurable metrics;
- absent input validation;
- unidentified required attributes;
- personal aesthetic preferences masquerading as acceptance criteria.

### 5.4 Relation — With Whom, to Whom, or to What?

Relation investigates links, bindings, and dependencies between elements.

It encompasses:

- ownership;
- membership;
- dependency chains;
- hierarchy;
- association;
- correlation;
- visibility boundaries;
- cross-tenant isolation;
- origin-to-destination mappings.

Guiding questions:

- Who owns this record?
- Which entity depends upon which?
- Who is authorized to view whose data?
- Does a parent-child relationship exist?
- Is the association mandatory or optional?
- Can the relationship mutate post-creation?

Risk indicators:

- undefined ownership;
- records lacking owning account or user;
- unspecified multi-tenant isolation rules;
- many-to-many relationships modeled as one-to-one;
- hidden circular dependencies;
- cascade deletion without rules for related entities.

### 5.5 Place — Where?

Place determines the spatial, architectural, or operational context of behavior.

It encompasses:

- screen / view;
- module / layer;
- menu location;
- delivery channel;
- environment (staging, production);
- client device;
- server / cloud provider;
- deployment region;
- jurisdiction;
- integration endpoints.

Guiding questions:

- Where does the action take place?
- Where does the outcome appear?
- Does the behavior exist in the dashboard, API, CLI, MCP, or all channels?
- Does it function identically in staging and production?
- Are there mobile versus desktop distinctions?
- Does legal jurisdiction or cloud region alter functionality?

Risk indicators:

- feature described without specifying access surface;
- production and staging treated as identical without configuration flags;
- undefined multi-channel behavior;
- data visible in one context inadvertently exposed in another.

### 5.6 Time — When?

Time investigates sequence, duration, validity windows, recurrence, retention, and deadlines.

It encompasses:

- event ordering;
- timestamp and date;
- timezones;
- expiration;
- timeouts;
- recurrence schedules;
- data retention;
- cron scheduling;
- validity periods;
- propagation delays;
- concurrency.

Guiding questions:

- When does the behavior initiate?
- When does it conclude?
- What prerequisite events must occur first?
- Is execution immediate, scheduled, or asynchronous?
- Does the state expire?
- Which timezone governs calculations?
- How long must records remain available?
- What happens when two competing events arrive simultaneously?

Risk indicators:

- vague terms like "immediately" lacking technical bounds;
- omitted timezones;
- indefinite token validity;
- unspecified data retention;
- unhandled concurrent race conditions;
- recurring jobs lacking termination dates.

### 5.7 Position — In What State or Arrangement?

Position describes the lifecycle state, stage, order, or arrangement of an entity.

It encompasses:

- initial state;
- active state;
- terminal state;
- position within a workflow;
- sorting order;
- layout disposition;
- feature configuration;
- transition preconditions.

Guiding questions:

- In what state must the entity exist prior to execution?
- To which state does it transition?
- Which state transitions are permitted?
- Does item ordering alter behavior?
- Can the user revert to the previous state?
- Does a terminal state exist?

Risk indicators:

- invalid or unreachable state transitions;
- unknown initial state;
- undocumented state enums;
- ambiguous drag-and-drop reordering;
- actions accessible in states where they should be disabled;
- absent undo or cancellation paths.

### 5.8 Possession — What Does the Actor Have?

Possession investigates resources, entitlements, capabilities, and permissions available to an actor.

It encompasses:

- security roles;
- granular permissions;
- credentials;
- authentication tokens;
- cryptographic keys;
- subscription plans;
- account balances;
- software licenses;
- resource allocations;
- enabled capabilities.

Guiding questions:

- Which permissions must the actor possess?
- Does authorization stem from role, account, or target resource?
- Does the user require a valid token, plan tier, or credit balance?
- Can entitlements be revoked mid-session?
- Is the resource dedicated or shared?
- What happens when an actor loses this capability?

Risk indicators:

- assumed authorization without explicit checks;
- role-based checks ignoring resource ownership;
- credentials lacking expiration or revocation mechanics;
- missing prerequisite resources;
- retained access after permissions are revoked.

### 5.9 Action — What is Done?

Action identifies the trigger, command, and executed operation.

It encompasses:

- initiating actor;
- domain verbs representing behavior;
- supplied payload data;
- triggering event;
- automated retries;
- cancellation;
- rollback / undo;
- idempotency semantics.

Guiding questions:

- Who triggers the action?
- What specifically do terms like `manage`, `process`, `approve`, or `sync` entail?
- What input data is required?
- Can the action be repeated safely?
- Can it be cancelled in-flight?
- Can completed operations be undone?
- Does the system trigger the action automatically?

Risk indicators:

- generic verbs lacking operational definitions;
- actions lacking explicit triggers;
- operations lacking input specifications;
- undefined retry policies;
- ambiguous cancellation mechanics;
- duplicate side effects caused by re-execution.

### 5.10 Affection or Received Effect — What is Affected?

The category traditionally known as `passion` is designated in MCR-10 as **affection** or **received effect**, avoiding the emotional connotation of modern language.

It examines that which receives, undergoes, or suffers the action.

It encompasses:

- affected target entity;
- observable outcome;
- state mutation;
- side effects;
- user notifications;
- failure modes;
- compensation transactions;
- audit logs;
- downstream system mutations.

Guiding questions:

- What changes after the action completes?
- Who is impacted?
- What observable output must be verified?
- What occurs when the operation fails?
- Is there a compensation transaction or rollback?
- Who must be notified?
- What must be logged for auditing?
- Are downstream external systems affected?

Risk indicators:

- actions lacking an explicit target;
- outcomes described only as general intentions;
- hidden side effects;
- failure states lacking defined error behavior;
- sensitive mutations lacking audit trails;
- partial updates lacking compensation rollback.

---

## 6. Boundaries Between Adjacent Categories

Certain elements appear to belong to multiple categories. The goal is not to force an artificial single label, but to understand each distinct aspect.

| Boundary | Distinguishing Rule | Example |
|---|---|---|
| Quality × Position | Quality describes intrinsic characteristics; position describes lifecycle state or sequence. | `high priority` can be quality; `pending review` is position. |
| Relation × Possession | Relation describes links between entities; possession describes capabilities or entitlements. | `task belongs to project` versus `user has edit permission`. |
| Action × Affection | Action examines who produces the change; affection examines what receives the change. | `manager revokes token` versus `token becomes invalid`. |
| Place × Position | Place indicates the context/location; position indicates state or order. | `on the users view` versus `in the validation step`. |
| Substance × Quality | Substance identifies the entity; quality represents a dependent property. | `account` versus `suspended account`. |
| Relation × Quantity | Relation identifies the link; quantity specifies how many links are allowed. | `token belongs to user` and `user may hold up to three tokens`. |

A single requirement phrase can be associated with multiple categories when doing so reveals distinct architectural constraints.

---

## 7. Application Lifecycle

MCR-10 is executed through six movements.

### Movement 1 — Capture Original Formulation

Preserve verbatim user phrasing prior to normalization.

Document:

- original user request;
- stakeholder who provided the information;
- business context;
- driving problem;
- cited documentation or compliance rules.

Never begin by rewriting the story. Premature polishing obscures critical ambiguities.

### Movement 2 — Isolate Simple Terms

Extract from the narrative:

- nouns;
- verbs;
- attributes;
- states;
- qualifiers;
- quantifiers;
- relationships;
- place references;
- time references.

Example:

> As a manager, I want to generate an MCP token to manage permitted modules.

Isolated terms:

- `manager`;
- `generate`;
- `MCP token`;
- `manage`;
- `modules`;
- `permitted`.

### Movement 3 — Disambiguate Vocabulary

Investigate:

- identical words with differing definitions;
- distinct terms representing the identical concept;
- derived terms denoting entity, action, attribute, or state;
- confusion between type and instance;
- confusion between entity and dependent property.

The deliverable of this step is a provisional domain glossary.

### Movement 4 — Distribute Across Categories

Map narrative fragments across the ten categories.

For each item, document:

- identified content;
- originating quote;
- information status;
- identified gaps;
- related categories;
- risk of leaving undefined.

### Movement 5 — Recompose into Assertions

Synthesize components into atomic assertions.

A standard formulation is:

```text
[Subject]
+ [action or predicate]
+ [object or attribute]
+ [condition of place, time, or state]
+ [bound or quality]
+ [observable effect]
```

Example:

> An authenticated manager can revoke their own MCP token in settings. Upon confirmation, subsequent calls made with this token must be rejected, and the revocation must be recorded in the audit log.

### Movement 6 — Test and Consolidate

For each assertion:

- formulate its logical negation;
- investigate exceptions;
- test boundary limits;
- verify authorization rules;
- examine prior and subsequent states;
- isolate failure modes;
- identify side effects;
- establish how to observe the outcome.

Convert confirmed decisions into:

- business rules;
- interaction flows;
- refined user stories;
- acceptance criteria;
- Gherkin test scenarios;
- documented open questions.

---

## 8. Information Status

Every piece of information must hold an explicit status label.

| Status | Meaning |
|---|---|
| Declared | Explicitly stated by the user or primary source. |
| Inferred | Deduced from surrounding context, pending confirmation. |
| Hypothesis | Working proposition introduced to facilitate discussion. |
| Decision | Formally confirmed by an authorized stakeholder. |
| Conflict | Contradicts another assertion, rule, or source. |
| Open | Remains pending an answer or formal decision. |
| Not Applicable | Category does not influence the slice, with documented rationale. |

An inference must never be presented as an established declared fact.

Example:

```markdown
- **Original quote:** "Each manager will have their own token."
- **Normalized assertion:** Each manager possesses an individual MCP token.
- **Status:** Declared.
- **Open Question:** Can a user hold more than one active token concurrently?
```

---

## 9. Dialogue Protocol

### 9.1 Understand First, Inquire Second

The method does not begin by firing ten sequential questions for the ten categories.

Before posing the first question:

1. read or listen to the request;
2. extract what is already explicitly defined;
3. isolate critical knowledge gaps;
4. present a concise synthesis of current understanding;
5. select the highest-impact blocking questions.

Example:

> I understand that the manager requires an MCP credential linked to modules they are permitted to manage. Before drafting acceptance criteria, we need to decide whether the token belongs to the user or team, how many tokens may exist, and how module permissions are governed.

### 9.2 Speak the User's Language

Formulate inquiries using terms established by the user.

Prefer:

> When you say `customer`, are you referring to the contracted organization or individual user accounts?

Avoid:

> Define the substance corresponding to the customer concept.

Philosophical concepts guide the analyst's thinking; they do not need to be exposed to the user when doing so adds cognitive friction.

### 9.3 Ask One Numbered Question per Round

In each round, present a single real question, numbered as `Question 1`, and
await the user's response before formulating the next. If other gaps remain,
re-rank them after receiving the answer, without asking them in the same round.

Below each question, provide at least three numbered options, followed by the
numbered options `Write another answer` and `Proceed`. Never present unnumbered options.

This ensures:

- fluid, natural conversation;
- progressive incorporation of new facts;
- avoiding questions rendered obsolete by earlier answers;
- validating alignment before diving deeper;
- eliminating fatigue caused by long questionnaires.

### 9.4 Prioritize Questions

Questions are classified across three priority tiers. This priority reflects
discovery risk; it does not replace backlog or product delivery priorities.

#### P1 — Blocker

A P1 answer alters system architecture, core business rules, or security risks.

Examples:

- identifying the acting persona;
- data ownership boundaries;
- access authorization;
- primary business effect;
- data isolation rules;
- handling money, privacy, or irreversible operations.

#### P2 — Necessary

A P2 answer enables implementing and testing behavior safely.

Examples:

- operational bounds;
- lifecycle states;
- time sequences;
- expiration rules;
- error handling;
- cancellation;
- audit logging.

#### P3 — Enhancement

A P3 answer improves user experience or operational ease without altering core behavior.

Examples:

- microcopy;
- visual presentation preferences;
- secondary sorting orders;
- non-critical performance optimizations;
- display formatting.

Within the same priority tier, inquire first about the gap impacting the greatest number of subsequent decisions.

### 9.5 Structure of a Round

Each conversational round must contain:

1. **Synthesis:** summary of what has been understood.
2. **Decisions:** confirmed rules established so far.
3. **Gaps:** applicable points still undefined.
4. **Question:** a concrete, numbered question.
5. **Options:** at least three numbered suggestions, plus write-in and proceed.
6. **Log:** original user reply and normalized decision.
7. **Updates:** affected categories and rules.

### 9.6 Hypothesis-Driven Questions

Offering a concrete hypothesis reduces user fatigue when presented explicitly.

Example:

> My understanding is that each token belongs exclusively to the user who created it. Is that accurate, or does the token represent the entire team account?

A hypothesis must never be incorporated into the specification until confirmed.

### 9.7 Adaptive Cycle and Explicit Exit

Backlog refinement poses a maximum of eight questions per area. After each
round, re-evaluate cumulative context and new answers: original input,
repository evidence, confirmed decisions, previous responses, and affected
dependencies. Reclassify gaps and formulate the next round while applicable
gaps remain within the question limit.
Prior queues are merely analytical hypotheses to be discarded when new
answers shift context.

Offer `Proceed` on every question from round one. In the subsequent round,
ask whether the user wishes to definitively close questions for that area,
answer later, or resume immediately. Include this confirmation among the
numbered questions of the next round.

If the user closes the area, record
`Area closed by user: <area>` in the applicable artifact and do not revisit
without an explicit request. If they defer, record
`Area deferred by user: <area>` and preserve open items for later resumption.
Never normalize the absence of an answer as a confirmed choice, do not declare
full completion, and do not approve the Definition Gate while applicable gaps remain.

---

## 10. Protocol for Analyzing Existing Specifications and Stories

When written requirements already exist, the method first executes diagnostic analysis.

### Step 1 — Segmentation

Decompose text into atomic assertions, preserving original excerpts.

### Step 2 — Extraction

Extract:

- actors;
- entities;
- actions;
- attributes;
- quantities;
- relations;
- places;
- times;
- states;
- capabilities;
- effects.

### Step 3 — Vocabulary Audit

Locate:

- undefined terms;
- homonyms with conflicting meanings;
- multiple names for identical concepts;
- derived terms used interchangeably;
- conflated entity classifications and attributes.

### Step 4 — Classification

Map each excerpt to relevant categories.

### Step 5 — Status Labeling

Label each assertion as:

- declared;
- inferred;
- hypothesis;
- decision;
- conflict;
- open.

### Step 6 — Logical Stress Testing

Investigate:

- logical negations;
- unhandled exceptions;
- failure modes;
- internal contradictions;
- boundary limits;
- lack of observable effect;
- unstated side effects.

### Step 7 — Coverage Evaluation

Evaluate which applicable categories are:

- absent;
- merely mentioned;
- defined;
- verifiable.

### Step 8 — Consolidation

Only after completing diagnosis, produce:

- summary;
- glossary;
- rules;
- decisions;
- scope boundaries;
- open questions;
- refined user stories;
- acceptance criteria.

---

## 11. Assertion Record Format

Every material assertion requires a traceable structured record.

```yaml
id: RQ-012
source_excerpt: "Each manager will have their own token."
normalized_assertion: "Each manager possesses an individual MCP token."
categories:
  - substance
  - quantity
  - relation
  - possession
status: declared
source: "Backlog refinement with product owner"
dependencies:
  - "Decide if multiple concurrent active tokens are permitted"
test: "Query tokens linked to two distinct managers"
risk: P1
```

Minimum fields:

| Field | Description |
|---|---|
| ID | Stable unique identifier. |
| Source Excerpt | Verbatim quote, document passage, or interview transcript. |
| Normalized Assertion | Atomic statement preserving exact meaning. |
| Categories | Applicable Aristotelian categories. |
| Status | Declared, Inferred, Hypothesis, Decision, Conflict, or Open. |
| Source | Person, specification, rule, or repository evidence. |
| Dependencies | Prerequisite decisions or related assertions. |
| Test | Method to confirm, refute, or observe behavior. |
| Risk | P1 (Blocker), P2 (Necessary), or P3 (Enhancement). |

---

## 12. Coverage Metric

Coverage provides visibility into analysis completeness, not an absolute quality score.

| Points | State | Criterion |
|---:|---|---|
| N/A | Not Applicable | Irrelevance documented with explicit justification. |
| 0 | Absent | Category is relevant but entirely omitted. |
| 1 | Mentioned | Vaguely referenced, contradictory, or non-operational. |
| 2 | Defined | Rule is explicit, coherent, and actionable. |
| 3 | Verifiable | Includes preconditions, observable effects, and failure handling. |

Percentage coverage can be calculated as:

```text
Sum of earned points
────────────────────────────────────────── × 100
3 × count of applicable categories
```

High numerical coverage does not eliminate blockers. A single unaddressed P1 question
blocks refinement even when all other categories are fully defined.

---

## 13. Risk Triggers

The method must flag:

- central domain terms with multiple competing definitions;
- actors lacking assigned roles or authorization boundaries;
- entities lacking designated ownership;
- actions lacking explicit triggers;
- actions lacking target entities;
- primary effects lacking observable outputs;
- unbounded quantities in cost-bearing or metered workflows;
- relative deadlines lacking specific durations or timezones;
- transitions lacking defined initial states;
- failure modes lacking defined fallback behaviors;
- sensitive mutations lacking audit logs;
- irreversible operations lacking confirmation;
- contradictions between assertions;
- acceptance criteria that merely restate user story titles;
- unverified inferences presented as established decisions.

---

## 14. Output Structure

Upon concluding analysis, MCR-10 delivers the following sections:

### Understanding

Summary of problem, intent, and target outcome.

### Vocabulary

Canonical domain definitions, disambiguated terms, and related concepts.

### Actors and Entities

Types, instances, attributes, and primary relationships.

### Categorial Matrix

Identified content, knowledge gaps, and status across categories.

### Rules and Decisions

Confirmed assertions accompanied by provenance sources.

### Scope

In-scope capabilities, out-of-scope boundaries, and dependencies.

### Flows and States

Triggers, actions, transitions, effects, and failure modes.

### Open Questions

Unresolved P1, P2, and P3 questions.

### Refined Stories

Smaller decoupled stories when initial requests encompass multiple goals.

### Acceptance Criteria

Observable scenarios using Given/When/Then formatting.

### Coverage and Risks

Score per applicable category and remaining blockers.

### Traceability

Direct links between source excerpts, decisions, rules, and acceptance criteria.

---

## 15. Worked Example

### Input Request

> As a manager, I want to generate an MCP token to manage permitted modules.

### Initial Analysis

| Category | Identified Content | Knowledge Gap |
|---|---|---|
| Substance | manager, MCP token, module | Does token belong to the user or team account? |
| Quantity | one token mentioned | Can multiple active tokens exist simultaneously? |
| Quality | undefined | What are security constraints and secret display rules? |
| Relation | manager related to modules | Who administers permitted modules? |
| Place | undefined | Where does configuration occur (UI view, API)? |
| Time | undefined | Does the token expire? When does revocation take effect? |
| Position | implicit states | What states exist: active, expired, revoked? |
| Possession | manager requires authorization | Which permission authorizes creation and revocation? |
| Action | generate and manage | What specifically does `manage` encompass? |
| Affection | token created, modules accessed | Is the secret displayed only once? Is there an audit log? |

### Synthesis for User

> I understand that managers need an MCP credential linked to modules they are authorized to manage. Before drafting criteria, we need to resolve three architectural decisions affecting identity, authorization, and token structures.

### Initial Candidate Question Queue

1. Does each token belong exclusively to an individual user, or can it represent a team account?
2. May a manager hold a single active token, or multiple named tokens?
3. Are module permissions inherited from user roles or configured individually per token?

Ask question 1 regarding ownership first. Upon receiving the response, recalculate gaps:
the answer may invalidate or reshape subsequent questions. The list represents an
analytical queue, never a batch questionnaire.

### Demonstrative Assertion Following Decisions

> Each MCP token belongs to a single admin or manager user, carries an explicit allowlist of authorized modules, and exists in an active, expired, or revoked state. A revoked token must be immediately rejected on subsequent API calls, and revocation must be logged in the audit trail.

This assertion will subsequently be tested:

- is rejection instantaneous?
- are in-flight calls aborted?
- can admins revoke tokens belonging to other users?
- what metadata must be recorded in the audit log?
- can expired tokens be reactivated?

---

## 16. Completion Criteria

A specification is sufficiently refined when:

- core domain terms possess operational definitions;
- actors, entities, actions, targets, and primary effects are explicit;
- types, instances, attributes, and states are not conflated;
- ownership and authorization are established or justified as not applicable;
- relevant quantitative boundaries are defined;
- execution contexts are specified;
- temporal rules and schedules are defined;
- states and valid transitions are mapped;
- high-risk failure modes and exceptions are handled;
- side effects are identified;
- applicable inferences are confirmed, refuted, or justified as not applicable;
- no applicable questions remain unanswered;
- acceptance criteria allow observing success and failure;
- every material decision links to its origin.

Selecting `Proceed` triggers confirmation of area closure, deferral, or immediate
resumption. Closing an area prevents further questions on it without explicit reopening.
Deferral preserves open items. The definition remains in Draft and the Definition Gate
remains Pending while applicable gaps persist.

---

## 17. Rules for Artificial Intelligence Assistants

An AI assistant applying MCR-10 must:

1. preserve original user phrasing;
2. extract what is already defined before posing questions;
3. never repeat answered questions;
4. explicitly label all inferences;
5. never fabricate decisions to artificially complete a specification;
6. apply categories adaptively rather than dogmatically;
7. ask exactly one numbered question per round and await responses;
8. prioritize authorization, ownership, data integrity, money, irreversibility, and core effects;
9. update analysis incrementally after each user response;
10. allow users to correct terminology definitions;
11. recalculate dependent rules whenever decisions change;
12. maintain traceability between origin, decision, and criteria;
13. generate concise or comprehensive summaries as requested;
14. treat non-applicable categories explicitly with documented justifications;
15. analyze existing materials before rewriting them;
16. limit backlog refinement to at most eight questions per area;
17. re-analyze accumulated context and new answers after each round;
18. continue while applicable gaps remain;
19. offer at least three numbered options, `Write another answer`, `Generate other options`, and `Proceed` on every question from round one;
20. confirm whether the user closes the area, defers answers, or resumes immediately;
21. record and respect closed or deferred areas.

---

## 18. Operational Prompt

```text
Analyze the request while preserving the user's original words.

Distinguish literal requests from core purpose, formulating the desired outcome
as an interpretation to be verified, never as presumed mind-reading.

First, extract simple terms and identify ambiguities, including homonyms with
different meanings, equivalent concepts, and derived terms that must not be conflated.

Next, distribute applicable content across substance, quantity, quality, relation,
place, time, position, possession, action, and affection / received effect.

For each item, record the source excerpt and label it as declared, inferred,
hypothesis, decision, conflict, or open question.

Recompose elements into assertions containing subject, condition, action/predicate,
and observable effect. Stress-test each assertion through negation, exceptions,
failure modes, and boundary limits.

Before rewriting the specification, present a synthesis and ask exactly one numbered
question per round. Offer at least three numbered options, 'Write another answer',
'Generate other options', and 'Proceed'. Prioritize identity, authorization,
ownership, data, costs, irreversibility, and core effects. After 'Proceed',
confirm area closure, deferral, or immediate resumption. Record choices and do
not reopen closed areas without an explicit request.

Never fabricate answers.

Finally, deliver understanding, vocabulary, actors and entities, categorial matrix,
confirmed rules, scope boundaries, flows, open questions, refined stories,
acceptance criteria, coverage metrics, risks, and traceability.
```

---

## 19. Conceptual References and Fidelity

Sources:

**Aristotle. _Categories; On Interpretation_. Translated with notes by Ricardo Santos. Imprensa Nacional-Casa da Moeda, 2016.**

- Aristotle, *Categories*, translated by E. M. Edghill, in *The Works of
  Aristotle* (1928), Bekker pagination:
  https://en.wikisource.org/wiki/The_Works_of_Aristotle/Categories
- Paul Studtmann, "Aristotle's Categories", *Stanford Encyclopedia of
  Philosophy*, Spring 2021 archive:
  https://plato.stanford.edu/archives/spr2021/entries/aristotle-categories/
- "Aristotle's Logic", section 7.3, *Stanford Encyclopedia of Philosophy*:
  https://plato.stanford.edu/entries/aristotle-logic/

Referenced passages:

- *Categories*, chapter 1, 1a1–15: homonyms, synonyms, and paronyms;
- *Categories*, chapter 2, 1a16–1b9: expressions with and without combination, `said of` and `in` a subject;
- *Categories*, chapter 4, 1b25–2a10: enumeration of the ten categories and progression from isolated terms to assertions.

Sources consulted on July 24, 2026. Public links allow verifying enumeration,
examples, and interpretive scholarship.

MCR-10 is a contemporary methodological adaptation. It does not attribute to
Aristotle a modern theory of requirements engineering, product management, or
software development. Terms like authorization, multi-tenancy, observability,
feature flags, rollback, and TDD belong exclusively to the modern software discipline.

---

## 20. Learnings, Validation, and Evolution

### Incorporated Learnings

- Categories improve investigative coverage without proving absolute completeness; a single
  P1 question can block a matrix with high numerical scores.
- Purpose must precede categories because user requests frequently describe proposed solutions
  without revealing root problems.
- Position, possession, and affection require careful translation for software systems;
  lifecycle state, authorization, and side effects are operational extensions, not historical equivalences.
- Separating declared statements, inferences, and decisions eliminates the risk of fluent
  agent writing masquerading assumptions as confirmed requirements.
- Dialogue is most productive when categories guide silent reasoning while only the highest-value
  gap is presented to the user.

### Validation Hypotheses

The method must be evaluated against production user stories. Compare before and after:

- material ambiguities discovered prior to implementation;
- number of questions posed versus answers altering behavior;
- requirements defects discovered during development or in production;
- inter-rater reliability between analysts regarding categories, status, and priorities;
- time elapsed before a story achieves testable Gherkin specifications;
- user satisfaction with synthesis fidelity.

### Potential Enhancements

1. Create domain-calibrated examples: multi-tenant SaaS, fintech, integrations,
   AI systems, sensitive health data, and asynchronous event streams.
2. Test inter-rater reliability and refine category boundaries producing divergent
   classifications without practical benefit.
3. Automate extraction and matrix building without automating human decisions or scoring.
4. Bind MCR records directly to `US`, `FR`, `AC`, test cases, and engineering tasks.
5. Define risk heuristics automatically elevating questions concerning authorization,
   privacy, billing, and data irreversibility to P1.
6. Measure questions avoided through adaptive reasoning rather than rewarding raw question volume.
7. Review plain language and accessibility so the method serves technical and non-technical stakeholders alike.

Any methodological evolution must preserve original user phrasing, assertion provenance,
and human sovereignty over intent and behavior.
