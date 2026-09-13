import { KANBAN_PERMISSIONS } from "./permissions";

/**
 * Every exported ability here is prefixed with the layer name — `kanbanX`,
 * never a bare `listBoards`/`create`. `nuxt-authorization` does no scanning of
 * its own: it relies on Nuxt's auto-import of `shared/utils/`, which crosses
 * layer boundaries into one global namespace. Two layers exporting a
 * `createBoard` would shadow each other silently, with no build error. This is
 * a mandatory convention, not a style preference (see
 * _docs/REFATORE_ARCHITETURE.md §5).
 */

interface User {
  id: string;
  teams?: string[];
  permissions?: Record<string, string[]>;
}

/**
 * Local copy of the same membership + permission check
 * `packages/app/shared/utils/abilities.ts` uses. Deliberately duplicated
 * rather than imported: that file is the `teams` domain, which is extracted
 * into its own layer in Fase 3 — taking a hard dependency on its current
 * location now would just have to be undone then.
 */
const hasTeamPermission = (
  user: User | null,
  teamId: string,
  permission: string,
): boolean => {
  return (
    !!user?.teams?.includes(teamId) &&
    (user?.permissions?.[teamId] || []).includes(permission)
  );
};

export const kanbanListBoards = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.BOARDS.VIEW),
);

export const kanbanCreateBoard = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.BOARDS.CREATE),
);

/**
 * Columns have no permissions of their own: adding or renaming one is a
 * structural change to the board, so it is gated by the board's own UPDATE.
 */
export const kanbanUpdateBoard = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.BOARDS.UPDATE),
);

export const kanbanDeleteBoard = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.BOARDS.DELETE),
);

export const kanbanCreateCard = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.CARDS.CREATE),
);

export const kanbanUpdateCard = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.CARDS.UPDATE),
);

export const kanbanMoveCard = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.CARDS.MOVE),
);

export const kanbanDeleteCard = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, KANBAN_PERMISSIONS.CARDS.DELETE),
);
