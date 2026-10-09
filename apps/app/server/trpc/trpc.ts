import { TRPCError, initTRPC } from "@trpc/server";
import type { BouncerArgs, allows as coreAllows } from "nuxt-authorization/utils";
import type { Context } from "~~/server/trpc/context";

// The ability type that nuxt-authorization's core `allows` accepts. Each layer declares its
// own structural `User`, so no single user type fits; deriving it from the library keeps its
// constraint in one place instead of restating it in every signature. The core function is
// used (not the auto-imported wrappers) because it is the same in the server program and in
// the Nuxt client program.
type AnyAbility = Parameters<typeof coreAllows>[0];

const t = initTRPC.context<Context>().create({
  // Without this, an unhandled exception (a DB constraint violation, a
  // missing column) reaches the client as `error.message` verbatim — for a
  // Drizzle/postgres failure that includes the full SQL statement and every
  // bound parameter value, which can hold PII. `error.cause` is the original
  // thrown value (see @trpc/server's `getTRPCErrorFromUnknown`); it — and,
  // for a `DrizzleQueryError`, the real driver error one level deeper in
  // `cause.cause` — is logged for operators, serialized per the Workers
  // logging rule (raw `Error` objects serialize to `{}`), while the client
  // gets a message that names nothing internal. A `TRPCError` a procedure
  // throws on purpose (`BAD_REQUEST`, `FORBIDDEN`, ...) is untouched: its
  // message is already meant for the person using the form.
  errorFormatter({ shape, error }) {
    if (error.code !== "INTERNAL_SERVER_ERROR") return shape;

    const cause = error.cause;
    const rootCause =
      cause instanceof Error && cause.cause instanceof Error ? cause.cause : cause;
    console.error("trpc: unhandled procedure error", {
      message: rootCause instanceof Error ? rootCause.message : error.message,
      name: rootCause instanceof Error ? rootCause.name : error.name,
      stack: rootCause instanceof Error ? rootCause.stack : error.stack,
    });

    return { ...shape, message: "Something went wrong. Please try again." };
  },
});

export const publicProcedure = t.procedure.use(async (opts) => {
  return opts.next({
    ctx: {
      ...opts.ctx,
    },
  });
});

export const protectedProcedure = publicProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (!ctx.session?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  // Self-service 2FA gate: only checked at all for the accounts that opted
  // in (ctx.session.mfaEnabled), so a user who never enrolled pays no cost
  // and sees no behaviour change. One verification per login, not per
  // request-window — see user-mfa-session.ts for why this differs from
  // platformAdminProcedure's 30-minute re-challenge. The client's own
  // pre-emptive redirect lives in layouts/dashboard.vue (via
  // /api/mfa/status); this is the actual enforcement, same layered pattern
  // as platform-admin below.
  if (ctx.session.mfaEnabled) {
    const mfaSession = await getUserMfaSession(ctx.event);
    if (mfaSession?.userId !== ctx.session.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "MFA_REQUIRED" });
    }
  }
  return opts.next({
    ctx: {
      user: ctx.session,
    },
  });
});

export const abilityProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;
  return opts.next({
    ctx: {
      ...ctx,
      allows: async function allow<Ability extends AnyAbility>(
        ability: Ability,
        ...args: BouncerArgs<Ability>
      ) {
        return await allows(ctx.event, ability, ...args);
      },
      denies: async function deny<Ability extends AnyAbility>(
        ability: Ability,
        ...args: BouncerArgs<Ability>
      ) {
        return await denies(ctx.event, ability, ...args);
      },
      authorize: async function auth<Ability extends AnyAbility>(
        ability: Ability,
        ...args: BouncerArgs<Ability>
      ) {
        try {
          await authorize(ctx.event, ability, ...args);
        } catch (error) {
          // audit trail for denied authz attempts — surfaces in Cloudflare
          // Workers Logs (observability is enabled on this worker)
          console.warn("authz denied", {
            userId: ctx.session?.id,
            ability: String(ability),
            args,
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error instanceof Error ? error.message : "Not authorized",
          });
        }
      },
    },
  });
});

/**
 * Platform authority — the SaaS owner/operator, not a team role. Built on
 * `protectedProcedure` and deliberately NOT on `abilityProcedure`: this is a
 * parallel system to the per-team RBAC, and routing it through the tenant
 * ability layer is exactly how a tenant-scoped permission would end up able
 * to grant platform-scoped access.
 *
 * Three gates, all of which must pass:
 *   1. an active (non-revoked) row in `PlatformAdmin`;
 *   2. MFA actually enrolled on that row;
 *   3. a currently valid elevated session cookie, proving a TOTP challenge
 *      was passed in the last 30 minutes — so being logged in all day is not
 *      enough on its own.
 */
export const platformAdminProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  const admin = await findActivePlatformAdmin(ctx.user.id);
  // One undifferentiated FORBIDDEN for all three failures: which gate the
  // caller failed is information they don't need and an attacker would use.
  if (!admin || !admin.mfaEnabledAt) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  const mfaSession = await getPlatformMfaSession(ctx.event);
  if (mfaSession?.platformAdminId !== admin.id) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const result = await opts.next({
    ctx: {
      platformAdmin: { id: admin.id, role: admin.role },
    },
  });

  // Every successful platform-admin mutation produces an audit line, here and
  // not in each router, so no future router can forget. The middleware cannot
  // reliably tell what a given procedure's input refers to, so it records the
  // generic `targetType: "unknown"` — resolvers under `admin.*` should call
  // recordAuditLog() themselves with the real target when they have one, and
  // treat this as the safety net that always captures at least who did what,
  // from where, and when.
  if (result.ok && opts.type === "mutation") {
    await recordAuditLog({
      actorUserId: ctx.user.id,
      action: opts.path,
      targetType: "unknown",
      targetId: null,
      metadata: opts.rawInput ?? null,
      // Not `ctx.ip`: the shared context reads the IP without
      // `xForwardedFor`, which behind Cloudflare is the edge, not the caller.
      ip: getRequestIP(ctx.event, { xForwardedFor: true }) ?? null,
    });
  }

  return result;
});

export const router = t.router;
export const middleware = t.middleware;
// Used by routers/index.ts (Composition Root) to fold billing's admin-facing
// sub-routers into `admin.*` conditionally on `layers.features.billing`
// (SPEC-0005) — without `@nuxfire/layer-admin` importing a feature layer.
export const mergeRouters = t.mergeRouters;
