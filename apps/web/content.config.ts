import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: "page",
      source: "docs/**",
    }),
    blog: defineCollection({
      type: "page",
      source: "blog/**",
      schema: z.object({
        date: z.string(),
        author: z.string(),
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
