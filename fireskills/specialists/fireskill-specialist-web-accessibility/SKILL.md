---
name: fireskill-specialist-web-accessibility
description: "Implement and audit web accessibility using WCAG, semantic HTML, keyboard navigation, focus management, accessible names, contrast, zoom, and assistive technologies. Use for components, pages, forms, dashboards, and compliance reviews; automation never replaces manual testing."
---

# Web Accessibility

## When to Use

- Trigger when implementing or auditing pages, components, forms, dashboards,
  media, and critical flows against WCAG and native platform semantics.
- Trigger for keyboard, focus management, accessible name, contrast, zoom, reflow,
  screen reader, or other assistive technology defects.
- Do not trigger solely for visual styling preferences lacking observable barriers;
  use `$fireskill-specialist-ui-design`.
- Combine with framework-specific skills to remediate source code without deferring
  compliance responsibilities to the framework.

## Workflow

1. Discover policy requirements, target WCAG conformance level, supported browsers,
   assistive technologies, user cohorts, and critical journeys; distinguish compliance
   audits from general usability testing.
2. Catalog accessibility barriers across structure, perception, keyboard, focus,
   forms, dynamic live updates, media, and authentication using
   [references/standards.md](references/standards.md).
3. Fix native HTML semantics and platform behavior before introducing ARIA attributes
   or custom widgets; verify calculated accessible names, roles, values, states, and relationships.
4. Implement keyboard navigation, logical focus order, visible focus indicators,
   unobscured focus rings, and post-event focus management across modal opens, closes,
   route changes, and asynchronous mutations.
5. Validate contrast ratios, text zoom, 320px reflow, text spacing, target sizes,
   forced colors, orientation adaptability, motion sensitivity, and media alternatives.
6. Execute automated rule scanners paired with manual technical inspection; categorize
   every finding by WCAG success criterion, impact, reproduction steps, and verifiable remediation.
7. Exercise critical user flows using representative assistive technologies, documenting
   test coverage, technical limitations, declared exceptions, and residual risks.

## Patterns

- No action relies solely on hover states, color alone, complex gestures, or path-based pointer gestures.
- Every interactive control exposes correct accessible name, role, value, and current state.
- Modals trap keyboard focus, provide predictable escape mechanics, and return focus upon closing.
- Errors link directly to form inputs and provide clear navigable summaries when multiple errors exist.
- Asynchronous updates announce only relevant, timely information via appropriate live regions.
- Charts and data visualizations offer equivalent data tables or textual descriptions and never rely on color alone.
- ARIA attributes never compensate for incorrect underlying native HTML semantics.

## Anti-Patterns

- Claiming WCAG compliance simply because axe or a linter reported zero violations;
  automated scanners cannot verify focus order, plain language, text equivalents, or task completion.
- Applying `role`, `tabindex`, and click handlers to `div` elements when native elements
  satisfy the specification; reimplements keyboard handling and browser semantics incompletely.
- Using `aria-label` to override visible text unnecessarily; divergent names break
  speech recognition software and complicate maintenance.
- Moving focus abruptly on every asynchronous background update; disrupts reading context.
  Announce status via polite live regions and move focus only when task completion requires it.
- Applying `overflow: hidden` to resolve reflow issues; content remains inaccessible,
  merely clipped from view.

## Validation

- Complete critical flows via keyboard alone, without keyboard traps, lost focus, or obscured focus indicators;
  verify focus restoration upon closing overlays.
- Verify 200% text resizing and 320 CSS px viewport reflow for vertical content without
  horizontal scrolling, alongside text spacing overrides and orientation switching.
- Measure contrast for text, form controls, and focus indicators, testing under forced colors
  and reduced motion preferences.
- Combine automated checkers with accessibility tree inspection and screen reader testing
  on highest-risk workflows.
- Do not declare WCAG compliance without mapping criteria, scope, concrete evidence,
  limitations, and exceptions; "accessible" is never synonymous with green automated tests.

## Related Skills

- `$fireskill-specialist-tailwind-css` implements contrast, forced colors, reflow,
  and reduced motion utility classes and tokens.
- `$fireskill-specialist-ui-design` governs visual hierarchy, tokens, and states that
  must satisfy contrast, reflow, and focus criteria.
- `$fireskill-specialist-ux-design` researches comprehension and task success, including
  with assistive technology users.
- `$fireskill-specialist-code-review` broadens reviews to include risks beyond accessibility.

Read [references/standards.md](references/standards.md) for WCAG 2.2 criteria,
component contracts, form accessibility, dynamic live regions, and test matrices.
