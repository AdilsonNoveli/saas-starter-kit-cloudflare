# Project Interface

<!-- markdownlint-disable MD013 -->

This file is the canonical source for building and reusing user interface components.
Update it before and after every task that creates or modifies a Vue screen.
Read `.fireskills/DESIGNSYSTEM.MD` before deciding macro layout composition. This file
registers local components, UI blocks, and views; global SaaS guidelines reside in
`.fireskills/DESIGNSYSTEM.MD`.

## Observed Baseline

- Stack: {{STACK_LABEL}}
- Policy: All interfaces are built as Vue Single-File Components with `@nuxt/ui` v4.
- Components: `@nuxt/ui` primitives (`UButton`, `UModal`, `UTable`, `UForm`, etc.).
- Theming: `packages/tokens` (`sharedUiConfig`, `theme.css`, `enterpriseTableUi`).

{{STACK_GUIDANCE}}

## Design System

| Item | Location or Value | Project Usage |
| --- | --- | --- |
| Tokens and theme | To be mapped | Colors, typography, spacing, radius, and color mode |
| `@nuxt/ui` configuration | `apps/app/app/app.config.ts` | `ui:` (spread of `sharedUiConfig`) |
| Icons | To be mapped | `lucide` icon collection (`i-lucide-*`) |
| Shared PageHeader | `.fireskills/DESIGNSYSTEM.MD` | Single reusable component for list, detail, create, and edit views |
| Dashboard pattern | `.fireskills/DESIGNSYSTEM.MD` | `PageHeader`, filters, KPI stat cards, main chart, and detailed view |
| Table pattern | `.fireskills/DESIGNSYSTEM.MD` | Full-width `UTable` with `enterpriseTableUi`, visible `ID` column, clickable row links, edit/delete actions |
| Form pattern | `.fireskills/DESIGNSYSTEM.MD` | Structured sections, contextual help column, responsive two-column layout |
| Context pattern | `.fireskills/DESIGNSYSTEM.MD` | `Breadcrumb` across all views with team, module, and current view |
| Shared components | To be mapped | App or layer components in `app/components/` |
| Domain compositions | To be mapped | Feature components in `layers/<layer>/app/components/` |

## Created and Reusable Blocks

Register all UI blocks created in the project, including internal feature components.
A block is an encapsulated Vue component with distinct responsibility, such as
tables, forms, filter bars, headers, cards, modals, slide-overs, empty states, or batch actions.

| Block | Type | File | Origin | Purpose and Public API | States and Accessibility | Consumers | Reuse or Extend |
| --- | --- | --- | --- | --- | --- | --- | --- |
| To be mapped | Base, composition, or domain | Target file | `@nuxt/ui` or custom | Props, events, and data model | Focus, keyboard, loading, empty, error, success | Screens and parent blocks | Guidance on when to reuse or extend |

## Screens and Composition

| Screen or Route | File | Used Vue Components | Data and Actions | States |
| --- | --- | --- | --- | --- |
| To be mapped | Target file | Components used | Model and triggers | Loading, empty, error, and success |

## Composition Rules

1. Pages and routes coordinate data and compose components; they do not inline dense tables, forms, filters, overlays, or cards.
2. Before creating a new component, audit this inventory and reuse existing blocks matching the same user intent.
3. Every created or reused `@nuxt/ui` component is recorded here with its source file, origin, purpose, API, states, and consumers.
4. Use the project design system (`packages/tokens`) and semantic color tokens; avoid hardcoded hex colors or arbitrary utility overrides.
