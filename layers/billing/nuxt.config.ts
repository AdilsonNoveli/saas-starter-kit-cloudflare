export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/billing` import alias.
    name: "billing",
  },
  // No `components` block: this step (Fase 3 passo 2a) is backend-only — the
  // billing frontend is still in packages/app and moves in passo 2b, which is
  // when `components: [{ path: "./components" }]` gets added (with NO `prefix`,
  // same reasoning as layers/teams and layers/kanban: `prefix` prepends with no
  // de-dup, so "Billing" on a directory of `Billing*.vue` files would render as
  // `<BillingBillingCard>`). `server/` is scanned by Nitro from directory
  // convention alone and needs nothing declared here.
});
