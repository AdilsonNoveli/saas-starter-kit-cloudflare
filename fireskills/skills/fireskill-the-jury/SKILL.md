---
name: fireskill-the-jury
description: Multi-agent deliberative protocol for high-impact architectural, technical, or strategic decisions in Nuxfire. Spawns a panel of 3 to 5 subagents that form independent blind opinions (anti-anchoring), debate under orthogonal roles, and issue a binding verdict with an explicit rubric and recorded dissent.
---

# Fireskill The Jury: Collegial Deliberation

**The Jury** is the collegial Fireskills protocol for high-impact decisions where a single perspective or agent assumption is insufficient.

It eliminates sycophancy and anchoring bias through a **blind, simultaneous initial round** among multiple evaluators.

---

## When to Use

- Irreversible architectural choice (e.g., adopting a new Cloudflare binding, monorepo restructuring).
- Complex technical dilemmas (e.g., persistence in KV vs. Hyperdrive/Postgres for a given workload).
- Multi-tenant data model redesign or RBAC authorization strategy.
- High-risk product decisions (e.g., Stripe vs. Paddle pricing model).

*Do not use for simple factual tasks or trivial syntax corrections.*

---

## The 5-Phase Workflow

```text
PHASE 0: Framing → PHASE 1: Assembly → PHASE 2: Blind Round → PHASE 3: Deliberation → PHASE 4: Verdict
```

### Phase 0: Framing the Question
The orchestrator defines 3 mandatory elements before starting:
1. **Question in Decidable Form**: "Should we migrate queue X to Cloudflare Queues or keep it in Drizzle with polling?"
2. **Evaluation Rubric (2 to 4 criteria)**: E.g., Performance under concurrency, maintenance complexity, blast radius, and cost.
3. **Shared Evidence**: Real code files, schemas, or project metrics.

### Phase 1: Panel Assembly
The panel is assembled with strictly orthogonal roles:
- **Proponent**: Advocates the strongest case in favor of the primary option.
- **Skeptic / Devil's Advocate**: Challenges assumptions and defends the most robust alternative or maintaining status quo.
- **Integrator**: Focused on the rubric, total cost of ownership, and long-term impact.

### Phase 2: Blind Round — Non-Negotiable
All jurors issue their initial opinions **independently and simultaneously**. No juror has access to responses from others before recording their initial conviction. This prevents the first agent from anchoring the rest of the group.

### Phase 3: Deliberation
Opinions are revealed to the group. Each juror evaluates counter-arguments and may only alter their vote if a novel, factual argument has been introduced.

### Phase 4: Binding Verdict
The jury issues a consolidated verdict:
- **Selected Option** with calibrated confidence level.
- **Preserved Dissent**: Record of skeptic warning points that must be monitored during implementation.
- **Immediate Concrete Action**: Which specification or task must be created.
