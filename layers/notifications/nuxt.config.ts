export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/notifications` import alias.
    name: "notifications",
  },
  components: [
    {
      // Relative to `srcDir` (`layers/notifications/app`), NOT `rootDir` — the
      // bug fixed in f27adc9: `./app/components` resolves to the non-existent
      // `layers/notifications/app/app/components` and every component of the
      // layer silently disappears.
      path: "./components",
      // No `prefix`, same reasoning as every other layer here: `prefix`
      // prepends unconditionally with NO de-duplication against a filename that
      // already starts with the same word, so `prefix: "Notifications"` over
      // `NotificationsSlideover.vue` would render `<NotificationsNotificationsSlideover>`.
      // The filename already carries the namespace.
      //
      // This directory is FLAT, unlike layers/billing's. The file used to live
      // at `apps/app/app/components/notifications/NotificationsSlideover.vue`
      // and registered as `<NotificationsSlideover>` — Nuxt's DIRECTORY-based
      // auto-prefix (unlike the `prefix` option above) does de-duplicate a
      // segment the filename already repeats, so the `notifications/` folder
      // contributed nothing to the name. Flattening therefore keeps the
      // registered name byte-identical, which is the only thing that matters
      // here: `layouts/dashboard.vue` calls `<NotificationsSlideover />` by name
      // from the Composition Root and must not be edited. Contrast
      // layers/billing, which KEEPS `admin/plans/` because there the nesting is
      // what produces `<AdminPlansCreateEditModal>`. Verified by diffing
      // `apps/app/.nuxt/components.d.ts` before and after the move, not
      // assumed.
    },
  ],
  // No `srcDir: "app"` line: that workaround only exists for a layer that ships
  // with no `app/` directory at all (Nuxt 4 then falls back to the layer ROOT
  // and drags `server/**` into the CLIENT TypeScript program — see
  // nuxfire-layers.md). This layer shipped backend and frontend in one step, so
  // `layers/notifications/app/` exists from the first commit and the default
  // resolves to it.
});
