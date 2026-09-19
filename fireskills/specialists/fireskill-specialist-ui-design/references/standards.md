# UI Standards for Systems and Dashboards

<!-- markdownlint-disable MD013 -->

## Shell Selection

| Dominant Need | Initial Structure | Decision Evidence |
| --- | --- | --- |
| Switching between stable areas | Sidebar + contextual header | Five or more recurring destinations |
| Comparing collection and item | Master-detail or linked routes | Frequent return to the same data slice |
| Monitoring health and exceptions | Filterable dashboard | Questions and actions defined per metric |
| Completing mandatory sequences | Workflow / Stepper | Finite, interdependent sequential steps |
| Editing extensive configuration | Categories + search | Stable groupings and low modification frequency |

Do not use dashboards as synonyms for authenticated homepages. Unless there are explicit
questions, comparisons, or exceptions, choose task-oriented navigation.

## Design System and CRUD

Before composition, read `.fireskills/DESIGNSYSTEM.MD` and apply its defaults. For CRUD
surfaces, use `PageHeader` on all pages, `UTable` in lists, `DetailLists` in detail views,
and two-column responsive form sections in create and edit views. Input labels reside
above fields and error messages appear in red below fields. The shell renders `Breadcrumb`
on every screen, showing active team, module, and current view; reuse the existing component.

## Hierarchy and Density

- Order elements by user task and error consequence, not available component container size.
- Use proximity for grouping, alignment for comparison, and contrast for prioritization;
  never rely on typography scale alone.
- Maintain a single primary action per viewport region. Secondary actions can coexist
  when they do not visually compete or share similar destructive consequences.
- In frequent operational workflows, prioritize rapid scanning and comparison; in onboarding
  and rare decisions, prioritize clarity and error prevention.
- Allow density adjustments to alter spacing, never meaning or available action sets.
- Separate form sections into context columns and field panels; use two columns on wide
  screens and single column on mobile viewports.
- Make `UTable` rows navigate to detail views via click and keyboard; keep nested actions
  layered on top of the row link.

## Data and Components

| Component | Minimum Contract |
| --- | --- |
| KPI | Name, value, unit, time window, comparison baseline, origin, and state |
| Chart | Explicit question, honest scale, legend, time range, and textual alternative |
| Table | Column headers, sorting, selection, row actions, pagination, and empty state |
| Filter | Visible state, item count, reset action, and shareable URL state |
| Form | Field label, helper text, required marker, contextual error, submit, and state preservation |
| Destructive Action | Target object, consequence explanation, proportional confirmation, and recovery path |

- Use tables when columns require comparison across rows.
- Use lists when sequential reading dominates and cards when each entity features unique structure;
  identical cards do not replace data tables.
- Reserve semantic colors for system state. Do not style chart series with error, warning,
  or success colors unless series represent those exact states.
- Explicitly represent `0`, unavailable, delayed, and unauthorized as distinct states.

## Tokens and Components

Define tokens in structured layers:

1. Primitives: Color scales, spacing scales, typography scales, border radii, elevations.
2. Semantics: `surface`, `text-muted`, `border-danger`, `focus-ring`.
3. Components: Only when semantics cannot be shared.

A new component variant must represent a recurring state or use case, not an isolated
one-off screen. Before creating one, compare props, slots, and tokens of existing
components, documenting why composition does not resolve the need.

## Responsiveness

- Define breakpoints where content integrity breaks, not by device names.
- Preserve tasks, reading order, and actions; collapsing must not conceal the only
  way to complete a workflow.
- Replace data tables with alternate representations only if the comparison contract
  remains viable.
- Test minimum supported viewports with real data and zoom. `overflow: hidden` does
  not fix layout problems.
- Reserve media dimensions to eliminate Cumulative Layout Shift (CLS) and keep text
  legible over images across all variants.

## States and Edge Cases

| State | Review Question |
| --- | --- |
| Loading | Does structure preserve context without promising non-existent data? |
| Empty | Does it explain why it is empty and provide a clear next action? |
| Partial | Does it distinguish available, delayed, and failed data subsets? |
| Error | Does it inform impact, recovery steps, and preserve user input? |
| Offline | Does it separate local cached data, stale status, and network-required actions? |
| Permission Denied | Does it avoid leaking resource existence and show authorized alternatives? |

## Review Proof

- Comparable screenshots of critical states in narrow and wide viewports.
- Inventory of newly introduced tokens/components with variant justifications.
- Stress-tested short, long, localized strings, and extreme numbers without clipping.
- Complete keyboard traversal with visible focus indicators.
- Zoom, reflow, contrast, forced colors, and reduced motion compliance.
- Primary actions and consequences understandable without relying solely on color or position.

<!-- markdownlint-enable MD013 -->

## Official Sources

<!-- markdownlint-disable MD034 -->

- Material Design 3: https://m3.material.io/
- Carbon Design System: https://carbondesignsystem.com/
- USWDS Components: https://designsystem.digital.gov/components/overview/
- USWDS Design Tokens: https://designsystem.digital.gov/design-tokens/
- GOV.UK Design System: https://design-system.service.gov.uk/
- WAI-ARIA APG patterns: https://www.w3.org/WAI/ARIA/apg/patterns/
- Web Content Accessibility Guidelines 2.2: https://www.w3.org/TR/WCAG22/

<!-- markdownlint-enable MD034 -->
