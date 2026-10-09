---
name: fireskill-specialist-interface-experience
description: Analyze current UI architectures and guide the discovery, planning, and delivery of complete, functional, accessible user interfaces aligned with existing stack conventions.
---

# Interface Experience

## When to Use

- Trigger when creating or modifying screens, dashboards, lists, forms, user journeys,
  or CRUD interfaces used by people.
- Trigger prior to UX, UI, and frontend implementation to map current screen structures
  and organize interface requirements.
- Do not use for background endpoints, cron jobs, or internal tasks lacking human UI.

## Workflow

1. Load `$fireskill-setup` and inspect `.fireskills/STACK.md`, `.fireskills/PACKAGES.md`,
   manifests, and local guidelines. Load `$fireskill-specialist-design-system` and read
   `.fireskills/DESIGNSYSTEM.MD` before proposing screens. If absent, initialize from
   `skills/templates/DESIGNSYSTEM.MD`.
   Run `node fireskills/skills/fireskill-setup/scripts/inspect_interface.mjs --project <root>`
   to discover routes, components, and frontend dependencies.
2. Inspect screens, flows, routes, components, permissions, states, and tests in the affected area.
   Document current user capabilities, what must remain, and what the deliverable changes.
3. Identify the frontend framework, routing strategy, UI primitives, styles, forms, and test runners.
   Adhere to these sources without changing UI libraries without explicit authorization.
4. Apply the central numbered questions contract only for genuine requirements gaps:
   ask one gap per round concerning screens, information flow, form fields, action buttons,
   and composition. When the user provides no specific visual direction, apply defaults from
   `.fireskills/DESIGNSYSTEM.MD`.
5. In section 10 of the spec, record the observed stack, each screen, flows, forms,
   compositions, states, and accessibility requirements. A CRUD deliverable is never
   restricted to APIs or databases alone: always map list views (`PageHeader` + `UTable`
   with clickable row detail), detail views (`PageHeader` + `DetailLists`), and create/edit
   flows (`PageHeader` + responsive two-column sections). Every screen must also map
   `Breadcrumb` showing team, module, and view, reusing the layout breadcrumb.
6. In section 14, define an `Interface Phase` with tasks per screen and test cases for
   navigation, forms, validation, feedback states, and keyboard accessibility.
7. Collaborate with `$fireskill-specialist-ux-design` for journeys, `$fireskill-specialist-ui-design`
   for visual composition, `$fireskill-specialist-nuxt-ui` for `@nuxt/ui` component adaptation,
   and `$fireskill-specialist-nuxt` for frontend page and layout implementation.

## Expected Outcome

An informative, functional, recognizable user interface matching the application's
existing design system and architecture.

## Antipatterns

- Implementing backend endpoints for CRUD deliverables while ignoring UI screens.
- Introducing a secondary component library alongside `@nuxt/ui`.
- Building forms without explicit validation states or keyboard focus management.
- Writing screens without responsive mobile considerations.

## Validation

- Review screens against `.fireskills/DESIGNSYSTEM.MD` standards.
- Ensure all states (loading, empty, error, success, 403) are tested and demonstrable.
- Verify that every implementation task completes its `VISUAL` checklist item.
