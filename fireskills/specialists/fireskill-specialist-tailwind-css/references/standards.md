# Tailwind CSS Standards and References

## System Layers

| Layer | Role | Example |
| --- | --- | --- |
| Tokens | Shared values and semantic roles (color, spacing, radius, typography) | `--color-surface`, `spacing` scale |
| Primitives | Reusable layout, typography, and foundational behavior | `flex`, `grid`, `text-sm`, `rounded-md` |
| Components | Recognizable semantic compositions in the framework | `Card`, `Badge`, `Button` |
| Variants | State and context declared on primitives or components | `hover:`, `data-[state=open]:`, `aria-selected:` |

Build top-down when consuming (use components before raw utilities) and bottom-up
when deciding to extract (repeated utilities become a component only when they
represent a semantic unit, not merely visual coincidence).

## Configuration Across Generations

- Tailwind v3 and earlier: tokens declared in `tailwind.config.js` (`theme.extend`),
  plugins registered in config, `@tailwind base/components/utilities` directives in input CSS.
- Tailwind v4: tokens declared directly in CSS via `@theme`, single `@import "tailwindcss"`,
  automatic content detection by default. Never mix configuration styles between
  generations without verifying installed version in `package.json` or lockfiles.
- Check official upgrade and compatibility guides for default behavior changes (colors, `ring`, `border`)
  when touching major version upgrades.

## Class Detection

- Tailwind's content scanner reads source files as plain text and looks for class-like strings;
  it does not evaluate JavaScript.
- Classes constructed by partial string interpolation (`` `bg-${color}-500` ``, `` `p-${size}` ``)
  are never detected. Use complete literal maps (`{ red: "bg-red-500", blue: "bg-blue-500" }`)
  so complete class names exist in source text.
- Classes originating in external packages or CMS HTML generated outside scanned files
  must be explicitly registered in `content`/`source` configuration.

## Responsiveness and Container Queries

- Mobile-first: unprefixed classes represent base styles; `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
  override styles from that breakpoint upward.
- `@container` (with `@container` marked on an ancestor and `@sm:`/`@md:` container utility queries)
  allows components to adapt to their container width (e.g., sidebar, split pane) rather than the viewport.
- Zoom and reflow are core accessibility requirements treated as responsiveness: layouts must
  not require horizontal scrolling at 400% zoom (equivalent to 320px CSS width) for primarily vertical content.

## State and Preference Variants

- Interaction states: `hover:`, `focus:`, `focus-visible:` (prefer `focus-visible` over plain `focus`
  to avoid focus rings on mouse clicks), `active:`, `disabled:`.
- Data and ARIA states: `aria-selected:`, `aria-expanded:`, `data-[state=open]:` when components
  expose state attributes (common in Reka UI and `@nuxt/ui`).
- User preferences: `dark:` (theming), `motion-reduce:` / `motion-safe:` (`prefers-reduced-motion`),
  `contrast-more:` (`prefers-contrast`), `forced-colors:` (Windows High Contrast Mode) — treat as core design requirements.

## `@apply` — When Acceptable

- Acceptable for a small handful of utilities repeated on a single low-level selector
  (e.g., local resets, third-party classes unable to receive Tailwind utilities directly).
- Unacceptable as a general component abstraction strategy — Vue SFCs with inline utilities
  provide better co-location, prop-driven variants, and avoid recreating parallel stylesheets.

## Verification Commands

- In framework projects (Nuxt, Vite), framework build commands (`bun run build`, `npx nuxi build`)
  invoke the full CSS pipeline — running production builds is the authoritative verification.
- Verify active version with `npx tailwindcss --version`.

## Authoritative Documentation

- Documentation: https://tailwindcss.com/docs
- Theme Variables (v4): https://tailwindcss.com/docs/theme
- Responsive Design: https://tailwindcss.com/docs/responsive-design
- Dark Mode: https://tailwindcss.com/docs/dark-mode
- Hover, Focus, and Other States: https://tailwindcss.com/docs/hover-focus-and-other-states
- Container Queries: https://tailwindcss.com/docs/responsive-design#container-queries
- Detecting Classes in Source Files: https://tailwindcss.com/docs/detecting-classes-in-source-files
- Adding Custom Styles (`@apply`): https://tailwindcss.com/docs/adding-custom-styles
- Compatibility & Upgrade Guide: https://tailwindcss.com/docs/compatibility
