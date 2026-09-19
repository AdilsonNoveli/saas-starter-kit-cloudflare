---
name: fireskill-specialist-ui-design
description: "Design and review visual interfaces for systems, dashboards, and applications with hierarchy, layout, tokens, components, density, states, and responsiveness. Use for screens, dashboards, design systems, layouts, tables, forms, and navigation; combine with UX and accessibility when user flows or interactions are involved."
---

# UI Design

## When to Use

- Trigger to define or review hierarchy, grid, shell, density, tokens, visual
  states, tables, forms, and navigation of an interface.
- Trigger when a screen functions correctly, but its composition hinders visual
  scanning, comparison, prioritization, or error recovery.
- Do not trigger to discover whether the user flow resolves the user's fundamental
  need; use `$fireskill-specialist-ux-design` for research, journey mapping, and task testing.
- Combine with `$fireskill-specialist-nuxt-ui` when Vue implementations can leverage
  existing `@nuxt/ui` components in the project.

## Workflow

1. Load `$fireskill-specialist-design-system` and read `.fireskills/DESIGNSYSTEM.MD` before
   starting composition. Confirm that user journeys and information flow have been
   agreed upon. For a new screen or form, document the main task, screens, fields,
   validations, and layout pattern. If no visual direction is specified, apply document
   defaults and only refer back to UX when behavioral or task details are missing.
2. Read observed stack, tokens, components, breakpoints, and existing screenshots
   before proposing a new visual language. When the system already exists, inspect
   affected screens, flows, navigation, content, permissions, and states before
   altering composition. Preserve frameworks, primitives, styles, and local conventions.
   Only propose a new library when explicitly confirmed or when the stack lacks an
   identifiable base.
3. Identify persona, primary task, frequency, device, density, and error consequences;
   order content and actions according to this priority.
4. For CRUD interfaces, apply the macro layout matrix: list view with `PageHeader`
   and `UTable`, detail view with `PageHeader` and `DetailLists`, create/edit views
   with `PageHeader` and form sections in two responsive columns. Each section has
   a context column and a fields panel; document justifications for any explicit exception.
5. Map data, units, permissions, and states: nominal, loading, empty, partial, error,
   offline, and permission denied prior to finalizing layout.
6. Choose shell, navigation, and grid layout coherent with information architecture;
   reference the layout matrix in [references/standards.md](references/standards.md).
7. Establish visual hierarchy through grouping, contrast, scale, and whitespace,
   mapping every choice to semantic design tokens.
8. Implement or specify components and edge cases across all breakpoints without
   creating redundant variants of existing components.
9. During development, verify borders, spacing, margins, padding, and system typography,
   even without an explicit request. Compare rendering, DOM inspection, or equivalent
   means across relevant viewports and states.
10. Validate real content, legibility, responsiveness, accessibility, and visual
    consistency with visual and behavioral proof. Record the verification in the
    task's `VISUAL` item.

When implementations use Vue components, load `$fireskill-specialist-nuxt-ui` after
defining composition to select `@nuxt/ui` components without deferring visual
design choices to the component catalog.

## Patterns

- Dashboards answer explicit questions; they are not mere decorative card collections.
- Place high-level summaries before details and position actions adjacent to affected objects.
- Use tables for dense comparison, lists for sequential reading, and cards for distinct entities.
- Preserve scroll position, filter states, and context when navigating between list and detail views.
- Always display units, time windows, data origins, freshness/timestamps, and empty representations.
- Keep destructive actions distinct, clearly explained, and reversible whenever possible.
- Define semantic tokens and a constrained spacing/typography scale.
- Build product personality through structured data, tone, tokens, rhythm, and states,
  rather than generic card stacks.
- Position input labels above fields and render field errors in red directly below the input.
- Use two columns for related fields on wide breakpoints, single column on mobile, and
  full-width for long text inputs, helper text, file uploads, and errors.
- Make the entire `UTable` row clickable for detail navigation; keep internal buttons,
  checkboxes, and context menus layered above the row link.
- Maintain a `Breadcrumb` across all screens, showing active team, module, and current
  page. Adapt the breadcrumb rendered by the existing shell.
- Use a single componentized, reusable `PageHeader` across list, detail, create, and
  edit CRUD views.
- Use full-width `UTable` for lists, always display the `ID` column, make rows navigate
  to detail views, and keep edit/delete actions accessible within each row.

## Anti-Patterns

- Scattering metrics across identical cards without questions, time windows, or comparison
  baselines; screens show raw numbers without context for variance or priority.
- Inventing new colors, spacing values, or component variants for individual screens;
  design systems lose common vocabulary, making global changes unpredictable.
- Using placeholders as labels, icon-only buttons without accessible text, or color
  as the sole indicator of state; critical meaning degrades across accessibility modes.
- Hiding frequent actions inside nested menus for a "cleaner" aesthetic; increases
  operational overhead and hinders discoverability without reducing real complexity.
- Using cards for list data requiring comparative scanning, or replacing `PageHeader`
  with isolated loose headings.
- Duplicating `PageHeader` markup across individual screens, hiding record IDs,
  constraining `UTable` width, or moving edit/delete actions outside the record row.

## Validation

- Compare nominal, loading, empty, partial, error, offline, and permission denied
  states within the same composition.
- Verify `UTable`, `DetailLists`, `PageHeader`, and two-column responsive form sections
  match CRUD interface guidelines.
- Verify `Breadcrumb` on every screen, displaying active team name and marking the current
  item as `aria-current="page"`. Confirm reuse of the existing breadcrumb component.
- Confirm any exception to `.fireskills/DESIGNSYSTEM.MD` has documented rationale and scope.
- Stress-test short/long strings, extreme numbers, expanded translated text, and date/currency/timezone
  formatting preferences.
- Verify minimum supported viewport, 200% zoom, reflow, contrast ratios, keyboard navigation,
  focus indicators, and reduced motion settings.
- Audit newly introduced tokens and components against published design systems, justifying
  any duplication.
- Verify borders, spacing, margins, padding, and typography across viewports during implementation,
  recording proof under the `VISUAL` task entry.
- Perform joint final review with `$fireskill-specialist-nuxt-ui` whenever `@nuxt/ui`
  components have been adapted.
- Do not declare an interface responsive or consistent without screenshots or DOM inspection
  across critical states and viewports.

## Related Skills

- `$fireskill-specialist-interface-experience` for mapping screens, actions, and states
  before visual composition.
- `$fireskill-specialist-nuxt` governs pages, layouts, middleware, and SSR; this skill
  governs composition and visual states.
- `$fireskill-specialist-prototyping` tests composition alternatives at the lowest
  necessary fidelity before full implementation.
- `$fireskill-specialist-nuxt-ui` provides `@nuxt/ui` components and theming; this
  skill decides hierarchy and system coherence.
- `$fireskill-specialist-ux-design` governs user research, journeys, information
  architecture, and task usability validation.
- `$fireskill-specialist-design-system` provides macro rules, defaults, and canonical
  scenarios prior to visual composition.
- `$fireskill-specialist-web-accessibility` conducts WCAG audits, keyboard accessibility,
  and assistive technology verification.
- `$fireskill-specialist-tailwind-css` translates tokens and variants into utility classes
  when Tailwind is the observed stack.

Read [references/standards.md](references/standards.md) for layout matrices,
density guidelines, data tables, tokens, states, and visual review criteria.
