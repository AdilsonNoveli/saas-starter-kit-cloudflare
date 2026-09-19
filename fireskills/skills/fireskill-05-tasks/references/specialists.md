# Specialists for Task Planning

Propose specialists capable of making PREP/EXECUTE/VERIFY/VISUAL/EVIDENCE/IMPROVE concrete:

- Implementation: technology specialists (`fireskill-specialist-nuxt`,
  `-trpc`, `-nuxfire-layers`, `-pinia`, `-nuxt-authorization`);
- Database and migrations: `-postgres` and `-drizzle`;
- Deployment: `-sst`, `-cloudflare-workers`, and `-delivery-engineering`;
- Quality: `-application-security`, `-web-accessibility`,
  `-performance-engineering`, and `-observability`;
- Interface: `-interface-experience`, `-ui-design`, `-ux-design`, and `-nuxt-ui`.

Specialist skills do not create `tasks.md` or modify task dependencies.

Specialists reside in `specialists/` in this repository. If the required specialist
is not yet available to the agent, state its name, purpose, and dependencies and request
explicit user authorization before installing or copying; never load specialists
unrelated to the task. If already present, announce automatic transition and load it within the same conversation.
