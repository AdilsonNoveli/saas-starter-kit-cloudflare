---
name: fireskill-specialist-tailwind-css
description: Implement and review Tailwind CSS with tokens, variants, responsiveness, dark mode, container queries, and maintainable CSS. Use when tailwindcss or Tailwind utility classes exist in templates and the task touches styling, theming, or responsiveness; use to decide between utilities, `@apply`, and component extraction; verify the installed version, as configuration (`tailwind.config` vs `@theme` in CSS) and directives differ between generations — do not mix syntax without checking `package.json`.
---

# Tailwind CSS

## When to Use

- Trigger when the project uses `tailwindcss` and tasks involve utility classes,
  themes, variants, responsiveness, or dark mode.
- Trigger to decide whether repeated visual patterns should become tokens, local `@apply`,
  or extracted components.
- Do not trigger for selecting pre-built UI library components (`@nuxt/ui`, Reka UI);
  use `$fireskill-specialist-nuxt-ui` for that and return here for the underlying token
  and utility class system. In Nuxfire, tokens live in `packages/tokens/theme.css`
  (`@theme static`), not in `tailwind.config`.
- Combine with `$fireskill-specialist-web-accessibility` for contrast, zoom, and `prefers-reduced-motion`.

## Workflow

1. Confirm Tailwind version, bundler integration (Vite, PostCSS), and token declaration
   location (`tailwind.config.js` or `@theme` in CSS for v4).
2. Translate layouts and interface states into responsive constraints (breakpoints or `@container`)
   before writing class names.
3. Reuse existing semantic tokens (color, spacing, radius, typography) before using
   arbitrary values (`w-[137px]`).
4. Implement mobile-first: write base styles for small viewports, overriding only what
   changes at larger breakpoints.
5. Cover interactive states (`hover`, `focus-visible`, `disabled`, `aria-*`) and user
   preferences (`dark`, `motion-reduce`, `forced-colors`) in the initial component version.
6. Extract reusable components (not `@apply`) when patterns represent recognizable semantic
   units (a "Card", a "Badge"), rather than mere coincidental visual duplication.
7. Validate production build CSS: ensure no dynamically generated classes are purged
   due to lack of static detectability by the content scanner.

## Core Rules

- Maintain color, spacing, radius, and typography as semantic tokens (`bg-surface`, `text-muted`)
  whenever a design system exists — avoid arbitrary raw values that bypass tokens.
- Express state (hover, focus, selection, error) using native Tailwind variants
  (`hover:`, `aria-selected:`, `data-[state=open]:`), never hiding state in opaque string concatenations.
- Do not use `@apply` as a blanket substitute for components — it recreates traditional
  CSS within utility-first systems, sacrificing co-location.
- Ensure all dynamic classes are statically detectable by the content scanner — use
  complete literal class maps instead of dynamic interpolations (`text-${color}-500` will fail:
  the scanner does not evaluate JavaScript templates).
- Treat dark mode, `prefers-reduced-motion`, `prefers-contrast`, and high-contrast modes
  as baseline requirements, not post-launch add-ons.
