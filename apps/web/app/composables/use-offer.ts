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

export function useOffer() {
  const { locale } = useI18n();
  const config = useRuntimeConfig();

  const intl = computed(() => INTL[locale.value] ?? "en-US");
  const price = (amount: number): string => formatPrice(amount, OFFER.currency, intl.value);

  const checkoutUrl = computed(() => (config.public.checkoutUrl as string | undefined) || OFFER.checkoutUrl);
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
    whatsapp: (message: string) => whatsappUrl(OFFER.support.whatsapp, message),
  };
}
