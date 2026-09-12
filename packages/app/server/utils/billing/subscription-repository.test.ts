import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractEqCondition } from "../test-support/drizzle-inspect";
import { PaymentProvider, SubscriptionStatus } from "~~/types/enums";

const baseInput = {
  teamId: "team_1",
  provider: PaymentProvider.STRIPE,
  providerSubscriptionId: "sub_new",
  status: SubscriptionStatus.ACTIVE,
  planId: "plan_pro",
  currentPeriodStart: new Date("2026-01-01"),
  currentPeriodEnd: new Date("2026-02-01"),
  cancelAtPeriodEnd: false,
  providerMetadata: {},
  customerEmail: "user@example.com",
  lastPaymentDate: null,
  nextPaymentDate: new Date("2026-02-01"),
};

describe("upsertSubscription", () => {
  const mockFindFirst = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockValues = vi.fn();

  beforeEach(() => {
    mockFindFirst.mockReset();
    mockSet.mockReset().mockReturnValue({ where: mockWhere });
    mockWhere.mockReset().mockResolvedValue(undefined);
    mockValues.mockReset().mockResolvedValue(undefined);

    // Same technique as team-seats.test.ts / event-ledger.test.ts: `useDB()`
    // is a Nitro auto-import, stubbed as a global rather than mocked as a
    // module import.
    vi.stubGlobal("useDB", () => ({
      query: { subscriptions: { findFirst: mockFindFirst } },
      update: () => ({ set: mockSet }),
      insert: () => ({ values: mockValues }),
    }));
  });

  it("inserts when no row exists for this provider subscription id", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const { upsertSubscription } = await import("./subscription-repository");
    await upsertSubscription(baseInput);

    expect(mockValues).toHaveBeenCalledWith(baseInput);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("scopes the update by providerSubscriptionId, not teamId", async () => {
    // This is the regression test for the bug that shipped twice (once in
    // the Stripe webhook, once in Paddle's, independently): the existing row
    // was *found* by providerSubscriptionId, but the UPDATE's WHERE clause
    // filtered by teamId — so a team with more than one subscription row
    // (a plan change, a provider switch, cancelled history) had one event's
    // update silently overwrite a *different* row belonging to the same
    // team. Sharing this one function is what makes that fixable once
    // instead of once per provider, and this test is what keeps it fixed.
    mockFindFirst.mockResolvedValue({
      id: "existing_row",
      providerSubscriptionId: "sub_new",
    });

    const { upsertSubscription } = await import("./subscription-repository");
    await upsertSubscription(baseInput);

    expect(mockValues).not.toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(baseInput);

    const condition = mockWhere.mock.calls[0]?.[0];
    const extracted = extractEqCondition(condition);
    expect(extracted?.column).toBe("providerSubscriptionId");
    expect(extracted?.value).toBe("sub_new");
  });
});
