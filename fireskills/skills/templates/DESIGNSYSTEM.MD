# Product Design System

<!-- markdownlint-disable MD013 -->

This document is the normative source for the project's macro interface decisions.
It guides the composition of all screens before registering components in
`.fireskills/INTERFACE.md`. Any new screen must consult this file, domain rules,
permissions, and related screens.

## Classification

| Field | Value |
| --- | --- |
| Scope | Entire product |
| Status | Active |
| Version | 1.0.0 |
| Updated at | To be filled |
| Responsible | To be filled |

## Direction Policy

- When the user does not specify visual direction, the defaults in this document remain
  active for delivery.
- An explicit direction may override a default. Record the change in
  `Delivery Exceptions`, specify its scope, and do not turn a local exception into a
  product rule without confirmation.
- Business rules, permissions, states, and product language guide the
  interface alongside tokens. Appearance must never conceal the primary action,
  data state, or recovery path.
- `.fireskills/INTERFACE.md` records components, blocks, screens, and local composition. It does not
  duplicate the macro decisions in this file.

## Mandatory Visual Review

Visual review occurs during the development of every interface, even
without a user request. In each task, compare the rendered or inspected
screen with this design system and with `.fireskills/INTERFACE.md`.

- Check borders, spacing, margins, and padding across shell, regions,
  components, fields, actions, and states.
- Check typography: family, weight, size, line-height, letter spacing,
  hierarchy, and text wrapping.
- Check alignment, width, overflow, focus, zoom, short content, and
  long content across supported viewports.
- Record method, viewport, states, adjustments, and outcome in the task's `VISUAL` item.
  For tasks with no visual surface, record `Not applicable` with concrete rationale.

This verification is part of delivery and does not depend on the user requesting a
visual review.

## SaaS Visual Language

The interface must be informative, recognizable, and operational. Personality
stems from typography, contrast, rhythm, language, data hierarchy,
and state treatment. Never rely on purely decorative elements for identity.

- Display first the question the screen answers, followed by data and actions.
- Use sufficient density for recurring operational tasks, with breathing room between groups
  and clear legibility on small screens.
- Prefer domain terms over generic labels like "Item", "Data", or "Action".
- Display units, periods, sources, updates, and consequences whenever data
  requires that context.
- Preserve scroll position, filters, and input values after errors or returns.
- Distinguish primary, secondary, and destructive actions through placement,
  hierarchy, and semantic color.

## Canonical Dashboard

A dashboard answers an operational product question. It is not an uncoordinated
collection of cards.

- Begin with `PageHeader`, visible period or scope, and filters placed close to the
  region they affect.
- Use a concise row of `KPI` indicators to show value, unit,
  period, comparison, source, and available action.
- Below indicators, show the primary trend or distribution and a
  `UTable` or list for detailed investigation.
- Every visualization reports loading, empty, error, and refresh states. Charts
  must include a textual or tabular alternative and not rely solely on color.
- Preserve filters, period, and scroll position when refreshing or returning from detail views.
- On small screens, stack information in task order and avoid unnecessary horizontal
  overflow. Responsiveness preserves readability, controls, and actions across supported breakpoints.

## Base Components and Common Blocks

Use the base available in the project before creating new compositions.
`@nuxt/ui` components provide fundamental controls and surfaces, such as
`UButton`, `UInput`, `UFormField`, `USelect`, `UModal`, `USlideover`, `UTabs`,
`UTable`, `UCard`, `UBadge`, `UAlert`, `USkeleton`, `UTooltip`, `UPagination`, and
`UBreadcrumb`.

Compositions such as `PageHeader`, navigation, filters, `UTable`, indicator cards,
panels, and feedback states build upon these components and the project theme
(`packages/tokens`). Adapt composition to tokens, data,
permissions, and product language. Never add a dependency solely for the visual
appearance of an example.

When reusing a primitive or block, record in `.fireskills/INTERFACE.md` its origin,
file, API, states, keyboard behavior, and consumer screens. A catalog composition
serves as a foundation; it does not replace the rules of this document nor the application architecture.

## Interface Best Practices

