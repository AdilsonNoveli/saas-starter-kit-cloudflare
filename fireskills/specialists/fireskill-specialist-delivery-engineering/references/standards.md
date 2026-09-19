# Delivery Engineering Standards and References

## Minimum Pipeline Stages

1. **Validation**: Linting, type-checking, and formatting verification — fail fast and cheap.
2. **Build**: Deterministic build from lockfiles producing a versioned artifact.
3. **Tests**: Unit and integration tests run against built artifacts or code, never against "what is on local developer machines".
4. **Analysis**: SAST, dependency vulnerability scanning, SBOM generation.
5. **Packaging**: Generate final immutable artifact (digest-pinned container image, versioned tarball) once.
6. **Promotion**: Move the exact same immutable artifact reference across environments without rebuilding, requiring manual approval where configured.

- Caches accelerate steps (dependencies, image layers) but never substitute for lockfile or integrity checks.
- Protect fork PR execution contexts: never expose protected environment secrets to fork contexts, and treat `pull_request_target` with strict scrutiny.
- Use concurrency locks per environment to prevent simultaneous deployments to the same target, and protect production environments with gated review requirements.

## Release Strategy Comparison

| Strategy | How It Operates | Prerequisites | Rollback Characteristics |
|---|---|---|---|
| Rolling | Replaces server instances in batches | Compatibility between coexisting old and new versions | Batch-by-batch reversion; slower |
| Blue / Green | New complete environment (green) receives traffic after validation; blue stays standby | 2x temporary capacity, atomic routing switch | Instantaneous: switch routing back to blue |
| Canary | Small traffic percentage directed to new version, increased progressively | Versioned telemetry metrics and automated abort thresholds | Halt traffic increase and drain canary |
| Feature Flag | New code deployed to production, inactive until flag toggles on | Owner, defined expiration, safe fallback when flag is off | Immediate: disable flag without reverting build |

No strategy makes others obsolete — combine them: deploy binaries via rolling updates
with features behind toggles, then canary the flag rollout across user segments.

## Migrations and Rollout Compatibility

- **Expand**: Add new column/table without dropping legacy structures; previous application version remains fully functional.
- **Migrate**: Point new application code to write/read new formats while both versions coexist during rollouts.
- **Contract**: Drop deprecated column/table only after 100% of production traffic runs on new versions and rollback windows have expired.
- Binary rollbacks and database migration rollbacks have distinct decision windows — schedule contract migrations in separate, subsequent deployment phases.

## Supply Chain Security

- Generate Software Bill of Materials (SBOM) during build execution, not retroactively.
- Build provenance (SLSA) links the output artifact back to the commit, pipeline, and inputs.
- Pin third-party CI actions by exact commit hash rather than mutable tags (`@main`, `@v1`).

## Authoritative Documentation

- GitHub Actions: https://docs.github.com/actions
- OpenID Connect for Temporary Credentials: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- SLSA: https://slsa.dev/spec/
- OpenSSF Scorecard: https://securityscorecards.dev/
- OCI Distribution Spec: https://github.com/opencontainers/distribution-spec
- OWASP Top 10 CI/CD Security Risks: https://owasp.org/www-project-top-10-ci-cd-security-risks/
- Trunk-Based Development: https://trunkbaseddevelopment.com/
- Feature Toggles (Martin Fowler): https://martinfowler.com/articles/feature-toggles.html
