# Application Security Standards and References

## Threat Modeling: Category Questions (STRIDE)

| Category | Core Question | Typical Control |
|---|---|---|
| Spoofing | Is the actor who they claim to be? | Strong authentication, MFA |
| Tampering | Was data altered in transit or at rest? | Integrity checks, signatures, database constraints |
| Repudiation | Can we prove who performed the action? | Audit logs, non-repudiation |
| Information Disclosure | Can an unauthorized actor view data? | Object-level authorization, data minimization |
| Denial of Service | Can an actor make the service unavailable? | Rate limits per actor/resource, timeouts, backpressure |
| Elevation of Privilege | Can an actor gain unassigned privileges? | Server-side authorization, deny by default |

Use as a feature design checklist: for every identified trust boundary, evaluate
all six categories before implementing controls.

## Boundary Checklist

- **Identity**: issuance, expiration, revocation, and credential recovery;
  MFA for high-risk operations; never reuse session tokens after privilege elevation
  (login, password change) without token regeneration.
- **Authorization**: verify role, specific target object, tenant, field, and action —
  route-level authorization alone does not prevent IDOR; all client-supplied object IDs
  require server-side ownership verification.
- **Input**: validate size, format, encoding, and intended destination; consider the
  cost of input processing (defenses against decompression bombs, catastrophic regex backtracking).
- **Data**: classify by sensitivity, minimize collection and retention, define backup and
  deletion policies adhering to classification — data that does not exist cannot be breached.
- **Operations**: secrets rotation, log sanitization (no PII or credentials), alerted
  security signals with owners, timely dependency patching, and blameless incident response.

## API Security (OWASP API Security Top 10 Recurring Categories)

- **Broken Object Level Authorization (BOLA / IDOR)**: most common API vulnerability —
  every endpoint receiving an object ID must verify that the authenticated actor possesses
  rights over that specific instance, not just the general operation.
- **Broken Authentication**: missing token expiration, lack of refresh token rotation,
  unprotected authentication endpoints vulnerable to brute force.
- **Excessive Data Exposure / Missing Output Filtering**: returning complete internal
  database entities and relying on UI clients to filter fields leaks sensitive data.
- **Missing or IP-Only Rate Limiting**: allows abuse of expensive operations (search,
  exports, email delivery) by authenticated actors rotating IPs or behind shared NAT.

## Supply Chain and Dependencies

- Run Software Composition Analysis (SCA) integrated into the CI/CD pipeline, not merely
  ad-hoc before releases.
- Scan for leaked credentials across full repository git history, not only in HEAD.
- Generate SBOMs during builds and verify build provenance (SLSA) when adopted.

## Verification Commands

```bash
# Vulnerable dependencies (SCA)
npm audit --audit-level=high
pip-audit
trivy fs .

# Leaked secrets across complete repository history
gitleaks detect --source . --log-opts="--all"

# SAST scanning with community rules
semgrep --config=auto .
```

Confirm which scanners the project already adopts (config files, CI workflows)
before introducing new tooling. Never declare "zero vulnerabilities" solely because
scanners returned exit code 0 — scanners suffer false negatives, especially around
domain-specific business logic.

## Authoritative Documentation

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Threat Modeling: https://owasp.org/www-community/Threat_Modeling
- NIST SSDF: https://csrc.nist.gov/Projects/ssdf
- NIST Digital Identity Guidelines: https://pages.nist.gov/800-63-4/
- OpenSSF: https://openssf.org/
