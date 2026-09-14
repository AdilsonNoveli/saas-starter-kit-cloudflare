import { users } from "@nuxfire/functions/schema";
import { eq } from "drizzle-orm";

export type UserMfaRecord = {
  id: string;
  mfaSecret: string | null;
  mfaEnabledAt: Date | null;
};

/**
 * Server-only lookup of a user's own MFA columns, `mfaSecret` included — used
 * only by the /api/mfa/* enrollment endpoints, which need the encrypted seed
 * itself. getUser() (server/utils/auth.ts) selects its own MFA-free column
 * set for anything that ends up in a client-facing session payload; never
 * merge this record into one.
 */
export async function getUserMfaRecord(
  userId: string,
): Promise<UserMfaRecord | null> {
  const [record] = await useDB()
    .select({
      id: users.id,
      mfaSecret: users.mfaSecret,
      mfaEnabledAt: users.mfaEnabledAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return record ?? null;
}
