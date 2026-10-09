---
name: fireskill-specialist-nuxt-ui
description: Build and review Vue interfaces with @nuxt/ui v4 (Reka UI + Tailwind CSS + Tailwind Variants) in Nuxfire — U* components, UForm validation, UTable with enterpriseTableUi, dashboard layouts, Lucide icons, and theming via packages/tokens and app.config.ts. Use before authoring or modifying any `.vue` file consuming U* components; does not cover brand palette decisions (design-system), UX user flows, or pure Tailwind outside Nuxt UI.
---

# Nuxt UI (@nuxt/ui v4)

## When to Use

- Activate before creating or editing `.vue` files that use `UButton`, `UModal`, `UForm`, `UTable`, `UDashboard*`, `UNavigationMenu`, or other `U*` primitives.
- Activate to customize themes: semantic tokens, border radius, component variants, slots, `app.config.ts`, or `packages/tokens`.
- Activate when selecting appropriate components (Modal vs Slideover, Select vs SelectMenu, Toast vs Alert) and assembling forms, tables, overlays, or navigation bars.
- Do not activate for macro brand identity or design system tokens — use `$fireskill-specialist-design-system`; nor for screen composition or UX flows — use `$fireskill-specialist-ui-design` and `$fireskill-specialist-ux-design`; nor for raw Tailwind utilities outside components — use `$fireskill-specialist-tailwind-css`.
- Combine with `$fireskill-specialist-nuxt` (pages, layouts, composables), `$fireskill-specialist-trpc` (form mutation endpoints), and `$fireskill-specialist-web-accessibility`.

## Workflow

1. Read [references/nuxfire-real.md](references/nuxfire-real.md): it clarifies where theming lives, which patterns exist, and what is **not** in use.
2. Search codebase for existing screen or component patterns (`layers/*/app/`, `apps/app/app/`) and follow conventions before inventing new ones.
3. Load task-specific references from the routing table below before writing code.
4. Select components using the `component-selection` matrix; inspect props/slots/events in generated theme files (`apps/app/.nuxt/ui/<component>.ts`) or official docs at `https://ui.nuxt.com`.
5. Implement using semantic color tokens, `i-lucide-*` icons, and i18n keys for localized screens.
6. When changing component visuals product-wide, modify `packages/tokens` (not individual pages) and verify rendered DOM output.
7. Run the validation checks below before declaring work complete.

## Reference Routing

| Task | Load |
|---|---|
| Any new screen | `nuxfire-real`, `guidelines/conventions`, `guidelines/component-selection` |
| Dashboard / admin area | `nuxfire-real`, `layouts/dashboard`, `recipes/navigation` |
| Form or settings page | `guidelines/forms`, `guidelines/conventions` |
| Login, registration, password recovery | `recipes/auth`, `guidelines/forms` |
| Table with filtering/pagination/selection | `recipes/data-tables`, `component-selection`, `nuxfire-real` (§3) |
| Modal, slideover, drawer, command palette | `recipes/overlays`, `component-selection` |
| Theming, color tokens, variants, `ui` prop | `guidelines/design-system`, `nuxfire-real` (§2) |
| Marketing, pricing, changelog | `layouts/landing`, `guidelines/design-system` |
| Component discovery by name | `references/components.md` |

Files in `references/`: `nuxfire-real.md`, `components.md`,
`guidelines/{design-system,component-selection,conventions,forms}.md`,
`layouts/{dashboard,landing,docs,chat,editor}.md`,
`recipes/{data-tables,auth,overlays,navigation}.md`.

## Key Rules

