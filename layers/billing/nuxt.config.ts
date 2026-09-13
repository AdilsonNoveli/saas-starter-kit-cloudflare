export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/billing` import alias.
    name: "billing",
  },
  // Explicit ONLY because this layer has no `app/` directory yet (passo 2a is
  // backend-only). Nuxt 4's default srcDir is `app/`, but it silently falls
  // back to the layer ROOT when that directory doesn't exist — and the
  // generated `.nuxt/tsconfig.json` then globs `layers/billing/**/*` instead of
  // `layers/billing/app/**/*`, dragging the layer's whole `server/` tree (test
  // files included) into the CLIENT TypeScript program, where server code is
  // checked against browser globals. That is not hypothetical: it is how a
  // latent tuple-typing error in `server/utils/billing/event-ledger.test.ts`
  // first appeared the moment the file moved here, having typechecked clean
  // for its whole life inside packages/app. Compare the include lists for
  // `layers/teams` / `layers/kanban` (both `.../app/**/*`) to confirm.
  //
  // Keep this line until passo 2b creates `layers/billing/app/`; after that it
  // is redundant with the default and can go.
  srcDir: "app",
  // No `components` block: this step (Fase 3 passo 2a) is backend-only — the
  // billing frontend is still in packages/app and moves in passo 2b, which is
  // when `components: [{ path: "./components" }]` gets added (with NO `prefix`,
  // same reasoning as layers/teams and layers/kanban: `prefix` prepends with no
  // de-dup, so "Billing" on a directory of `Billing*.vue` files would render as
  // `<BillingBillingCard>`). `server/` is scanned by Nitro from directory
  // convention alone and needs nothing declared here.
});
