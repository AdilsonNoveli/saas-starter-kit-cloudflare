import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { pngSize } from "./og-images";
import {
  auditPage,
  auditSite,
  lintPosts,
  parseHead,
  parseSitemap,
  type AuditContext,
  type ImageInfo,
  type PageHtml,
  type PostFile,
  type Violation,
} from "./seo-rules";

// BDD source: specs/*/0001-content-seo-metadata/spec.md (AC-005). Every case is one
// violation of one named rule, or the proof that a clean site passes.

const SITE = "https://nuxfire.com";
const CLUSTER = {
  en: "git-first-release",
  "pt-br": "git-primeiro-lancamento",
  es: "git-primer-lanzamiento",
} as const;

/** A 1200x675 PNG header: enough for `pngSize`, which reads only the IHDR chunk. */
function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

const images = new Map<string, ImageInfo>([
  ["/images/og/default.png", { exists: true, width: 1200, height: 675 }],
  ["/images/blog/git.png", { exists: true, width: 1200, height: 675 }],
  ["/images/blog/small.png", { exists: true, width: 800, height: 450 }],
]);

const auditCtx: AuditContext = {
  siteUrl: SITE,
  siteName: "Nuxfire",
  fallbackTitles: ["Nuxfire Docs | Nuxfire", "Nuxfire | Nuxfire", "Nuxfire"],
  fallbackDescriptions: ["Production-ready enterprise-grade Nuxt starter kit for Cloudflare."],
  fallbackDescriptionAllowed: [],
  expectedImage: { width: 1200, height: 675 },
  image: (publicPath) => images.get(publicPath) ?? { exists: false },
};

interface Fixture {
  lang: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogUrl: string | null;
  ogType: string;
  ogImage: string | null;
  ogLocale: string;
  twitterCard: string | null;
  twitterImage: string | null;
  published: string | null;
  robots: string | null;
  h1: string[];
  hreflang: { hreflang: string; href: string }[];
  jsonLd: unknown | null;
}

function postUrl(slug: string): string {
  return `${SITE}/blog/${slug}`;
}

function blogPosting(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "@type": "BlogPosting",
    headline: "Git for Your First Release",
    description: "A manual.",
    image: [`${SITE}/images/blog/git.png`],
    datePublished: "2026-09-25T00:00:00Z",
    dateModified: "2026-09-25T00:00:00Z",
    author: { "@type": "Organization", name: "Nuxfire Team" },
    inLanguage: "en-US",
    ...overrides,
  };
}

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  const url = postUrl(CLUSTER.en);
  return {
    lang: "en-US",
    title: "Git for Your First Release | Nuxfire",
    description: "A senior-level manual to ship your first release safely.",
    canonical: url,
    ogTitle: "Git for Your First Release",
    ogDescription: "A senior-level manual to ship your first release safely.",
    ogUrl: url,
    ogType: "article",
    ogImage: `${SITE}/images/blog/git.png`,
    ogLocale: "en_US",
    twitterCard: "summary_large_image",
    twitterImage: `${SITE}/images/blog/git.png`,
    published: "2026-09-25T00:00:00Z",
    robots: null,
    h1: ["Git for Your First Release"],
    hreflang: [{ hreflang: "en-US", href: url }],
    jsonLd: { "@context": "https://schema.org", "@graph": [blogPosting()] },
    ...overrides,
  };
}

function html(f: Fixture): string {
  const tag = (s: string | null): string => s ?? "";
  const meta = (attr: "name" | "property", key: string, value: string | null): string =>
    value === null ? "" : `<meta ${attr}="${key}" content="${value}">`;
  const links = f.hreflang
    .map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${l.href}">`)
    .join("");
  return [
    `<!DOCTYPE html><html dir="ltr" lang="${f.lang}"><head>`,
    f.title === null ? "" : `<title>${tag(f.title)}</title>`,
    meta("name", "description", f.description),
    f.canonical === null ? "" : `<link rel="canonical" href="${f.canonical}">`,
    meta("property", "og:title", f.ogTitle),
    meta("property", "og:description", f.ogDescription),
    meta("property", "og:url", f.ogUrl),
    meta("property", "og:type", f.ogType),
    meta("property", "og:image", f.ogImage),
    meta("property", "og:locale", f.ogLocale),
    meta("name", "twitter:card", f.twitterCard),
    meta("name", "twitter:image", f.twitterImage),
    meta("property", "article:published_time", f.published),
    meta("name", "robots", f.robots),
    links,
    f.jsonLd === null
      ? ""
      : `<script type="application/ld+json">${JSON.stringify(f.jsonLd)}</script>`,
    "</head><body>",
    f.h1.map((text) => `<h1 class="x">${text}</h1>`).join(""),
    "</body></html>",
  ].join("");
}

function page(overrides: Partial<Fixture> = {}, url = `/blog/${CLUSTER.en}`): PageHtml {
  return { url, html: html(fixture(overrides)) };
}

const rules = (violations: Violation[]): string[] => [...new Set(violations.map((v) => v.rule))].sort();

// ---------------------------------------------------------------------------------
// Source lint: frontmatter of the posts (AC-005, T005)
// ---------------------------------------------------------------------------------

function post(slug: string, lang: string, extra: Record<string, unknown> = {}): PostFile {
  return {
    file: `content/blog/${slug}.md`,
    slug,
    frontmatter: {
      title: `Title ${slug}`,
      description: `Description ${slug}`,
      date: "2026-09-25",
      author: "Nuxfire Team",
      lang,
      ogImage: "/images/blog/git.png",
      translations: { en: CLUSTER.en, "pt-br": CLUSTER["pt-br"], es: CLUSTER.es },
      ...extra,
    },
  };
}

