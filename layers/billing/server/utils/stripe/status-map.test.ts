import { describe, expect, it } from "vitest";
import { SubscriptionStatus } from "../../../shared/types/enums";
import { mapStripeStatus } from "./status-map";

describe("mapStripeStatus", () => {
  it("maps every Stripe subscription status Stripe can actually send", () => {
    // One assertion per status Stripe's own SDK type declares — not a sample.
    // This is what would have caught the original bug: the map used to carry
    // a key ("expired") that is not a real Stripe status, while silently
    // missing "trialing" and "unpaid", both of which are.
    expect(mapStripeStatus("active")).toBe(SubscriptionStatus.ACTIVE);
    expect(mapStripeStatus("trialing")).toBe(SubscriptionStatus.TRIALING);
    expect(mapStripeStatus("past_due")).toBe(SubscriptionStatus.PAST_DUE);
    expect(mapStripeStatus("paused")).toBe(SubscriptionStatus.PAUSED);
    expect(mapStripeStatus("canceled")).toBe(SubscriptionStatus.CANCELED);
    expect(mapStripeStatus("unpaid")).toBe(SubscriptionStatus.UNPAID);
    expect(mapStripeStatus("incomplete")).toBe(SubscriptionStatus.INCOMPLETE);
  });

  it("treats incomplete_expired as terminal (CANCELED), not INCOMPLETE", () => {
    // The first invoice went unpaid and was voided — no further billing
    // happens, so this must not read as "still trying to start".
    expect(mapStripeStatus("incomplete_expired")).toBe(
      SubscriptionStatus.CANCELED,
    );
  });
});
