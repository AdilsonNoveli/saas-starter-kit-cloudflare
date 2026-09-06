import { Secret, TOTP } from "otpauth/slim";
import { platformAdmins } from "@nuxfire/functions/schema";

/**
 * Provisions a TOTP seed for a platform admin who has one but hasn't enrolled
 * yet. Runs as a Nitro route rather than a tRPC procedure because
 * `platformAdminProcedure` requires MFA to already be enabled — enrolment
 * cannot sit behind the gate it exists to open.
 *
 * `otpauth/slim` (not the bare package entry) is imported deliberately: the
 * default entry resolves to a Node build that pulls in `node:crypto`, while
 * the slim build is pure JS over @noble/hashes plus `crypto.getRandomValues`,
 * which is exactly what workerd provides.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const admin = await findActivePlatformAdmin(user.id);
  // The only way to get a row here is src/database/grant-platform-admin.ts,
  // run by hand against the database — so reaching this without one means
  // someone who was never granted platform access is probing the endpoint.
  if (!admin) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  // Re-enrolling would let anyone holding a live session swap the second
  // factor for one they control. Resetting a lost authenticator is a manual,
  // out-of-band operation, not an HTTP call.
  if (admin.mfaEnabledAt) {
    throw createError({
      statusCode: 400,
      statusMessage: "MFA is already configured",
    });
  }

  const { platformAdminEncryptionKey } = useRuntimeConfig(event);
  // 160 bits, the size RFC 4226 specifies for HOTP/TOTP seeds.
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: "Movimenta Bairro",
    label: user.email ?? user.id,
    secret,
  });

  // Overwrites any seed from an abandoned earlier attempt, so a setup that
  // was started and never verified can simply be started again.
  await useDB()
    .update(platformAdmins)
    .set({
      mfaSecret: await encryptSecret(secret.base32, platformAdminEncryptionKey),
    })
    .where(eq(platformAdmins.id, admin.id));

  await recordAuditLog({
    actorUserId: user.id,
    action: "platformAdmin.mfa.setup",
    targetType: "platformAdmin",
    targetId: admin.id,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
  });

  // The URI carries the seed in the clear — unavoidable, it is what the
  // authenticator app has to scan. It is returned exactly once, at
  // provisioning time, and never logged or exposed again afterwards.
  return { otpauthUri: totp.toString() };
});
