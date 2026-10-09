import { and, count, eq, isNull } from "drizzle-orm";
import { mfaRecoveryCodes } from "@nuxfire/functions/schema";
import {
  RECOVERY_CODE_COUNT,
  formatRecoveryCode,
  generateRecoveryCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
  type MfaRecoveryScope,
} from "@nuxfire/crypto";

// The database half of the recovery codes; generation, format and the keyed
// hash come from @nuxfire/crypto. Other layers import it by subpath
// (`@nuxfire/layer-account/server/utils/mfa-recovery`); `useDB()` stays the
// Nitro global so the tests can stub it.

/**
 * Replaces the whole set, so an old sheet stops working the moment a new one is
 * issued. Delete and insert share a transaction: a failure never leaves the
 * account with no codes. Returns the plaintext codes, the only time they exist.
 */
export async function replaceRecoveryCodes(
  key: string,
  scope: MfaRecoveryScope,
  userId: string,
) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  const rows = await Promise.all(
    codes.map(async (code) => ({
      userId,
      scope,
      codeHash: await hashRecoveryCode(key, scope, userId, code),
    })),
  );
  await useDB().transaction(async (tx) => {
    await tx
      .delete(mfaRecoveryCodes)
      .where(
        and(
          eq(mfaRecoveryCodes.userId, userId),
          eq(mfaRecoveryCodes.scope, scope),
        ),
      );
    await tx.insert(mfaRecoveryCodes).values(rows);
  });
  return codes.map(formatRecoveryCode);
}

export async function countRecoveryCodes(
  scope: MfaRecoveryScope,
  userId: string,
) {
  const [row] = await useDB()
    .select({ remaining: count() })
    .from(mfaRecoveryCodes)
    .where(
      and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.scope, scope),
        isNull(mfaRecoveryCodes.usedAt),
      ),
    );
  return row?.remaining ?? 0;
}

/**
 * Redeems a code. The `usedAt IS NULL` guard sits inside the UPDATE itself, so
 * two concurrent requests presenting the same code cannot both succeed.
 */
export async function consumeRecoveryCode(
  key: string,
  scope: MfaRecoveryScope,
  userId: string,
  input: string,
) {
  const normalized = normalizeRecoveryCode(input);
  if (!normalized) return false;
  const codeHash = await hashRecoveryCode(key, scope, userId, normalized);
  const redeemed = await useDB()
    .update(mfaRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.scope, scope),
        eq(mfaRecoveryCodes.codeHash, codeHash),
        isNull(mfaRecoveryCodes.usedAt),
      ),
    )
    .returning({ id: mfaRecoveryCodes.id });
  return redeemed.length > 0;
}
