export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/admin` import alias.
    name: "admin",
  },
  components: [
    {
      // Relative to `srcDir` (`layers/admin/app`), NOT `rootDir` — the bug
      // fixed in f27adc9: `./app/components` resolves to the non-existent
      // `layers/admin/app/app/components` and every component of the layer
      // silently disappears.
      path: "./components",
      // No `prefix`, same reasoning as every other layer here: `prefix`
      // prepends unconditionally with NO de-duplication against a filename that
      // already starts with the same word.
      //
      // This directory KEEPS its `admin/`, `admin/companies/` and
      // `admin/queue/` nesting, like layers/billing and unlike
      // layers/teams/notifications. The DIRECTORY-derived prefix is what
      // produces two of the four live names — `admin/companies/SuspendModal.vue`
      // registers as `<AdminCompaniesSuspendModal>` and
      // `admin/queue/ReplayModal.vue` as `<AdminQueueReplayModal>` — so
      // flattening would rename them and break `pages/admin/companies/index.vue`
      // and `pages/admin/queue/index.vue`. (`admin/AdminDataTable.vue` is the
      // stutter case Nuxt de-duplicates on its own: it registers as
      // `<AdminDataTable>`, not `<AdminAdminDataTable>`, so its folder
      // contributes nothing to its name — it stays put only so all four admin
      // components live under one root.) Verified against
      // `apps/app/.nuxt/components.d.ts` before and after the move, not
      // assumed.
    },
  ],
  // No `srcDir: "app"` line: that workaround only exists for a layer that ships
  // with no `app/` directory at all (Nuxt 4 then falls back to the layer ROOT
  // and drags `server/**` into the CLIENT TypeScript program — see
  // nuxfire-layers.md). This layer shipped backend and frontend in one step, so
  // `layers/admin/app/` exists from the first commit and the default resolves
  // to it.
});
