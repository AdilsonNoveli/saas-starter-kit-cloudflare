import { beforeEach, describe, expect, it, vi } from "vitest";

const basePlan = {
  id: "plan_1",
  name: "Pro",
  description: "For growing teams",
  price: "$29",
  period: "month",
  unitAmount: null as number | null,
  currency: null as string | null,
  isArchived: false,
  isPublicOffer: true,
};

describe("getPublicOfferPlan", () => {
  const mockFindFirst = vi.fn();

  beforeEach(() => {
    mockFindFirst.mockReset();
    vi.stubGlobal("useDB", () => ({
      query: { plans: { findFirst: mockFindFirst } },
    }));
  });

  it("returns null when no plan is flagged as the public offer", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const { getPublicOfferPlan } = await import("./plans");
    const result = await getPublicOfferPlan();

    expect(result).toBeNull();
  });

  it("returns the flagged plan's summary, falling back to the manual price when unmanaged by Stripe", async () => {
    mockFindFirst.mockResolvedValue(basePlan);

    const { getPublicOfferPlan } = await import("./plans");
    const result = await getPublicOfferPlan();

    expect(result).toEqual({
      id: "plan_1",
      name: "Pro",
      description: "For growing teams",
      priceLabel: "$29",
      period: "month",
    });
  });

  it("formats the price from unitAmount/currency for a Stripe-managed plan", async () => {
    mockFindFirst.mockResolvedValue({
      ...basePlan,
      unitAmount: 2900,
      currency: "usd",
    });

    const { getPublicOfferPlan } = await import("./plans");
    const result = await getPublicOfferPlan();

    expect(result?.priceLabel).not.toBe("$29");
    expect(result?.priceLabel).toMatch(/29/);
  });
});

describe("clearPublicOffer", () => {
  it("clears isPublicOffer on every currently-flagged plan", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const tx = { update: vi.fn().mockReturnValue({ set }) };

    const { clearPublicOffer } = await import("./plans");
    await clearPublicOffer(tx as never);

    expect(set).toHaveBeenCalledWith({ isPublicOffer: false });
    expect(where).toHaveBeenCalled();
  });
});
