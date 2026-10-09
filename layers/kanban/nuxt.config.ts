export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/kanban` import alias.
    name: "kanban",
  },
  components: [
    {
      path: "./components",
      // No `prefix` option: every file here is already named `Kanban*.vue`
      // (the naming convention), and `prefix` prepends unconditionally, with
      // no de-dup against a filename that already starts with the same word
      // — verified by temporarily setting this to "Zebra" and getting
      // `<ZebraKanbanBoard>`, not `<ZebraBoard>`. Re-adding "Kanban" here
      // would render as `<KanbanKanbanBoard>`. `path` is kept explicit
      // (matches Nuxt's own default for this directory) so this block stays
      // as the one place a future layer author checks for the convention.
    },
  ],
});
