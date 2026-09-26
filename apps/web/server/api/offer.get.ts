import type { H3Event } from "h3";

interface PublicOfferPlan {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  period: string;
}

type AppBinding = { fetch: typeof fetch };

/**
 * Whichever plan the admin flagged `isPublicOffer` in /admin/plans, or
 * `null`. Proxies apps/app's own `GET /api/public/offer` — reached over the
 * Cloudflare service binding set up in infra/web.ts (`link: [contentDatabase, app]`),
 * the binding key being the linked Worker's own SST resource name
 * (`AppWorker`, same convention as `env.Auth`/`env.Emails` elsewhere in this
 * project). A plain fetch() to the public URL is the fallback for local dev,
 * where `sst dev` may not have the binding wired up — mirrors
 * apps/app/server/utils/auth.ts's getClient() exactly.
 *
 * This is why the landing page never needs a `CHECKOUT_URL` env var or a
 * redeploy when the admin changes the offer: the client's own render reads
 * this route fresh on every request.
 */
export default defineEventHandler(async (event: H3Event) => {
  const appUrl = useRuntimeConfig(event).public.appUrl;
  if (!appUrl) return null;

  const binding = (
    event.context as { cloudflare?: { env?: { AppWorker?: AppBinding } } }
  )?.cloudflare?.env?.AppWorker;
  const doFetch = binding ? binding.fetch.bind(binding) : fetch;

  try {
    const response = await doFetch(`${appUrl}/api/public/offer`);
    if (!response.ok) return null;
    return (await response.json()) as PublicOfferPlan | null;
  } catch {
    return null;
  }
});
