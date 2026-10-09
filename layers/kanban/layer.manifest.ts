import { defineLayerManifest } from "@nuxfire/manifest";

export default defineLayerManifest({
  name: "kanban",
  displayName: "Kanban Board",
  description: "Visual task and project management with drag-and-drop",
  version: "1.0.0",

  // Documentational only — nothing validates `extends` order automatically
  // (see nuxfire-layers.md, Fase 1.4).
  requires: ["teams"],

  navigation: {
    sidebar: [
      {
        label: "Kanban",
        icon: "i-ph-kanban-duotone",
        to: "/{team}/kanban",
        order: 50,
      },
    ],
  },

  permissions: [
    "kanban:boards:view",
    "kanban:boards:create",
    "kanban:boards:update",
    "kanban:boards:delete",
    "kanban:cards:create",
    "kanban:cards:update",
    "kanban:cards:move",
    "kanban:cards:delete",
  ],
});
