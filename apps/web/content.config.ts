import { defineCollection, defineContentConfig, z } from "@nuxt/content";
import { CONTENT_LANGS } from "./i18n/supported-locales";
import { toIsoDateTime } from "./app/utils/seo/content-seo";

/** A date or datetime the SEO builders can turn into ISO 8601 with a timezone. */
const isoDate = z.string().refine(
  (value) => {
    try {
      toIsoDateTime(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Use YYYY-MM-DD or a full ISO 8601 datetime with a timezone" },
);

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: "page",
      source: "docs/**",
    }),
    // Translations of the docs, served at the same /docs/... URLs. The page and
    // the navigation pick the collection of the active locale and fall back to
    // `docs` (English) for anything that is not translated. See
    // app/composables/use-docs-locale.ts.
    docs_pt_br: defineCollection({
      type: "page",
      source: { include: "pt-br/docs/**", prefix: "/docs" },
    }),
    docs_es: defineCollection({
      type: "page",
      source: { include: "es/docs/**", prefix: "/docs" },
    }),
    blog: defineCollection({
      type: "page",
      source: "blog/**",
      schema: z.object({
        date: isoDate,
        updated: isoDate.optional(),
        author: z.string(),
        authorType: z.enum(["Person", "Organization"]).optional(),
        lang: z.enum(CONTENT_LANGS),
        translations: z.record(z.enum(CONTENT_LANGS), z.string()).optional(),
        category: z.string().optional(),
        readTime: z.string().optional(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
        ogImage: z
          .string()
          .regex(/^\/.*\.(png|jpe?g)$/i, "Use a root-relative png or jpeg path")
          .optional(),
      }),
    }),
    faqs: defineCollection({
      type: "page",
      source: "faqs/**",
    }),
    // license.md, privacy-policy.md, terms-of-service.md — loose files directly
    // under content/, not matched by the docs/blog/faqs globs above.
    legal: defineCollection({
      type: "page",
      source: "*.md",
    }),
  },
});
