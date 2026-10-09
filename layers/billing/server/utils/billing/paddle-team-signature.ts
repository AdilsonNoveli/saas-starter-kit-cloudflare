import { fromHex, hmacSha256, toHex, verifyHmacSha256 } from "@nuxfire/crypto";

// Domain-separated so the webhook secret is never used to sign anything else.
const message = (teamId: string) => `nuxfire:paddle-checkout-team:${teamId}`;
// A distinct domain from `message` above: a pending-purchase id and a team id
// are both plain cuids, so without this prefix a signature minted for one
// would verify as the other (SPEC-0004 NFR-001).
const pendingPurchaseMessage = (pendingPurchaseId: string) =>
  `nuxfire:paddle-checkout-pending-purchase:${pendingPurchaseId}`;

export async function signPaddleTeam(secret: string, teamId: string) {
  if (!secret) throw new Error("Paddle webhook secret is not configured");
  return toHex(await hmacSha256(secret, message(teamId)));
}

export async function verifyPaddleTeam(
  secret: string,
  teamId: string,
  signature: string,
) {
  if (!secret || !teamId || !signature) return false;
  const bytes = fromHex(signature);
  if (!bytes) return false;
  return verifyHmacSha256(secret, message(teamId), bytes);
}

/**
 * Signs a `PendingPurchase` id at checkout start (SPEC-0004 FR-001/FR-003),
 * the same role `signPaddleTeam` plays for an in-app team upgrade: the
 * browser carries this id back in `customData`, and only a value signed here
 * is trusted at webhook time.
 */
export async function signPaddlePendingPurchase(
  secret: string,
  pendingPurchaseId: string,
) {
  if (!secret) throw new Error("Paddle webhook secret is not configured");
  return toHex(await hmacSha256(secret, pendingPurchaseMessage(pendingPurchaseId)));
}

export async function verifyPaddlePendingPurchase(
  secret: string,
  pendingPurchaseId: string,
  signature: string,
) {
  if (!secret || !pendingPurchaseId || !signature) return false;
  const bytes = fromHex(signature);
  if (!bytes) return false;
  return verifyHmacSha256(secret, pendingPurchaseMessage(pendingPurchaseId), bytes);
}
