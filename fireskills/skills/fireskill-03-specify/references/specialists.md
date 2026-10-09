# Specialists for Specification

Use specialists in `specialists/` to deepen specific areas:

- Data: `fireskill-specialist-postgres`, `-drizzle`, and `-data-modeling`;
- Security and APIs: `-application-security`, `-web-api-design`, `-trpc`, and
  `-nuxt-authorization`;
- Architecture and Operations: `-software-architecture`, `-nuxfire-layers`,
  `-observability`, `-performance-engineering`, `-cloudflare-workers`, `-sst`, and
  `-delivery-engineering`;
- User Experience: `-interface-experience`, `-ui-design`, `-ux-design`,
  `-web-accessibility`, and the interface stack specialist (`-nuxt-ui`,
  with `-nuxt`);
- Stack: the specialist matching the name of detected technologies.

Specialists inform standards and best practices; the normative source of truth remains
`specs/<state>/<NNNN>-<slug>/spec.md` in the target project.

Specialists reside in `specialists/` in this repository. If the required specialist
is not yet available to the agent, state its name, purpose, and dependencies and request
explicit user authorization before installing or copying; never load specialists
unrelated to the task. If already present, announce automatic transition and load it within the same conversation.
