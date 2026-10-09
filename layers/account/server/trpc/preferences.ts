import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { userPreferences } from "@nuxfire/functions/schema";
import {
  getPreferences,
  updatePreferences,
  type PreferencesRepo,
} from "../services/preferences";

// Thin (DEC-018): builds the repository over `useDB()` and hands the logic to
// services/preferences.ts. Errors leave as the stable code (DEC-015).

function preferencesRepo(): PreferencesRepo {
  return {
    async find(userId) {
      const [row] = await useDB()
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));
      return row ?? null;
    },
    async upsert(row) {
      const { locale, timeZone, theme, dateFormat, nameOrder, updatedAt } = row;
      const [saved] = await useDB()
        .insert(userPreferences)
        .values(row)
        // `onboardedAt` and `createdAt` are never part of an edit.
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { locale, timeZone, theme, dateFormat, nameOrder, updatedAt },
        })
        .returning();
      if (!saved) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "generic" });
      }
      return saved;
    },
  };
}

export default router({
  get: protectedProcedure.query(({ ctx: { user } }) =>
    getPreferences({ repo: preferencesRepo() }, user.id),
  ),
  update: protectedProcedure
    // Plain strings: the service validates them and answers with the code.
    .input(
      z.object({
        locale: z.string().optional(),
        timeZone: z.string().optional(),
        theme: z.string().optional(),
        dateFormat: z.string().optional(),
        nameOrder: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx: { user } }) => {
      const result = await updatePreferences(
        { repo: preferencesRepo(), now: () => new Date() },
        user.id,
        input,
      );
      if (!result) {
        // No row yet: the person has not finished the onboarding.
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "generic" });
      }
      if ("error" in result) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      }
      return result;
    }),
});
