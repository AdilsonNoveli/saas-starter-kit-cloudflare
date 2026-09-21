---
name: fireskill-specialist-design-system
description: Create and maintain .fireskills/DESIGNSYSTEM.MD with macro SaaS interface rules, CRUD patterns, states, and scoped exceptions. Use before designing screens; do not use to inventory local component files.
---

# Fireskills Specialist Design System

## When to Use

This skill governs `.fireskills/DESIGNSYSTEM.MD` in consumer projects. It establishes
visual language, shell layout, surface composition, states, and business rules exposed
in the user interface. It guides UX, UI, interface experience, and Vue components with `@nuxt/ui`.

Use before creating or reviewing screens, CRUD workflows, navigation, forms, or
global components. Also use when the document is missing, outdated, or conflicting
with an implemented screen.

Do not use this skill to catalog local components, props, or file locations. That
registry belongs in `.fireskills/INTERFACE.md`, which links to macro design choices without duplicating them.

## Required Sources

Read in this order:

0. In Nuxfire, [references/nuxfire-design-system.md](references/nuxfire-design-system.md): where customization lives and which components do **not** exist.
1. `.fireskills/DESIGNSYSTEM.MD` at the project root, if present.
2. `skills/templates/DESIGNSYSTEM.MD` if creating the document.
3. `.fireskills/INTERFACE.md` to review existing registered components and screens.
4. `.fireskills/STACK.md`, manifests, routes, screens, permissions, and domain rules.

When absent, copy the managed template to `.fireskills/DESIGNSYSTEM.MD` and populate
only confirmed context. Do not fill gaps with generic placeholder copy.

## Workflow

1. Identify product, module, surface, and affected user flow.
2. Compare requests against `.fireskills/DESIGNSYSTEM.MD` and preserve active rules.
3. If no visual direction is given, apply document defaults and record this as the default design direction.
4. If a different direction is provided, record the exception, its scope, and the rule it replaces. A single screen exception does not alter global rules.
5. Update the document only when rules have macro scope. Document specific components and screens in `.fireskills/INTERFACE.md`.
6. Map canonical scenarios for the surface before handing off to UX, UI, or implementation.
7. Report consulted sources, applied rules, recorded exceptions, and covered scenarios.

Conduct visual reviews during development even without explicit user requests.
Verify borders, spacing, margins, padding, and typography across viewports and states.
Record methodology, results, and adjustments in the `VISUAL` task checklist item.

## Standards

### Mandatory SaaS Defaults

When no contrary visual direction exists, apply these compositions:

- CRUD List: `PageHeader` + summary + `UTable`. Use search, filters, sorting,
  pagination, selection, and row actions as required by volume and domain.
- Detail View: `PageHeader` + `DetailLists`, with status badge, primary next action,
  and related records or activity history.
- Create / Edit: `PageHeader` + form sections in responsive two-column layout
  (left context column, right fields panel).
- Form Fields: visible top labels above inputs, contextual help text, preserved inputs,
  and explicit submission state.
- Field Validation Errors: red border/icon, visible error message directly below input,
  semantic ARIA association, and focus on the first invalid field.
- Multiple Errors: summary banner at top linking to affected inputs.
- Screen States: `loading`, empty, error, success, forbidden (403), partial content,
  and unsaved changes when applicable.
- Breadcrumbs: mandatory on every screen, showing active team name before module
  and page title. Reuse layout breadcrumb (or `UBreadcrumb` from `@nuxt/ui`).
- UTable: entire row clickable to open details, with keyboard equivalents and
  row action buttons isolated via `TableRowAction` or stop-propagation.
- CRUD Consistency: all views reuse the componentized `PageHeader`; tables use
  full-width `UTable`, display `ID` column, and provide edit and delete row actions.
- Reusable components for headers, tables, rows, actions, forms, states, and feedback
  must be recorded in `.fireskills/INTERFACE.md` and reused before implementing new components.

These defaults do not imply generic styling. Character originates in domain hierarchy,
typography, tokens, rhythm, contrast, and shell execution.

## Dashboards and Shared Blocks

Dashboards feature `PageHeader`, date/scope selector, filters, a concise `KPI` strip
(value, unit, period, comparison, source), followed by primary trends/distributions
and detailed investigative data tables. Every metric must define loading, empty,
error, and refresh states, with accessible text/tabular alternatives for charts.

Use `@nuxt/ui` v4 components (`UCard`, `UTable`, `UForm`, `UModal`, `UDashboard*`)
themed via `@nuxfire/tokens` (`sharedUiConfig`, `theme.css`, `enterpriseTableUi`).

## Form Layouts

Organize create/edit flows into distinct sections. Context on the left, fields panel
on the right. Fields use two columns on desktop viewports and collapse to single-column
on mobile. Actions footer keeps cancel and submit buttons adjacent to form outcomes.

## Canonical Scenarios

Cover these scenarios in `.fireskills/DESIGNSYSTEM.MD` or delivery specs:

- list with populated records;
- empty list state;
- detail view with status and action buttons;
- valid creation;
- valid editing;
- create/edit with field validation errors;
- unauthorized access (403);
- data loading failure;
- unsaved changes warning;
- destructive action outcomes (confirmation modals for deletion/cancellation).

## Boundaries and Handoff

- UX defines flow, information architecture, and task terminology from this source.
- UI defines tokens, hierarchy, visual rhythm, and states from this source.
- Vue components (`@nuxt/ui`) implement matching compositions after reading this source and `.fireskills/INTERFACE.md`.
- The interface experience skill coordinates delivery and must load `.fireskills/DESIGNSYSTEM.MD` before designing screens.

## Antipatterns

- Card walls when users need to compare tabular records.
- Monolithic forms lacking section groupings.
- Multi-column forms on mobile screens.
- Placeholders used as substitutes for form labels.
- Errors conveyed solely through icons, color, or distant toasts.
- Screens lacking empty states or recovery routes.
- Dashboards presenting disconnected numbers without context, units, or next steps.
- Creating bespoke styles using arbitrary hex codes instead of semantic tokens.
- Registering local screen exceptions as global design rules.

## Validation

Before handoff, verify (in Nuxfire, the `PageHeader`, `Breadcrumb` and `DetailLists` items apply only to a screen whose task creates those components; see [references/nuxfire-design-system.md](references/nuxfire-design-system.md)):

- `.fireskills/DESIGNSYSTEM.MD` exists at project root with policy, defaults, states, and scenarios.
- List views use `UTable` and `PageHeader`.
- Every screen renders `Breadcrumb` displaying team, module, and page title.
- Existing layout breadcrumb components are reused.
- Detail views use `DetailLists` and `PageHeader`.
- Forms use sections with responsive two-column layouts.
- Field errors display in red beneath controls with semantic ARIA associations.
- Scoped exceptions are recorded with explicit boundaries.
- `.fireskills/INTERFACE.md` tracks local component registries.
- Task checklist items include completed `VISUAL` reviews prior to `EVIDENCE`.