- `<UApp>` wraps the application exactly once (already in `app.vue`); toasts, tooltips, and overlay providers depend on it. Never nest another `UApp`.
- Use **semantic color tokens exclusively**: `text-default`, `text-muted`, `text-dimmed`, `bg-elevated`, `bg-muted`, `border-default`, `border-muted`, `text-primary`. Never hardcode raw palette scales (`text-gray-500`, `bg-red-600`).
- Style cascade precedence (highest wins): instance `ui`/`class` prop -> `app.config.ts` (`sharedUiConfig`) -> default component theme.
- Global theme lives in `packages/tokens` (`sharedUiConfig` in `index.ts`, CSS custom properties in `theme.css`). Never duplicate tokens in app `main.css`.
- When overriding a component globally, target the active **variant**, not `slots`: variant classes apply later and override slot definitions.
- Tables: `<UTable :data :columns :ui="enterpriseTableUi" />` imported from `@nuxfire/tokens`; customize via object spread rather than copying classes.
- Forms: `UForm` with `:schema` (Zod) and reactive `:state`, `UFormField` with `name` matching schema key, and `useNotification()` for feedback (`useToast()` direct is legacy); mutations call `useTrpcClient()`.
- Modals: `v-model:open`; content in `#content` using `UCard` when header/footer are required. Destructive actions trigger `useNotification().confirm(...)`, never bespoke per-page modals.
- Icons use format `i-{collection}-{name}`; default collection is `lucide` (`i-lucide-users`). Custom SVGs use `nuxt-svgo` (prefix `icon`, folder `~/assets/icons`).
- Menu/tab/select options belong in an `items` array rather than manual slots per entry.
- Reusable components listed in `references/components.md` must not be rewritten manually.

## Anti-patterns

- Hardcoded palette colors or hex codes in `.vue` files — breaks light/dark mode and centralized rebranding (`packages/tokens/theme.css`).
- Copying `enterpriseTableUi` classes into local pages instead of importing the configured object.
- Applying global overrides to `slots.root` when the active variant redefines the same property: classes vanish silently.
- Redeclaring `--ui-*`, `--color-*`, or typography rules in an app `main.css` that already imports `@nuxfire/tokens/theme.css`.
- Inverting the stylesheet import order: `tailwindcss` -> `@nuxt/ui` -> `theme.css`.
- Omitting `@source "./index.ts"` in `theme.css` when defining token classes only in `packages/tokens/index.ts`.
- Building bespoke navigation links beside `UNavigationMenu`: diverges from design tokens.
- Creating repetitive confirmation modals across pages instead of using the unified `ConfirmDialog`.
- Assuming uninstalled features exist (chat/editor packages, MCP tools).
- Coding component APIs from memory without inspecting props/slots in generated theme types or official docs.
- Introducing redundant third-party UI libraries for capabilities Nuxt UI already covers.

## Validation

- `bun run typecheck` in `apps/app` (`nuxt typecheck`) passes without slot/prop errors in modified `.vue` files.
- Zero raw palette color classes in modified files:
  `grep -nE "\b(text|bg|border|ring)-(gray|zinc|slate|stone|neutral|red|green|blue)-[0-9]{2,3}\b" <files>` returns empty.
- Run the app (`bun run app` in root) and test screens in light/dark themes across mobile and desktop viewport widths; inspect DOM elements to verify overridden utility classes apply.
- Test keyboard navigation: visible focus rings, tab order, `Esc` dismisses overlays, accessible labels on all `UFormField` elements.
- Forms: verify invalid state, valid submission, and server error handling (toast/field error).
- Tables: verify empty state, loading skeleton, error state, and clickable rows where applicable.
- Never declare UI accessible or responsive without verified DOM evidence.

## Related Skills

- `$fireskill-specialist-nuxt` for pages, layouts, composables, and SSR.
- `$fireskill-specialist-design-system` for tokens, palette, and brand rules residing in `packages/tokens`.
- `$fireskill-specialist-ui-design` and `$fireskill-specialist-ux-design` for screen layout composition and user journeys.
- `$fireskill-specialist-tailwind-css` for utility classes and responsive layouts outside components.
- `$fireskill-specialist-trpc` for backend API mutation procedures.
- `$fireskill-specialist-nuxt-authorization` for permission-based component rendering (`<Can>`).
- `$fireskill-specialist-web-accessibility` for deep contrast, focus management, and keyboard support.
