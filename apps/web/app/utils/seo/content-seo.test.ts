import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  assertRasterImage,
  bcp47,
  blogPostFromEntry,
  buildArticleSeo,
  buildPageSeo,
  contentNotFound,
  hreflangLinks,
  lastmodWithTime,
  ogLocale,
  OG_IMAGE_SIZE,
  sitemapEntryFor,
  toIsoDateTime,
  type BlogPostInput,
  type SeoContext,
} from "./content-seo";

// Pure builders: no Nuxt auto-imports, no I/O. Every case below is derived from the
// BDD scenarios of specs/*/0001-content-seo-metadata/spec.md (markers: `SPECSFY:`).

const ctx: SeoContext = {
  siteUrl: "https://nuxfire.com",
  siteName: "Nuxfire",
  defaultOgImage: "/images/og/default.png",
  fallbackTitles: ["Nuxfire Docs | Nuxfire", "Nuxfire"],
  labels: { home: "Home", blog: "Blog" },
};

const cluster = {
  en: "git-branching-first-release",
  "pt-br": "git-branches-primeiro-lancamento",
  es: "git-ramas-primer-lanzamiento",
} as const;

const en: BlogPostInput = {
  path: `/blog/${cluster.en}`,
  title: "Git for Your First Release",
  description: "A senior-level manual to ship your first release safely.",
  date: "2026-09-25",
  author: "Nuxfire Team",
  lang: "en",
  category: "DevOps",
  readTime: "14 min",
  tags: ["Git", "GitHub"],
  ogImage: "/images/blog/git-branching-stage-production.png",
  translations: cluster,
};

const pt: BlogPostInput = {
  ...en,
  path: `/blog/${cluster["pt-br"]}`,
  title: "Git para o Primeiro Lançamento",
  description: "Um manual de nível sênior para publicar a primeira versão.",
  author: "Equipe Nuxfire",
  lang: "pt-br",
};