const lintCtx = {
  langs: ["en", "pt-br", "es"],
  publicFileExists: (publicPath: string): boolean => images.get(publicPath)?.exists ?? false,
};

const cleanPosts = (): PostFile[] => [
  post(CLUSTER.en, "en"),
  post(CLUSTER["pt-br"], "pt-br"),
  post(CLUSTER.es, "es"),
];

describe("source lint of post frontmatter (AC-005)", () => {
  // SPECSFY: US-004 FR-008 FR-006 AC-005
  it("passes a clean translation cluster", () => {
    expect(lintPosts(cleanPosts(), lintCtx)).toEqual([]);
  });

  // SPECSFY: US-004 FR-006 FR-008 US-001 AC-005
  it("requires lang and names the file", () => {
    const posts = cleanPosts();
    delete posts[0].frontmatter.lang;
    const found = lintPosts(posts, lintCtx);
    expect(rules(found)).toContain("post-lang-required");
    expect(found.find((v) => v.rule === "post-lang-required")?.where).toBe(posts[0].file);
  });

  // SPECSFY: US-004 FR-006 FR-008 FR-004 AC-005
  it("rejects a language that is not a configured locale", () => {
    const posts = cleanPosts();
    posts[0].frontmatter.lang = "fr";
    expect(rules(lintPosts(posts, lintCtx))).toContain("post-lang-valid");
  });

  // SPECSFY: US-004 FR-006 FR-008 US-001 FR-001 AC-005
  it("requires a title and a description", () => {
    const posts = cleanPosts();
    posts[0].frontmatter.title = "";
    posts[1].frontmatter.description = " ";
    expect(rules(lintPosts(posts, lintCtx))).toEqual(
      expect.arrayContaining(["post-title-required", "post-description-required"]),
    );
  });

  // SPECSFY: US-004 FR-006 FR-008 AC-005
  it("rejects invalid dates and an update before the publication", () => {
    const posts = cleanPosts();
    posts[0].frontmatter.date = "25/09/2026";
    posts[1].frontmatter.updated = "2026-09-01";
    expect(rules(lintPosts(posts, lintCtx))).toEqual(
      expect.arrayContaining(["post-date-iso", "post-updated-order"]),
    );
  });

  // SPECSFY: US-004 FR-004 FR-006 FR-008 US-003 AC-005
  it("requires the cluster to contain the post itself", () => {
    const posts = cleanPosts();
    posts[0].frontmatter.translations = { "pt-br": CLUSTER["pt-br"], es: CLUSTER.es };
    expect(rules(lintPosts(posts, lintCtx))).toContain("post-translations-self");
  });

  // SPECSFY: US-004 FR-004 FR-006 FR-008 US-003 AC-005
  it("rejects a translation whose target does not exist", () => {
    const posts = cleanPosts().slice(0, 2);
    const found = lintPosts(posts, lintCtx);
    expect(rules(found)).toContain("post-translations-target-exists");
    expect(found.some((v) => v.message.includes(CLUSTER.es))).toBe(true);
  });

  // SPECSFY: US-004 FR-004 FR-006 FR-008 US-003 AC-005
  it("rejects a translation whose target is written in another language", () => {
    const posts = cleanPosts();
    posts[2].frontmatter.lang = "pt-br";
    expect(rules(lintPosts(posts, lintCtx))).toContain("post-translations-lang-match");
  });

  // SPECSFY: US-004 FR-004 FR-006 FR-008 US-003 AC-005
  it("rejects a translation that does not reference back and names both files", () => {
    const posts = cleanPosts();
    posts[2].frontmatter.translations = { es: CLUSTER.es, en: CLUSTER.en };
    const found = lintPosts(posts, lintCtx).filter((v) => v.rule === "post-translations-reciprocal");
    expect(found.length).toBeGreaterThan(0);
    const text = found.map((v) => `${v.where} ${v.message}`).join(" ");
    expect(text).toContain(CLUSTER["pt-br"]);
    expect(text).toContain(CLUSTER.es);
  });

  // SPECSFY: US-004 US-002 FR-002 FR-006 FR-008 AC-005
  it("rejects an SVG ogImage", () => {
    const posts = cleanPosts();
    posts[0].frontmatter.ogImage = "/images/blog/git.svg";
    expect(rules(lintPosts(posts, lintCtx))).toContain("post-ogimage-raster");
  });

  // SPECSFY: US-004 US-002 FR-002 FR-006 FR-008 AC-005
  it("rejects an ogImage that does not exist in public", () => {
    const posts = cleanPosts();
    posts[0].frontmatter.ogImage = "/images/blog/ghost.png";
    expect(rules(lintPosts(posts, lintCtx))).toContain("post-ogimage-exists");
  });

  // SPECSFY: US-004 FR-006 FR-008 US-003 FR-004 AC-005
  it("rejects a post that has no translations: the site follows the language of the visitor", () => {
    const alone = post("solo", "pt-br", { translations: undefined, ogImage: undefined });
    const found = lintPosts([alone], lintCtx).filter((v) => v.rule === "post-translations-complete");
    expect(found).toHaveLength(1);
    expect(found[0].where).toBe(alone.file);
    expect(found[0].message).toContain("en, pt-br, es");
  });

  // SPECSFY: US-004 FR-006 FR-008 US-003 FR-004 AC-005
  it("rejects a cluster that lacks a configured language and names the missing one", () => {
    const pair = { en: CLUSTER.en, "pt-br": CLUSTER["pt-br"] };
    const posts = [
      post(CLUSTER.en, "en", { translations: pair }),
      post(CLUSTER["pt-br"], "pt-br", { translations: pair }),
    ];
    const found = lintPosts(posts, lintCtx).filter((v) => v.rule === "post-translations-complete");
    expect(found).toHaveLength(2);
    expect(found[0].message).toContain("es");
  });

  // SPECSFY: US-004 FR-006 FR-008 AC-005
  it("accepts a post without ogImage when its cluster is complete", () => {
    const posts = cleanPosts();
    posts.forEach((entry) => delete entry.frontmatter.ogImage);
    expect(lintPosts(posts, lintCtx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------
// Build audit: one page at a time (AC-005, T006)
// ---------------------------------------------------------------------------------

describe("head parsing (AC-005)", () => {
  // SPECSFY: US-004 FR-008 FR-001 AC-005
  it("reads title, headings, language and meta whatever the attribute order", () => {
    const head = parseHead(
      `<html lang="pt-BR"><head><title>A &amp; B</title><meta content="x" property="og:title"></head><body><h1>t</h1><h1>u</h1></body></html>`,
    );
    expect(head.htmlLang).toBe("pt-BR");
    expect(head.title).toBe("A & B");
    expect(head.h1Count).toBe(2);
    expect(head.meta.get("property:og:title")).toEqual(["x"]);
  });

  // SPECSFY: US-004 FR-008 FR-001 AC-005
  it("keeps a `>` that sits inside a quoted attribute value", () => {
    const head = parseHead(
      `<html><head><meta name="description" content="Anatomy of specs/<state>/<NNNN>-<slug>/spec.md."><link rel="alternate" hreflang="en" href="https://a/b?x=<y>"></head></html>`,
    );
    expect(head.meta.get("name:description")).toEqual(["Anatomy of specs/<state>/<NNNN>-<slug>/spec.md."]);
    expect(head.links).toEqual([{ rel: "alternate", href: "https://a/b?x=<y>", hreflang: "en" }]);
  });

  // SPECSFY: US-004 FR-008 FR-001 AC-005
  it("recognizes a meta refresh redirect stub", () => {
    expect(parseHead('<html><head><meta http-equiv="refresh" content="0; url=/docs"></head></html>').redirect).toBe(true);
    expect(parseHead("<html><head><title>x</title></head></html>").redirect).toBe(false);
  });

  // SPECSFY: US-004 FR-008 FR-003 AC-005
  it("collects every JSON-LD block and tolerates an invalid one", () => {
    const head = parseHead(
      `<html><head><script type="application/ld+json">{"a":1}</script><script type="application/ld+json">{oops</script></head></html>`,
    );
    expect(head.jsonLd).toEqual([{ a: 1 }]);
    expect(head.jsonLdInvalid).toBe(1);
  });
});

describe("build audit of one page (AC-005)", () => {
  // SPECSFY: US-004 FR-008 US-001 US-002 US-003 AC-005
  it("passes a complete post page", () => {
    expect(auditPage(page(), auditCtx)).toEqual([]);
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("rejects a missing title and a fallback title", () => {
    expect(rules(auditPage(page({ title: null }), auditCtx))).toContain("title-present");
    expect(rules(auditPage(page({ title: "Nuxfire Docs | Nuxfire | Nuxfire" }), auditCtx))).toEqual(
      expect.arrayContaining(["title-not-fallback", "title-no-repeated-segment"]),
    );
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("accepts the docs title pattern with two different segments", () => {
    const docs = page({ title: "Quick Start Guide - Nuxfire Docs | Nuxfire" }, "/docs/x");
    expect(rules(auditPage(docs, auditCtx))).not.toContain("title-no-repeated-segment");
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("rejects a missing description and the site default description", () => {
    expect(rules(auditPage(page({ description: null }), auditCtx))).toContain("description-present");
    const generic = "Production-ready enterprise-grade Nuxt starter kit for Cloudflare.";
    expect(rules(auditPage(page({ description: generic }), auditCtx))).toContain(
      "description-not-fallback",
    );
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("requires exactly one h1", () => {
    expect(rules(auditPage(page({ h1: [] }), auditCtx))).toContain("h1-single");
    expect(rules(auditPage(page({ h1: ["a", "b"] }), auditCtx))).toContain("h1-single");
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("rejects a relative canonical and a canonical that differs from og:url", () => {
    expect(rules(auditPage(page({ canonical: "/blog/x", ogUrl: "/blog/x" }), auditCtx))).toContain(
      "canonical-absolute",
    );
    expect(rules(auditPage(page({ ogUrl: `${SITE}/blog/other` }), auditCtx))).toContain(
      "canonical-og-url",
    );
  });

  // SPECSFY: US-004 FR-008 US-002 FR-002 FR-009 AC-005
  it("rejects an og:image that is missing, relative, absent from the output or SVG", () => {
    expect(rules(auditPage(page({ ogImage: null, twitterImage: null }), auditCtx))).toContain(
      "og-image-absolute",
    );
    expect(rules(auditPage(page({ ogImage: "/images/blog/git.png" }), auditCtx))).toContain(
      "og-image-absolute",
    );
    expect(rules(auditPage(page({ ogImage: `${SITE}/images/blog/ghost.png` }), auditCtx))).toContain(
      "og-image-exists",
    );
    expect(rules(auditPage(page({ ogImage: `${SITE}/images/blog/git.svg` }), auditCtx))).toContain(
      "og-image-raster",
    );
  });

  // SPECSFY: US-004 FR-008 US-002 FR-002 FR-009 AC-005
  it("rejects an og:image that is not 1200 by 675 pixels", () => {
    const wrong = page({ ogImage: `${SITE}/images/blog/small.png` });
    expect(rules(auditPage(wrong, auditCtx))).toContain("og-image-size");
  });

  // SPECSFY: US-004 FR-008 US-002 FR-002 AC-005
  it("rejects a summary_large_image card without an image", () => {
    const found = auditPage(page({ ogImage: null, twitterImage: null }), auditCtx);
    expect(rules(found)).toContain("twitter-card-image");
  });

  // SPECSFY: US-004 FR-008 US-002 FR-002 AC-005
  it("requires og:type article and a timezone-aware published time on a post", () => {
    expect(rules(auditPage(page({ ogType: "website" }), auditCtx))).toContain("article-og-type");
    expect(rules(auditPage(page({ published: "2026-09-25" }), auditCtx))).toContain(
      "article-published-time",
    );
  });

  // SPECSFY: US-004 FR-008 US-003 FR-003 AC-005
  it("requires a BlogPosting JSON-LD with its recommended fields", () => {
    const missing = blogPosting();
    delete missing.datePublished;
    delete missing.author;
    const found = auditPage(
      page({ jsonLd: { "@context": "https://schema.org", "@graph": [missing] } }),
      auditCtx,
    );
    expect(rules(found)).toContain("article-jsonld");
    expect(found.filter((v) => v.rule === "article-jsonld").map((v) => v.message).join(" ")).toMatch(
      /datePublished/,
    );
    expect(rules(auditPage(page({ jsonLd: null }), auditCtx))).toContain("article-jsonld");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-003 AC-005
  it("reads the JSON-LD the way the schema module writes it: combined @type and author by reference", () => {
    const node = blogPosting({
      "@type": ["Article", "BlogPosting"],
      author: { "@id": "https://nuxfire.com/#/schema/organization/1" },
    });
    const graph = [
      node,
      { "@id": "https://nuxfire.com/#/schema/organization/1", "@type": "Organization", name: "Nuxfire Team" },
    ];
    const clean = page({ jsonLd: { "@context": "https://schema.org", "@graph": graph } });
    expect(auditPage(clean, auditCtx)).toEqual([]);
  });

  // SPECSFY: US-004 FR-008 US-003 FR-003 AC-005
  it("rejects an author reference that points to nothing or to a node without a name", () => {
    const node = blogPosting({ author: { "@id": "https://nuxfire.com/#/schema/organization/1" } });
    const dangling = page({ jsonLd: { "@context": "https://schema.org", "@graph": [node] } });
    expect(auditPage(dangling, auditCtx).map((v) => v.message).join(" ")).toMatch(/author/);
    const nameless = page({
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [node, { "@id": "https://nuxfire.com/#/schema/organization/1", "@type": "Organization" }],
      },
    });
    expect(rules(auditPage(nameless, auditCtx))).toContain("article-jsonld");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-004 AC-005
  it("requires html lang, og:locale and inLanguage to agree", () => {
    const ptLd = { "@context": "https://schema.org", "@graph": [blogPosting({ inLanguage: "pt-BR" })] };
    expect(rules(auditPage(page({ jsonLd: ptLd }), auditCtx))).toContain("article-lang");
    expect(rules(auditPage(page({ ogLocale: "pt_BR" }), auditCtx))).toContain("article-lang");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-004 AC-005
  it("rejects hreflang with a relative href, an invalid code or without the page itself", () => {
    const url = postUrl(CLUSTER.en);
    expect(
      rules(auditPage(page({ hreflang: [{ hreflang: "en-US", href: "/blog/x" }] }), auditCtx)),
    ).toContain("hreflang-valid");
    expect(
      rules(auditPage(page({ hreflang: [{ hreflang: "english", href: url }] }), auditCtx)),
    ).toContain("hreflang-valid");
    expect(
      rules(
        auditPage(page({ hreflang: [{ hreflang: "pt-BR", href: postUrl(CLUSTER["pt-br"]) }] }), auditCtx),
      ),
    ).toContain("hreflang-self");
  });
});

// ---------------------------------------------------------------------------------
// Build audit: cross-page and sitemap rules (AC-005, T006)
// ---------------------------------------------------------------------------------

function clusterPages(): PageHtml[] {
  const alternates = (["en", "pt-br", "es"] as const).map((lang) => ({
    hreflang: { en: "en-US", "pt-br": "pt-BR", es: "es-ES" }[lang],
    href: postUrl(CLUSTER[lang]),
  }));
  const withDefault = [...alternates, { hreflang: "x-default", href: postUrl(CLUSTER.en) }];
  return (["en", "pt-br", "es"] as const).map((lang) => ({
    url: `/blog/${CLUSTER[lang]}`,
    html: html(
      fixture({
        title: `Title ${lang} | Nuxfire`,
        canonical: postUrl(CLUSTER[lang]),
        ogUrl: postUrl(CLUSTER[lang]),
        lang: { en: "en-US", "pt-br": "pt-BR", es: "es-ES" }[lang],
        ogLocale: { en: "en_US", "pt-br": "pt_BR", es: "es_ES" }[lang],
        hreflang: withDefault,
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [blogPosting({ inLanguage: { en: "en-US", "pt-br": "pt-BR", es: "es-ES" }[lang] })],
        },
      }),
    ),
  }));
}

function sitemapXml(entries: { loc: string; lastmod?: string; alternates: { hreflang: string; href: string }[] }[]): string {
  const urls = entries
    .map((entry) => {
      const alternates = entry.alternates
        .map((a) => `<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
        .join("");
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : "";
      return `<url><loc>${entry.loc}</loc>${lastmod}${alternates}</url>`;
    })
    .join("");
  return `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}

function cleanSitemap() {
  const alternates = (["en", "pt-br", "es"] as const).map((lang) => ({
    hreflang: { en: "en-US", "pt-br": "pt-BR", es: "es-ES" }[lang],
    href: postUrl(CLUSTER[lang]),
  }));
  const withDefault = [...alternates, { hreflang: "x-default", href: postUrl(CLUSTER.en) }];
  return parseSitemap(
    sitemapXml(
      (["en", "pt-br", "es"] as const).map((lang) => ({
        loc: postUrl(CLUSTER[lang]),
        lastmod: "2026-09-25T00:00:00Z",
        alternates: withDefault,
      })),
    ),
  );
}

describe("pages that must not be indexed (AC-005)", () => {
  const redirect = (): PageHtml => ({
    url: "/signup",
    html: '<html lang="en-US"><head><meta name="robots" content="noindex, nofollow"></head><body></body></html>',
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("exempts a noindex page from the content rules", () => {
    expect(auditPage(redirect(), auditCtx)).toEqual([]);
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  // SPEC-0002 FR-004: the stub is exempt from the content rules (title, h1, image) but it is
  // itself reported as `no-meta-refresh`.
  it("exempts a meta refresh redirect stub from the content rules", () => {
    const stub: PageHtml = {
      url: "/docs/pro",
      html: '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/docs/saas-starter-kit"></head></html>',
    };
    expect(auditPage(stub, auditCtx).map((v) => v.rule)).toEqual(["no-meta-refresh"]);
    expect(auditSite([...clusterPages(), stub], cleanSitemap(), auditCtx)).toEqual([]);
  });

  // SPECSFY: US-004 FR-008 US-003 FR-005 AC-005
  it("rejects a noindex page that is listed in the sitemap", () => {
    const sitemap = [...cleanSitemap(), { loc: `${SITE}/signup`, lastmod: undefined, alternatives: [] }];
    const found = auditSite([...clusterPages(), redirect()], sitemap, auditCtx);
    expect(rules(found)).toContain("sitemap-noindex");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-005 AC-005
  it("accepts a noindex page that is absent from the sitemap", () => {
    expect(auditSite([...clusterPages(), redirect()], cleanSitemap(), auditCtx)).toEqual([]);
  });
});

describe("sitemap parsing (AC-005)", () => {
  // SPECSFY: US-004 FR-008 FR-005 AC-005
  it("reads loc, lastmod and hreflang alternatives", () => {
    const [first] = cleanSitemap();
    expect(first.loc).toBe(postUrl(CLUSTER.en));
    expect(first.lastmod).toBe("2026-09-25T00:00:00Z");
    expect(first.alternatives).toHaveLength(4);
    expect(first.alternatives[0]).toEqual({ hreflang: "en-US", href: postUrl(CLUSTER.en) });
  });
});

describe("build audit of the whole site (AC-005)", () => {
  // SPECSFY: US-004 FR-008 US-003 FR-004 FR-005 AC-005
  it("passes a reciprocal cluster listed in the sitemap with lastmod", () => {
    expect(auditSite(clusterPages(), cleanSitemap(), auditCtx)).toEqual([]);
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("rejects two unrelated pages with the same title", () => {
    const unrelated: PageHtml = {
      url: "/docs/unrelated",
      html: html(fixture({ title: "Title en | Nuxfire", canonical: `${SITE}/docs/unrelated`, hreflang: [] })),
    };
    expect(rules(auditSite([...clusterPages(), unrelated], cleanSitemap(), auditCtx))).toContain("title-unique");
  });

  // SPECSFY: US-004 FR-008 US-001 FR-001 AC-005
  it("lets the language versions of one page share a title", () => {
    const pages = clusterPages().map((entry) => ({
      ...entry,
      html: entry.html.replace(/<title>[^<]*<\/title>/, "<title>Same | Nuxfire</title>"),
    }));
    expect(rules(auditSite(pages, cleanSitemap(), auditCtx))).not.toContain("title-unique");
  });

  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  // SPEC-0002 DEC-011 supersedes the date-only acceptance of SPEC-0001 DEC-013: Bing asks for
  // a date and a time in the sitemap lastmod.
  it("requires a lastmod with date, time and timezone", () => {
    const withLastmod = (lastmod: string) => cleanSitemap().map((entry) => ({ ...entry, lastmod }));
    expect(rules(auditSite(clusterPages(), withLastmod("2026-09-25T00:00:00Z"), auditCtx))).not.toContain("sitemap-lastmod-datetime");
    expect(rules(auditSite(clusterPages(), withLastmod("2026-09-25T10:00:00-03:00"), auditCtx))).not.toContain("sitemap-lastmod-datetime");
    expect(rules(auditSite(clusterPages(), withLastmod("2026-09-25"), auditCtx))).toContain("sitemap-lastmod-datetime");
    expect(rules(auditSite(clusterPages(), withLastmod("25/09/2026"), auditCtx))).toContain("sitemap-lastmod-datetime");
    expect(rules(auditSite(clusterPages(), withLastmod("2026-09-25T10:00"), auditCtx))).toContain("sitemap-lastmod-datetime");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-004 AC-005
  it("rejects hreflang that is not reciprocal", () => {
    const pages = clusterPages();
    pages[2] = {
      ...pages[2],
      html: pages[2].html.replace(
        `<link rel="alternate" hreflang="en-US" href="${postUrl(CLUSTER.en)}">`,
        "",
      ),
    };
    expect(rules(auditSite(pages, cleanSitemap(), auditCtx))).toContain("hreflang-reciprocal");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-005 AC-005
  it("rejects a post without lastmod in the sitemap", () => {
    const sitemap = cleanSitemap().map((entry) => ({ ...entry, lastmod: undefined }));
    expect(rules(auditSite(clusterPages(), sitemap, auditCtx))).toContain("sitemap-lastmod");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-005 AC-005
  it("rejects a post that is missing from the sitemap", () => {
    const sitemap = cleanSitemap().slice(0, 2);
    expect(rules(auditSite(clusterPages(), sitemap, auditCtx))).toContain("sitemap-post-listed");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-004 FR-005 AC-005
  it("rejects hreflang in the head that differs from the sitemap", () => {
    const sitemap = cleanSitemap();
    sitemap[1] = { ...sitemap[1], alternatives: [{ hreflang: "en-US", href: postUrl(CLUSTER.en) }] };
    expect(rules(auditSite(clusterPages(), sitemap, auditCtx))).toContain("sitemap-hreflang-match");
  });

  // SPECSFY: US-004 FR-008 US-003 FR-005 AC-005
  it("rejects a sitemap URL whose page does not exist in the output", () => {
    const sitemap = cleanSitemap();
    sitemap.push({ loc: `${SITE}/blog/ghost`, lastmod: "2026-09-25T00:00:00Z", alternatives: [] });
    expect(rules(auditSite(clusterPages(), sitemap, auditCtx))).toContain("sitemap-target-exists");
  });

  // SPECSFY: US-004 FR-008 FR-009 US-002 AC-005
  it("reads a PNG size from its header", () => {
    expect(pngSize(png(1200, 675))).toEqual({ width: 1200, height: 675 });
    expect(pngSize(Buffer.from("not a png"))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------
// CLI: exit codes against temporary directories (AC-005, T007)
// ---------------------------------------------------------------------------------

const SCRIPT = join(import.meta.dirname, "check-seo.ts");
const roots: string[] = [];
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

function write(file: string, content: string | Buffer): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function frontmatter(slug: string, lang: string, extra = ""): string {
  return [
    "---",
    `title: "Title ${slug}"`,
    `description: "Description ${slug}"`,
    `date: "2026-09-25"`,
    `author: "Nuxfire Team"`,
    `lang: ${lang}`,
    `ogImage: "/images/blog/git.png"`,
    "translations:",
    `  en: ${CLUSTER.en}`,
    `  pt-br: ${CLUSTER["pt-br"]}`,
    `  es: ${CLUSTER.es}`,
    ...(extra ? [extra] : []),
    "---",
    "",
    "Body.",
    "",
  ].join("\n");
}

interface Site {
  content: string;
  publicDir: string;
  output: string;
}

/** A consistent three-post site (en, pt-br, es) on disk, ready for the CLI. */
function buildSite(mutate: (site: Site) => void = () => {}): Site {
  const root = mkdtempSync(join(tmpdir(), "check-seo-"));
  roots.push(root);
  const site: Site = { content: join(root, "content"), publicDir: join(root, "public"), output: join(root, "output") };
  write(join(site.content, `${CLUSTER.en}.md`), frontmatter(CLUSTER.en, "en"));
  write(join(site.content, `${CLUSTER["pt-br"]}.md`), frontmatter(CLUSTER["pt-br"], "pt-br"));
  write(join(site.content, `${CLUSTER.es}.md`), frontmatter(CLUSTER.es, "es"));
  write(join(site.publicDir, "images/blog/git.png"), png(1200, 675));
  write(join(site.output, "images/blog/git.png"), png(1200, 675));
  write(join(site.output, "images/og/default.png"), png(1200, 675));
  const alternates = [
    { hreflang: "en-US", href: postUrl(CLUSTER.en) },
    { hreflang: "pt-BR", href: postUrl(CLUSTER["pt-br"]) },
    { hreflang: "es-ES", href: postUrl(CLUSTER.es) },
    { hreflang: "x-default", href: postUrl(CLUSTER.en) },
  ];
  const langs = { en: ["en-US", "en_US"], "pt-br": ["pt-BR", "pt_BR"], es: ["es-ES", "es_ES"] } as const;
  for (const lang of ["en", "pt-br", "es"] as const) {
    write(
      join(site.output, "blog", CLUSTER[lang], "index.html"),
      html(
        fixture({
          title: `Title ${lang} | Nuxfire`,
          canonical: postUrl(CLUSTER[lang]),
          ogUrl: postUrl(CLUSTER[lang]),
          lang: langs[lang][0],
          ogLocale: langs[lang][1],
          hreflang: alternates,
          jsonLd: { "@context": "https://schema.org", "@graph": [blogPosting({ inLanguage: langs[lang][0] })] },
        }),
      ),
    );
  }
  write(
    join(site.output, "__sitemap__/en-US.xml"),
    sitemapXml(
      (["en", "pt-br", "es"] as const).map((lang) => ({
        loc: postUrl(CLUSTER[lang]),
        lastmod: "2026-09-25T00:00:00Z",
        alternates,
      })),
    ),
  );
  mutate(site);
  return site;
}

/**
 * Runs the real command line. `bun` may be a `.cmd` shim (npm installs on Windows), which
 * Node cannot spawn without a shell, so the command is one quoted string.
 */
const quote = (value: string): string => `"${value.replaceAll('"', '\\"')}"`;

function run(site: Site, extra: string[] = []) {
  const command = [
    "bun",
    quote(SCRIPT),
    "--content",
    quote(site.content),
    "--public",
    quote(site.publicDir),
    "--output",
    quote(site.output),
    // the repository's own allowances must not leak into a fixture site
    "--config",
    quote(join(site.publicDir, "no-such-seo-config.json")),
    ...extra.map(quote),
  ].join(" ");
  const result = spawnSync(command, { encoding: "utf8", shell: true });
  return { code: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

// Each case starts a real `bun` process: on a loaded machine that can exceed the 5 s default.
describe("check:seo command line (AC-005)", { timeout: 60_000 }, () => {
  // SPECSFY: US-004 FR-008 US-001 US-002 US-003 AC-005
  it("exits 0 on a clean site", () => {
    const { code, out } = run(buildSite());
    expect(out).not.toMatch(/✗/);
    expect(code).toBe(0);
  });

  // SPECSFY: US-004 FR-008 FR-006 AC-005
  it("exits non-zero naming the file and the rule for a post without lang", () => {
    const site = buildSite(({ content }) => {
      write(join(content, `${CLUSTER.en}.md`), frontmatter(CLUSTER.en, "en").replace("lang: en\n", ""));
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("post-lang-required");
    expect(out).toContain(`${CLUSTER.en}.md`);
  });

  // SPECSFY: US-004 FR-008 FR-004 FR-006 US-003 AC-005
  it("exits non-zero for a translation that does not reference back", () => {
    const site = buildSite(({ content }) => {
      const pt = readFileSync(join(content, `${CLUSTER["pt-br"]}.md`), "utf8");
      write(join(content, `${CLUSTER["pt-br"]}.md`), pt.replace(`  en: ${CLUSTER.en}\n`, ""));
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("post-translations-");
  });

  // SPECSFY: US-004 FR-008 FR-002 FR-006 US-002 AC-005
  it("exits non-zero for an SVG ogImage", () => {
    const site = buildSite(({ content }) => {
      const en = readFileSync(join(content, `${CLUSTER.en}.md`), "utf8");
      write(join(content, `${CLUSTER.en}.md`), en.replace("git.png", "git.svg"));
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("post-ogimage-raster");
  });

  // SPECSFY: US-004 FR-008 FR-001 US-001 AC-005
  it("exits non-zero when two unrelated pages share a title", () => {
    const site = buildSite(({ output }) => {
      write(
        join(output, "docs", "unrelated", "index.html"),
        html(fixture({ title: "Title en | Nuxfire", canonical: `${SITE}/docs/unrelated`, hreflang: [] })),
      );
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("title-unique");
  });

  // SPECSFY: US-004 FR-008 FR-001 US-001 AC-005
  it("exits non-zero for a page without h1", () => {
    const site = buildSite(({ output }) => {
      const file = join(output, "blog", CLUSTER.en, "index.html");
      write(file, readFileSync(file, "utf8").replace(/<h1[^>]*>.*?<\/h1>/, ""));
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("h1-single");
  });

  // SPECSFY: US-004 FR-008 FR-001 US-001 AC-005
  it("exits non-zero for a relative canonical", () => {
    const site = buildSite(({ output }) => {
      const file = join(output, "blog", CLUSTER.en, "index.html");
      write(file, readFileSync(file, "utf8").replace(`rel="canonical" href="${postUrl(CLUSTER.en)}"`, `rel="canonical" href="/blog/${CLUSTER.en}"`));
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("canonical-absolute");
  });

  // SPECSFY: US-004 FR-008 FR-002 FR-009 US-002 AC-005
  it("exits non-zero for an og:image that is missing from the output", () => {
    const site = buildSite(({ output }) => rmSync(join(output, "images/blog/git.png")));
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("og-image-exists");
  });

  // SPECSFY: US-004 FR-008 FR-003 FR-009 US-003 AC-005
  it("exits non-zero for a BlogPosting missing a field", () => {
    const site = buildSite(({ output }) => {
      const file = join(output, "blog", CLUSTER.en, "index.html");
      write(file, readFileSync(file, "utf8").replace('"datePublished":"2026-09-25T00:00:00Z",', ""));
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("article-jsonld");
  });

  // SPECSFY: US-004 FR-008 FR-004 US-003 AC-005
  it("exits non-zero when the head hreflang differs from the sitemap", () => {
    const site = buildSite(({ output }) => {
      const file = join(output, "__sitemap__/en-US.xml");
      write(file, readFileSync(file, "utf8").replace(/<xhtml:link[^>]*x-default[^>]*>/g, ""));
    });
    const { code, out } = run(site);
    expect(code).not.toBe(0);
    expect(out).toContain("sitemap-hreflang-match");
  });

  // SPECSFY: US-004 FR-008 FR-006 AC-005
  it("runs only the source lint, and says so, when there is no build output", () => {
    const site = buildSite();
    rmSync(site.output, { recursive: true, force: true });
    const { code, out } = run(site);
    expect(code).toBe(0);
    expect(out).toMatch(/no build output/i);
  });
});

// ---------------------------------------------------------------------------------
// NFR-002: tooling adds no dependency (guards)
// ---------------------------------------------------------------------------------

const importsOf = (file: string): string[] =>
  [...readFileSync(join(import.meta.dirname, file), "utf8").matchAll(/^import[^"']*["']([^"']+)["']/gm)].map(
    (m) => m[1],
  );

describe("the gate needs no dependency (NFR-002)", () => {
  // Third-party means a bare specifier: `node:` built-ins and relative paths are fine.
  const allowed = (spec: string): boolean => spec.startsWith("node:") || spec.startsWith(".");

  // SPECSFY: NFR-002 FR-008 US-004 AC-005
  it("keeps the pure rules free of third-party imports", () => {
    expect(importsOf("seo-rules.ts").filter((spec) => !allowed(spec))).toEqual([]);
  });

  // SPECSFY: NFR-002 FR-008 US-004 AC-005
  it("keeps the command line free of third-party imports and reads YAML with Bun", () => {
    expect(importsOf("check-seo.ts").filter((spec) => !allowed(spec))).toEqual([]);
    expect(readFileSync(SCRIPT, "utf8")).toContain("Bun.YAML");
  });

  // SPECSFY: NFR-002 FR-008 US-004 AC-005
  it("does not add a YAML dependency to the root manifest", () => {
    const manifest = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
    expect(all.filter((name) => /yaml/i.test(name))).toEqual([]);
  });
});


// ---------------------------------------------------------------------------------
// SPEC-0002: search rules on the built output (AC-004, T006-T008)
// ---------------------------------------------------------------------------------

describe("sitemap freshness and robots (AC-004)", () => {
  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("checks the lastmod of every sitemap URL, not only of the posts", () => {
    const docs = page({}, "/docs/x");
    const sitemap = [...cleanSitemap(), { loc: `${SITE}/docs/x`, lastmod: "2026-09-25", alternatives: [] }];
    const found = auditSite([...clusterPages(), docs], sitemap, auditCtx);
    expect(found.filter((v) => v.rule === "sitemap-lastmod-datetime").map((v) => v.where)).toContain("/docs/x");
  });

  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("keeps sitemap-lastmod for a post that has none", () => {
    const sitemap = cleanSitemap().map((entry) => ({ ...entry, lastmod: undefined }));
    expect(rules(auditSite(clusterPages(), sitemap, auditCtx))).toContain("sitemap-lastmod");
  });

  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("requires robots.txt to list a sitemap of the site when robots.txt is given", () => {
    const without = { ...auditCtx, robotsTxt: "User-agent: *\nDisallow:\n" };
    expect(rules(auditSite(clusterPages(), cleanSitemap(), without))).toContain("robots-sitemap");
    const other = { ...auditCtx, robotsTxt: "Sitemap: https://elsewhere.com/sitemap.xml\n" };
    expect(rules(auditSite(clusterPages(), cleanSitemap(), other))).toContain("robots-sitemap");
    const good = { ...auditCtx, robotsTxt: `User-agent: *\nSitemap: ${SITE}/sitemap_index.xml\n` };
    expect(rules(auditSite(clusterPages(), cleanSitemap(), good))).not.toContain("robots-sitemap");
    expect(rules(auditSite(clusterPages(), cleanSitemap(), auditCtx))).not.toContain("robots-sitemap");
  });
});

describe("redirect stubs, canonical sitemap URLs and placeholder titles (AC-004)", () => {
  const stub = (url: string): PageHtml => ({
    url,
    html: '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/docs"></head></html>',
  });

  // SPECSFY: US-002 FR-004 FR-007 NFR-001 AC-004
  it("rejects a page that is only a meta refresh", () => {
    const found = auditPage(stub("/docs/pro"), auditCtx);
    expect(rules(found)).toEqual(["no-meta-refresh"]);
    expect(found[0].where).toBe("/docs/pro");
  });

  // SPECSFY: US-002 FR-004 FR-007 NFR-001 AC-004
  it("rejects a sitemap URL whose page declares another canonical", () => {
    const pages = clusterPages();
    pages[0] = { ...pages[0], html: pages[0].html.replace(`<link rel="canonical" href="${postUrl(CLUSTER.en)}">`, `<link rel="canonical" href="${SITE}/blog/other">`) };
    expect(rules(auditSite(pages, cleanSitemap(), auditCtx))).toContain("sitemap-canonical");
    expect(rules(auditSite(clusterPages(), cleanSitemap(), auditCtx))).not.toContain("sitemap-canonical");
  });

  // SPECSFY: US-002 FR-004 FR-007 NFR-001 AC-004
  it("rejects a title that matches a configured placeholder", () => {
    const ctx = { ...auditCtx, placeholderTitles: ["Demo SaaS"] };
    const found = auditPage(page({ title: "Demo SaaS | Nuxfire" }), ctx);
    expect(rules(found)).toContain("title-not-placeholder");
    expect(rules(auditPage(page({ title: "Git for Your First Release | Nuxfire" }), ctx))).not.toContain("title-not-placeholder");
    expect(rules(auditPage(page({ title: "Demo SaaS | Nuxfire" }), auditCtx))).not.toContain("title-not-placeholder");
  });
});

describe("structured data that cannot be honest (AC-004)", () => {
  const withLd = (node: unknown): PageHtml =>
    page({ jsonLd: { "@context": "https://schema.org", "@graph": [blogPosting(), node] } });

  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("rejects FAQPage markup: Google stopped showing FAQ rich results on 2026-05-07", () => {
    const found = auditPage(withLd({ "@type": "FAQPage", mainEntity: [] }), auditCtx);
    expect(rules(found)).toContain("jsonld-no-faq");
    const array = auditPage(withLd({ "@type": ["WebPage", "FAQPage"] }), auditCtx);
    expect(rules(array)).toContain("jsonld-no-faq");
  });

  // SPECSFY: US-002 US-004 FR-004 FR-009 NFR-001 AC-004
  it("rejects a rating or a review unless the ledger proves reviews exist", () => {
    const rated = withLd({ "@type": "SoftwareApplication", name: "Nuxfire", aggregateRating: { "@type": "AggregateRating", ratingValue: 5 } });
    expect(rules(auditPage(rated, auditCtx))).toContain("jsonld-no-unproven-rating");
    const reviewed = withLd({ "@type": "Product", name: "Nuxfire", review: [{ "@type": "Review" }] });
    expect(rules(auditPage(reviewed, auditCtx))).toContain("jsonld-no-unproven-rating");
    expect(rules(auditPage(rated, { ...auditCtx, provenReviews: true }))).not.toContain("jsonld-no-unproven-rating");
  });

  // SPECSFY: US-002 FR-004 NFR-001 AC-004
  it("does not flag a page whose JSON-LD is only an article and a breadcrumb", () => {
    const ok = auditPage(withLd({ "@type": "BreadcrumbList", itemListElement: [] }), auditCtx);
    expect(rules(ok)).not.toContain("jsonld-no-faq");
    expect(rules(ok)).not.toContain("jsonld-no-unproven-rating");
  });
});
