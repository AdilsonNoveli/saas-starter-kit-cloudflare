/**
 * Shared Nuxt UI `app.config.ts` fragment for every NuxFire Nuxt app.
 * Spread into each app's own `ui` block: `ui: { ...sharedUiConfig, ... }`.
 *
 * Literals that select a variant carry their own `as const`; the object as a
 * whole must NOT be `as const`, because that makes `compoundVariants` a
 * readonly array, which Nuxt UI's `AppConfigUI` (TVConfig) rejects.
 */
export const sharedUiConfig = {
  icons: {
    panelOpen: "i-lucide-chevron-right",
    panelClose: "i-lucide-chevron-left",
  },
  colors: {
    primary: "flame",
    secondary: "fire",
    success: "green",
    info: "blue",
    warning: "amber",
    error: "red",
    neutral: "night",
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
          link: "px-3 py-3 rounded-lg before:rounded-lg",
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
       * almost entirely by the label color, with no defined edge. pedped's
       * active item is a tinted background *plus* a matching border — a
       * bordered chip, not just a wash of color. `ring-inset` keeps the
       * border from adding to the element's box size.
       */
      {
        variant: "pill" as const,
        active: true,
        class: { link: "before:bg-primary/15 ring ring-inset ring-primary/25" },
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
  },
};

/**
 * `UTable`'s stock header (`text-sm text-highlighted font-semibold`) reads
 * as a heading, not a column label — the pedped reference's tables use a
 * small, muted, uppercase, letter-spaced header instead (the same
 * convention Linear/Stripe/Notion data tables use), which is what actually
 * separates "table" from "list of headings" at a glance.
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
  th: "py-3 border-b border-default text-xs uppercase tracking-wider text-muted font-semibold",
  td: "border-b border-default",
  separator: "h-0",
} as const;