describe("page metadata of a content page (AC-001)", () => {
  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("uses the post title without a second brand suffix and the post description", () => {
    const seo = buildArticleSeo(en, ctx);
    expect(seo.title).toBe("Git for Your First Release");
    expect(seo.description).toBe(en.description);
    expect(seo.meta.ogTitle).toBe(seo.title);
    expect(seo.meta.ogDescription).toBe(en.description);
    expect(seo.title).not.toContain("Nuxfire");
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("emits an absolute canonical equal to og:url", () => {
    const seo = buildArticleSeo(en, ctx);
    expect(seo.canonical).toBe("https://nuxfire.com/blog/git-branching-first-release");
    expect(seo.meta.ogUrl).toBe(seo.canonical);
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("rejects a title equal to the site fallback", () => {
    expect(() => buildArticleSeo({ ...en, title: "Nuxfire Docs | Nuxfire" }, ctx)).toThrow(
      /fallback/i,
    );
    expect(() => buildArticleSeo({ ...en, title: "Nuxfire" }, ctx)).toThrow(/fallback/i);
  });

  // SPECSFY: US-001 FR-001 FR-006 NFR-001 AC-001
  it("rejects an empty title or description instead of inventing one", () => {
    expect(() => buildArticleSeo({ ...en, title: "  " }, ctx)).toThrow(/title/i);
    expect(() => buildArticleSeo({ ...en, description: "" }, ctx)).toThrow(/description/i);
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("builds absolute URLs from a site URL with or without a trailing slash", () => {
    expect(absoluteUrl("https://nuxfire.com", "/blog")).toBe("https://nuxfire.com/blog");
    expect(absoluteUrl("https://nuxfire.com/", "/blog")).toBe("https://nuxfire.com/blog");
    expect(absoluteUrl("https://nuxfire.com", "/")).toBe("https://nuxfire.com/");
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("rejects a relative site URL or a path without a leading slash", () => {
    expect(() => absoluteUrl("nuxfire.com", "/blog")).toThrow(/site url/i);
    expect(() => absoluteUrl("https://nuxfire.com", "blog")).toThrow(/path/i);
  });

  // SPECSFY: US-001 FR-006 NFR-001 AC-001
  it("normalizes a date-only value to midnight UTC and keeps a full ISO datetime", () => {
    expect(toIsoDateTime("2026-09-25")).toBe("2026-09-25T00:00:00Z");
    expect(toIsoDateTime("2026-09-25T10:30:00-03:00")).toBe("2026-09-25T10:30:00-03:00");
    expect(toIsoDateTime("2026-09-25T10:30:00Z")).toBe("2026-09-25T10:30:00Z");
  });

  // SPECSFY: US-001 FR-006 NFR-001 AC-001
  it("rejects impossible dates, other formats and datetimes without a timezone", () => {
    expect(() => toIsoDateTime("2026-02-31")).toThrow(/date/i);
    expect(() => toIsoDateTime("25/09/2026")).toThrow(/date/i);
    expect(() => toIsoDateTime("2026-09-25T10:30:00")).toThrow(/timezone/i);
  });

  // SPECSFY: US-001 FR-007 AC-001 AC-006 NFR-001
  it("treats a missing document as not found", () => {
    expect(contentNotFound(null, { path: "/blog/missing" })).toMatchObject({ statusCode: 404 });
  });
});

describe("mapping a content entry (AC-001)", () => {
  const entry = {
    path: "/blog/x",
    title: "T",
    description: "D",
    date: "2026-09-25",
    updated: null,
    author: "A",
    authorType: null,
    lang: "pt-br",
    category: null,
    tags: ["a"],
    ogImage: "/images/x.png",
    translations: { "pt-br": "x", en: "y", ignored: "z" },
  };

  // SPECSFY: US-001 FR-006 NFR-001 AC-001
  it("maps columns to the builder input and reads null as absent", () => {
    expect(blogPostFromEntry(entry)).toMatchObject({
      path: "/blog/x",
      lang: "pt-br",
      updated: undefined,
      authorType: undefined,
      category: undefined,
      tags: ["a"],
      translations: { "pt-br": "x", en: "y" },
    });
  });

  // SPECSFY: US-001 FR-006 NFR-001 AC-001
  it("keeps only the configured languages of translations", () => {
    expect(Object.keys(blogPostFromEntry(entry).translations ?? {})).toEqual(["en", "pt-br"]);
  });

  // SPECSFY: US-001 FR-006 NFR-001 AC-001
  it("fails loudly for a missing or unknown language and for malformed fields", () => {
    expect(() => blogPostFromEntry({ ...entry, lang: undefined })).toThrow(/lang/);
    expect(() => blogPostFromEntry({ ...entry, lang: "fr" })).toThrow(/unknown language/);
    expect(() => blogPostFromEntry({ ...entry, tags: "a" })).toThrow(/tags/);
    expect(() => blogPostFromEntry({ ...entry, authorType: "Robot" })).toThrow(/authorType/);
    expect(() => blogPostFromEntry({ ...entry, translations: { en: 1 } })).toThrow(/translations.en/);
  });
});

describe("open graph and twitter metadata (AC-002)", () => {
  const withUpdate: BlogPostInput = { ...en, updated: "2026-09-27" };

  // SPECSFY: US-002 FR-002 NFR-001 AC-002
  it("types a post as article with published and modified times", () => {
    const { meta } = buildArticleSeo(withUpdate, ctx);
    expect(meta.ogType).toBe("article");
    expect(meta.articlePublishedTime).toBe("2026-09-25T00:00:00Z");
    expect(meta.articleModifiedTime).toBe("2026-09-27T00:00:00Z");
  });

  // SPECSFY: US-002 FR-002 NFR-001 AC-002
  it("falls back to the publication date when the post was never updated", () => {
    const { meta } = buildArticleSeo(en, ctx);
    expect(meta.articleModifiedTime).toBe(meta.articlePublishedTime);
  });

  // SPECSFY: US-002 FR-002 NFR-001 AC-002
  it("emits section, tags and the author name in meta author, not article:author", () => {
    const { meta } = buildArticleSeo(en, ctx);
    expect(meta.articleSection).toBe("DevOps");
    expect(meta.articleTag).toEqual(["Git", "GitHub"]);
    expect(meta.author).toBe("Nuxfire Team");
    expect(meta).not.toHaveProperty("articleAuthor");
  });

  // SPECSFY: US-002 FR-002 FR-009 NFR-001 AC-002
  it("emits an absolute raster og:image with width, height, type and alt", () => {
    const { meta } = buildArticleSeo(en, ctx);
    expect(meta.ogImage).toBe("https://nuxfire.com/images/blog/git-branching-stage-production.png");
    expect(meta.ogImageWidth).toBe(String(OG_IMAGE_SIZE.width));
    expect(meta.ogImageHeight).toBe(String(OG_IMAGE_SIZE.height));
    expect(meta.ogImageType).toBe("image/png");
    expect(meta.ogImageAlt).toBe(en.title);
  });

  // SPECSFY: US-002 FR-002 FR-009 NFR-001 AC-002
  it("sets twitter:card summary_large_image together with the same image", () => {
    const { meta } = buildArticleSeo(en, ctx);
    expect(meta.twitterCard).toBe("summary_large_image");
    expect(meta.twitterImage).toBe(meta.ogImage);
    expect(meta.twitterImageAlt).toBe(meta.ogImageAlt);
  });

  // SPECSFY: US-002 FR-002 FR-009 NFR-001 AC-002
  it("falls back to the default site image when the post has no ogImage", () => {
    const { meta } = buildArticleSeo({ ...en, ogImage: undefined }, ctx);
    expect(meta.ogImage).toBe("https://nuxfire.com/images/og/default.png");
    expect(meta.twitterImage).toBe(meta.ogImage);
  });

  // SPECSFY: US-002 FR-002 FR-009 FR-006 NFR-001 AC-002
  it("rejects an SVG ogImage and names the offending path", () => {
    expect(() => buildArticleSeo({ ...en, ogImage: "/images/blog/cover.svg" }, ctx)).toThrow(
      /cover\.svg/,
    );
    expect(() => assertRasterImage("/images/blog/cover.svg", "ogImage")).toThrow(/raster/i);
  });

  // SPECSFY: US-002 FR-002 FR-006 NFR-001 AC-002
  it("accepts png and jpeg in any letter case and rejects paths that are not root-relative", () => {
    expect(() => assertRasterImage("/images/a.PNG", "ogImage")).not.toThrow();
    expect(() => assertRasterImage("/images/a.jpeg", "ogImage")).not.toThrow();
    expect(() => assertRasterImage("images/a.png", "ogImage")).toThrow(/root-relative|start with/i);
  });

  // SPECSFY: US-002 FR-002 FR-009 NFR-001 AC-002
  it("gives non-article pages the website type and the default image", () => {
    const seo = buildPageSeo(
      { path: "/license", title: "License", description: "The license.", kind: "website" },
      ctx,
    );
    expect(seo.meta.ogType).toBe("website");
    expect(seo.meta.ogImage).toBe("https://nuxfire.com/images/og/default.png");
    expect(seo.meta.twitterCard).toBe("summary_large_image");
    expect(seo.meta.twitterImage).toBe(seo.meta.ogImage);
    expect(seo.meta).not.toHaveProperty("articlePublishedTime");
  });

  // SPECSFY: US-002 FR-002 NFR-001 AC-002
  it("never sets a twitter card without a twitter image", () => {
    const pages = [
      buildArticleSeo(en, ctx).meta,
      buildArticleSeo({ ...en, ogImage: undefined }, ctx).meta,
      buildPageSeo({ path: "/docs", title: "Docs", description: "d", kind: "docs" }, ctx).meta,
    ];
    for (const meta of pages) {
      if (meta.twitterCard) expect(meta.twitterImage).toBeTruthy();
    }
  });
});

describe("structured data and language (AC-003)", () => {
  // SPECSFY: US-003 FR-004 NFR-001 AC-003
  it("derives the html lang and the og:locale from the post language", () => {
    const seo = buildArticleSeo(pt, ctx);
    expect(seo.htmlLang).toBe("pt-BR");
    expect(seo.meta.ogLocale).toBe("pt_BR");
    expect(bcp47("es")).toBe("es-ES");
    expect(ogLocale("en")).toBe("en_US");
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-003
  it("lists only real translations as og:locale:alternate", () => {
    expect(buildArticleSeo(pt, ctx).meta.ogLocaleAlternate).toEqual(["en_US", "es_ES"]);
    const alone: BlogPostInput = { ...pt, translations: undefined };
    expect(buildArticleSeo(alone, ctx).meta.ogLocaleAlternate).toEqual([]);
  });

  // SPECSFY: US-003 FR-003 NFR-001 AC-003
  it("emits a BlogPosting with the fields Google recommends", () => {
    const { blogPosting } = buildArticleSeo({ ...pt, updated: "2026-09-27" }, ctx).schema;
    expect(blogPosting).toMatchObject({
      "@type": "BlogPosting",
      headline: pt.title,
      description: pt.description,
      datePublished: "2026-09-25T00:00:00Z",
      dateModified: "2026-09-27T00:00:00Z",
      inLanguage: "pt-BR",
      articleSection: ["DevOps"],
      keywords: ["Git", "GitHub"],
      image: ["https://nuxfire.com/images/blog/git-branching-stage-production.png"],
    });
  });

  // SPECSFY: US-003 FR-003 FR-006 NFR-001 AC-003
  it("types the author as Organization by default and as Person when declared", () => {
    expect(buildArticleSeo(pt, ctx).schema.blogPosting.author).toEqual({
      "@type": "Organization",
      name: "Equipe Nuxfire",
    });
    const person = buildArticleSeo({ ...pt, author: "Adilson Noveli", authorType: "Person" }, ctx);
    expect(person.schema.blogPosting.author).toEqual({ "@type": "Person", name: "Adilson Noveli" });
  });

  // SPECSFY: US-003 FR-003 NFR-001 AC-003
  it("builds the breadcrumb Home, Blog, post with absolute URLs", () => {
    expect(buildArticleSeo(pt, ctx).schema.breadcrumb).toEqual([
      { name: "Home", item: "https://nuxfire.com/" },
      { name: "Blog", item: "https://nuxfire.com/blog" },
      { name: pt.title, item: "https://nuxfire.com/blog/git-branches-primeiro-lancamento" },
    ]);
  });

  // SPECSFY: US-003 FR-003 FR-006 NFR-001 AC-003
  it("rejects a post updated before it was published and an unknown language", () => {
    expect(() => buildArticleSeo({ ...en, updated: "2026-09-01" }, ctx)).toThrow(/before/i);
    // @ts-expect-error — simulating frontmatter that escaped the schema.
    expect(() => buildArticleSeo({ ...en, lang: "fr" }, ctx)).toThrow(/language/i);
  });

  // SPECSFY: US-003 FR-004 FR-006 NFR-001 AC-003
  it("keeps the language and the locale tables in one place", () => {
    expect(bcp47("en")).toBe("en-US");
    expect(bcp47("pt-br")).toBe("pt-BR");
    // @ts-expect-error — unknown codes must fail loudly, not fall back.
    expect(() => bcp47("fr")).toThrow(/language/i);
  });
});

describe("hreflang clusters in head and sitemap (AC-004)", () => {
  // SPECSFY: US-003 FR-004 NFR-001 AC-004
  it("lists itself, both siblings and x-default pointing to the English post", () => {
    expect(hreflangLinks(pt, ctx)).toEqual([
      { hreflang: "en-US", href: "https://nuxfire.com/blog/git-branching-first-release" },
      { hreflang: "pt-BR", href: "https://nuxfire.com/blog/git-branches-primeiro-lancamento" },
      { hreflang: "es-ES", href: "https://nuxfire.com/blog/git-ramas-primer-lanzamiento" },
      { hreflang: "x-default", href: "https://nuxfire.com/blog/git-branching-first-release" },
    ]);
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-004
  it("produces the same cluster whichever member asks for it (reciprocity)", () => {
    const fromEn = hreflangLinks(en, ctx);
    const fromPt = hreflangLinks(pt, ctx);
    const fromEs = hreflangLinks({ ...en, path: `/blog/${cluster.es}`, lang: "es" }, ctx);
    expect(fromPt).toEqual(fromEn);
    expect(fromEs).toEqual(fromEn);
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-004
  it("omits x-default when there is no English version", () => {
    const noEn: BlogPostInput = {
      ...pt,
      translations: { "pt-br": cluster["pt-br"], es: cluster.es },
    };
    const links = hreflangLinks(noEn, ctx);
    expect(links.map((link) => link.hreflang)).toEqual(["pt-BR", "es-ES"]);
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-004
  it("declares only itself, with its own language, when there are no translations", () => {
    const alone: BlogPostInput = { ...pt, translations: undefined };
    expect(hreflangLinks(alone, ctx)).toEqual([
      { hreflang: "pt-BR", href: "https://nuxfire.com/blog/git-branches-primeiro-lancamento" },
    ]);
  });

  // SPECSFY: US-003 FR-004 FR-006 NFR-001 AC-004
  it("rejects a cluster that does not contain the post itself", () => {
    const wrong: BlogPostInput = { ...pt, translations: { en: cluster.en, es: cluster.es } };
    expect(() => hreflangLinks(wrong, ctx)).toThrow(/itself|own/i);
    const otherSlug: BlogPostInput = {
      ...pt,
      translations: { ...cluster, "pt-br": "another-slug" },
    };
    expect(() => hreflangLinks(otherSlug, ctx)).toThrow(/itself|own/i);
  });

  // SPECSFY: US-003 FR-004 FR-005 NFR-001 AC-004
  it("gives the sitemap the same alternatives as the head", () => {
    const entry = sitemapEntryFor(pt, ctx);
    expect(entry.alternatives).toEqual(hreflangLinks(pt, ctx));
  });

  // SPECSFY: US-003 FR-005 NFR-001 AC-004
  it("uses updated, else date, as lastmod", () => {
    expect(sitemapEntryFor(pt, ctx).lastmod).toBe("2026-09-25T00:00:00Z");
    expect(sitemapEntryFor({ ...pt, updated: "2026-10-01" }, ctx).lastmod).toBe(
      "2026-10-01T00:00:00Z",
    );
  });

  // SPECSFY: US-003 FR-005 FR-004 NFR-001 AC-004
  it("declares a post with no translations as its own language in the sitemap too", () => {
    const alone: BlogPostInput = { ...pt, translations: undefined };
    expect(sitemapEntryFor(alone, ctx).alternatives).toEqual([
      { hreflang: "pt-BR", href: "https://nuxfire.com/blog/git-branches-primeiro-lancamento" },
    ]);
  });
});

describe("missing blog and legal documents (AC-006)", () => {
  // SPECSFY: US-001 FR-001 FR-007 NFR-001 AC-006
  it("returns a 404 error for a null or undefined document", () => {
    expect(contentNotFound(null, { path: "/blog/x" })).toMatchObject({
      statusCode: 404,
      data: { path: "/blog/x" },
    });
    expect(contentNotFound(undefined, { path: "/license" })).toMatchObject({ statusCode: 404 });
  });

  // SPECSFY: US-001 FR-001 FR-007 NFR-001 AC-006
  it("returns nothing for a document that exists", () => {
    expect(contentNotFound({ title: "License" }, { path: "/license" })).toBeNull();
  });

  // SPECSFY: US-001 FR-001 FR-007 NFR-001 AC-006
  it("carries a status message a person can read", () => {
    const error = contentNotFound(null, { path: "/blog/x" });
    expect(error?.statusMessage).toMatch(/not found/i);
  });
});

describe("missing docs pages (AC-006)", () => {
  // SPECSFY: US-001 FR-001 FR-007 NFR-001 AC-006
  it("treats a docs page without a body as not found", () => {
    expect(contentNotFound({ title: "x" }, { path: "/docs/x", requireBody: true })).toMatchObject({
      statusCode: 404,
    });
    expect(contentNotFound({ body: null }, { path: "/docs/x", requireBody: true })).toMatchObject({
      statusCode: 404,
    });
  });

  // SPECSFY: US-001 FR-001 FR-007 NFR-001 AC-006
  it("accepts a docs page with a body", () => {
    expect(
      contentNotFound({ body: { type: "minimal" } }, { path: "/docs/x", requireBody: true }),
    ).toBeNull();
  });

  // SPECSFY: US-001 FR-001 FR-007 NFR-001 AC-006
  it("does not require a body unless asked to", () => {
    expect(contentNotFound({ title: "x" }, { path: "/docs/x" })).toBeNull();
  });
});

describe("sitemap lastmod with a time (SPEC-0002 DEC-011)", () => {
  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("adds midnight UTC to a date-only lastmod, the meaning DEC-005 gives a date without a time", () => {
    const xml = "<urlset><url><loc>https://a/x</loc><lastmod>2026-09-25</lastmod></url></urlset>";
    expect(lastmodWithTime(xml)).toBe("<urlset><url><loc>https://a/x</loc><lastmod>2026-09-25T00:00:00Z</lastmod></url></urlset>");
  });

  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("leaves a lastmod that already has a time, and a url without lastmod, unchanged", () => {
    const xml = "<urlset><url><loc>https://a/x</loc><lastmod>2026-09-25T10:00:00-03:00</lastmod></url><url><loc>https://a/y</loc></url></urlset>";
    expect(lastmodWithTime(xml)).toBe(xml);
  });

  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("rewrites every date-only lastmod of a sitemap", () => {
    const xml = "<lastmod>2026-09-15</lastmod><lastmod>2026-09-25</lastmod>";
    expect(lastmodWithTime(xml)).toBe("<lastmod>2026-09-15T00:00:00Z</lastmod><lastmod>2026-09-25T00:00:00Z</lastmod>");
  });
});