- Provide every screen with a task-oriented title, a primary action, and a clear
  return path.
- Maintain consistent visual hierarchy, predictable alignment, sufficient contrast,
  comfortable touch targets, and legible text under zoom.
- Ensure keyboard navigation, visible focus rings, logical focus order,
  field-associated messages, and accessible names for controls.
- Do not use color, icons, or position as the sole medium for communicating state; combine
  text, semantics, and visual indicators.
- Keep feedback close to the trigger action, avoid blocking workflows unnecessarily, and
  respect `prefers-reduced-motion`.
- Test short and long content, small and large screens, loading, empty, error,
  success, disabled, and unauthorized states.

## Global Shell

All authenticated pages follow the product shell, unless an exception is recorded below.

- The shell provides persistent navigation, work canvas, focus management, and
  coherent navigation paths.
- Every screen starts with `PageHeader`, containing context, task-oriented title,
  helpful description, and primary action when applicable.
- Secondary actions sit close to the title or the region they affect. Destructive
  actions require visual distinction and confirmation stating explicit consequences.
- The page must declare loading, empty, error, success, unauthorized,
  partial content, and unsaved changes when part of the flow.

### Mandatory Breadcrumb

- Every application screen displays a `Breadcrumb` within the global shell. The path
  uses actual product terms and terminates at the current screen title.
- The hierarchy always includes the active team before module and screen, with visible
  team name and a link to its root context. No authenticated screen may hide the team
  by truncating the trail.
- First look for existing breadcrumbs, layouts that already render them, and item types
  (or use `UBreadcrumb`). Reuse this structure, its routes, and tokens; do not create parallel implementations.
- Preserve active team and current screen on narrow viewports. If intermediate items
  must collapse, use accessible ellipsis without removing either boundary or team name.
- Current item uses unlinked state, `aria-current="page"`, and accessible name. Preceding
  items are real links, respect permissions, and do not rely solely on icons or color.

## Canonical CRUD

| Surface | Mandatory Composition | Usage Rules |
| --- | --- | --- |
| List | `PageHeader` + useful summary + `UTable` | Use for dense comparison, search, filters, sorting, pagination, selection, and row actions. Batch actions must clearly state scope and result. |
| Detail | `PageHeader` + `DetailLists` | Organize attributes by domain subject, highlight status and next action. Add activity, relations, or history when domain requires. |
| Create | `PageHeader` + form sections in two responsive columns | Each section has a context column, field panel, visible labels, inline field help, and submit with sending state. |
| Edit | `PageHeader` + form sections in two responsive columns | Reuse create structure, display current values, preserve changes on failure, and report save outcome. |

### Mandatory CRUD Reuse and Actions

- All CRUD screens share the same reusable `PageHeader` component.
  List, detail, create, and edit adjust title, description, breadcrumbs, and
  actions via props or config, without duplicating markup.
- Recurring table, row, action, form, state, and feedback components are created once,
  recorded in `.fireskills/INTERFACE.md`, and reused across compatible screens.
- The list `UTable` (`enterpriseTableUi`) spans full available width. The `ID` column remains
  always visible, alongside business columns.
- The entire row serves as the link to details via mouse and keyboard. Independent
  edit and delete buttons reside in the row without bubbling clicks to the detail link.
- Delete respects permissions, displays the target record, and confirms consequences
  prior to execution.

### List Navigation

- When a row represents a record with details, the entire row acts as a navigation
  action to those details. Clicking any cell or activating via keyboard produces the same outcome.
- Use an accessible link across the row surface, such as `data-row-link`, avoiding nested links
  or invalid `tr` semantics.
- Checkboxes, menus, buttons, and other row controls reside inside `TableRowAction` or equivalent,
  layered above the row link, and do not navigate to details upon interaction.
- The row is clickable only when a clear target exists. Hover, focus, and selection states
  must remain perceptible without relying solely on color.

### Form Structure

Create and edit use separate sections to reduce cognitive load and keep record
review predictable.

- Each section uses a left context column (title and description) and a right form panel.
- The panel organizes related fields into two columns on wide breakpoints,
  using `grid-cols-2` or equivalent composition, and single column on mobile.
