# Product Design System

`packages/tokens` (`@nuxfire/tokens`) is the single source of truth for visual customization. This file defines where it lives and the rules for using it; concrete values (palettes, radius, fonts, component overrides) reside in code, never here. The identity uses a warm beige canvas (`#F2EFE8` in the light theme) and dark graphite (`#111213` in the dark theme), Fogo Vivo (`#FE1C02`) as the primary brand/action color, Brasa (`#FF8A00` / `#FFC266`) as highlighter/marca-texto, no glass, "clear" in the style of Notion (decisions D7 and D8, ADR-0007 and ADR-0008, patch `_reference/tokens.md`).

## Single Source of Truth

- `packages/tokens/theme.css`: the fonts (Atkinson Hyperlegible for text and titles, IBM Plex Mono for data), the palettes: Fogo Vivo (`--color-fire-500` #FE1C02 principal, `--color-fire-300` #FF4A2E, `--color-fire-700` #C91600), Brasa (`--color-ember-200` #FFC266, `--color-ember-400` #FF8A00), `serelius` (aliases `--color-serelius-400` to `--color-fire-500`), `ink` (neutral scale derived from `#1C2B33`), `graphite` (dark mode scale derived from `#111213`), and `sand` (the warm surface scale of the light theme), the highlight pair (`--color-highlight` with `--color-on-highlight: #ffffff`), the surface, text and border mapping for light and dark modes (`--ui-*`, `.dark` block), and the Serelius scale under the `--sr-` prefix: radius (0, 2px and 3px: no corner above 3px), density (56px list rows, 24px gaps, 20x16 padding, 36px controls), motion (four durations and four curves, zero under `prefers-reduced-motion`) and the focus ring (`--color-fire-500` in light, `--color-fire-300` in dark).
- `packages/tokens/index.ts`: `fontFamilies` and `nuxtFonts` (the `fonts` option each app passes to `@nuxt/fonts`), `brand` (the brand file names), `emailColors` and `emailTailwind` (already-resolved colors for the e-mail templates, checked against `theme.css` by a test), `sharedUiConfig` (the `ui` block of each `app.config.ts`: the 43 Phosphor icons Nuxt UI draws by itself, `colors`, and the component adjustments) and `enterpriseTableUi` (the `:ui` prop of `UTable`). The rationale for each override is documented in the file's comments.
- `packages/tokens/index.ts` also exports `themeColor` (the color for `<meta name="theme-color">`, which does not accept CSS variables); `theme-color.test.ts` fails if it diverges from `--ui-bg` in `theme.css`.
- `packages/tokens/public/`: the brand files (`icon-border.svg`, `icon-color.svg`, `logo-clear.svg` for light backgrounds, `logo-dark.svg` for dark ones, `nuxfire.svg`, `nuxfire-white.svg`, `favicon.ico`) and the touch and PWA icons. `packages/tokens/nuxt.config.ts` makes the package a Nuxt layer for this folder only, so every app serves the files from its own root and none keeps a copy.
- `apps/app`, `apps/web`, and `apps/login` import, in this order, `tailwindcss`, `@nuxt/ui`, and `@nuxfire/tokens/theme.css` in their `main.css`. `theme.css` comes last to override Nuxt UI defaults.
- `theme.css` declares `@source "./index.ts";`: without this line, Tailwind does not scan the package (which arrives via symlink), and a class that only exists in `index.ts` would be emitted to the DOM without matching CSS rules.

## Rules

1. All visual customization (color, typography, radius, density, motion, icons, brand, dark mode, component defaults) lives exclusively in `packages/tokens`. An app's `main.css` never redeclares tokens; it is reserved for what is genuinely local. `scripts/design-tokens-policy.test.ts` enforces it across `apps/*`, `layers/*` and `packages/*`.
2. Across all apps and `layers/`, use only semantic classes and colors from `@nuxt/ui` (`primary`, `success`, `text-default`, `bg-elevated`, `border-default`...); never raw palette colors (`text-red-500`, `bg-white`) or hex / `rgb` in code: derive from a token (`var(--ui-*)`, `color-mix`). The only allowed deviations are the rows of the Delivery Exceptions table below.
3. Reuse existing tokens before creating local values.
4. Every `UTable` receives `enterpriseTableUi` via `:ui`.
5. Do not communicate error or success by color alone; maintain visible keyboard focus; respect `prefers-reduced-motion`.
6. Icons are Phosphor duotone only (`i-ph-<name>-duotone`, sizes 16, 20, 24, 32). No other icon set, no emoji as decoration.
7. No glass (`backdrop-blur`), no sparkle icon for AI. Fogo Vivo (`#FE1C02`) is the action/primary brand color (with white text `#ffffff`). Brasa (`#FF8A00` / `#FFC266`) is a highlighter (`--sr-mark`), with `#111213` text on top.
8. Corners are almost square (decision D11, ADR-0011): no corner above 3px. `theme.css` caps every `--radius-*` of Tailwind and Nuxt UI at 3px, so `rounded-md`, `rounded-lg` and the like are fine; `rounded-full`, `rounded-xl` and larger, an arbitrary radius over 3px and a `border-radius` over 3px are violations (use `rounded-sm` or `rounded-md`, which the theme caps at 2px and 3px). A Nuxt UI component that draws `rounded-full` by default needs a line in `sharedUiConfig`. `UStepper` (the onboarding step indicator) draws `rounded-full` by default, so `sharedUiConfig.stepper` in `packages/tokens/index.ts` overrides its `trigger` and `separator` slots.
9. Voice: native Brazilian Portuguese, "você", short sentences, no exclamation mark and no celebration emoji; the interface says "pessoas", "conexões", "círculos" and "conversas", never "contatos", "leads", "registros" or "nós". `bun run check:copy` enforces it in `apps/app`, `apps/login` and `layers/*`.

## Adjustments of the starter kit (verdicts, D-F2-7)

Where the Serelius scale and an adjustment of the kit disagree, the scale wins in visual values; adjustments that fix behavior stay.

| Block | Verdict | Why |
| --- | --- | --- |
| `button` | MANTIDO | Only default variants; no visual value. |
| `card` | SUBSTITUÍDO (radius) and MANTIDO (surface) | The radius is now `--sr-radius-md`; `bg-elevated` with a ring stays because the stock card measured 1.00:1 against its page. |
| `avatar` | MANTIDO (surface) and SUBSTITUÍDO (radius) | The fallback sits one step up the surface ladder so it stays visible on any raised surface; the stock `rounded-full` becomes `--sr-radius-sm`. |
| `dashboardSidebar` | MANTIDO | Corrects the centering of the collapsed menu. |
| `navigationMenu` | SUBSTITUÍDO (radius and active item) and MANTIDO (sizes) | Radius is `--sr-radius-xs`; the selected item is the lime highlighter with ink text; tap targets and 24px icons stay. |
| `tabs` | MANTIDO | The underline variant carries far less visual weight. |
| `switch`, `chip`, `radioGroup` | SUBSTITUÍDO | The stock `rounded-full` of base, thumb and indicator becomes `--sr-radius-sm` or `--sr-radius-xs`. |
| `enterpriseTableUi` | SUBSTITUÍDO | Header is `text-sm`, muted and semibold with no uppercase; cells use 20px sides and 16px rows (56px data rows). |

## Visual Review

Before the task's `EVIDENCE` item, verify borders, spacing, margins, padding, and typography against the tokens. Every screen is reviewed in the light theme, the dark theme and a phone width, and recorded in the review board of the spec (`scripts/design-visual-review.test.ts` fails when a screen has no verified row). Reused or created components are recorded in `.fireskills/INTERFACE.md`.

## How to Rebrand

- Colors: the `serelius` and `ink` palettes and the `--ui-*` mapping in `theme.css`. If renaming a palette, update `ui.colors` in `index.ts`.
- Fonts: `fontFamilies` in `index.ts` (the apps read it; no `nuxt.config.ts` names a font).
- Radius, density, motion and focus: the `--sr-*` variables in `theme.css`; Nuxt UI's own scale follows `--ui-radius`.
- Nuxt UI component default: `sharedUiConfig` or `enterpriseTableUi` in `index.ts`.
- Brand: replace the files in `packages/tokens/public/`, then run `bun scripts/generate-brand-icons.ts` to derive the PWA and touch icons from the symbol.

## Delivery Exceptions

Record here any exceptions to the rules above, along with rationale and scope.

| Date | Screen or Flow | Overridden Rule | New Rule | Scope | Rationale | Author |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-30 | MFA setup, QR code | Rule 2: no hex or rgb in code (kinds: hex) | The QR code is drawn true black on true white in both themes | `layers/account/app/components/account/MfaSetupModal.vue` | A QR code is read by a camera, not a person; a low-contrast or inverted code is one many scanners refuse (decision D-F2-3, first entry of the table). | Owner, via SPEC-0008 |
