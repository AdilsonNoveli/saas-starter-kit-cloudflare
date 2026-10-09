# Specialists for BDD-Driven TDD

Use technology specialists to select test seams, fixtures, and compatible commands
(`fireskill-specialist-nuxt`, `-trpc`, `-drizzle`, `-nuxt-authorization`, `-pinia`).
Add specialists based on specific risk areas:

- Accessibility: `fireskill-specialist-web-accessibility`;
- Security: `fireskill-specialist-application-security`;
- Performance/Load: `fireskill-specialist-performance-engineering`;
- Data/Concurrency: `fireskill-specialist-postgres` and `-drizzle`;
- Deploy/Failover: `-sst`, `-cloudflare-workers`, or `-delivery-engineering`.

No specialist can substitute for observed RED or fabricate behavior.

Specialists reside in `specialists/` in this repository. If the required specialist
is not yet available to the agent, state its name, purpose, and dependencies and request
explicit user authorization before installing or copying; never load specialists
unrelated to the task. If already present, announce automatic transition and load it within the same conversation.
