# Design system in Nuxfire — What Actually Exists in the Codebase

Each statement below includes its concrete file evidence. If the codebase changes,
the code supersedes this document: re-read the referenced file before taking action.

## 1. What exists

| Fact | Evidence |
|---|---|
| `packages/tokens` (`@nuxfire/tokens`) is the single source of truth for visual customization: palettes, fonts, radius, light/dark surface mapping, component defaults | `packages/tokens/theme.css`, `packages/tokens/index.ts` |
| `sharedUiConfig` is spread into the `ui` block of every app's `app.config.ts`; `enterpriseTableUi` is the `:ui` of `UTable` | `apps/*/app/app.config.ts`, `packages/tokens/index.ts` |
| Every app imports, in this order, `tailwindcss`, `@nuxt/ui`, `@nuxfire/tokens/theme.css` | `apps/*/app/assets/css/main.css` |
| The browser-chrome color (`<meta name="theme-color">`) cannot use a CSS variable, so it is exported as `themeColor`; a test fails if it drifts from `--ui-bg` | `packages/tokens/index.ts`, `packages/tokens/theme-color.test.ts` |
| No Tailwind default palette class (`text-red-500`, `bg-emerald-500`...) is used in `apps/app`, `apps/login`, `apps/web` or `layers/`; they use Nuxt UI semantic roles (`primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`) | `git grep` (command in section 3) |
| `.fireskills/DESIGNSYSTEM.MD` is deliberately minimal: where the tokens live and the rules to use them | `.fireskills/DESIGNSYSTEM.MD` |
| Confirmation dialogs go through `useNotification().confirm`, rendered by one `ConfirmDialog` mounted in `app.vue` | `apps/app/app/composables/use-notification.ts`, `apps/app/app/app.vue` |

## 2. What does NOT exist

- `PageHeader`, `TableRowAction`, `UBreadcrumb`/`Breadcrumb` and `KPI` components, and `DetailLists`: none is in `apps/app`, `layers/` or `packages/tokens`. No screen in `apps/app` or the layers renders a breadcrumb.
- A shared CRUD or dashboard page pattern. Screens are composed from `UDashboardNavbar`, `UDashboardPanel`, `UPageCard`, `UCard`, `UForm`, `UModal` and `UTable`.

Because of this, the generic checklists in this skill (`PageHeader`, `Breadcrumb`, `DetailLists`, KPI strips) apply only to a screen whose task creates those components and registers them in `.fireskills/INTERFACE.md`. Do not write them into `.fireskills/DESIGNSYSTEM.MD` as rules, and do not fail an existing screen for lacking them.

Do not copy palette values, hex codes, contrast ratios or component-override tables into `.fireskills/DESIGNSYSTEM.MD`: they live in `theme.css` and in the comments of `packages/tokens/index.ts`.

## 3. Verification

Raw palette classes (expected: no output):

```bash
git grep -n -E "\b(text|bg|border|ring|from|to|via|fill|stroke|divide|outline|decoration|shadow)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]{2,3}\b" -- apps layers
```

Documented exceptions: the QR code in `layers/account/app/components/account/MfaSetupModal.vue` stays pure black on pure white in both themes (scanners refuse low-contrast codes).
