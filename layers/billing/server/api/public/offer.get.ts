import { getPublicOfferPlan } from "../../utils/plans";

/**
 * The only thing apps/web's landing page needs to render its Buy CTA without
 * a deploy-time env var: whichever plan the admin flagged `isPublicOffer` in
 * /admin/plans, or `null` while none is set. Public and unauthenticated on
 * purpose — reached from apps/web over a Cloudflare service binding
 * (infra/web.ts's `link: [app]`), never the public internet, so it carries
 * no secret and needs no CORS handling.
 */
export default defineEventHandler(async () => getPublicOfferPlan());
