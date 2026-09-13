import { defineLayerManifest } from "@nuxfire/layer-types";

export default defineLayerManifest({
  name: "kanban",
  displayName: "Kanban Board",
  description: "Gestão visual de tarefas e projetos com drag-and-drop",
  version: "1.0.0",

  // Documentational only — nothing validates `extends` order automatically
  // (see _docs/REFATORE_ARCHITETURE.md, Fase 1.4).
  requires: ["teams"],

  navigation: {
    sidebar: [
      {
        label: "Kanban",
        icon: "i-lucide-kanban",
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
