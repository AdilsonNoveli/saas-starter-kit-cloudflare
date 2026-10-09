import { TRPCError } from "@trpc/server";
import type { userPreferences } from "../database/schema";
import { onboardingDefaults } from "../../shared/utils/onboarding-defaults";
import { parsePreferences } from "../utils/preferences";
import type { PreferencesEdit } from "./preferences";
import type { Clock } from "./ports";

// SPEC-0010, FR-004 to FR-006, DEC-001 (DEC-018): the onboarding writes the
// name, the `UserPreference` row and either a new Space with its Owner or the
// accepted invite in ONE transaction, so a failure anywhere leaves the person
// exactly as before, still on /onboarding.

/** The writes the service makes itself through the transaction handle. */
export interface OnboardingWrites {
  updateUserName(userId: string, name: string): Promise<void>;
  insertPreferences(row: typeof userPreferences.$inferInsert): Promise<void>;
}

/** A pending invite as the lookup returns it; the dependencies may carry more. */
export interface OnboardingInvite {
  id: string;
  team: { name: string; slug: string };
}

/**
 * `Tx` is whatever else the dependencies need from the handle (the drizzle
 * transaction in production). The transaction's own result is not used: the
 * service reads what it returns only after the commit.
 */
export interface OnboardingDeps<Tx, Invite extends OnboardingInvite> {
  repo: { transaction(fn: (tx: Tx & OnboardingWrites) => Promise<unknown>): Promise<unknown> };
  /** `createTeamWithOwner` in production; throws `slug_taken` on a taken slug. */
  createSpace(tx: Tx, input: { name: string; slug: string; ownerUserId: string }): Promise<{ slug: string }>;
  /** The pending, unexpired invite for the lower-cased e-mail, if any. */
  findPendingInvite(tx: Tx, emailLower: string): Promise<Invite | null>;
  acceptInvite(tx: Tx, invite: Invite, userId: string): Promise<{ slug: string }>;
  now: Clock;
}

export interface OnboardingUser {
  id: string;
  email: string;
  name: string | null;
}

export type CompleteOnboardingInput = {
  user: OnboardingUser;
  name: string;
  preferences: PreferencesEdit;
} & ({ space: { name: string; slug: string } } | { inviteId: string });

/** Suggestions for steps 1 and 3 and the invite that replaces step 3, if any. */
export async function getOnboardingState<Tx, Invite extends OnboardingInvite>(
  deps: OnboardingDeps<Tx, Invite>,
  user: OnboardingUser,
) {
  // Through a transaction only to hand the lookup the same handle it gets
  // when the onboarding completes.
  const found: { invite: Invite | null } = { invite: null };
  await deps.repo.transaction(async (tx) => {
    found.invite = await deps.findPendingInvite(tx, user.email.toLowerCase());
  });
  const { invite } = found;
  return {
    ...onboardingDefaults({ name: user.name, email: user.email }),
    invite: invite ? { id: invite.id, team: { name: invite.team.name, slug: invite.team.slug } } : null,
  };
}

/** `{ slug }` of the Space the person lands in; throws with the stable code. */
export async function completeOnboarding<Tx, Invite extends OnboardingInvite>(
  deps: OnboardingDeps<Tx, Invite>,
  input: CompleteOnboardingInput,
): Promise<{ slug: string }> {
  const parsed = parsePreferences(input.preferences);
  if (!parsed.ok) throw new TRPCError({ code: "BAD_REQUEST", message: parsed.error });

  const { user } = input;
  const now = deps.now();
  let slug = "";
  await deps.repo.transaction(async (tx) => {
    await tx.updateUserName(user.id, input.name);
    await tx.insertPreferences({
      userId: user.id,
      ...parsed.value,
      onboardedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if ("inviteId" in input) {
      // Looked up again inside the transaction: the one offered by
      // getOnboardingState may have expired or been used since.
      const invite = await deps.findPendingInvite(tx, user.email.toLowerCase());
      if (!invite || invite.id !== input.inviteId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "invite_unavailable" });
      }
      ({ slug } = await deps.acceptInvite(tx, invite, user.id));
      return;
    }

    ({ slug } = await deps.createSpace(tx, {
      name: input.space.name,
      slug: input.space.slug,
      ownerUserId: user.id,
    }));
  });
  // Only reached once the transaction committed.
  return { slug };
}
