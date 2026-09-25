import { queryCollection } from "@nuxt/content/server";
import { getSiteConfig } from "#site-config/server/composables/getSiteConfig";
import { DEFAULT_OG_IMAGE } from "../../site";
import { blogPostFromEntry, sitemapEntryFor, type SeoContext } from "../../app/utils/seo/content-seo";

// Gives every blog post its real `lastmod` and hreflang cluster in the sitemap, taken from
// the same builders that write the page head, so the two can never disagree (Google treats
// them as equivalent methods and ignores annotations that contradict each other).
//
// A Nitro hook, not the `onUrl` of `defineSitemapSchema()`: the sitemap module serializes
// that function to text for a virtual module, so it cannot use imports or closures. This
// runs with the full server context. The hook fires for the prerendered sitemaps at build
// time and for any sitemap generated at runtime.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("sitemap:resolved", async ({ urls, event }) => {
    const site = getSiteConfig(event);
    const context: SeoContext = {
      siteUrl: site.url ?? "",
      siteName: site.name ?? "",
      defaultOgImage: DEFAULT_OG_IMAGE,
      fallbackTitles: [],
      labels: { home: "", blog: "" },
    };
    const entries = await queryCollection(event, "blog").all();
    const posts = new Map(entries.map((entry) => [entry.path, blogPostFromEntry({ ...entry })]));

    for (const url of urls) {
      const post = posts.get(new URL(url.loc, context.siteUrl).pathname);
      if (post) Object.assign(url, sitemapEntryFor(post, context));
    }
  });
});
