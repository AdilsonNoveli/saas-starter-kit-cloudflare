import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventName, type Paddle } from "@paddle/paddle-node-sdk";
import type { PaddleSendEmail } from "./paddle-webhook-dispatch";

const mockUpsertSubscription = vi.fn();
vi.mock("./subscription-repository", () => ({
  upsertSubscription: (input: unknown) => mockUpsertSubscription(input),
}));

const mockVerifyPaddleTeam = vi.fn();
const mockVerifyPaddlePendingPurchase = vi.fn();
vi.mock("./paddle-team-signature", () => ({
  verifyPaddleTeam: (...args: unknown[]) => mockVerifyPaddleTeam(...args),
  verifyPaddlePendingPurchase: (...args: unknown[]) =>
    mockVerifyPaddlePendingPurchase(...args),
}));

const mockRecordConfirmedSubscription = vi.fn();
vi.mock("./pending-purchase-repository", () => ({
  recordConfirmedSubscription: (...args: unknown[]) =>
    mockRecordConfirmedSubscription(...args),
}));

const mockDescribeBuyerDestination = vi.fn().mockResolvedValue({ kind: "new_space" });
vi.mock("./buyer-provisioning", () => ({
  describeBuyerDestination: (...args: unknown[]) => mockDescribeBuyerDestination(...args),
}));

function baseSubscriptionEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_paddle_1",
    customerId: "ctm_1",
    status: "active",
    items: [{ price: { id: "pri_1" }, previouslyBilledAt: null, nextBilledAt: null }],
    currentBillingPeriod: null,
    customData: { team_id: "team_1", team_sig: "sig" },
    ...overrides,
  };
}

function fakePaddle() {
  return {
    customers: { get: vi.fn().mockResolvedValue({ email: "buyer@example.com" }) },
  } as unknown as Paddle;
}

const mockPlansFindFirst = vi.fn();
const mockPendingPurchaseFindFirst = vi.fn();

describe("paddle webhook dispatch", () => {
  let sendEmail: PaddleSendEmail;

  beforeEach(() => {
    mockUpsertSubscription.mockReset();
    mockVerifyPaddleTeam.mockReset().mockResolvedValue(true);
    mockVerifyPaddlePendingPurchase.mockReset().mockResolvedValue(true);
    mockRecordConfirmedSubscription.mockReset();
    mockDescribeBuyerDestination.mockReset().mockResolvedValue({ kind: "new_space" });
    mockPlansFindFirst.mockReset().mockResolvedValue({ id: "plan_1" });
    mockPendingPurchaseFindFirst.mockReset().mockResolvedValue({
      id: "pp_1",
      email: "buyer@example.com",
      plan: { id: "plan_1", name: "Starter" },
    });
    sendEmail = vi.fn().mockResolvedValue(true) as unknown as PaddleSendEmail;
    vi.stubGlobal("useDB", () => ({
      query: {
        plans: { findFirst: mockPlansFindFirst },
        pendingPurchases: { findFirst: mockPendingPurchaseFindFirst },
      },
    }));
  });

  it("regression: an existing team_id customer is written through upsertSubscription unchanged", async () => {
    const paddle = fakePaddle();
    const { dispatchPaddleWebhook: dispatch } = await import("./paddle-webhook-dispatch");

    const outcome = await dispatch(
      paddle,
      { eventType: EventName.SubscriptionCreated, data: baseSubscriptionEvent() } as never,
      "secret",
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team_1", providerSubscriptionId: "sub_paddle_1" }),
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("SPECSFY: AC-002 confirms a pending-purchase customer and sends the claim e-mail once", async () => {
    mockRecordConfirmedSubscription.mockResolvedValue({ firstConfirmation: true });
    const paddle = fakePaddle();
    const { dispatchPaddleWebhook: dispatch } = await import("./paddle-webhook-dispatch");

    const outcome = await dispatch(
      paddle,
      {
        eventType: EventName.SubscriptionCreated,
        data: baseSubscriptionEvent({
          customData: { pending_purchase_id: "pp_1", purchase_sig: "sig" },
        }),
      } as never,
      "secret",
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(mockUpsertSubscription).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      "PurchaseClaim",
      expect.objectContaining({ claimLink: "https://app.example.com/claim/pp_1" }),
    );
  });

  it("SPECSFY: AC-007 does not resend the claim e-mail on redelivery", async () => {
    mockRecordConfirmedSubscription.mockResolvedValue({ firstConfirmation: false });
    const paddle = fakePaddle();
    const { dispatchPaddleWebhook: dispatch } = await import("./paddle-webhook-dispatch");

    const outcome = await dispatch(
      paddle,
      {
        eventType: EventName.SubscriptionUpdated,
        data: baseSubscriptionEvent({
          customData: { pending_purchase_id: "pp_1", purchase_sig: "sig" },
        }),
      } as never,
      "secret",
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("SPECSFY: AC-011 rejects a pending-purchase event with an invalid signature", async () => {
    mockVerifyPaddlePendingPurchase.mockResolvedValue(false);
    const paddle = fakePaddle();
    const { dispatchPaddleWebhook: dispatch } = await import("./paddle-webhook-dispatch");

    const outcome = await dispatch(
      paddle,
      {
        eventType: EventName.SubscriptionCreated,
        data: baseSubscriptionEvent({
          customData: { pending_purchase_id: "pp_1", purchase_sig: "bad" },
        }),
      } as never,
      "secret",
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: false, reason: "Invalid purchase signature" });
    expect(mockRecordConfirmedSubscription).not.toHaveBeenCalled();
  });

  it("does not confirm a pending-purchase subscription that is not yet active", async () => {
    const paddle = fakePaddle();
    const { dispatchPaddleWebhook: dispatch } = await import("./paddle-webhook-dispatch");

    const outcome = await dispatch(
      paddle,
      {
        eventType: EventName.SubscriptionCreated,
        data: baseSubscriptionEvent({
          status: "past_due",
          customData: { pending_purchase_id: "pp_1", purchase_sig: "sig" },
        }),
      } as never,
      "secret",
      sendEmail,
      "https://app.example.com",
    );

    expect(outcome).toEqual({ ok: true });
    expect(mockRecordConfirmedSubscription).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
