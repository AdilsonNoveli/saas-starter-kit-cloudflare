import { assertRasterImage, toIsoDateTime } from "../apps/web/app/utils/seo/content-seo";

// The rules behind `bun run check:seo`. Pure: they receive already-read data (parsed
// frontmatter, HTML strings, sitemap XML) and return violations, so every rule is
// unit-tested without a build. The command line (check-seo.ts) does the reading.
//
// Sources for each rule: specs/*/0001-content-seo-metadata (section 2, research notes).

export interface Violation {
  /** Stable rule identifier, printed and asserted by tests. */
  rule: string;
  /** File (source lint) or page URL (build audit). */
  where: string;
  message: string;
}

// ---------------------------------------------------------------------------------
// Source lint: frontmatter of the posts
// ---------------------------------------------------------------------------------

export interface PostFile {
  file: string;
  slug: string;
  frontmatter: Record<string, unknown>;
}

export interface LintContext {
  langs: readonly string[];
  /** Whether a root-relative path (`/images/x.png`) exists under the public directory. */
  publicFileExists: (publicPath: string) => boolean;
}

const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

function dateProblem(value: unknown): string | undefined {
  if (typeof value !== "string") return "it must be a string";
  try {
    toIsoDateTime(value);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function clusterKey(translations: Record<string, unknown>): string {
  return JSON.stringify(Object.entries(translations).sort(([a], [b]) => a.localeCompare(b)));
}

export function lintPosts(posts: PostFile[], ctx: LintContext): Violation[] {
  const violations: Violation[] = [];
  const bySlug = new Map(posts.map((post) => [post.slug, post]));

  for (const post of posts) {
    const { frontmatter: fm, file } = post;
    const add = (rule: string, message: string): number =>
      violations.push({ rule, where: file, message });

    if (!isText(fm.title)) add("post-title-required", "title is required");
    if (!isText(fm.description)) add("post-description-required", "description is required");

    if (fm.lang === undefined) {
      add("post-lang-required", `lang is required (one of: ${ctx.langs.join(", ")})`);
    } else if (typeof fm.lang !== "string" || !ctx.langs.includes(fm.lang)) {
      add("post-lang-valid", `lang "${String(fm.lang)}" is not a configured locale (${ctx.langs.join(", ")})`);
    }

    const dateError = dateProblem(fm.date);
    if (dateError) add("post-date-iso", `date: ${dateError}`);
    if (fm.updated !== undefined) {
      const updatedError = dateProblem(fm.updated);
      if (updatedError) add("post-date-iso", `updated: ${updatedError}`);
      else if (!dateError && new Date(toIsoDateTime(String(fm.updated))) < new Date(toIsoDateTime(String(fm.date)))) {
        add("post-updated-order", `updated (${String(fm.updated)}) is before date (${String(fm.date)})`);
      }
    }

    if (fm.ogImage !== undefined) {
      if (typeof fm.ogImage !== "string") {
        add("post-ogimage-raster", "ogImage must be a path string");
      } else {
        try {
          assertRasterImage(fm.ogImage, "ogImage");
          if (!ctx.publicFileExists(fm.ogImage)) {
            add("post-ogimage-exists", `ogImage ${fm.ogImage} does not exist under apps/web/public (run bun run generate:og)`);
          }
        } catch (error) {
          add("post-ogimage-raster", error instanceof Error ? error.message : String(error));
        }
      }
    }

    const translations = fm.translations;
    if (translations !== undefined && translations !== null && typeof translations === "object") {
      const own = translations as Record<string, unknown>;
      if (own[String(fm.lang)] !== post.slug) {
        add("post-translations-self", `translations must include this post itself (${String(fm.lang)}: ${post.slug})`);
      }
      for (const [lang, slug] of Object.entries(own)) {
        if (typeof slug !== "string") {
          add("post-translations-target-exists", `translations.${lang} must be a slug string`);
          continue;
        }
        if (slug === post.slug) continue;
        const target = bySlug.get(slug);
        if (!target) {
          add("post-translations-target-exists", `translations.${lang} points to "${slug}", which is not a post in this folder`);
          continue;
        }
        if (target.frontmatter.lang !== lang) {
          add(
            "post-translations-lang-match",
            `translations.${lang} points to "${slug}", which is written in "${String(target.frontmatter.lang)}"`,
          );
        }
        const back = target.frontmatter.translations;
        if (!back || typeof back !== "object" || clusterKey(back as Record<string, unknown>) !== clusterKey(own)) {
          violations.push({
            rule: "post-translations-reciprocal",
            where: target.file,
            message: `${post.slug} lists ${slug} in its translations, but ${slug} does not list the same set of versions`,
          });
        }
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------------
// Head parsing
// ---------------------------------------------------------------------------------

export interface LinkTag {
  rel?: string;
  href?: string;
  hreflang?: string;
}

export interface HeadInfo {
  htmlLang?: string;
  title?: string;
  /** Keys are `name:<name>` or `property:<property>`; values keep document order. */
  meta: Map<string, string[]>;
  links: LinkTag[];
  h1Count: number;
  jsonLd: unknown[];
  jsonLdInvalid: number;
  /** A `<meta http-equiv="refresh">` stub: the page only redirects, it has no content of its own. */
  redirect: boolean;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const decode = (text: string): string => text.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity);

/** The inside of a tag: a quoted attribute value may contain `>` (for example `specs/<state>`). */
const TAG_BODY = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`;
const tagPattern = (name: string): RegExp => new RegExp(String.raw`<${name}\b${TAG_BODY}>`, "gi");

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*"([^"]*)"/g)) {
    found[match[1].toLowerCase()] = decode(match[2]);
  }
  return found;
}

export function parseHead(html: string): HeadInfo {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const meta = new Map<string, string[]>();
  for (const tag of html.match(tagPattern("meta")) ?? []) {
    const attrs = attributes(tag);
    const key = attrs.name ? `name:${attrs.name}` : attrs.property ? `property:${attrs.property}` : undefined;
    if (key === undefined || attrs.content === undefined) continue;
    meta.set(key, [...(meta.get(key) ?? []), attrs.content]);
  }
  const links = (html.match(tagPattern("link")) ?? []).map((tag): LinkTag => {
    const attrs = attributes(tag);
    return { rel: attrs.rel, href: attrs.href, hreflang: attrs.hreflang };
  });
  const jsonLd: unknown[] = [];
  let jsonLdInvalid = 0;
  for (const block of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      jsonLd.push(JSON.parse(block[1]));
    } catch {
      jsonLdInvalid += 1;
    }
  }
  return {
    htmlLang: html.match(/<html\b[^>]*\blang="([^"]*)"/i)?.[1],
    title: title ? decode(title[1].trim()) : undefined,
    meta,
    links,
    h1Count: (html.match(/<h1\b/gi) ?? []).length,
    jsonLd,
    jsonLdInvalid,
    redirect: /<meta\b[^>]*http-equiv\s*=\s*"refresh"/i.test(html),
  };
}

// ---------------------------------------------------------------------------------
// Sitemap parsing
// ---------------------------------------------------------------------------------

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  alternatives: { hreflang: string; href: string }[];
}

export function parseSitemap(xml: string): SitemapUrl[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((block) => {
    const body = block[1];
    const alternatives = [...body.matchAll(tagPattern("xhtml:link"))].flatMap((tag) => {
      const attrs = attributes(tag[0]);
      return attrs.hreflang && attrs.href ? [{ hreflang: attrs.hreflang, href: attrs.href }] : [];
    });
    return {
      loc: body.match(/<loc>([^<]*)<\/loc>/)?.[1].trim() ?? "",
      lastmod: body.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1].trim(),
      alternatives,
    };
  });
}

// ---------------------------------------------------------------------------------
// Build audit
// ---------------------------------------------------------------------------------

export interface ImageInfo {
  exists: boolean;
  width?: number;
  height?: number;
}

export interface AuditContext {
  siteUrl: string;
  siteName: string;
  fallbackTitles: readonly string[];
  fallbackDescriptions: readonly string[];
  /** Page URLs that may legitimately carry the site-wide default description (the homes). */
  fallbackDescriptionAllowed: readonly string[];
  expectedImage: { width: number; height: number };
  /** Looks a root-relative path up in the build output. */
  image: (publicPath: string) => ImageInfo;
}

export interface PageHtml {
  /** Path of the page, e.g. `/blog/my-post`. */
  url: string;
  html: string;
}

const POST_URL = /^\/blog\/[^/]+$/;
const ABSOLUTE = /^https?:\/\//i;
/** The sitemap protocol's W3C Datetime: a date, or a datetime with a timezone. */
const SITEMAP_LASTMOD = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;
const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const HREFLANG_CODE = /^(x-default|[a-z]{2,3}(-[A-Za-z]{2,4})?)$/;

export const isPostUrl = (url: string): boolean => POST_URL.test(url);

/**
 * A page that asks not to be indexed, or that only redirects, needs no search metadata and
 * must not be in the sitemap.
 */
const isNoindex = (head: HeadInfo): boolean =>
  head.redirect || (head.meta.get("name:robots") ?? []).some((value) => /noindex/i.test(value));
const trimSlash = (url: string): string => (url.length > 1 ? url.replace(/\/$/, "") : url);

function hreflangLinksOf(head: HeadInfo): { hreflang: string; href: string }[] {
  return head.links.flatMap((link) =>
    link.rel === "alternate" && link.hreflang && link.href ? [{ hreflang: link.hreflang, href: link.href }] : [],
  );
}

type JsonNode = Record<string, unknown>;

/** Every node of every JSON-LD block, `@graph` flattened. */
function jsonLdNodes(blocks: unknown[]): JsonNode[] {
  const nodes: JsonNode[] = [];
  for (const block of blocks) {
    if (block && typeof block === "object") {
      nodes.push(block as JsonNode);
      const graph = (block as JsonNode)["@graph"];
      if (Array.isArray(graph)) nodes.push(...(graph.filter((node) => node && typeof node === "object") as JsonNode[]));
    }
  }
  return nodes;
}

/** The schema module writes `["Article", "BlogPosting"]`; a plain string is fine too. */
function hasType(node: JsonNode, type: string): boolean {
  const declared = node["@type"];
  return declared === type || (Array.isArray(declared) && declared.includes(type));
}

/** A node, or the node an `{ "@id": ... }` reference points to inside the same graph. */
function resolveNode(value: unknown, nodes: JsonNode[]): JsonNode | undefined {
  if (!value || typeof value !== "object") return undefined;
  const node = value as JsonNode;
  const id = node["@id"];
  if (typeof id === "string" && Object.keys(node).length === 1) {
    return nodes.find((candidate) => candidate["@id"] === id);
  }
  return node;
}

export function auditPage(page: PageHtml, ctx: AuditContext): Violation[] {
  const violations: Violation[] = [];
  const add = (rule: string, message: string): number => violations.push({ rule, where: page.url, message });
  const head = parseHead(page.html);
  if (isNoindex(head)) return violations;
  const first = (key: string): string | undefined => head.meta.get(key)?.[0];

  // Title
  if (!head.title) {
    add("title-present", "the page has no <title>");
  } else {
    const isFallback = ctx.fallbackTitles.some(
      (fallback) => head.title === fallback || head.title === `${fallback} | ${ctx.siteName}`,
    );
    if (isFallback) add("title-not-fallback", `"${head.title}" is the site fallback: the page did not set a title`);
    const segments = head.title.split(" | ").map((segment) => segment.trim());
    if (new Set(segments).size !== segments.length) {
      add("title-no-repeated-segment", `"${head.title}" repeats a segment`);
    }
  }

  // Description
  const description = first("name:description");
  if (!description || description.trim() === "") {
    add("description-present", "the page has no meta description");
  } else if (
    ctx.fallbackDescriptions.includes(description) &&
    !ctx.fallbackDescriptionAllowed.includes(page.url)
  ) {
    add("description-not-fallback", "the description is the site-wide default: the page did not set its own");
  }

  // Heading
  if (head.h1Count !== 1) add("h1-single", `expected exactly one <h1>, found ${head.h1Count}`);

  // Canonical and Open Graph identity
  const canonical = head.links.find((link) => link.rel === "canonical")?.href;
  const ogUrl = first("property:og:url");
  if (!canonical || !ABSOLUTE.test(canonical)) {
    add("canonical-absolute", `the canonical is ${canonical ? `relative ("${canonical}")` : "missing"}`);
  } else if (ogUrl !== canonical) {
    add("canonical-og-url", `canonical (${canonical}) differs from og:url (${ogUrl ?? "missing"})`);
  }
  if (!first("property:og:title")) add("og-title", "og:title is missing");
  if (!first("property:og:description")) add("og-description", "og:description is missing");

  // Social image
  const ogImage = first("property:og:image");
  if (!ogImage || !ABSOLUTE.test(ogImage)) {
    add("og-image-absolute", `og:image is ${ogImage ? `relative ("${ogImage}")` : "missing"}`);
  } else {
    if (!/\.(png|jpe?g)$/i.test(ogImage)) add("og-image-raster", `og:image ${ogImage} is not a png or jpeg`);
    const path = ogImage.startsWith(ctx.siteUrl) ? ogImage.slice(ctx.siteUrl.length) : undefined;
    if (path === undefined) {
      add("og-image-exists", `og:image ${ogImage} is not on ${ctx.siteUrl}, so it cannot be verified`);
    } else {
      const info = ctx.image(path);
      if (!info.exists) {
        add("og-image-exists", `og:image ${path} is not in the build output`);
      } else if (
        info.width !== ctx.expectedImage.width ||
        info.height !== ctx.expectedImage.height
      ) {
        add(
          "og-image-size",
          `og:image ${path} is ${info.width ?? "?"}x${info.height ?? "?"}, expected ${ctx.expectedImage.width}x${ctx.expectedImage.height}`,
        );
      }
    }
  }
  if (first("name:twitter:card") === "summary_large_image" && !first("name:twitter:image") && !ogImage) {
    add("twitter-card-image", "twitter:card is summary_large_image but the page has no image");
  }

  // Hreflang
  const alternates = hreflangLinksOf(head);
  for (const alternate of alternates) {
    if (!HREFLANG_CODE.test(alternate.hreflang) || !ABSOLUTE.test(alternate.href)) {
      add("hreflang-valid", `invalid alternate (hreflang="${alternate.hreflang}" href="${alternate.href}")`);
    }
  }
  if (alternates.length > 0 && canonical && !alternates.some((alternate) => alternate.href === canonical)) {
    add("hreflang-self", "the page does not list itself among its hreflang alternates");
  }

  // Articles
  if (isPostUrl(page.url)) {
    if (first("property:og:type") !== "article") add("article-og-type", `og:type is "${first("property:og:type") ?? "missing"}", expected article`);
    const published = first("property:article:published_time");
    if (!published || !ISO_WITH_TIMEZONE.test(published)) {
      add("article-published-time", `article:published_time is ${published ? `"${published}"` : "missing"}: ISO 8601 with a timezone is required`);
    }
    const nodes = jsonLdNodes(head.jsonLd);
    const post = nodes.find((node) => hasType(node, "BlogPosting"));
    if (!post) {
      add("article-jsonld", "no BlogPosting JSON-LD found");
    } else {
      const missing = ["headline", "datePublished", "dateModified", "inLanguage"].filter(
        (key) => !isText(post[key]),
      );
      const image = post.image;
      if (!(Array.isArray(image) ? image.length > 0 : isText(image))) missing.push("image");
      const author = resolveNode(post.author, nodes);
      if (!author || !isText(author.name)) missing.push("author");
      if (missing.length > 0) add("article-jsonld", `BlogPosting is missing: ${missing.join(", ")}`);

      const inLanguage = isText(post.inLanguage) ? post.inLanguage : undefined;
      const locale = first("property:og:locale");
      if (
        inLanguage &&
        (head.htmlLang !== inLanguage || locale !== inLanguage.replace("-", "_"))
      ) {
        add(
          "article-lang",
          `html lang "${head.htmlLang ?? "missing"}", og:locale "${locale ?? "missing"}" and inLanguage "${inLanguage}" must agree`,
        );
      }
    }
  }
  return violations;
}

/** Cross-page rules: unique titles, reciprocal hreflang, and the sitemap. */
export function auditSite(pages: PageHtml[], sitemap: SitemapUrl[], ctx: AuditContext): Violation[] {
  const violations: Violation[] = [];
  const everyPage = pages.map((page) => ({ page, head: parseHead(page.html) }));
  const absolute = (url: string): string => trimSlash(`${ctx.siteUrl}${url === "/" ? "" : url}`);
  const byAbsolute = new Map(everyPage.map((entry) => [absolute(entry.page.url), entry]));
  // Pages that opted out of indexing are exempt from the cross-page rules too.
  const parsed = everyPage.filter((entry) => !isNoindex(entry.head));

  // Unique titles
  const titles = new Map<string, string[]>();
  for (const { page, head } of parsed) {
    if (head.title) titles.set(head.title, [...(titles.get(head.title) ?? []), page.url]);
  }
  // Language versions of one page (hreflang alternates) may share a title: it is the same page.
  const alternatesOf = new Map<string, Set<string>>();
  for (const { page, head } of parsed) {
    alternatesOf.set(absolute(page.url), new Set(hreflangLinksOf(head).map((link) => trimSlash(link.href))));
  }
  const related = (a: string, b: string): boolean =>
    alternatesOf.get(absolute(a))?.has(absolute(b)) === true || alternatesOf.get(absolute(b))?.has(absolute(a)) === true;
  for (const [title, urls] of titles) {
    const unrelated = urls.some((url, index) => urls.some((other, otherIndex) => otherIndex > index && !related(url, other)));
    if (unrelated) {
      violations.push({ rule: "title-unique", where: urls.join(", "), message: `${urls.length} pages share the title "${title}"` });
    }
  }

  // Reciprocal hreflang (x-default is a fallback pointer, not a language version)
  for (const { page, head } of parsed) {
    const self = absolute(page.url);
    for (const alternate of hreflangLinksOf(head)) {
      if (alternate.hreflang === "x-default" || trimSlash(alternate.href) === self) continue;
      const target = byAbsolute.get(trimSlash(alternate.href));
      if (!target) {
        violations.push({ rule: "hreflang-reciprocal", where: page.url, message: `alternate ${alternate.href} is not a page of the build` });
      } else if (
        // The way back must be a language link: an x-default that happens to point here does not count.
        !hreflangLinksOf(target.head).some(
          (back) => back.hreflang !== "x-default" && trimSlash(back.href) === self,
        )
      ) {
        violations.push({
          rule: "hreflang-reciprocal",
          where: page.url,
          message: `${alternate.href} does not list ${self} back`,
        });
      }
    }
  }

  // Sitemap
  const entries = new Map(sitemap.map((entry) => [trimSlash(entry.loc), entry]));
  for (const entry of sitemap) {
    const target = byAbsolute.get(trimSlash(entry.loc));
    if (!target) {
      violations.push({ rule: "sitemap-target-exists", where: entry.loc, message: "the sitemap lists a URL that is not a page of the build" });
    } else if (isNoindex(target.head)) {
      violations.push({ rule: "sitemap-noindex", where: entry.loc, message: "the sitemap lists a page that asks not to be indexed or only redirects" });
    }
  }
  for (const { page, head } of parsed) {
    if (!isPostUrl(page.url)) continue;
    const entry = entries.get(absolute(page.url));
    if (!entry) {
      violations.push({ rule: "sitemap-post-listed", where: page.url, message: "the post is not in the sitemap" });
      continue;
    }
    if (!entry.lastmod || !SITEMAP_LASTMOD.test(entry.lastmod)) {
      violations.push({ rule: "sitemap-lastmod", where: page.url, message: `lastmod is ${entry.lastmod ? `"${entry.lastmod}"` : "missing"}: a W3C Datetime (YYYY-MM-DD or ISO 8601 with a timezone) is required` });
    }
    const pair = (link: { hreflang: string; href: string }): string => `${link.hreflang}|${trimSlash(link.href)}`;
    const inHead = new Set(hreflangLinksOf(head).map(pair));
    const inSitemap = new Set(entry.alternatives.map(pair));
    const differs = inHead.size !== inSitemap.size || [...inHead].some((link) => !inSitemap.has(link));
    if (differs) {
      violations.push({
        rule: "sitemap-hreflang-match",
        where: page.url,
        message: `head lists [${[...inHead].sort().join(", ")}] but the sitemap lists [${[...inSitemap].sort().join(", ")}]`,
      });
    }
  }
  return violations;
}
