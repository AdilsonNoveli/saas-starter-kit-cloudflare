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
          root: "bg-elevated ring ring-default divide-y divide-default",
        },
        subtle: {
          root: "bg-elevated ring ring-default divide-y divide-default",
        },
        soft: {
          root: "bg-elevated divide-y divide-default",
        },
      },
    },
  },

  /**
   * Vertical navigation (dashboard/admin sidebars). Stock rows measure 32px
   * tall with zero gap between them, which is what makes the sidebar read as
   * cramped next to pedped's 48px rows. These bring rows to 44px with a 4px
   * rhythm — the same override has to sit on the `orientation` variant for
   * the same reason as the card above.
   */
  navigationMenu: {
    variants: {
      orientation: {
        vertical: {
          link: "px-3 py-3",
          list: "space-y-1",
        },
      },
    },
    compoundVariants: [
      {
        orientation: "vertical" as const,
        collapsed: true,
        class: { link: "justify-center px-0" },
      },
      /*
       * The stock active row is `before:bg-elevated`, which on a sidebar that
       * shares the page canvas measures 1.117:1 — the selection is carried
       * almost entirely by the label color. A brand tint reads as a change of
       * hue rather than of lightness, so it survives on any surface. Same
       * treatment the pedped sidebar uses for its active item.
       */
      {
        variant: "pill" as const,
        active: true,
        class: { link: "before:bg-primary/15" },
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
