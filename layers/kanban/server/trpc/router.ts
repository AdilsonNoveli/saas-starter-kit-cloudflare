import { TRPCError, type AnyRouter } from "@trpc/server";
import { asc, eq, or } from "drizzle-orm";
import { z } from "zod";
// `~~` is the Composition Root (packages/app). Layers import the shared tRPC
// primitives and server utils explicitly instead of relying on Nitro's
// cross-layer merge — the decision recorded at the top of
// _docs/REFATORE_ARCHITETURE.md ("Layers cuidam do frontend; o backend usa
// import explícito").
import { abilityProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { teamMemberships, teams } from "@nuxfire/functions/schema";
import { kanbanBoards, kanbanCards, kanbanColumns } from "../database/schema";
import {
  kanbanCreateBoard,
  kanbanCreateCard,
  kanbanDeleteCard,
  kanbanListBoards,
  kanbanMoveCard,
  kanbanUpdateBoard,
} from "../../shared/utils/abilities";
import { ensureKanbanPermissions } from "../utils/permissions";

/**
 * Resolves a team by slug or id and proves the caller is a member of it.
 * Membership is checked here, in the query, rather than trusted from the
 * ability: an ability only answers "may this user do X in team T", never
 * "does team T exist and is this user in it".
 */
async function requireTeamMembership(userId: string, teamIdentifier: string) {
  const team = await useDB().query.teams.findFirst({
    where: or(eq(teams.id, teamIdentifier), eq(teams.slug, teamIdentifier)),
    with: {
      memberships: {
        where: eq(teamMemberships.userId, userId),
      },
    },
  });

  if (!team || team.memberships.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this team",
    });
  }

  return team;
}

/** Same guard, entered from a board id instead of a team identifier. */
async function requireBoard(userId: string, boardId: string) {
  const board = await useDB().query.kanbanBoards.findFirst({
    where: eq(kanbanBoards.id, boardId),
  });

  if (!board) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
  }

  await requireTeamMembership(userId, board.teamId);
  return board;
}

/** Same guard again, entered from a column id. */
async function requireColumn(userId: string, columnId: string) {
  const column = await useDB().query.kanbanColumns.findFirst({
    where: eq(kanbanColumns.id, columnId),
  });

  if (!column) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Column not found" });
  }

  const board = await requireBoard(userId, column.boardId);
  return { column, board };
}

