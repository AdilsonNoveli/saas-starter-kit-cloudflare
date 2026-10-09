import {
  Storage,
  type StorageAdapter,
} from "@openauthjs/openauth/storage/storage";
import { ACCESS_TOKEN_TTL_SECONDS } from "../../../config";
import type { FullUser, SubjectUser } from "./subjects";

/**
 * The subject every token of a person is issued under. It depends on the id
 * alone, so a profile change (name, photo, e-mail) never moves the person's
 * sessions to another prefix. Ids must not contain ":": the issuer splits a
 * refresh token `"{subject}:{token}"` at its last colon.
 */
export function stableSubject(userId: string): string {
  if (!userId || userId.includes(":")) {
    throw new Error("a user id must be non-empty and must not contain a colon");
  }
  return `user:${userId}`;
}

/** The fields of a refresh record (issuer.js generateTokens) this module reads. */
type RefreshValue =
  | {
      properties?: { sid?: unknown; email?: unknown };
      timeUsed?: number;
      ttl?: { refresh?: number };
    }
  | null
  | undefined;

/**
 * Every refresh record of the person, read from the
 * `["oauth:refresh", "user:<id>"]` prefix only. Collected before anyone writes:
 * MemoryStorage iterates the very array that set() and remove() change.
 */
async function sessionRecords(
  storage: StorageAdapter,
  userId: string,
): Promise<Array<[string[], RefreshValue]>> {
  const subject = stableSubject(userId);
  const records: Array<[string[], RefreshValue]> = [];
  for await (const [key, value] of Storage.scan<RefreshValue>(storage, [
    "oauth:refresh",
    subject,
  ])) {
    // MemoryStorage scans by plain string prefix, so user:1 would also list user:12.
    if (key[1] === subject) records.push([key, value]);
  }
  return records;
}

/**
 * Removes the person's refresh records, reading only the
 * `["oauth:refresh", "user:<id>"]` prefix. With `exceptSid`, every record of
 * that session survives (a renewal in the same request leaves two of them),
 * and records without a sid, issued before sids existed, go. With `onlySid`,
 * every record of that one session goes and nothing else. Returns how many
 * records were removed; repeating the call is harmless, which matters because
 * a KV listing can lag behind a delete.
 */
export async function revokeSessions(
  storage: StorageAdapter,
  userId: string,
  opts: { exceptSid?: string; onlySid?: string } = {},
): Promise<number> {
  const doomed: string[][] = [];
  for (const [key, value] of await sessionRecords(storage, userId)) {
    const sid = value?.properties?.sid;
    if (opts.exceptSid !== undefined && sid === opts.exceptSid) continue;
    if (opts.onlySid !== undefined && sid !== opts.onlySid) continue;
    doomed.push(key);
  }
  for (const key of doomed) {
    await Storage.remove(storage, key);
  }
  return doomed.length;
}

/** The one call of the issuer's success context that opens a session. */
export interface SessionResponder {
  subject(
    type: "user",
    properties: SubjectUser,
    options: { subject: string; ttl: { access: number } },
  ): Promise<Response>;
}

/**
 * The one form of an e-mail the issuer keys anything by. The password provider
 * already lower-cases what it reads, the code provider does not, so every key
 * and every stored address goes through here.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

/**
 * Opens a session for a person: a stable subject, a fresh `sid` that every
 * renewal keeps, the provider that opened it and the short access TTL. This is
 * the only place that issues a token, for every provider.
 */
export async function issueUserSession(
  ctx: SessionResponder,
  storage: StorageAdapter,
  user: Pick<SubjectUser, "id" | "name" | "email" | "image" | "provider">,
): Promise<Response> {
  const email = normalizeEmail(user.email);
  // Named one by one: the caller may hand the whole stored profile, whose
  // accounts (provider userinfo) do not belong in a token.
  const properties: SubjectUser = {
    id: user.id,
    name: user.name,
    email,
    image: user.image,
    provider: user.provider,
    sid: crypto.randomUUID(),
  };
  const response = await ctx.subject(
    "user",
    properties,
    {
      subject: stableSubject(user.id),
      ttl: { access: ACCESS_TOKEN_TTL_SECONDS },
    },
  );
  await rememberPasswordSubject(storage, email, user.id);
  return response;
}

/**
 * Records the subject `/password/change` revokes for this e-mail. It runs
 * after `ctx.subject`: on a password login the provider writes the properties
 * hash to this same key inside that call, and this write replaces it.
 */
export async function rememberPasswordSubject(
  storage: StorageAdapter,
  email: string,
  userId: string,
): Promise<void> {
  await Storage.set(
    storage,
    ["email", normalizeEmail(email), "subject"],
    stableSubject(userId),
  );
}

/** The profile at `["users", email]`, when it belongs to this person. */
async function ownProfile(
  storage: StorageAdapter,
  userId: string,
  email: string,
): Promise<FullUser | undefined> {
  const profile = await Storage.get<FullUser>(storage, ["users", email]);
  return profile?.id === userId ? profile : undefined;
}

