# Project Interface

<!-- markdownlint-disable MD013 -->

Canonical source for building and reusing the user interface. Update it before and after each task that creates or modifies a Vue screen. Tokens, theme, and customization rules: `.fireskills/DESIGNSYSTEM.MD`.

## Observed Baseline

- All interfaces are composed of Vue Single-File Components with `@nuxt/ui` v4.
- Lucide icons (`i-lucide-*`).
- Shared components in `apps/app/app/components/`; domain compositions in `layers/<layer>/app/components/`. File-based routes in `apps/app/app/pages/` and `layers/*/app/pages/`.

## Created and Reusable Blocks

Register all created UI blocks, including feature internals: Vue components with single responsibility, such as grids, forms, filters, headers, cards, dialogs, slide-overs, empty states, uploads, or batch actions. Blocks provided by the starter reside in the directories above; read them before creating an equivalent.

| Block | Type | File | Origin | Purpose and Public API | States and Accessibility | Consumers | Reuse or Extend |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ConfirmDialog` | Domain composition (app) | `apps/app/app/components/ConfirmDialog.vue` | custom, on top of `@nuxt/ui` | Singleton confirmation dialog, mounted once in `app.vue`. Never imported directly by a page: call `useNotification().confirm({ title, ... })`. | To be mapped | `apps/app/app/app.vue` | Use `useNotification().confirm` instead of creating another dialog |

## Screens and Composition

Register each created or modified screen.

| Screen or Route | File | Used Vue Components | Data and Actions | States |
| --- | --- | --- | --- | --- |

## Composition Rules

1. Pages and routes coordinate data and compose components; they do not concentrate reusable grids, forms, filters, overlays, or cards.
2. Before creating a component, consult this table and the component directories; reuse existing ones when they fulfill the same intent.
3. Every `@nuxt/ui` component reused or created enters the table with its file, origin, explanation, API, states, and real consumers.
4. When creating a block, register it in this table in the same task. When modifying or removing a block, update its consumers and reuse guidance.

<!-- markdownlint-enable MD013 -->
