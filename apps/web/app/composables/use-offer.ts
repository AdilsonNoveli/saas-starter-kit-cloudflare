import { activePrice, formatPrice, OFFER, whatsappUrl } from "~/utils/offer";

// The offer as the landing shows it (SPEC-0003 FR-002): every price, limit and contact on the page
// comes from `~/utils/offer`, formatted for the visitor's language.

/**
 * Whether the launch price is shown. The owner decided a launch price for the first hundred
 * licenses (SPEC-0003 DEC-007). The count is enforced by the checkout, which is a later spec (Q-08):
 * until it exists, publishing the page needs the owner's decision on this flag.
 */
const LAUNCH_OPEN = true;

const INTL: Record<string, string> = { en: "en-US", "pt-br": "pt-BR", es: "es-ES" };

interface PublicOfferPlan {
  id: string;
}

export const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/KSKqVly5tFp2OpUtWrvccY";

export function useOffer() {
  const { locale } = useI18n();
  const config = useRuntimeConfig();

  const intl = computed(() => INTL[locale.value] ?? "en-US");
  const price = (amount: number): string => formatPrice(amount, OFFER.currency, intl.value);

  // The Plan the admin flagged `isPublicOffer` in /admin/plans, read live
  // through this app's own /api/offer route (server/api/offer.get.ts), which
  // in turn reaches apps/app over a Cloudflare service binding — no env var,
  // no redeploy when the admin changes which plan is for sale. `key` dedupes
  // this fetch across every component that calls useOffer() on the same page.
  const { data: publicOffer } = useFetch<PublicOfferPlan | null>("/api/offer", {
    key: "public-offer",
    default: () => null,
  });

  const checkoutUrl = computed(() =>
    publicOffer.value && config.public.appUrl
      ? `${config.public.appUrl}/buy/${publicOffer.value.id}`
      : "",
  );
  const params = computed(() => ({
    launch: price(OFFER.launchPrice),
    regular: price(OFFER.regularPrice),
    limit: OFFER.launchLimit,
    months: OFFER.updateMonths,
    price: price(activePrice(OFFER, LAUNCH_OPEN)),
  }));


  return {
    offer: OFFER,
    launchOpen: LAUNCH_OPEN,
    params,
    checkoutUrl,
    hasCheckout: computed(() => checkoutUrl.value !== ""),
    whatsappGroupUrl: WHATSAPP_GROUP_URL,
    whatsapp: (_message?: string) => WHATSAPP_GROUP_URL,
  };
}
