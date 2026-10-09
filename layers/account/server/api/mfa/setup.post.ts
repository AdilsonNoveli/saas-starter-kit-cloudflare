import { Secret, TOTP } from "otpauth/slim";
import { encryptSecret } from "@nuxfire/crypto";
import { users } from "@nuxfire/functions/schema";

/**
 * Provisions a TOTP seed for the caller's own account, self-service.
 * Mirrors admin/mfa/setup.post.ts — a Nitro route rather than a tRPC
 * procedure for the identical reason: protectedProcedure requires MFA to
 * already be verified for this login once it's enabled, so enrolment cannot
 * sit behind the gate it exists to open.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const record = await getUserMfaRecord(user.id);
  // Re-enrolling would let anyone holding a live session swap the second
  // factor for one they control. Recovering a lost authenticator is a
  // manual, out-of-band operation (see the platform-admin doc's own known
  // limit) — self-service disable-then-re-enable (account.disableMfa) is the
  // supported path, not overwriting a seed still in use.
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  if (record.mfaEnabledAt) {
    throw createError({
      statusCode: 400,
      statusMessage: "MFA is already configured",
    });
  }

  const { userMfaEncryptionKey } = useRuntimeConfig(event);
  // 160 bits, the size RFC 4226 specifies for HOTP/TOTP seeds.
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: userMfaIssuer(event),
    label: user.email ?? user.id,
    secret,
  });

  // Overwrites any seed from an abandoned earlier attempt, so a setup that
  // was started and never verified can simply be started again.
  await useDB()
    .update(users)
    .set({
      mfaSecret: await encryptSecret(secret.base32, userMfaEncryptionKey),
    })
    .where(eq(users.id, user.id));

  // The URI carries the seed in the clear — unavoidable, it is what the
  // authenticator app has to scan. Returned exactly once, at provisioning
  // time, and never logged or exposed again afterwards.
  return { otpauthUri: totp.toString() };
});
