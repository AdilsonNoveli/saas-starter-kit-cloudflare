/**
 * Shared Nuxt UI `app.config.ts` fragment for every Nuxfire Nuxt app.
 * Spread into each app's own `ui` block: `ui: { ...sharedUiConfig, ... }`.
 *
 * Literals that select a variant carry their own `as const`; the object as a
 * whole must NOT be `as const`, because that makes `compoundVariants` a
 * readonly array, which Nuxt UI's `AppConfigUI` (TVConfig) rejects.
 */
/**
 * Font families of every Serelius app, declared once. Each app passes `nuxtFonts` to the `fonts` option
 * of `@nuxt/fonts`, so no `nuxt.config.ts` names a font. The `fontsource` provider fetches the files at
 * build time and `@nuxt/fonts` serves them from the app's own domain. Only the listed weights are emitted:
 * Atkinson Hyperlegible 400 and 700 for text and titles, IBM Plex Mono 400 for data; normal style and the
 * latin subsets only. `global: true` is required: the families are reached through the `--font-sans` and
 * `--font-mono` variables, which `@nuxt/fonts` does not follow, so without it no `@font-face` is emitted.
 */
export const fontFamilies = [
  { name: "Atkinson Hyperlegible", provider: "fontsource", weights: [400, 700] },
  { name: "IBM Plex Mono", provider: "fontsource", weights: [400] },
] as const;

export const nuxtFonts = {
  families: fontFamilies.map((family) => ({ name: family.name, provider: family.provider, weights: [...family.weights], styles: ["normal" as const], subsets: ["latin", "latin-ext"], global: true })),
};

/**
 * Brand files served from the root of every app (`packages/tokens/public`, exposed as a Nuxt layer).
 * `logo.light` is drawn for light backgrounds (ink) and `logo.dark` for dark ones (paper). The symbol has
 * an outline version (`icon-border.svg`) and a filled two-color version (`icon-color.svg`). Every fill in
 * these SVGs is a color defined in `theme.css`; the policy test checks it.
 */
export const brand = {
  symbol: { outline: "/icon-border.svg", color: "/icon-color.svg" },
  logo: { light: "/logo-clear.svg", dark: "/logo-dark.svg" },
  favicon: "/favicon.ico",
} as const;

/**
 * Colors for the e-mail templates in `packages/emails`. E-mail clients read neither CSS variables nor
 * `color-mix()`, so the values are already resolved; `design-tokens.test.ts` fails when one drifts from
 * `theme.css`, the same guard `themeColor` has. Names are roles, not hues: `ink` is text and headings,
 * `muted` is secondary text, `line` is rules and borders, `action` / `onAction` is the button.
 */
export const emailColors = {
  canvas: "#f2efe8",
  ink: "#111213",
  muted: "#43494c",
  line: "#c2bcab",
  action: "#fe1c02",
  onAction: "#ffffff",
} as const;

/** The Tailwind config of the e-mail templates: the colors above under their role names. */
/** E-mail corners follow the same cap as the apps (decision D11): nothing above 3px. */
export const emailRadius = "3px";

export const emailTailwind = { theme: { extend: { colors: { ...emailColors }, borderRadius: { DEFAULT: emailRadius, sm: "2px", md: emailRadius, lg: emailRadius, xl: emailRadius, "2xl": emailRadius, full: emailRadius } } } };

