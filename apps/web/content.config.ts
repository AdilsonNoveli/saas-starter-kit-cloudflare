import { defineCollection, defineContentConfig, z } from "@nuxt/content";

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
        date: z.string(),
        author: z.string(),
        category: z.string().optional(),
        readTime: z.string().optional(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
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
