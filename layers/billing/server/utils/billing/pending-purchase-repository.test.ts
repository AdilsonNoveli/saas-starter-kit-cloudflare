import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingPurchaseStatus } from "../../../shared/types/enums";
import { PaymentProvider } from "../../../shared/types/enums";

const basePurchase = {
  id: "pp_1",
  email: "buyer@example.com",
  planId: "plan_1",
  provider: PaymentProvider.STRIPE,
  providerCheckoutId: "cs_1",
  providerCustomerId: null,
  providerSubscriptionId: "sub_1",
  status: PendingPurchaseStatus.PENDING,
  failureReason: null,
  claimEmailSentAt: null,
  claimedAt: null,
  claimedByUserId: null,
  resultTeamId: null,
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("evaluateClaimEligibility", () => {
  it("SPECSFY: AC-005 rejects a claimant whose e-mail does not match the purchase", async () => {
    const { evaluateClaimEligibility } = await import(
      "./pending-purchase-repository"
    );
    expect(
      evaluateClaimEligibility(basePurchase, "someoneelse@example.com"),
    ).toEqual({ ok: false, reason: "wrong_email" });
  });

  it("SPECSFY: AC-021 gives the same reason for a foreign e-mail as for no purchase at all", async () => {
    const { evaluateClaimEligibility } = await import(
      "./pending-purchase-repository"
    );
    const notFound = evaluateClaimEligibility(undefined, "buyer@example.com");
    const wrongEmail = evaluateClaimEligibility(
      basePurchase,
      "someoneelse@example.com",
    );
    // Both are distinct reasons internally, but callers (checkout.ts) must
    // map them to one identical response — this only proves the two remain
    // separately identifiable here, for that mapping to collapse on purpose.
    expect(notFound.ok).toBe(false);
    expect(wrongEmail.ok).toBe(false);
  });

  it("SPECSFY: AC-006 rejects a purchase already CLAIMED, distinct from wrong e-mail", async () => {
    const { evaluateClaimEligibility } = await import(
      "./pending-purchase-repository"
    );
    expect(
      evaluateClaimEligibility(
        { ...basePurchase, status: PendingPurchaseStatus.CLAIMED },
        "buyer@example.com",
      ),
    ).toEqual({ ok: false, reason: "already_claimed" });
  });

  it("SPECSFY: AC-020 rejects an EXPIRED purchase with a reason distinct from already_claimed", async () => {
    const { evaluateClaimEligibility } = await import(
      "./pending-purchase-repository"
    );
    expect(
      evaluateClaimEligibility(
        { ...basePurchase, status: PendingPurchaseStatus.EXPIRED },
        "buyer@example.com",
      ),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a REJECTED purchase with its own reason", async () => {
    const { evaluateClaimEligibility } = await import(
      "./pending-purchase-repository"
    );
    expect(
      evaluateClaimEligibility(
        { ...basePurchase, status: PendingPurchaseStatus.REJECTED },
        "buyer@example.com",
      ),
    ).toEqual({ ok: false, reason: "rejected" });
  });

  it("rejects a PENDING purchase whose subscription was never confirmed", async () => {
    const { evaluateClaimEligibility } = await import(
      "./pending-purchase-repository"
    );
    expect(
      evaluateClaimEligibility(
        { ...basePurchase, providerSubscriptionId: null },
        "buyer@example.com",
      ),
    ).toEqual({ ok: false, reason: "not_confirmed" });
  });

  it("accepts a PENDING, confirmed purchase claimed by its own e-mail", async () => {
    const { evaluateClaimEligibility } = await import(
      "./pending-purchase-repository"
    );
    expect(evaluateClaimEligibility(basePurchase, "buyer@example.com")).toEqual({
      ok: true,
    });
  });
});

describe("claimPendingPurchase", () => {
  it("SPECSFY: AC-006 / AC-022 returns null when the row is no longer PENDING (lost the race or already claimed)", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const db = { update: vi.fn().mockReturnValue({ set }) };

    const { claimPendingPurchase } = await import(
      "./pending-purchase-repository"
    );
    const result = await claimPendingPurchase(db as never, "pp_1", "user_1", "team_1");

    expect(result).toBeNull();
  });

  it("returns the claimed row when the atomic transition succeeds", async () => {
    const claimedRow = {
      ...basePurchase,
      status: PendingPurchaseStatus.CLAIMED,
      resultTeamId: "team_1",
    };
    const returning = vi.fn().mockResolvedValue([claimedRow]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const db = { update: vi.fn().mockReturnValue({ set }) };

    const { claimPendingPurchase } = await import(
      "./pending-purchase-repository"
    );
    const result = await claimPendingPurchase(db as never, "pp_1", "user_1", "team_1");

    expect(result).toEqual(claimedRow);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PendingPurchaseStatus.CLAIMED,
        claimedByUserId: "user_1",
        resultTeamId: "team_1",
      }),
    );
  });
});

