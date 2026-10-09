// Permission strings this layer adds to the tenant RBAC catalogue. Every value
// here appears verbatim in `layer.manifest.ts`'s `permissions` array — the
// manifest is the declaration, this object is what code actually checks
// against. Naming follows the repo-wide `layer:resource:action` convention.
export const KANBAN_PERMISSIONS = {
  BOARDS: {
    VIEW: "kanban:boards:view",
    CREATE: "kanban:boards:create",
    UPDATE: "kanban:boards:update",
    DELETE: "kanban:boards:delete",
  },
  CARDS: {
    CREATE: "kanban:cards:create",
    UPDATE: "kanban:cards:update",
    MOVE: "kanban:cards:move",
    DELETE: "kanban:cards:delete",
  },
};
