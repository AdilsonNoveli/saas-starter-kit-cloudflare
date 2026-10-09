import { eq } from "drizzle-orm";
import { userSessions } from "@nuxfire/functions/schema";
import { parseUserAgent } from "./user-agent";

// The `UserSession` row of one sign-in (SPEC-0010, DEC-008). The login callback
// builds and saves it, the access renewal touches it; the issuer's refresh
// records stay the source of truth for which sessions are alive. `useDB()` is
// the Nitro global, like the other server utils of this layer, so the tests
// can stub it.

/** The session cookies are rewritten on every renewal: 30 days from last use. */
export const SESSION_SLIDING_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SessionRecord = {
  id: string;
  userId: string;
  browser: string;
  os: string;
  country: string | null;
  region: string | null;
  city: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
};

function slidingExpiry(now: Date) {
  return new Date(now.getTime() + SESSION_SLIDING_DAYS * DAY_MS);
}

/**
 * Reads exactly three fields of `event.context.cf`, and only when they are
 * text. Everything else it carries (address, coordinates, postal code, network
 * details) never reaches the row.
 */
function placeField(cf: unknown, field: "country" | "region" | "city") {
  if (typeof cf !== "object" || cf === null || !(field in cf)) return null;
  const value: unknown = Reflect.get(cf, field);
  return typeof value === "string" && value ? value : null;
}

export function buildSessionRecord(input: {
  sid: string;
  userId: string;
  userAgent: string | undefined;
  cf: unknown;
  now: Date;
}): SessionRecord {
  const { browser, os } = parseUserAgent(input.userAgent);
  return {
    id: input.sid,
    userId: input.userId,
    browser,
    os,
    country: placeField(input.cf, "country"),
    region: placeField(input.cf, "region"),
    city: placeField(input.cf, "city"),
    createdAt: input.now,
    lastUsedAt: input.now,
    expiresAt: slidingExpiry(input.now),
  };
}

/** Saves the row of a sign-in; the same `sid` seen again replaces it. */
export async function upsertSession(record: SessionRecord) {
  const { browser, os, country, region, city, lastUsedAt, expiresAt } = record;
  await useDB()
    .insert(userSessions)
    .values(record)
    .onConflictDoUpdate({
      target: userSessions.id,
      set: { browser, os, country, region, city, lastUsedAt, expiresAt },
    });
}

/** Once per access renewal, never per request: last use and validity slide. */
export async function touchSession(sid: string, now: Date = new Date()) {
  await useDB()
    .update(userSessions)
    .set({ lastUsedAt: now, expiresAt: slidingExpiry(now) })
    .where(eq(userSessions.id, sid));
}