export interface IdentityState {
  /** Every provider the person has logged in with (`accounts[].type`). */
  providers: string[];
  /** Whether a password credential exists for the e-mail. */
  hasPassword: boolean;
  /** The sids with at least one refresh record left: the live sessions. */
  sids: string[];
}

/**
 * What an identity has, for the app, which cannot read AuthKV. A profile under
 * the e-mail that carries another id is somebody else's and counts as none.
 */
export async function identityState(
  storage: StorageAdapter,
  input: { userId: string; email: string },
): Promise<IdentityState> {
  const email = normalizeEmail(input.email);
  const profile = await ownProfile(storage, input.userId, email);
  const providers = [
    ...new Set((profile?.accounts ?? []).map((account) => account.type)),
  ];
  const hasPassword = Boolean(
    profile && (await Storage.get(storage, ["email", email, "password"])),
  );
  const sids = new Set<string>();
  for (const [, value] of await sessionRecords(storage, input.userId)) {
    const sid = value?.properties?.sid;
    if (typeof sid === "string") sids.add(sid);
  }
  return { providers, hasPassword, sids: [...sids] };
}

// Their e-mail belongs to the provider: the next login through it would look
// the old address up, find nothing and create another identity.
const PROVIDER_MANAGED_EMAIL = new Set(["google", "github"]);

// How long a refresh record that was already used stays in KV: the issuer's
// reuse window (auth.ts sets no `ttl.reuse`, so its 60-second default), which
// is also KV's minimum expiration.
const USED_REFRESH_TTL_SECONDS = 60;

export type MoveIdentityEmailResult =
  | { ok: true }
  | { ok: false; error: "email_taken" | "email_managed_by_provider" };

/**
 * Moves an identity to a new e-mail with the same id: the profile, the password
 * credential and the subject key are written under the new address, the
 * records of the caller's session (`currentSid`) are rewritten to carry it,
 * every other session ends, and only then do the old keys go. A failure halfway
 * leaves both addresses on the same id, so no login path is lost and the app's
 * callback writes the token's e-mail into `User.email` on the next login.
 * Refuses, touching nothing, an address someone else has (`email_taken`) and a
 * profile linked to Google or GitHub (`email_managed_by_provider`).
 */
export async function moveIdentityEmail(
  storage: StorageAdapter,
  input: {
    userId: string;
    oldEmail: string;
    newEmail: string;
    currentSid: string;
  },
): Promise<MoveIdentityEmailResult> {
  const oldEmail = normalizeEmail(input.oldEmail);
  const newEmail = normalizeEmail(input.newEmail);
  const profile = await ownProfile(storage, input.userId, oldEmail);
  if (!profile) {
    throw new Error("the person has no identity profile at the current e-mail");
  }
  if (
    (profile.accounts ?? []).some((account) =>
      PROVIDER_MANAGED_EMAIL.has(account.type),
    )
  ) {
    return { ok: false, error: "email_managed_by_provider" };
  }
  // The person already has this address; moving onto it would erase it.
  if (newEmail === oldEmail) return { ok: false, error: "email_taken" };
  // A profile of this same id at the new address is a move that stopped
  // halfway, which a retry finishes.
  const movedProfile = await ownProfile(storage, input.userId, newEmail);
  const taken =
    !movedProfile &&
    Boolean(
      (await Storage.get(storage, ["users", newEmail])) ||
        (await Storage.get(storage, ["email", newEmail, "password"])),
    );
  if (taken) return { ok: false, error: "email_taken" };

  const credential = await Storage.get(storage, ["email", oldEmail, "password"]);
  if (credential) {
    await Storage.set(storage, ["email", newEmail, "password"], credential);
  }
  await Storage.set(storage, ["users", newEmail], {
    ...profile,
    email: newEmail,
    updatedAt: new Date().toISOString(),
  });
  await rememberPasswordSubject(storage, newEmail, input.userId);

  // Each renewal re-issues the token from the record's properties, so the
  // current session carries the new address from its next renewal on.
  for (const [key, value] of await sessionRecords(storage, input.userId)) {
    if (!value || value.properties?.sid !== input.currentSid) continue;
    await Storage.set(
      storage,
      key,
      { ...value, properties: { ...value.properties, email: newEmail } },
      value.timeUsed ? USED_REFRESH_TTL_SECONDS : value.ttl?.refresh,
    );
  }
  await revokeSessions(storage, input.userId, { exceptSid: input.currentSid });

  // The profile goes last: until then the old address still logs in.
  await Storage.remove(storage, ["email", oldEmail, "password"]);
  await Storage.remove(storage, ["email", oldEmail, "subject"]);
  await Storage.remove(storage, ["users", oldEmail]);
  return { ok: true };
}
