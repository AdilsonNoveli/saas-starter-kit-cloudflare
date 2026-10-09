# Standards for SaaS Application Design Systems

<!-- markdownlint-disable MD013 -->

## Macro Source

Read `.fireskills/DESIGNSYSTEM.MD` before proposing tokens, shell layouts, global components,
or CRUD compositions. If absent, copy `.fireskills/templates/DESIGNSYSTEM.MD` and populate
only confirmed context.

## Common Surfaces

| Surface | Minimal Composition |
| --- | --- |
| CRUD List | Shared `PageHeader` + summary + full-width `UTable` with `ID` and row actions |
| Detail View | `PageHeader` + `DetailLists` + status and primary next action |
| Create / Edit | `PageHeader` + responsive two-column sections (context and fields) |
| Dashboard | Period / scope selector + filters + `KPI` strip + trend/distribution + detail table |
| Every Screen | `Breadcrumb` displaying team, module, and current view title |

Reuse layout breadcrumb components; if absent, use `UBreadcrumb` from `@nuxt/ui`.

All CRUD views reuse the componentized `PageHeader` without duplicating markup.
Table rows link to detail views while maintaining discrete click handlers for row actions.
During development, audit borders, spacing, margins, padding, and typography, recording
findings in the `VISUAL` task checklist.

## State Contracts

Every surface declares, as applicable: `loading`, empty, error, success, forbidden (403),
partial content, and unsaved changes. Field errors are semantically associated with controls,
displayed directly below inputs, and preserve entered values. Multiple errors feature
a top summary banner with anchor links.

## Responsive Forms

Group inputs into distinct sections. Context panels explain the group; field panels
contain controls. Use two columns on desktop viewports, collapsing to single-column
on mobile screens, with full width for long text, file uploads, and banners.

## Authoritative Documentation

- [Material Design 3](https://m3.material.io/)
- [Carbon Design System](https://carbondesignsystem.com/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)

<!-- markdownlint-enable MD013 -->
