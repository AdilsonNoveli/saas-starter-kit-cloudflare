import type { EmailBrand } from "./props";

// The deployed values are handed to the Emails Worker by infra/emails.ts (which gets
// them from scripts/branding.ts). Templates never read config themselves: they
// receive the brand as an argument, so they stay pure and previewable.
export const emailBrand = (env: {
  BRAND_NAME: string;
  BRAND_DOMAIN: string;
}): EmailBrand => ({
  name: env.BRAND_NAME,
  // Served by apps/web at the production domain (packages/tokens/public/pwa-192x192.png, served by every app).
  logoUrl: `https://${env.BRAND_DOMAIN}/pwa-192x192.png`,
});

// Sample data for `bun run dev` in this package (react-email's preview server) only.
export const previewBrand: EmailBrand = {
  name: "Acme",
  logoUrl: "https://example.com/pwa-192x192.png",
};