export const sharedUiConfig = {
  // Phosphor duotone for every icon Nuxt UI draws by itself (43 keys). Nuxt UI defaults them all to
  // Lucide, so without this block it would keep emitting Lucide next to the project's Phosphor icons.
  icons: {
    arrowDown: "i-ph-arrow-down-duotone",
    arrowLeft: "i-ph-arrow-left-duotone",
    arrowRight: "i-ph-arrow-right-duotone",
    arrowUp: "i-ph-arrow-up-duotone",
    caution: "i-ph-warning-circle-duotone",
    check: "i-ph-check-duotone",
    chevronDoubleLeft: "i-ph-caret-double-left-duotone",
    chevronDoubleRight: "i-ph-caret-double-right-duotone",
    chevronDown: "i-ph-caret-down-duotone",
    chevronLeft: "i-ph-caret-left-duotone",
    chevronRight: "i-ph-caret-right-duotone",
    chevronUp: "i-ph-caret-up-duotone",
    close: "i-ph-x-duotone",
    copy: "i-ph-copy-duotone",
    copyCheck: "i-ph-check-square-duotone",
    dark: "i-ph-moon-duotone",
    drag: "i-ph-dots-six-vertical-duotone",
    ellipsis: "i-ph-dots-three-duotone",
    error: "i-ph-x-circle-duotone",
    external: "i-ph-arrow-up-right-duotone",
    eye: "i-ph-eye-duotone",
    eyeOff: "i-ph-eye-slash-duotone",
    file: "i-ph-file-duotone",
    folder: "i-ph-folder-duotone",
    folderOpen: "i-ph-folder-open-duotone",
    hash: "i-ph-hash-duotone",
    info: "i-ph-info-duotone",
    light: "i-ph-sun-duotone",
    loading: "i-ph-circle-notch-duotone",
    menu: "i-ph-list-duotone",
    minus: "i-ph-minus-duotone",
    panelClose: "i-ph-caret-left-duotone",
    panelOpen: "i-ph-caret-right-duotone",
    plus: "i-ph-plus-duotone",
    reload: "i-ph-arrow-counter-clockwise-duotone",
    search: "i-ph-magnifying-glass-duotone",
    stop: "i-ph-square-duotone",
    star: "i-ph-star-duotone",
    success: "i-ph-check-circle-duotone",
    system: "i-ph-desktop-duotone",
    tip: "i-ph-lightbulb-duotone",
    upload: "i-ph-upload-duotone",
    warning: "i-ph-warning-duotone",
  },
  colors: {
    primary: "serelius",
    secondary: "ink",
    success: "green",
    info: "blue",
    warning: "amber",
    error: "red",
    neutral: "ink",
  },
  button: {
    defaultVariants: {
      color: "primary" as const,
      variant: "solid" as const,
    },
  },
  /**
   * UCard's stock `outline` variant sets `bg-default` — the same tone as the
   * page — so a card was measured at 1.00:1 against its own background, with
   * only a 1.117:1 ring to delimit it. The fix has to land on the *variant*,
   * not on `slots`: tailwind-variants applies variant classes after slot
   * classes, so a global `slots.root` is silently dropped (verified in the
   * running app — `bg-elevated` never reached the rendered class list).
   *
   * Cards sit on the raised surface, like the pedped reference, and stay
   * shadow-free — the ring does the work.
   */
  card: {
    variants: {
      variant: {
        outline: {
          root: "bg-elevated ring ring-default divide-y divide-default rounded-md",
        },
        subtle: {
          root: "bg-elevated ring ring-default divide-y divide-default rounded-md",
        },
        soft: {
          root: "bg-elevated divide-y divide-default rounded-md",
        },
      },
    },
  },

  /**
   * The stock `neutral` avatar fallback is `bg-elevated` — the same tone as
   * a card's own background (see the `card` override above), so a fallback
   * avatar sitting on any `bg-elevated` surface (a card, a raised row) reads
   * as no background at all. `bg-accented` is one step further up the same
   * surface ladder, so it stays visible against both the page and any card.
   */
  avatar: {
    // Nuxt UI draws the avatar `rounded-full`; Serelius corners are almost square (decision D11).
    slots: {
      root: "rounded-sm",
    },
    variants: {
      color: {
        neutral: {
          root: "bg-accented",
          fallback: "text-highlighted",
        },
      },
    },
  },

  /**
   * The dashboard/admin sidebar shell. The stock `header`, `body` and
   * `footer` slots all carry `px-4`, which is right for the expanded panel
   * but leaves only 23px of usable width on the 72px collapsed rail — far
   * narrower than the 44px icon chip below, so the chip overflowed its own
   * box and `mx-auto` had nothing left to center with (measured: chips
   * landed at x-center 46 against a rail center of 36). Dropping the gutter
   * while collapsed puts the logo, the team switcher and every icon —
   * including whatever a `#footer` slot places there — back on one axis.
   * `footer` was missing from this override for a while: any sidebar footer
   * content (e.g. the dashboard layout's own Settings entry) kept the stock
   * `px-4` while collapsed, so it rendered narrower and off-center from
   * every `body` row even though both used the exact same nav-item markup —
   * the container around it, not the item itself, was the mismatch.
   *
   * That same container is also why centering stayed broken after the
   * padding fix above: stock `footer` is `flex items-center` — a *row*,
   * whose cross-axis is vertical, so `items-center` only centers a child
   * top-to-bottom and does nothing for its horizontal position. `body` is
   * `flex flex-col` and never sets `items-*` at all, which is what actually
   * centers its icons: the default `items-stretch` on a column container
   * makes every row-item span the full rail width, and the nav-item's own
   * `mx-auto` (in the `navigationMenu` override below) centers the 44px
   * square inside that full-width strip. `flex-col items-stretch` here
   * copies that exact model onto `footer`, so any single-item footer content
   * centers itself the same way — through the shared item markup, not a
   * container-level `justify-center` some call site has to remember to add.
   *
   * `group-data-[collapsed=true]` (paired with `group` on the root) rather
   * than a plain conditional class: DashboardSidebar.vue puts `data-collapsed`
   * on the desktop aside only, so the mobile slideover — which reuses these
   * very same slot classes — keeps its normal padding.
   *
   * `body` also gets a bigger top gap than the stock `py-2` (kept only for
   * the bottom, so nothing at the end of the list moves) — the sidebar's own
   * header sits flush against the top navbar with zero visual breathing room
   * before the first nav row, while the main panel starts its own first
   * block `p-6` (24px) below that same navbar. `pt-6` puts the first icon on
   * the same footing as the page title next to it, in both layouts, whether
   * collapsed or not — a size this is worth spelling out on rather than
   * leaving as an unexplained `6`.
   */
  dashboardSidebar: {
    slots: {
      root: "group",
      header: "group-data-[collapsed=true]:px-0",
      body: "pt-6 pb-2 group-data-[collapsed=true]:px-0",
      footer: "flex-col items-stretch group-data-[collapsed=true]:px-0",
    },
  },

  /**
   * Vertical navigation (dashboard/admin sidebars). Stock rows measure 32px
   * tall with zero gap between them and a 20px icon, which is what makes the
   * sidebar read as amateurish next to pedped's 48px rows with 24px icons
   * inside a defined square tap target. These bring rows to 44px with a 4px
   * rhythm and pedped's exact icon size — the overrides have to sit on the
   * `orientation` variant for the same reason as the card override above.
   *
   * The radius is here, on the shared vertical link, so the collapsed chip
   * and the expanded row are the same shape. It has to land on `before:` too:
   * the row's tinted background is drawn by that pseudo-element (stock
   * `before:rounded-md`), while the active ring below sits on the link box
   * itself — which carried no radius at all when expanded, so the ring drew a
   * hard square around a rounded fill.
   */
  navigationMenu: {
    variants: {
      orientation: {
        vertical: {
          link: "px-3 py-3 rounded-xs before:rounded-xs",
          list: "space-y-3",
          linkLeadingIcon: "size-6",
        },
      },
    },
    compoundVariants: [
      /*
       * Collapsed rail: pedped renders each icon inside its own centered
       * w-12 h-12 square, not just centered inside a full-width row — a
       * defined button shape is what makes it read as a tap target instead
       * of a floating glyph. `gap-0` matters even with one visible child:
       * the base `link` class still reserves `gap-1.5` for the label span
       * (hidden, not removed, when collapsed), which otherwise nudges the
       * icon off-center inside the square.
       */
      {
        orientation: "vertical" as const,
        collapsed: true,
        class: { link: "justify-center px-0 gap-0 mx-auto size-11" },
      },
      /*
       * The stock active row is `before:bg-elevated`, which on a sidebar that
       * shares the page canvas measures 1.117:1 — the selection was carried
       * almost entirely by the label color, with no defined edge. In Serelius
       * the selected item is the lime marker with ink text (11.13:1 in both
       * themes): the lime is a highlighter, never ink. `ring-inset` keeps a
       * transparent ring from adding to the element's box size.
       */
      {
        variant: "pill" as const,
        active: true,
        class: { link: "before:bg-highlight text-on-highlight ring ring-inset ring-transparent" },
      },
    ],
  },

  /**
   * Tabs default to a solid `bg-primary` pill, which puts a full-width block
   * of brand color inside every card that uses them. The underline variant is
   * the treatment the pedped settings screens use (brand-colored label plus a
   * rule) and carries far less visual weight.
   */
  tabs: {
    defaultVariants: {
      variant: "link" as const,
    },
    // The underline indicator is `rounded-full` in the stock theme; it sits on the variant, not on a slot.
    variants: {
      variant: {
        link: {
          indicator: "rounded-xs",
        },
      },
    },
  },

  /*
   * The other Nuxt UI components the product uses that draw `rounded-full` by default (decision D11:
   * almost square corners). A new component that does the same needs a line here; the policy test
   * only sees what the code writes, not what a library draws.
   */
  switch: {
    slots: {
      base: "rounded-sm",
      thumb: "rounded-xs",
    },
  },
  chip: {
    slots: {
      base: "rounded-xs",
    },
  },
  radioGroup: {
    slots: {
      base: "rounded-sm",
      indicator: "after:rounded-xs",
    },
  },
  // The onboarding step indicator (SPEC-0010, DEC-007): the stock step button and the line between
  // steps are `rounded-full`. Both sit on slots, with no variant redefining the radius.
  stepper: {
    slots: {
      trigger: "rounded-sm",
      separator: "rounded-xs",
    },
  },
};

