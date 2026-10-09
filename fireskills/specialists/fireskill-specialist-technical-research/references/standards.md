# Technical Research Standards and References

## Source Hierarchy, from Most to Least Authoritative

1. **Specifications and Standards** (RFC, W3C TR, ECMA, ISO) or vendor proprietary
   specifications for platform-exclusive behavior (e.g., vendor docs for proprietary APIs).
2. **Versioned Official Documentation** of the project/framework/service, matching the
   exact version used by the target environment.
3. **Official Source Code, Tests, and Changelogs** — when documentation is ambiguous
   or omitted, actual behavior resides in the source code and its test suite.
4. **Reproducible Experiments in the Target Environment** — when no written sources
   resolve uncertainty, a controlled test under the same runtime, version, and configuration
   serves as the next best evidence.
5. **Secondary Sources with Explicit Methodology** (technical write-ups, conference talks,
   articles) — acceptable only when describing verifiable methods (environment, version,
   benchmark setup); otherwise, it constitutes opinion rather than evidence.

A lower-tier source never overrides a higher-tier source without explicit justification
(e.g., official docs are proven outdated and contradicted by recent release commits).

## Source Evaluation Matrix

- **Authority**: Who controls the described behavior — the original creator/vendor,
  or an external third party observing from outside?
- **Recency**: What exact version and publication date? Does the behavior still hold
  for the version deployed in the project?
- **Applicability**: Does the source reflect the same runtime, config, scale, and
  usage patterns, or do operational differences invalidate generalization?
- **Reproducibility**: Would another engineer with the same source and environment
  arrive at identical conclusions?
- **Incentive**: Are there commercial interests, selective benchmarking, or vendor
  sponsorship affecting conclusions?

Sources failing "applicability" or having substantial commercial incentive are not
automatically dismissed, but strictly require triangulation with an independent secondary
source before supporting critical decisions.

## Synthesis Format

Question → Supported Decision → Conclusion (Fact / Inference / Knowledge Gap, explicitly
labeled) → Evidence (direct anchor link + version + date) → Source Conflict (if any, and
resolution rationale) → Practical Implication for Decision → Residual Gaps.

Never present an "inference" with textual certainty equivalent to a "fact" — explicit
status labels must appear in the final summary document.

## Official Sources for Locating Primary References

- RFC Editor: https://www.rfc-editor.org/
- W3C Technical Reports: https://www.w3.org/TR/
- ECMA International (ECMAScript and other standards): https://ecma-international.org/publications-and-standards/standards/
- NIST Publications: https://www.nist.gov/publications
- Crossref Metadata (locating publications and DOIs): https://www.crossref.org/documentation/retrieve-metadata/
- GitHub Releases (official open source changelogs): https://docs.github.com/repositories/releasing-projects-on-github
- Semantic Versioning (interpreting version guarantees): https://semver.org/
