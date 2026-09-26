# Product Design System

`packages/tokens` (`@nuxfire/tokens`) is the single source of truth for visual customization. This file defines where it lives and the rules for using it; concrete values (palettes, radius, fonts, component overrides) reside in code, never here.

## Single Source of Truth

- `packages/tokens/theme.css`: fonts, palettes (`flame`, `fire`, `night`, and `mint` — the Buy CTA's fixed brand green, only shades 500/950, not wired into `ui.colors`), border radius (`--ui-radius`), and the surface, text, and border mapping for light and dark modes (`--ui-*`, `.dark` block).
- `packages/tokens/index.ts`: `sharedUiConfig` (the `ui` block of each `app.config.ts`, including `colors`: `primary` → `flame`, `secondary` → `fire`, `neutral` → `night`) and `enterpriseTableUi` (the `:ui` prop of `UTable`). The rationale for each override is documented in the file's comments.
- `packages/tokens/index.ts` also exports `themeColor` (the color for `<meta name="theme-color">`, which does not accept CSS variables); `theme-color.test.ts` fails if it diverges from `--ui-bg` in `theme.css`.
- `apps/app`, `apps/web`, and `apps/login` import, in this order, `tailwindcss`, `@nuxt/ui`, and `@nuxfire/tokens/theme.css` in their `main.css`. `theme.css` comes last to override Nuxt UI defaults.
- `theme.css` declares `@source "./index.ts";`: without this line, Tailwind does not scan the package (which arrives via symlink), and a class that only exists in `index.ts` would be emitted to the DOM without matching CSS rules.

## Rules

1. All visual customization (color, typography, radius, dark mode, component defaults) lives exclusively in `packages/tokens`. An app's `main.css` never redeclares tokens; it is reserved for what is genuinely local (an animation, a component effect).
2. Across all apps and `layers/`, use only semantic classes and colors from `@nuxt/ui` (`primary`, `success`, `text-default`, `bg-elevated`, `border-default`...); never raw palette colors (`text-red-500`) or hex / `rgba` in CSS: derive from a token (`var(--ui-*)`, `color-mix`). Documented exception in code: the MFA QR code stays black on white in both themes.
3. Reuse existing tokens before creating local values.
4. Every `UTable` receives `enterpriseTableUi` via `:ui`.
5. Do not communicate error or success by color alone; maintain visible keyboard focus; respect `prefers-reduced-motion`.

## Visual Review

Before the task's `EVIDENCE` item, verify borders, spacing, margins, padding, and typography against the tokens. Reused or created components are recorded in `.fireskills/INTERFACE.md`.

## How to Rebrand

- Accent and neutral colors: palettes in `theme.css`. If renaming a palette, update `ui.colors` in `index.ts`.
- Radius: `--ui-radius` in `theme.css`.
- Nuxt UI component default: `sharedUiConfig` or `enterpriseTableUi` in `index.ts`.

## Delivery Exceptions

Record here any exceptions to the rules above, along with rationale and scope.

| Date | Screen or Flow | Overridden Rule | New Rule | Scope | Rationale | Author |
| --- | --- | --- | --- | --- | --- | --- |
