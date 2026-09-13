export default defineNuxtConfig({
  $meta: {
    // Gives the layer its official `#layers/kanban` import alias.
    name: "kanban",
  },
  components: [
    {
      path: "./app/components",
      // Every component of this layer is globally registered as <Kanban*>,
      // which is what keeps two layers from colliding on a generic name
      // like <Board> or <Card>.
      prefix: "Kanban",
    },
  ],
});
