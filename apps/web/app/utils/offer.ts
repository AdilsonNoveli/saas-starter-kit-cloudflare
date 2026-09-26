// The offer of the landing in one place (SPEC-0003 FR-002, FR-013): the visible text, the structured
// data and, later, the checkout read the same numbers. Nothing here talks to a network.

export interface Offer {
  /** ISO 4217 code of the currency the price is charged in. */
  currency: string;
  /** Price after the launch, in whole currency units. */
  regularPrice: number;
  /** Price for the first `launchLimit` licenses, in whole currency units. */
  launchPrice: number;
  /** How many licenses are sold at the launch price. */
  launchLimit: number;
  /** Months of updates included in the price. */
  updateMonths: number;
  support: {
    /** International number, digits only, for example `5511940204449`. */
    whatsapp: string;
  };
}

/** The owner's offer, confirmed on 2026-09-25 (SPEC-0003 DEC-006, DEC-007). */
export const OFFER: Offer = {
  currency: "BRL",
  regularPrice: 497,
  launchPrice: 97,
  launchLimit: 100,
  updateMonths: 12,
  support: { whatsapp: "5511940204449" },
};

/** What is wrong with an offer, in words; an empty list means it is valid. */
export function validateOffer(offer: Offer): string[] {
  const problems: string[] = [];
  if (!/^[A-Z]{3}$/.test(offer.currency)) problems.push("currency must be a three-letter ISO 4217 code such as BRL");
  if (!(offer.regularPrice > 0)) problems.push("regularPrice must be above 0");
  if (!(offer.launchPrice > 0) || !(offer.launchPrice < offer.regularPrice)) problems.push("launchPrice must be above 0 and below regularPrice");
  if (!Number.isInteger(offer.launchLimit) || offer.launchLimit < 1) problems.push("launchLimit must be a whole number of 1 or more");
  if (!Number.isInteger(offer.updateMonths) || offer.updateMonths < 1) problems.push("updateMonths must be a whole number of 1 or more");
  if (!/^\d{10,15}$/.test(offer.support.whatsapp)) problems.push("support.whatsapp must be 10 to 15 digits, with the country code and no signs");
  return problems;
}

/** The price the visitor is shown: the launch price while the launch is open, the regular one after. */
export function activePrice(offer: Offer, launchOpen: boolean): number {
  return launchOpen ? offer.launchPrice : offer.regularPrice;
}

/** A price as text for a locale, for example `R$ 97,00` in pt-BR. */
export function formatPrice(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

/** `https://wa.me/<digits>` with an optional message. */
export function whatsappUrl(number: string, message?: string): string {
  if (!/^\d+$/.test(number)) throw new Error("the WhatsApp number must be digits only");
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * JSON-LD for the landing: a software application with its offer. It has no rating, no review and no
 * FAQ: none of them is backed by reviews that can be shown (Google structured data policies).
 */
export function offerSchema(
  offer: Offer,
  page: { name: string; url: string; description: string },
  launchOpen: boolean,
): {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  url: string;
  description: string;
  applicationCategory: "DeveloperApplication";
  operatingSystem: string;
  offers: { "@type": "Offer"; price: number; priceCurrency: string; url: string };
} {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: page.name,
    url: page.url,
    description: page.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    offers: { "@type": "Offer", price: activePrice(offer, launchOpen), priceCurrency: offer.currency, url: page.url },
  };
}
