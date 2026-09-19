# Specialists for Validation

Select based on risk surface:

- Security: `fireskill-specialist-application-security` and `-openauth`;
- Data: `-postgres` and `-drizzle`;
- Architecture/API: `-software-architecture`, `-web-api-design`, or `-trpc`;
- User Experience: `-ui-design`, `-ux-design`, `-web-accessibility`;
- Operations: `-sst`, `-cloudflare-workers`, `-delivery-engineering`,
  `-observability`, and `-performance-engineering`;
- Independent review: `-code-review`.

The presence of a specialist is not evidence of gate clearance; evidence arises strictly from repository artifacts and executable commands.

Specialists reside in `specialists/` in this repository. If the required specialist
is not yet available to the agent, state its name, purpose, and dependencies and request
explicit user authorization before installing or copying; never load specialists
unrelated to the task. If already present, announce automatic transition and load it within the same conversation.
