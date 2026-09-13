export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/teams` import alias.
    name: "teams",
  },
  // No `components` entry yet: this layer ships no Vue components until the
  // frontend half of the extraction (Fase 3, passo 1b) moves them out of
  // packages/app/app/. The prefix config lands together with the components it
  // has to prefix — declaring an empty component dir now would only add a
  // directory Nuxt scans on every build for nothing.
});