const kanbanRouter = router({
  listBoards: abilityProcedure
    .input(z.object({ teamIdentifier: z.string() }))
    .query(async ({ ctx: { authorize, user }, input }) => {
      await ensureKanbanPermissions();
      const team = await requireTeamMembership(user.id, input.teamIdentifier);
      await authorize(kanbanListBoards, team.id);

      return useDB().query.kanbanBoards.findMany({
        where: eq(kanbanBoards.teamId, team.id),
        orderBy: asc(kanbanBoards.createdAt),
      });
    }),

  getBoard: abilityProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx: { authorize, user }, input }) => {
      const board = await requireBoard(user.id, input.boardId);
      await authorize(kanbanListBoards, board.teamId);

      const full = await useDB().query.kanbanBoards.findFirst({
        where: eq(kanbanBoards.id, board.id),
        with: {
          columns: {
            orderBy: asc(kanbanColumns.position),
            with: {
              cards: {
                orderBy: asc(kanbanCards.position),
              },
            },
          },
        },
      });

      if (!full) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
      }

      return full;
    }),

  createBoard: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        name: z
          .string()
          .min(2, "Board name must be at least 2 characters")
          .max(80, "Board name must be max 80 characters"),
      }),
    )
    .mutation(async ({ ctx: { authorize, user }, input }) => {
      const team = await requireTeamMembership(user.id, input.teamIdentifier);
      await authorize(kanbanCreateBoard, team.id);

      const [board] = await useDB()
        .insert(kanbanBoards)
        .values({ teamId: team.id, name: input.name })
        .returning();

      return board;
    }),

  listColumns: abilityProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx: { authorize, user }, input }) => {
      const board = await requireBoard(user.id, input.boardId);
      await authorize(kanbanListBoards, board.teamId);

      return useDB().query.kanbanColumns.findMany({
        where: eq(kanbanColumns.boardId, board.id),
        orderBy: asc(kanbanColumns.position),
      });
    }),

  createColumn: abilityProcedure
    .input(
      z.object({
        boardId: z.string(),
        name: z
          .string()
          .min(1, "Column name is required")
          .max(80, "Column name must be max 80 characters"),
      }),
    )
    .mutation(async ({ ctx: { authorize, user }, input }) => {
      const board = await requireBoard(user.id, input.boardId);
      // Columns are structure, not content — gated by the board's own UPDATE.
      await authorize(kanbanUpdateBoard, board.teamId);

      const existing = await useDB().query.kanbanColumns.findMany({
        where: eq(kanbanColumns.boardId, board.id),
      });

      const [column] = await useDB()
        .insert(kanbanColumns)
        .values({
          boardId: board.id,
          name: input.name,
          position: existing.length,
        })
        .returning();

      return column;
    }),

  createCard: abilityProcedure
    .input(
      z.object({
        columnId: z.string(),
        title: z
          .string()
          .min(1, "Card title is required")
          .max(200, "Card title must be max 200 characters"),
        description: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx: { authorize, user }, input }) => {
      const { column, board } = await requireColumn(user.id, input.columnId);
      await authorize(kanbanCreateCard, board.teamId);

      const existing = await useDB().query.kanbanCards.findMany({
        where: eq(kanbanCards.columnId, column.id),
      });

      const [card] = await useDB()
        .insert(kanbanCards)
        .values({
          columnId: column.id,
          title: input.title,
          description: input.description ?? null,
          position: existing.length,
        })
        .returning();

      return card;
    }),

  moveCard: abilityProcedure
    .input(
      z.object({
        cardId: z.string(),
        toColumnId: z.string(),
        position: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx: { authorize, user }, input }) => {
      const card = await useDB().query.kanbanCards.findFirst({
        where: eq(kanbanCards.id, input.cardId),
      });
      if (!card) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
      }

      const source = await requireColumn(user.id, card.columnId);
      const target = await requireColumn(user.id, input.toColumnId);
      await authorize(kanbanMoveCard, target.board.teamId);

      // A card can only move within the board it already belongs to. Without
      // this, a caller who is a member of two teams could hand a card id from
      // board A and a column id from board B and silently relocate it across
      // tenants.
      if (source.board.id !== target.board.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot move a card to a different board",
        });
      }

      // Renumber the destination column from the order the user actually
      // dropped into, instead of writing `input.position` straight onto the
      // row: two cards would then share a position and their relative order
      // would be whatever Postgres felt like returning.
      const destination = await useDB().query.kanbanCards.findMany({
        where: eq(kanbanCards.columnId, target.column.id),
        orderBy: asc(kanbanCards.position),
      });

      const ordered = destination.filter((item) => item.id !== card.id);
      ordered.splice(Math.min(input.position, ordered.length), 0, card);

      await Promise.all([
        useDB()
          .update(kanbanCards)
          .set({ columnId: target.column.id })
          .where(eq(kanbanCards.id, card.id)),
        ...ordered.map((item, index) =>
          useDB()
            .update(kanbanCards)
            .set({ position: index })
            .where(eq(kanbanCards.id, item.id)),
        ),
      ]);

      return { id: card.id, columnId: target.column.id };
    }),

  deleteCard: abilityProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx: { authorize, user }, input }) => {
      const card = await useDB().query.kanbanCards.findFirst({
        where: eq(kanbanCards.id, input.cardId),
      });
      if (!card) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
      }

      const { board } = await requireColumn(user.id, card.columnId);
      await authorize(kanbanDeleteCard, board.teamId);

      await useDB().delete(kanbanCards).where(eq(kanbanCards.id, card.id));

      return { id: card.id };
    }),
});

/**
 * The layer's contribution to `appRouter`, keyed by the top-level name each
 * router is mounted under. Every layer exports exactly this shape — a map, not
 * a single `<name>Router` binding — because a layer may own more than one
 * top-level key (`layers/teams` owns both `teams` and `invites`, matching the
 * client-facing API that already exists). `scripts/compose-layers.ts` imports
 * this map by its fixed name and spreads it; it never has to guess an export
 * name from the manifest.
 *
 * `satisfies`, never a `: Record<string, AnyRouter>` annotation: the annotation
 * would widen every procedure away and `trpc.kanban.listBoards` would lose its
 * input/output types on the client (AppRouter is inferred straight through this
 * object). `satisfies` keeps the literal type and still makes `tsc` reject a
 * wrong shape here, in this file, instead of at Nuxt build time.
 */
export const routers = {
  kanban: kanbanRouter,
} satisfies Record<string, AnyRouter>;
