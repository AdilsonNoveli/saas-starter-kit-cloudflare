---
name: fireskill-specialist-ux-design
description: "Investigate, structure, and validate experiences with user research, information architecture, journeys, flows, forms, onboarding, and error recovery. Use for usability problems, user flows, discoverability, content design, or user testing; never reduce UX to visual surface polish."
---

# UX Design

## When to Use

- Trigger to investigate user behavior, structure customer journeys, information
  architecture, form flows, onboarding, microcopy, and error recovery.
- Trigger when uncertainty exists regarding the core problem, task sequence, domain
  language, or a user's ability to successfully complete a task.
- Do not trigger for isolated visual polish; use `$fireskill-specialist-ui-design`
  once user intent and interaction flow are already validated.
- Combine with `$fireskill-specialist-prototyping` when a hypothesis requires a
  disposable artifact prior to production implementation.

## Workflow

1. Load `$fireskill-specialist-design-system` and read `.fireskills/DESIGNSYSTEM.MD` before
   proposing solutions. When creating or altering a human-facing interface, conduct
   discovery. Clarify via core contract what screens exist, how information flows,
   which fields and validations enter forms, and how each action presents: dedicated
   page, slide-over drawer, modal, expanded inline area, or another pattern. If no
   visual direction is given, apply `.fireskills/DESIGNSYSTEM.MD` defaults; only inquire
   about composition when task gaps or conflicts exist. Reuse confirmed context
   and ask only what remains undefined.
2. Review observed stack and existing screens before proposing visual flows. The
   journey must leverage observed technologies and conventions; if interface layers
   are ambiguous, clarify with the user. Inspect the existing system to understand
   what users currently see, do, and expect across affected views before proposing changes.
3. Formulate behavioral hypotheses prior to choosing research methods; define audience,
   context, frequency, and error severity.
4. Audit existing collateral, cataloging observed facts, inferences, hypotheses,
   and internal preferences separately.
5. Select methods proportionate to the question and failure severity using
   [references/standards.md](references/standards.md); define recruitment criteria,
   consent protocols, discussion guides, and stopping rules.
6. Map current journeys detailing inputs, choices, wait times, error states, channels,
   dependencies, and handoffs without erasing critical exceptions.
7. Prototype at the minimum fidelity that makes the hypothesis testable without
   simulating behaviors that bias results.
8. Conduct test sessions with neutral tasks and prompts, tracking independent success,
   errors, completion time, hesitation, comprehension, and key verbatim quotes.
9. Synthesize findings by evidence strength, severity, scope, and impact; clearly
   distinguish observations, interpretations, recommendations, and open questions.

Do not select slide-over panels, modals, or patterns based solely on internal preference.
Document explicit user responses and route composition tasks to `$fireskill-specialist-ui-design`.
For CRUD surfaces, cover clickable row lists, empty states, detail views, two-column
responsive form create/edit flows, field errors, permission denials, and loading failures.

## Patterns

- Use natural domain terminology and disclose complexity progressively.
- Keep system status, next actions, and error recovery paths continuously visible.
- Request information only when needed, explaining why sensitive data is required.
- Avoid friction-heavy confirmation dialogues for trivial actions; offer reversible undo instead.
- Preserve user input across errors and present contextual inline corrections.
- Design onboarding as a direct path to core value, not a mandatory slide tour.
- Forbid dark patterns, artificial urgency, or ambiguous consent mechanics.
- Leverage data hierarchy and product language to give character to the experience,
  maintaining `PageHeader`, `UTable`, `DetailLists`, and two-column responsive form sections
  as system defaults.
- Maintain a `Breadcrumb` across all screens, showing active team, module, and current view.
  Reuse the component already rendered by the shell.

## Anti-Patterns

- Asking "do you like this?" or demonstrating the solution before users attempt the task;
  measures courtesy and post-rationalization rather than usability.
- Generalizing an entire product rule from a single participant's isolated quote; without
  recurrence and triangulation, isolated feedback lacks statistical validity.
- Recruiting only colleagues or expert power-users when serving beginners; shortcuts
  and internal vocabulary will not represent real audiences.
- Presenting solution lists detached from documented findings; internal preferences
  risk masquerading as research conclusions.
- Measuring completion time alone without distinguishing drop-offs, assisted completions,
  and critical unrecovered errors; raw metrics mask qualitative failure.

## Validation

- Ensure each research question is paired with appropriate methodology, participants,
  and evidence suited to the design decision it informs.
- Trace recommendations to findings and findings to consented session recordings/notes;
  anonymize data according to privacy policies.
- Involve representative user groups, devices, contexts, and assistive technologies
  proportional to task criticality, noting recruitment limitations.
- Re-validate structural changes against identical critical tasks, comparing independent
  success, error frequency, and comprehension.
- Never declare an experience "intuitive" or validated without observable evidence
  and explicit sample boundary declarations.

## Related Skills

- `$fireskill-specialist-nuxt-ui` for composing Vue components with `@nuxt/ui` after
  validating journeys and tasks.
- `$fireskill-specialist-interface-experience` to structure screens, actions, and interface
  states during discovery.
- `$fireskill-specialist-ui-design` materializes visual hierarchy and states once tasks
  and flows are established.
- `$fireskill-specialist-design-system` defines defaults, scoped exceptions, and CRUD
  conventions prior to information architecture.
- `$fireskill-specialist-prototyping` creates minimal disposable artifacts to test
  interaction hypotheses.
- `$fireskill-specialist-web-accessibility` evaluates compliance and assistive technology
  usage beyond qualitative research cohorts.
- `$fireskill-specialist-domain-modeling` aligns domain vocabulary and business invariants
  when user experiences touch complex domain rules.

Read [references/standards.md](references/standards.md) for method selection,
research structure, form design, content, onboarding, and service blueprints.
