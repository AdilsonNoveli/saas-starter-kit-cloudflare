import { authEmail, prodDomain } from "../../config";

// Branding shared by every e-mail template. Derived from the root config.ts so
// installing Nuxfire for a new domain never leaves another product's name or
// logo host in the messages (the logo is served by apps/web at the production
// domain — apps/web/public/pwa-192x192.png).
export const emailBrand = {
  name: authEmail.name,
  logoUrl: `https://${prodDomain}/pwa-192x192.png`,
};
