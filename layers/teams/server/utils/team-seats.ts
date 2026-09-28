import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { teamInvites, teamMemberships } from "@nuxfire/functions/schema";

// `useDB()` below has no import on purpose, exactly as it had in
// apps/app/server/utils/: Nitro's auto-import scan covers EVERY active
// layer's `server/` directory, not just the Composition Root's
// (`scanDirs: layerDirs.map((dirs) => dirs.server)` in
// @nuxt/nitro-server). So this file is a byte-for-byte relocation — which is
// the point: `team-seats.test.ts` next to it stubs `useDB` on `globalThis`,
// and that net only proves the move changed nothing if the moved code is
// genuinely unchanged.
//
// The layer's tRPC router does NOT do this — it imports `~~/server/utils/db`
// explicitly, like layers/kanban's does, because a tRPC router has to be
// importable as a plain module by scripts/compose-layers.ts's generated file,
// outside any Nitro auto-import scope. See README.md.

/** Members currently occupying a seat on the team. */
export async function countTeamMembers(teamId: string): Promise<number> {
  const [row] = await useDB()
    .select({ value: count() })
    .from(teamMemberships)
    .where(eq(teamMemberships.teamId, teamId));

  return row?.value ?? 0;
}

/**
 * Invites that can still turn into a member, and therefore already hold a
 * seat. An invite stops holding one the moment it can no longer be accepted —
 * which is why the expiry is part of this query and not just the status.
 *
 * `expiresAt` is nullable, and a null there means "never expires", so it has
 * to count as live rather than be silently dropped by the comparison.
 */
export async function countPendingInvites(teamId: string): Promise<number> {
  const [row] = await useDB()
    .select({ value: count() })
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.teamId, teamId),
        eq(teamInvites.status, "PENDING"),
        or(
          isNull(teamInvites.expiresAt),
          gt(teamInvites.expiresAt, new Date()),
        ),
      ),
    );

  return row?.value ?? 0;
}

/** An invite is acceptable only while it is pending and not past its expiry. */
export function isInviteAcceptable(invite: {
  status: string;
  expiresAt: Date | null;
}): boolean {
  if (invite.status !== "PENDING") return false;
  return invite.expiresAt === null || invite.expiresAt.getTime() > Date.now();
}

/**
 * Whether a team with `maxSeats` room can take one more occupant (a member or
 * a pending invite counted as `used`). `maxSeats == null` means unlimited —
 * true whether it comes from a plan with no seat cap or from a team with no
 * plan at all (SPEC-0005: `Team.maxSeats` is denormalized by billing, absent
 * when billing is disabled or no plan was ever assigned). Extracted as a pure
 * function so `invites.ts`'s two call sites (send and accept) share one rule
 * instead of two copies of the same `!== null` check.
 */
export function hasSeatAvailable(
  maxSeats: number | null,
  used: number,
): boolean {
  return maxSeats === null || used < maxSeats;
}
