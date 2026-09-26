import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { PaymentProvider, SubscriptionStatus } from "../../../shared/types/enums";

const mockUpsertSubscription = vi.fn();
vi.mock("../billing/subscription-repository", () => ({
  upsertSubscription: (input: unknown) => mockUpsertSubscription(input),
}));

function fakeStripe(overrides: {
  subscription?: Record<string, unknown>;
  customer?: Record<string, unknown>;
  invoice?: Record<string, unknown> | null;
} = {}) {
  const subscription = {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    items: { data: [{ price: { id: "price_1" } }] },
    current_period_start: 1_700_000_000,
    current_period_end: 1_702_592_000,
    cancel_at_period_end: false,
    canceled_at: null,
    latest_invoice: "in_1",
    ...overrides.subscription,
  };
  const customer = {
    id: "cus_1",
    deleted: false,
    email: "buyer@example.com",
    metadata: { team_id: "team_1" },
    ...overrides.customer,
  };
  const invoice =
    overrides.invoice === null
      ? null
      : { status_transitions: { paid_at: 1_700_000_500 }, ...overrides.invoice };

  return {
    subscriptions: { retrieve: vi.fn().mockResolvedValue(subscription) },
    customers: { retrieve: vi.fn().mockResolvedValue(customer) },
    invoices: { retrieve: vi.fn().mockResolvedValue(invoice) },
  } as unknown as Stripe;
}

describe("syncStripeSubscriptionForTeam / syncStripeSubscription", () => {
  const mockPlansFindFirst = vi.fn();
  const mockTeamsUpdateSet = vi.fn();
  const mockTeamsUpdateWhere = vi.fn();

  beforeEach(() => {
    mockUpsertSubscription.mockReset();
    mockPlansFindFirst.mockReset().mockResolvedValue({ id: "plan_1" });
    mockTeamsUpdateWhere.mockReset().mockResolvedValue(undefined);
    mockTeamsUpdateSet.mockReset().mockReturnValue({ where: mockTeamsUpdateWhere });

    vi.stubGlobal("useDB", () => ({
      query: { plans: { findFirst: mockPlansFindFirst } },
      update: () => ({ set: mockTeamsUpdateSet }),
    }));
  });

  it("SPECSFY: AC-019 syncStripeSubscriptionForTeam writes through upsertSubscription keyed by the explicit teamId", async () => {
    const stripe = fakeStripe();
    const { syncStripeSubscriptionForTeam } = await import("./subscription-sync");

    const outcome = await syncStripeSubscriptionForTeam(stripe, "sub_1", "team_explicit");

    expect(outcome).toEqual({ ok: true });
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team_explicit",
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: "sub_1",
        status: SubscriptionStatus.ACTIVE,
        planId: "plan_1",
      }),
    );
  });

  it("returns a typed failure when the subscription has no configured plan", async () => {
    mockPlansFindFirst.mockResolvedValue(undefined);
    const stripe = fakeStripe();
    const { syncStripeSubscriptionForTeam } = await import("./subscription-sync");

    const outcome = await syncStripeSubscriptionForTeam(stripe, "sub_1", "team_1");

    expect(outcome).toEqual({ ok: false, reason: "No plan configured for price price_1" });
    expect(mockUpsertSubscription).not.toHaveBeenCalled();
  });

  it("SPECSFY: AC-001 / AC-002 characterizes existing syncStripeSubscription behavior unchanged: resolves teamId from customer.metadata.team_id", async () => {
    const stripe = fakeStripe();
    const { syncStripeSubscription } = await import("./subscription-sync");

    const outcome = await syncStripeSubscription(stripe, "sub_1");

    expect(outcome).toEqual({ ok: true });
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team_1" }),
    );
  });

  it("characterizes existing behavior unchanged: fails when the customer has no team_id", async () => {
    const stripe = fakeStripe({ customer: { metadata: {} } });
    const { syncStripeSubscription } = await import("./subscription-sync");

    const outcome = await syncStripeSubscription(stripe, "sub_1");

    expect(outcome).toEqual({ ok: false, reason: "Customer has no team_id in metadata" });
    expect(mockUpsertSubscription).not.toHaveBeenCalled();
  });

  it("characterizes existing behavior unchanged: fails when the customer was deleted", async () => {
    const stripe = fakeStripe({ customer: { deleted: true } });
    const { syncStripeSubscription } = await import("./subscription-sync");

    const outcome = await syncStripeSubscription(stripe, "sub_1");

    expect(outcome).toEqual({ ok: false, reason: "Customer was deleted" });
  });
});