- Long inputs, extensive help text, uploads, nested tables, and error messages
  span full width when required by the task.
- Dependent fields remain adjacent in natural reading order; grids must never
  separate label, help text, and error from the input.
- Section or form footers place cancel, save, loading, success, and error close to the action.
  In edit mode, unsaved changes are protected against accidental dismissal.

### Forms

- Labels are visible and do not depend on placeholders.
- Required fields, accepted formats, and value sources are clear prior to submission.
- Validation marks invalid inputs with red semantic border, background, or icon,
  displaying error messages beneath the input. Text must also be announced by assistive tech.
- When multiple errors occur, a top summary offers anchor links to each field.
- Focus moves to the first invalid field upon submission. Entered values remain intact
  whenever the server allows retry.
- Submit buttons indicate loading, success, or failure without duplicate submissions.

## States and Messages

| State | Minimum Content |
| --- | --- |
| Loading | Structure matching final layout and indication of what is loading. |
| Empty | Reason, guidance, and primary call-to-action to begin, when applicable. |
| Error | What failed, recovery action, and support contacts when necessary. |
| Unauthorized | Brief explanation without exposing protected data, plus request access path. |
| Success | Concrete result, next steps, and return path to previous context. |
| Partial | Available data, missing parts, and how to refresh. |
| Unsaved | Pending modifications, guarded exit, and clear choice to stay or discard. |

## Business Rules Exposed in Interface

- Visible actions respect role, permissions, and record state.
- Status transitions display current state, next valid states, and operation effect.
- Deletion, cancellation, and irreversible actions indicate consequences, target, and confirmation before execution.
- Duplication, version conflicts, and validation failures return to screen with preserved data.
- History, authorship, and timestamps appear when activity affects record interpretation.

## Canonical Scenarios

### List with Records

```gherkin
Given the user has permission to view records
When they open the list route
Then they see a PageHeader with context and primary action
And they see a Breadcrumb with team name and current screen title
And they see records in a table with suitable search, filters, and sorting
And they can identify status, updates, and available actions per row
```

### Empty List

```gherkin
Given there are no records for the current scope
When the user opens the list
Then they see a message explaining why it is empty
And they see an action to create the first record when authorized
```

### Detail View

```gherkin
Given the user has access to a record
When they open its detail view
Then they see the PageHeader with identification, status, and valid actions
And they see attributes organized in DetailLists
And they find relations or activity when required by the domain
```

### Valid Creation

```gherkin
Given the user has permission to create
When they fill form sections in two columns and submit
Then they see the save outcome
And they are navigated to details or list according to defined flow
```

### Creation or Edit with Field Error

```gherkin
Given the user submitted an invalid field
When the server returns the error
Then the field displays red visual error state
And the error message appears beneath the field
And focus lands on the first error
And other entered values remain preserved
```

### Unauthorized

```gherkin
Given the user lacks required permissions
When they attempt to open or trigger the action
Then they see a message without exposed protected data
And they do not receive controls they cannot use
```

### Loading Error

```gherkin
Given the data source failed
When the user opens the screen
Then they see an error state with an intelligible cause
And they find an action to retry
```

## Tokens and Components

Color, typography, spacing, radius, focus, and animation tokens must be
reused before creating local ad-hoc values. Accessible components and catalog
compositions must be registered in `.fireskills/INTERFACE.md` with source,
props, events, states, and active consumers. Visual review must
verify borders, spacing, margins, padding, and typography against these
tokens before completing the task's `EVIDENCE` item.

## Delivery Exceptions

| Date | Screen or Flow | Overridden Default | New Rule | Scope | Rationale | Author |
| --- | --- | --- | --- | --- | --- | --- |
| To be filled | To be filled | To be filled | To be filled | Delivery, screen, or product | To be filled | To be filled |

## History

| Version | Date | Change | Scope |
| --- | --- | --- | --- |
| 1.0.0 | To be filled | Created SaaS defaults and canonical CRUD scenarios | Product |

<!-- markdownlint-enable MD013 -->
