import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingPurchaseStatus, PlanBuyerTeamMode, PaymentProvider } from "../../../shared/types/enums";

const basePendingPurchase = {
  id: "pp_1",
  email: "buyer@example.com",
  planId: "plan_1",
  provider: PaymentProvider.STRIPE,
  providerCheckoutId: "cs_1",
  providerCustomerId: "cus_1",
  providerSubscriptionId: "sub_1",
  status: PendingPurchaseStatus.PENDING,
  failureReason: null,
  claimEmailSentAt: new Date(),
  claimedAt: null,
  claimedByUserId: null,
  resultTeamId: null,
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * A thenable chain: awaiting it directly resolves `result`, and `.returning()`
 * does too. Typed as `DrizzleChain` (a minimal structural stand-in) — it
 * plays the role of whichever real Drizzle chain (`.values()`, `.set()`,
 * `.where()`, `.returning()`) the caller needs next.
 */
interface DrizzleChain extends PromiseLike<unknown> {
  set: (values: unknown) => DrizzleChain;
  where: (condition: unknown) => DrizzleChain;
  values: (values: unknown) => DrizzleChain;
  returning: () => Promise<unknown>;
}

function chain(result: unknown): DrizzleChain {
  const obj: DrizzleChain = {
    set: () => obj,
    where: () => obj,
    values: () => obj,
    returning: () => Promise.resolve(result),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return obj;
}

interface FakeDbOptions {
  teamBySlug?: unknown;
  teamById?: unknown;
  ownerRole?: unknown;
  memberRole?: unknown;
  existingMembership?: unknown;
  insertTeamResult?: unknown;
  claimResult?: unknown;
}

function makeFakeDb(options: FakeDbOptions) {
  const insertTeam = vi.fn(() => chain([options.insertTeamResult]));
  const insertMembership = vi.fn(() => chain(undefined));
  const updateTeamPlan = vi.fn(() => chain(undefined));
  const updatePendingPurchase = vi.fn(() =>
    chain(options.claimResult === undefined ? [] : [options.claimResult]),
  );

  const query = {
    teams: {
      findFirst: vi.fn((args: { where?: unknown }) => {
        // The two callers pass different conditions (slug vs id); tests
        // configure only the one their scenario needs.
        return Promise.resolve(options.teamBySlug ?? options.teamById);
      }),
    },
    roles: {
      findFirst: vi.fn(() =>
        Promise.resolve(options.ownerRole ?? options.memberRole),
      ),
    },
    teamMemberships: {
      findFirst: vi.fn(() => Promise.resolve(options.existingMembership)),
    },
  };

  const tx = {
    query,
    insert: vi.fn((table: unknown) => ({
      values: (values: unknown) => {
        if (table === teamsTableMarker) return insertTeam().values(values);
        return insertMembership().values(values);
      },
    })),
    update: vi.fn((table: unknown) => ({
      set: (values: unknown) => {
        if (table === pendingPurchasesTableMarker) {
          return updatePendingPurchase().set(values);
        }
        return updateTeamPlan().set(values);
      },
    })),
  };

  return {
    query,
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    insertMembership,
    updateTeamPlan,
    updatePendingPurchase,
  };
}

// Placeholder identities swapped in via vi.mock below so the fake db can tell
// `teams` from `pendingPurchases` in `.insert(table)`/`.update(table)` calls
// without depending on the real schema module's object identity at import
// time (hoisted mocks run before this file's own imports resolve).
const teamsTableMarker = Symbol("teams");
const pendingPurchasesTableMarker = Symbol("pendingPurchases");

vi.mock("@nuxfire/layer-teams/server/database/schema", () => ({
  teams: teamsTableMarker,
  teamMemberships: Symbol("teamMemberships"),
  roles: Symbol("roles"),
}));
vi.mock("../../database/schema", () => ({
  pendingPurchases: pendingPurchasesTableMarker,
}));
vi.mock("@nuxfire/layer-teams/server/utils/roles", () => ({
  ensureSystemRoles: vi.fn(),
}));

describe("provisionBuyerTeam", () => {
  beforeEach(() => {
    vi.stubGlobal("useDB", () => ({}));
  });

  it("SPECSFY: AC-015 rejects a NEW_TEAM claim with an invalid team name", async () => {
    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_1", buyerTeamMode: PlanBuyerTeamMode.NEW_TEAM, buyerTeamId: null },
      userId: "user_1",
      teamName: "A",
      teamSlug: "a",
    });
    expect(result).toEqual({ ok: false, reason: "invalid_team_name" });
  });

  it("SPECSFY: AC-014 rejects a NEW_TEAM claim whose slug is already taken", async () => {
    const fakeDb = makeFakeDb({ teamBySlug: { id: "existing_team", slug: "acme" } });
    vi.stubGlobal("useDB", () => fakeDb);

    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_1", buyerTeamMode: PlanBuyerTeamMode.NEW_TEAM, buyerTeamId: null },
      userId: "user_1",
      teamName: "Acme",
      teamSlug: "acme",
    });
    expect(result).toEqual({ ok: false, reason: "slug_taken" });
    expect(fakeDb.transaction).not.toHaveBeenCalled();
  });

  it("SPECSFY: AC-001 creates a new team, an Owner membership, and claims the purchase for NEW_TEAM", async () => {
    const fakeDb = makeFakeDb({
      teamBySlug: undefined,
      ownerRole: { id: "role_owner", name: "Owner" },
      insertTeamResult: { id: "team_new", slug: "acme" },
      claimResult: { ...basePendingPurchase, status: PendingPurchaseStatus.CLAIMED },
    });
    vi.stubGlobal("useDB", () => fakeDb);

    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_1", buyerTeamMode: PlanBuyerTeamMode.NEW_TEAM, buyerTeamId: null },
      userId: "user_1",
      teamName: "Acme",
      teamSlug: "acme",
    });
    expect(result).toEqual({ ok: true, teamId: "team_new", teamSlug: "acme" });
  });

  it("SPECSFY: AC-004 rejects an EXISTING_TEAM claim whose destination was suspended", async () => {
    const fakeDb = makeFakeDb({ teamById: { id: "team_1", slug: "client-co", status: "SUSPENDED" } });
    vi.stubGlobal("useDB", () => fakeDb);

    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_1", buyerTeamMode: PlanBuyerTeamMode.EXISTING_TEAM, buyerTeamId: "team_1" },
      userId: "user_1",
    });
    expect(result).toEqual({ ok: false, reason: "destination_suspended" });
    expect(fakeDb.transaction).not.toHaveBeenCalled();
  });

  it("SPECSFY: AC-017 rejects an EXISTING_TEAM claim whose destination no longer exists", async () => {
    const fakeDb = makeFakeDb({ teamById: undefined });
    vi.stubGlobal("useDB", () => fakeDb);

    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_1", buyerTeamMode: PlanBuyerTeamMode.EXISTING_TEAM, buyerTeamId: null },
      userId: "user_1",
    });
    expect(result).toEqual({ ok: false, reason: "destination_missing" });
  });

  it("SPECSFY: AC-018 re-validates the destination at claim time even if it was ACTIVE at checkout start", async () => {
    // Same shape as AC-004: the function has no separate "checked earlier"
    // state to trust, so re-validation is inherent to calling it once, at
    // claim time, with the team's *current* row.
    const fakeDb = makeFakeDb({ teamById: { id: "team_1", slug: "client-co", status: "SUSPENDED" } });
    vi.stubGlobal("useDB", () => fakeDb);

    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_1", buyerTeamMode: PlanBuyerTeamMode.EXISTING_TEAM, buyerTeamId: "team_1" },
      userId: "user_1",
    });
    expect(result).toEqual({ ok: false, reason: "destination_suspended" });
  });

  it("SPECSFY: AC-002 / AC-016 adds the buyer as Member and updates the team's plan for EXISTING_TEAM", async () => {
    const fakeDb = makeFakeDb({
      teamById: { id: "team_1", slug: "client-co", status: "ACTIVE" },
      memberRole: { id: "role_member", name: "Member" },
      existingMembership: undefined,
      claimResult: { ...basePendingPurchase, status: PendingPurchaseStatus.CLAIMED },
    });
    vi.stubGlobal("useDB", () => fakeDb);

    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_support", buyerTeamMode: PlanBuyerTeamMode.EXISTING_TEAM, buyerTeamId: "team_1" },
      userId: "user_1",
    });
    expect(result).toEqual({ ok: true, teamId: "team_1", teamSlug: "client-co" });
    expect(fakeDb.updateTeamPlan).toHaveBeenCalled();
  });

  it("SPECSFY: AC-010 does not duplicate membership when the buyer already belongs to the destination", async () => {
    const fakeDb = makeFakeDb({
      teamById: { id: "team_1", slug: "client-co", status: "ACTIVE" },
      memberRole: { id: "role_member", name: "Member" },
      existingMembership: { id: "membership_1", teamId: "team_1", userId: "user_1" },
      claimResult: { ...basePendingPurchase, status: PendingPurchaseStatus.CLAIMED },
    });
    vi.stubGlobal("useDB", () => fakeDb);

    const { provisionBuyerTeam } = await import("./buyer-provisioning");
    const result = await provisionBuyerTeam({
      pendingPurchase: basePendingPurchase,
      plan: { id: "plan_support", buyerTeamMode: PlanBuyerTeamMode.EXISTING_TEAM, buyerTeamId: "team_1" },
      userId: "user_1",
    });
    expect(result).toEqual({ ok: true, teamId: "team_1", teamSlug: "client-co" });
    expect(fakeDb.insertMembership).not.toHaveBeenCalled();
  });
});
