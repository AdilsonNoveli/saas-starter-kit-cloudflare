/**
 * Thin wrapper over this layer's slice of the tRPC client, so pages and
 * components never repeat the team-identifier plumbing.
 *
 * `useTrpcClient` and `useCurrentTeam` are auto-imported from the Composition
 * Root (packages/app): Nuxt's auto-import registry is shared across every
 * layer in the build, which is exactly the property this pilot layer exercises.
 */
export function useKanban() {
  const client = useTrpcClient();
  const currentTeam = useCurrentTeam();
  const teamIdentifier = computed(() => currentTeam.value?.slug ?? "");

  return {
    teamIdentifier,

    // Reads. Getters rather than plain values so trpc-nuxt re-runs the query
    // when the active team (or the route's board) changes — same pattern as
    // admin/plans/index.vue.
    useBoardList: () =>
      client.kanban.listBoards.useQuery(() => ({
        teamIdentifier: teamIdentifier.value,
      })),

    useBoard: (boardId: () => string) =>
      client.kanban.getBoard.useQuery(() => ({ boardId: boardId() })),

    // Writes.
    createBoard: (name: string) =>
      client.kanban.createBoard.mutate({
        teamIdentifier: teamIdentifier.value,
        name,
      }),

    createColumn: (boardId: string, name: string) =>
      client.kanban.createColumn.mutate({ boardId, name }),

    createCard: (columnId: string, title: string) =>
      client.kanban.createCard.mutate({ columnId, title }),

    moveCard: (payload: {
      cardId: string;
      toColumnId: string;
      position: number;
    }) => client.kanban.moveCard.mutate(payload),

    deleteCard: (cardId: string) => client.kanban.deleteCard.mutate({ cardId }),
  };
}
