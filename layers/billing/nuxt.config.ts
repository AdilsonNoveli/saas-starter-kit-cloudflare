export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/billing` import alias.
    name: "billing",
  },
  components: [
    {
      // Relative to `srcDir` (`layers/billing/app`), NOT `rootDir` — the bug
      // fixed in f27adc9: `./app/components` resolves to the non-existent
      // `layers/billing/app/app/components` and every component of the layer
      // silently disappears.
      path: "./components",
      // No `prefix`, same reasoning as layers/teams and layers/kanban:
      // `prefix` prepends unconditionally with no de-dup against a filename
      // that already starts with the same word, so "Billing" over a directory
      // of `Billing*.vue` files renders `<BillingBillingPortalActions>`.
      //
      // Unlike teams (which flattened `components/team/` + `components/members/`
      // into one directory because the nesting stuttered the names), this
      // layer KEEPS its subdirectories: Nuxt's directory-nesting auto-prefix is
      // exactly what produces the live names here. `admin/plans/CreateEditModal.vue`
      // is registered as `<AdminPlansCreateEditModal>`, which is how
      // `pages/admin/plans/index.vue` calls it — flattening the tree would
      // rename it. `billing/` and `pricing/` are redundant for naming (the
      // filenames already carry the name) but are left as-is: restructuring
      // them buys nothing and this is a relocation, not a redesign.
    },
  ],
  // `srcDir: "app"` used to be here, explicit, only because this layer had no
  // `app/` directory while it was backend-only and Nuxt 4 silently falls back
  // to the layer ROOT in that case (dragging `server/**` into the CLIENT
  // TypeScript program — see _docs/AGENTS.md). `layers/billing/app/` exists as
  // of Fase 3 passo 2b, so the default now resolves to it and the line is gone.
});
