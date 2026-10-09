import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SendEmail } from "./stripe-webhook-dispatch";

const mockRecordConfirmedSubscription = vi.fn();
vi.mock("./pending-purchase-repository", () => ({
  recordConfirmedSubscription: (...args: unknown[]) =>
    mockRecordConfirmedSubscription(...args),
}));

const mockDescribeBuyerDestination = vi.fn().mockResolvedValue({ kind: "new_space" });
vi.mock("./buyer-provisioning", () => ({
  describeBuyerDestination: (...args: unknown[]) => mockDescribeBuyerDestination(...args),
}));

const mockSyncStripeSubscription = vi.fn();
vi.mock("../stripe/subscription-sync", () => ({
  syncStripeSubscription: (...args: unknown[]) => mockSyncStripeSubscription(...args),
}));

function fakeStripe(overrides: {
  subscriptionStatus?: string;
  customerMetadata?: Record<string, string>;
} = {}) {
  const subscription = {
    id: "sub_1",
    customer: "cus_1",
    status: overrides.subscriptionStatus ?? "active",
  };
  const customer = {
    id: "cus_1",
    deleted: false,
    metadata: overrides.customerMetadata ?? { pending_purchase_id: "pp_1" },
  };
  return {
    subscriptions: { retrieve: vi.fn().mockResolvedValue(subscription) },
    customers: { retrieve: vi.fn().mockResolvedValue(customer) },
  } as unknown as Stripe;
}

const findFirstMock = vi.fn();

describe("stripe webhook dispatch — pending-purchase confirmation", () => {
  let sendEmail: SendEmail;

  beforeEach(() => {
    mockRecordConfirmedSubscription.mockReset();
    mockDescribeBuyerDestination.mockReset().mockResolvedValue({ kind: "new_space" });
    mockSyncStripeSubscription.mockReset().mockResolvedValue({ ok: true });
    findFirstMock.mockReset().mockResolvedValue({
      id: "pp_1",
      email: "buyer@example.com",
      plan: { id: "plan_1", name: "Starter" },
    });
    sendEmail = vi.fn().mockResolvedValue(true) as unknown as SendEmail;
    vi.stubGlobal("useDB", () => ({
      query: { pendingPurchases: { findFirst: findFirstMock } },
    }));
  });

  it("SPECSFY: AC-001 sends the claim e-mail exactly once on the first confirmed subscription.created", async () => {
    mockRecordConfirmedSubscription.mockResolvedValue({ firstConfirmation: true });
    const stripe = fakeStripe();
    const { dispatch } = await import("./stripe-webhook-dispatch");

    const outcome = await dispatch(
      stripe,
      { type: "customer.subscription.created", data: { object: { id: "sub_1" } } } as Stripe.Event,
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      "PurchaseClaim",
      expect.objectContaining({
        planName: "Starter",
        claimLink: "https://app.example.com/claim/pp_1",
      }),
    );
  });

  it("SPECSFY: AC-007 does not resend the claim e-mail when the confirmation event is redelivered", async () => {
    mockRecordConfirmedSubscription.mockResolvedValue({ firstConfirmation: false });
    const stripe = fakeStripe();
    const { dispatch } = await import("./stripe-webhook-dispatch");

    const outcome = await dispatch(
      stripe,
      { type: "customer.subscription.updated", data: { object: { id: "sub_1" } } } as Stripe.Event,
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("SPECSFY: AC-008 does not confirm a delayed-payment checkout.session.completed with payment_status unpaid", async () => {
    const stripe = fakeStripe();
    const { dispatch } = await import("./stripe-webhook-dispatch");

    const outcome = await dispatch(
      stripe,
      {
        type: "checkout.session.completed",
        data: { object: { payment_status: "unpaid", subscription: "sub_1" } },
      } as unknown as Stripe.Event,
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(mockRecordConfirmedSubscription).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("SPECSFY: AC-008 confirms and sends the claim e-mail once async_payment_succeeded arrives", async () => {
    mockRecordConfirmedSubscription.mockResolvedValue({ firstConfirmation: true });
    const stripe = fakeStripe();
    const { dispatch } = await import("./stripe-webhook-dispatch");

    const outcome = await dispatch(
      stripe,
      {
        type: "checkout.session.async_payment_succeeded",
        data: { object: { payment_status: "paid", subscription: "sub_1" } },
      } as unknown as Stripe.Event,
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not confirm a subscription still incomplete (created but not yet paying)", async () => {
    const stripe = fakeStripe({ subscriptionStatus: "incomplete" });
    const { dispatch } = await import("./stripe-webhook-dispatch");

    const outcome = await dispatch(
      stripe,
      { type: "customer.subscription.created", data: { object: { id: "sub_1" } } } as Stripe.Event,
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(mockRecordConfirmedSubscription).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("never confirms on invoice.payment_failed, even for a pending-purchase customer", async () => {
    const stripe = fakeStripe();
    const { dispatch } = await import("./stripe-webhook-dispatch");

    const outcome = await dispatch(
      stripe,
      { type: "invoice.payment_failed", data: { object: { subscription: "sub_1" } } } as unknown as Stripe.Event,
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(mockRecordConfirmedSubscription).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("delegates a team_id customer to the existing, unchanged syncStripeSubscription", async () => {
    const stripe = fakeStripe({ customerMetadata: { team_id: "team_1" } });
    const { dispatch } = await import("./stripe-webhook-dispatch");

    const outcome = await dispatch(
      stripe,
      { type: "customer.subscription.created", data: { object: { id: "sub_1" } } } as Stripe.Event,
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(mockSyncStripeSubscription).toHaveBeenCalledWith(stripe, "sub_1");
    expect(mockRecordConfirmedSubscription).not.toHaveBeenCalled();
  });
});
