// Build-time facts about the site, shared by nuxt.config.ts and content.config.ts (both run
// in Node before the app exists, so neither can read `useSiteConfig()`).

/**
 * Origin of the site. Set per stage at build time by infra/web.ts (from the branding
 * domain); a local build outside the deploy gets localhost. Feeds @nuxtjs/seo's `site.url`,
 * i18n's `baseUrl` and the sitemap hook, so every absolute URL points at one origin.
 */
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

/** Root-relative path of the social image used by pages that have none of their own. */
export const DEFAULT_OG_IMAGE = "/images/og/default.png";
