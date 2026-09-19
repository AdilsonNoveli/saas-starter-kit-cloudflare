---
name: fireskill-specialist-technical-research
description: "Investigate technical questions in primary sources, source code, standards, and reproducible experiments, producing traceable syntheses separating facts, inferences, and knowledge gaps. Use when a decision depends on real API behavior, technology comparisons, or technically uncertain facts; save research solely in locations authorized by the consuming project's spec, never in a parallel `research.md`."
---

# Technical Research

## When to Use

- Trigger when an architectural, library, or engineering approach decision
  depends on a technical fact nobody has verified with primary sources.
- Also trigger to compare concrete alternatives before an expensive-to-reverse
  decision, or to confirm whether an assumed behavior remains valid in the current
  dependency version.
- Do not trigger to re-confirm an already decided choice merely to construct a
  post-hoc justification — that is confirmation bias, not technical research.
- Combine with `$fireskill-specialist-software-architecture` when research directly
  grounds a structural decision documented in an ADR.

## Workflow

1. Formulate the specific question, the decision it informs, the scope, and required
   recency (current behavior vs. historical versions).
2. Define beforehand what evidence would confirm or refute each alternative — without
   this, any finding appears to confirm the initial bias.
3. Prioritize in order: specifications/standards, versioned official documentation,
   official source code and changelogs, reproducible experiments in the target
   runtime environment, and only then secondary sources.
4. Verify version, release date, and direct applicability to the observed project
   runtime — behavior documented for another version is not valid evidence for the
   version in use.
5. Triangulate all mission-critical claims with an independent secondary source,
   and run controlled experiments when documentation remains ambiguous.
6. Explicitly separate confirmed facts, inferences (probable but unproven), risks,
   and residual knowledge gaps lacking evidence.
7. Synthesize findings with direct links to sources adjacent to the specific claims
   they support, noting concrete implications for the decision.

## Patterns

- Never cite forum posts, personal blogs, or generic AI summaries as authoritative
  proof of API behavior when primary sources exist — use them as clues for where
  to locate the primary source, not as concluding citations.
- Cite specific page anchors or sections of the source adjacent to the claim,
  avoiding generic links to documentation homepages.
- Synthesize while preserving necessary decision context; avoid extensive copy-pasting
  that merely shifts reading overhead to the reader.
- Record the exact version and publication date of any source whose behavior may
  evolve across releases — without this, conclusions silently expire.
- When two authoritative sources conflict, declare the discrepancy explicitly
  rather than silently selecting one without justifying why it prevails.
- Do not create a rogue `research.md` outside project spec boundaries; research is
  indexed and resides strictly where the consumer project spec designates.
- Treat vendor-published benchmarks as interested evidence — useful as hypotheses,
  never as conclusions without independent reproduction.

## Anti-Patterns

- Researching after already deciding, seeking only confirmation — the question
  in step 1 is biased from inception ("why is X better" instead of "X vs Y, and under what criteria").
- Citing "the docs state" without a link or version — leaves the claim impossible
  to reverify when behavior shifts.
- Copying vendor marketing benchmarks as if they were neutral measurements in the
  project's environment.
- Resolving conflicting sources by picking the one conforming to initial preferences
  without documenting that a conflict existed.

## Validation

- Every conclusion informing a decision has direct, traceable evidence (link + version
  + date), not memory recall.
- Consulted sources match the exact version and runtime environment of the consuming
  project, not outdated or generic runtimes.
- Executed experiments are reproducible by peers and never mutate production systems
  or real user data.
- Gaps and residual uncertainty are explicit in the final synthesis, not hidden behind
  unearned confidence.
- Never present an untriangulated inference as fact — language implying certainty
  without corresponding evidence is forbidden.

## Related Skills

- `$fireskill-specialist-domain-modeling` uses external sources to align concepts
  without replacing the project's validated domain vocabulary.
- `$fireskill-specialist-prototyping` transforms technical uncertainty into disposable
  spikes with explicit hypotheses and stopping conditions.
- `$fireskill-specialist-software-architecture` when research grounds structural
  decisions recorded in ADRs.
- `$fireskill-specialist-debugging` when "research" is actually investigating why
  observed runtime behavior diverges from documented behavior — in that case, root
  cause diagnosis is the objective, not technology comparison.

Read [references/standards.md](references/standards.md) for the source hierarchy,
evidence evaluation matrix, and synthesis format.
