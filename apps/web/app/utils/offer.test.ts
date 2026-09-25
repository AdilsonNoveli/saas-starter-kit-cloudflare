import { describe, expect, it } from "vitest";
import { activePrice, formatPrice, offerSchema, validateOffer, whatsappUrl, type Offer } from "./offer";

// BDD source: specs/draft/0003-landing-refactor-one-offer/spec.md (AC-001, AC-003; FR-001, FR-002, FR-013).
// The price, the launch limit, the support number and the checkout address live in one place;
// the visible text, the structured data and (later) the checkout read it.

const OFFER: Offer = {
  currency: "BRL",
  regularPrice: 497,
  launchPrice: 97,
  launchLimit: 100,
  updateMonths: 12,
  checkoutUrl: "",
  support: { whatsapp: "5511940204449" },
};

describe("the offer configuration (FR-002)", () => {
  // SPECSFY: US-001 FR-002 AC-001
  it("accepts the owner's offer", () => {
    expect(validateOffer(OFFER)).toEqual([]);
  });

  // SPECSFY: US-001 FR-002 AC-001
  it("rejects a launch price that is not below the regular price, or a limit that is not a whole number", () => {
    expect(validateOffer({ ...OFFER, launchPrice: 497 }).join(" ")).toContain("launchPrice");
    expect(validateOffer({ ...OFFER, launchLimit: 0 }).join(" ")).toContain("launchLimit");
    expect(validateOffer({ ...OFFER, launchLimit: 10.5 }).join(" ")).toContain("launchLimit");
    expect(validateOffer({ ...OFFER, updateMonths: 0 }).join(" ")).toContain("updateMonths");
  });

  // SPECSFY: US-001 FR-002 FR-013 AC-001
  it("rejects a currency that is not a three-letter code, a support number that is not digits, and a checkout address that is not https", () => {
    expect(validateOffer({ ...OFFER, currency: "R$" as never }).join(" ")).toContain("currency");
    expect(validateOffer({ ...OFFER, support: { whatsapp: "+55 11 94020-4449" } }).join(" ")).toContain("whatsapp");
    expect(validateOffer({ ...OFFER, checkoutUrl: "http://pay.example.com" }).join(" ")).toContain("checkoutUrl");
    expect(validateOffer({ ...OFFER, checkoutUrl: "https://buy.stripe.com/abc" })).toEqual([]);
  });
});

describe("what the visitor is shown (FR-001, FR-002)", () => {
  // SPECSFY: US-001 FR-002 AC-001
  it("shows the launch price while the launch is open and the regular price afterwards", () => {
    expect(activePrice(OFFER, true)).toBe(97);
    expect(activePrice(OFFER, false)).toBe(497);
  });

  // SPECSFY: US-001 FR-002 AC-001
  it("formats the price in reais for each language", () => {
    const plain = (value: string): string => value.replace(/\s/g, " ");
    expect(plain(formatPrice(97, "BRL", "pt-BR"))).toBe("R$ 97,00");
    expect(plain(formatPrice(497, "BRL", "pt-BR"))).toBe("R$ 497,00");
    expect(formatPrice(97, "BRL", "en")).toContain("97.00");
    expect(formatPrice(97, "BRL", "es")).toContain("97,00");
  });
});

describe("support contact (FR-013)", () => {
  // SPECSFY: US-001 FR-013 AC-001
  it("builds a wa.me link from digits and encodes the message", () => {
    expect(whatsappUrl("5511940204449")).toBe("https://wa.me/5511940204449");
    expect(whatsappUrl("5511940204449", "Olá, quero falar")).toBe("https://wa.me/5511940204449?text=Ol%C3%A1%2C%20quero%20falar");
  });

  // SPECSFY: US-001 FR-013 AC-001
  it("refuses a number with anything but digits", () => {
    expect(() => whatsappUrl("+55 11 94020-4449")).toThrow(/digits/);
  });
});

describe("structured data (FR-008, AC-003)", () => {
  const schema = offerSchema(OFFER, { name: "Nuxfire", url: "https://nuxfire.com/pt-br", description: "Kit para SaaS" }, true);

  // SPECSFY: US-003 FR-008 AC-003
  it("describes a software application with the price the visitor sees", () => {
    expect(schema["@type"]).toBe("SoftwareApplication");
    expect(schema.applicationCategory).toBe("DeveloperApplication");
    expect(schema.offers).toMatchObject({ "@type": "Offer", price: 97, priceCurrency: "BRL" });
    expect(offerSchema(OFFER, { name: "Nuxfire", url: "https://nuxfire.com", description: "x" }, false).offers.price).toBe(497);
  });

  // SPECSFY: US-003 FR-008 AC-003
  it("carries no rating, review or FAQ: none is backed by real reviews", () => {
    const text = JSON.stringify(schema);
    expect(text).not.toMatch(/aggregateRating|"review"|FAQPage/);
  });
});