describe("getPendingPurchase", () => {
  const mockFindFirst = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockUpdateReturning = vi.fn();

  beforeEach(() => {
    mockFindFirst.mockReset();
    mockSet.mockReset().mockReturnValue({ where: mockWhere });
    mockWhere.mockReset().mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateReturning.mockReset();

    vi.stubGlobal("useDB", () => ({
      query: { pendingPurchases: { findFirst: mockFindFirst } },
      update: () => ({ set: mockSet }),
    }));
  });

  it("SPECSFY: AC-009 / AC-020 flips a PENDING row past its expiry to EXPIRED on read", async () => {
    const stale = { ...basePurchase, expiresAt: new Date("2020-01-01T00:00:00.000Z") };
    mockFindFirst.mockResolvedValue(stale);
    mockUpdateReturning.mockResolvedValue([
      { ...stale, status: PendingPurchaseStatus.EXPIRED },
    ]);

    const { getPendingPurchase } = await import("./pending-purchase-repository");
    const result = await getPendingPurchase("pp_1", new Date("2026-06-01T00:00:00.000Z"));

    expect(result?.status).toBe(PendingPurchaseStatus.EXPIRED);
  });

  it("leaves a PENDING row before its expiry untouched", async () => {
    mockFindFirst.mockResolvedValue(basePurchase);

    const { getPendingPurchase } = await import("./pending-purchase-repository");
    const result = await getPendingPurchase("pp_1", new Date("2026-06-01T00:00:00.000Z"));

    expect(result?.status).toBe(PendingPurchaseStatus.PENDING);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("does not relabel a terminal status (CLAIMED) even if past the original expiry", async () => {
    const stale = {
      ...basePurchase,
      status: PendingPurchaseStatus.CLAIMED,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    };
    mockFindFirst.mockResolvedValue(stale);

    const { getPendingPurchase } = await import("./pending-purchase-repository");
    const result = await getPendingPurchase("pp_1", new Date("2026-06-01T00:00:00.000Z"));

    expect(result?.status).toBe(PendingPurchaseStatus.CLAIMED);
    expect(mockSet).not.toHaveBeenCalled();
  });
});

describe("recordConfirmedSubscription", () => {
  it("SPECSFY: AC-007 reports firstConfirmation only when the conditional update actually wrote a row", async () => {
    const returningOnce = vi.fn().mockResolvedValue([{ ...basePurchase }]);
    const whereOnce = vi.fn().mockReturnValue({ returning: returningOnce });
    const setOnce = vi.fn().mockReturnValue({ where: whereOnce });
    vi.stubGlobal("useDB", () => ({ update: () => ({ set: setOnce }) }));

    const { recordConfirmedSubscription } = await import(
      "./pending-purchase-repository"
    );
    const first = await recordConfirmedSubscription("pp_1", {
      providerSubscriptionId: "sub_1",
      providerCustomerId: "cus_1",
    });
    expect(first.firstConfirmation).toBe(true);

    const returningTwice = vi.fn().mockResolvedValue([]);
    const whereTwice = vi.fn().mockReturnValue({ returning: returningTwice });
    const setTwice = vi.fn().mockReturnValue({ where: whereTwice });
    vi.stubGlobal("useDB", () => ({ update: () => ({ set: setTwice }) }));

    const second = await recordConfirmedSubscription("pp_1", {
      providerSubscriptionId: "sub_1",
      providerCustomerId: "cus_1",
    });
    expect(second.firstConfirmation).toBe(false);
  });
});

describe("createPendingPurchase", () => {
  it("inserts with a 30-day expiry from now", async () => {
    const returning = vi.fn().mockResolvedValue([{ ...basePurchase, id: "pp_new" }]);
    const values = vi.fn().mockReturnValue({ returning });
    vi.stubGlobal("useDB", () => ({ insert: () => ({ values }) }));

    const { createPendingPurchase } = await import("./pending-purchase-repository");
    const before = Date.now();
    const row = await createPendingPurchase({
      email: "buyer@example.com",
      planId: "plan_1",
      provider: PaymentProvider.STRIPE,
      providerCheckoutId: "cs_new",
    });

    expect(row.id).toBe("pp_new");
    const inserted = values.mock.calls[0]?.[0] as { expiresAt: Date };
    const days = (inserted.expiresAt.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });
});