/**
 * `UTable`'s stock header (`text-sm text-highlighted font-semibold`) reads as a heading, not a column
 * label. Serelius separates "table" from "list of headings" by weight and color instead of caps: the
 * header is `text-sm` in the muted tone, still semibold, with the same 20px sides and 16px rows of the
 * "aerada" density (`--sr-density-pad-x` / `--sr-density-pad-y`), so a data row is 56px tall.
 *
 * The header is a flat sticky-style bar in pedped — `bg-surface-raised
 * border-b border-border`, full width, no rounding. An earlier version of
 * this override added `first:rounded-l-lg last:rounded-r-lg` plus borders on
 * all four sides of the end cells, which instead drew the header as a
 * rounded, segmented pill floating above the rows — a different visual
 * language than the reference (and the reason a from-scratch comparison
 * against pedped's `customers/index.vue` was needed rather than trusting
 * this file's own prior reasoning).
 *
 * `tr` carries the hover treatment unconditionally: the stock theme only
 * turns it on via `data-[selectable=true]` (set when a `UTable` gets an
 * `onSelect`/`onHover`/`onContextmenu` prop), so a read-only table like
 * Plans or Audit Log rendered with zero row feedback. pedped's rows always
 * hover, whether or not the row itself navigates anywhere on click.
 *
 * A `UTable` instance has no `variant` prop gating these slots the way
 * `card`'s does, but this is exported as an explicit `:ui` object — not
 * folded into `sharedUiConfig.table` — so every call site's override is
 * guaranteed to apply (an instance `:ui` prop always wins) rather than
 * depending on a global slot merge order that was never verified for this
 * component. One definition, three call sites today (AdminDataTable,
 * TeamDashboardActivity, the admin overview's Recent Companies table).
 */
export const enterpriseTableUi = {
  base: "border-separate border-spacing-0",
  thead: "[&>tr]:bg-elevated [&>tr]:after:content-none",
  tbody: "[&>tr]:last:[&>td]:border-b-0",
  tr: "hover:bg-elevated/50 transition-colors",
  th: "px-5 py-3 border-b border-default text-sm text-muted font-semibold",
  td: "px-5 py-4 border-b border-default",
  separator: "h-0",
} as const;

/**
 * `<meta name="theme-color">` tints the browser chrome and, unlike everything else
 * here, cannot use a CSS variable. Each value must equal the `--ui-bg` of its mode in
 * theme.css; `theme-color.test.ts` fails when they drift.
 */
export const themeColor = { light: "#f2efe8", dark: "#111213" } as const;
