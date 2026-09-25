import { CONTENT_LANGS, CONTENT_LOCALES, type ContentLang } from "../../../i18n/supported-locales";

// Pure builders for the SEO metadata of content pages. No I/O and no Nuxt auto-imports,
// so every rule is unit-testable and the same code serves the page composable and the
// sitemap hook of content.config.ts. Rules and sources: specs/*/0001-content-seo-metadata.

/** Size every social image is generated at (scripts/og-images.ts) and declared with. */
export const OG_IMAGE_SIZE = { width: 1200, height: 675 } as const;

const BLOG_BASE = "/blog";

export interface SeoContext {
  /** Origin of the site, e.g. `https://nuxfire.com` (a trailing slash is tolerated). */
  siteUrl: string;
  siteName: string;
  /** Root-relative path of the raster image used when a page has none of its own. */
  defaultOgImage: string;
  /** Titles no page may use: the global fallback that means "nobody set a title". */
  fallbackTitles: readonly string[];
  labels: { home: string; blog: string };
}

export type AuthorType = "Person" | "Organization";

export interface BlogPostInput {
  /** `/blog/<slug>` */
  path: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author: string;
  authorType?: AuthorType;
  lang: ContentLang;
  category?: string;
  readTime?: string;
  tags?: readonly string[];
  image?: string;
  ogImage?: string;
  /** Language to slug of every version of this post, itself included. */
  translations?: Partial<Record<ContentLang, string>>;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

/** The MIME types of the raster formats `assertRasterImage` accepts. */
export type SocialImageType = "image/png" | "image/jpeg";

export interface SocialImage {
  url: string;
  width: number;
  height: number;
  type: SocialImageType;
  alt: string;
}

/** The `useSeoMeta` keys (unhead) this module emits, and nothing else. */
export interface SeoMeta {
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "article" | "website";
  ogUrl?: string;
  ogSiteName?: string;
  ogLocale?: string;
  ogLocaleAlternate?: string[];
  ogImage?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  ogImageType?: SocialImageType;
  ogImageAlt?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleSection?: string;
  articleTag?: string[];
  author?: string;
  twitterCard?: "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
}

export interface BlogPostingSchema {
  "@type": "BlogPosting";
  headline: string;
  description: string;
  image: string[];
  datePublished: string;
  dateModified: string;
  author: { "@type": AuthorType; name: string };
  inLanguage: string;
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  articleSection?: string[];
  keywords?: string[];
}

export interface ArticleSeo {
  htmlLang: string;
  title: string;
  description: string;
  canonical: string;
  meta: SeoMeta;
  links: { rel: "alternate"; hreflang: string; href: string }[];
  schema: {
    blogPosting: BlogPostingSchema;
    breadcrumb: { name: string; item: string }[];
  };
}

export interface PageInput {
  path: string;
  title: string;
  /** The title used for og:title and twitter:title when it differs from `title`. */
  socialTitle?: string;
  description: string;
  kind: "website" | "docs" | "blog-index";
}

export interface PageSeo {
  title: string;
  description: string;
  canonical: string;
  meta: SeoMeta;
}

export interface NotFoundError {
  statusCode: 404;
  statusMessage: string;
  data: { path: string };
}

// ---------------------------------------------------------------------------------
// Languages and URLs
// ---------------------------------------------------------------------------------

/** BCP-47 tag of a content language (`pt-br` -> `pt-BR`). Unknown codes fail loudly. */
export function bcp47(lang: ContentLang): string {
  const locale = CONTENT_LOCALES.find((candidate) => candidate.code === lang);
  if (!locale) throw new Error(`Unknown content language "${String(lang)}"`);
  return locale.language;
}

/** Open Graph locale (`language_TERRITORY`) of a content language (`pt-br` -> `pt_BR`). */
export function ogLocale(lang: ContentLang): string {
  return bcp47(lang).replace("-", "_");
}

export function absoluteUrl(siteUrl: string, path: string): string {
  let origin: string;
  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
    origin = parsed.origin;
  } catch {
    throw new Error(`Invalid site URL "${siteUrl}": it must be absolute, e.g. https://example.com`);
  }
  if (!path.startsWith("/")) throw new Error(`Path must start with a slash: "${path}"`);
  return `${origin}${path}`;
}

// ---------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?/;
const TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/;

/**
 * Machine-readable ISO 8601 with a timezone, as Google recommends for article dates.
 * A date-only value has no time, so it is read as midnight UTC (documented decision).
 */
export function toIsoDateTime(value: string): string {
  const dateOnly = value.match(DATE_ONLY);
  if (dateOnly) {
    const [year, month, day] = dateOnly.slice(1).map(Number) as [number, number, number];
    const probe = new Date(Date.UTC(year, month - 1, day));
    const real =
      probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
    if (!real) throw new Error(`Invalid date "${value}": that day does not exist`);
    return `${value}T00:00:00Z`;
  }
  if (DATETIME.test(value)) {
    if (!TIMEZONE.test(value)) {
      throw new Error(`Date "${value}" has no timezone: append Z or an offset such as -03:00`);
    }
    if (Number.isNaN(new Date(value).getTime())) throw new Error(`Invalid date "${value}"`);
    return value;
  }
  throw new Error(`Invalid date "${value}": use YYYY-MM-DD or a full ISO 8601 datetime`);
}

// ---------------------------------------------------------------------------------
// Social image
// ---------------------------------------------------------------------------------

const RASTER = /\.(png|jpe?g)$/i;

/** Facebook lists JPEG, GIF and PNG for og:image; SVG is not among them (research note). */
export function assertRasterImage(path: string, label: string): void {
  if (!path.startsWith("/")) {
    throw new Error(`${label} must be a root-relative path (start with "/"): ${path}`);
  }
  if (!RASTER.test(path)) {
    throw new Error(`${label} must be a raster image (png or jpeg), got: ${path}`);
  }
}

export function resolveSocialImage(ogImage: string | undefined, ctx: SeoContext, alt: string): SocialImage {
  const path = ogImage ?? ctx.defaultOgImage;
  assertRasterImage(path, ogImage === undefined ? "defaultOgImage" : "ogImage");
  return {
    url: absoluteUrl(ctx.siteUrl, path),
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    type: /\.png$/i.test(path) ? "image/png" : "image/jpeg",
    alt,
  };
}

function socialMeta(image: SocialImage, title: string, description: string): SeoMeta {
  return {
    ogImage: image.url,
    ogImageWidth: String(image.width),
    ogImageHeight: String(image.height),
    ogImageType: image.type,
    ogImageAlt: image.alt,
    // The card is only declared together with its image (a large card without one is invalid).
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image.url,
    twitterImageAlt: image.alt,
  };
}

/**
 * The social image every page carries unless it sets its own: registered once in app.vue,
 * so a page can never ship without an og:image (Open Graph requires one).
 */
export function defaultSocialMeta(ctx: SeoContext): SeoMeta {
  const image = resolveSocialImage(undefined, ctx, ctx.siteName);
  return {
    ogImage: image.url,
    ogImageWidth: String(image.width),
    ogImageHeight: String(image.height),
    ogImageType: image.type,
    ogImageAlt: image.alt,
    twitterCard: "summary_large_image",
    twitterImage: image.url,
    twitterImageAlt: image.alt,
  };
}

// ---------------------------------------------------------------------------------
// Validation shared by every builder
// ---------------------------------------------------------------------------------

function assertTitle(title: string, ctx: SeoContext): void {
  if (title.trim() === "") throw new Error("A content page needs a non-empty title");
  if (ctx.fallbackTitles.includes(title.trim())) {
    throw new Error(`Title "${title}" equals the site fallback title: the page did not set its own`);
  }
}

function assertDescription(description: string): void {
  if (description.trim() === "") throw new Error("A content page needs a non-empty description");
}

// ---------------------------------------------------------------------------------
// hreflang and sitemap
// ---------------------------------------------------------------------------------

function slugOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/**
 * The hreflang cluster of a post: every version listed, itself included, in the fixed
 * locale order, then `x-default` pointing to the English version when one exists.
 * The head and the sitemap both use this list, so they can never disagree.
 */
export function hreflangLinks(post: BlogPostInput, ctx: SeoContext): AlternateLink[] {
  const self: AlternateLink = {
    hreflang: bcp47(post.lang),
    href: absoluteUrl(ctx.siteUrl, post.path),
  };
  const translations = post.translations;
  if (!translations || Object.keys(translations).length === 0) return [self];
  if (translations[post.lang] !== slugOf(post.path)) {
    throw new Error(
      `translations of ${post.path} must include the post itself (${post.lang}: ${slugOf(post.path)})`,
    );
  }
  const links: AlternateLink[] = [];
  for (const lang of CONTENT_LANGS) {
    const slug = translations[lang];
    if (slug !== undefined) {
      links.push({ hreflang: bcp47(lang), href: absoluteUrl(ctx.siteUrl, `${BLOG_BASE}/${slug}`) });
    }
  }
  const english = translations.en;
  if (english !== undefined) {
    links.push({ hreflang: "x-default", href: absoluteUrl(ctx.siteUrl, `${BLOG_BASE}/${english}`) });
  }
  return links;
}

/** `lastmod` and alternatives of a post for the sitemap (`updated`, else `date`). */
export function sitemapEntryFor(
  post: BlogPostInput,
  ctx: SeoContext,
): { lastmod: string; alternatives: AlternateLink[] } {
  return {
    lastmod: toIsoDateTime(post.updated ?? post.date),
    alternatives: hreflangLinks(post, ctx),
  };
}

// ---------------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------------

export function buildArticleSeo(post: BlogPostInput, ctx: SeoContext): ArticleSeo {
  assertTitle(post.title, ctx);
  assertDescription(post.description);
  const htmlLang = bcp47(post.lang);
  const published = toIsoDateTime(post.date);
  const modified = toIsoDateTime(post.updated ?? post.date);
  if (new Date(modified).getTime() < new Date(published).getTime()) {
    throw new Error(`updated (${post.updated}) is before date (${post.date}) in ${post.path}`);
  }

  const canonical = absoluteUrl(ctx.siteUrl, post.path);
  const image = resolveSocialImage(post.ogImage, ctx, post.title);
  const links = hreflangLinks(post, ctx);
  const alternateLocales = CONTENT_LANGS.filter(
    (lang) => lang !== post.lang && post.translations?.[lang] !== undefined,
  ).map(ogLocale);

  const meta: SeoMeta = {
    ogTitle: post.title,
    ogDescription: post.description,
    ogType: "article",
    ogUrl: canonical,
    ogSiteName: ctx.siteName,
    ogLocale: ogLocale(post.lang),
    ogLocaleAlternate: alternateLocales,
    articlePublishedTime: published,
    articleModifiedTime: modified,
    // `article:author` is a reference to a profile in the Open Graph protocol and posts
    // only carry a name: the name goes to <meta name="author"> and to the JSON-LD.
    author: post.author,
    ...socialMeta(image, post.title, post.description),
  };
  if (post.category) meta.articleSection = post.category;
  if (post.tags && post.tags.length > 0) meta.articleTag = [...post.tags];

  const blogPosting: BlogPostingSchema = {
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: [image.url],
    datePublished: published,
    dateModified: modified,
    author: { "@type": post.authorType ?? "Organization", name: post.author },
    inLanguage: htmlLang,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };
  if (post.category) blogPosting.articleSection = [post.category];
  if (post.tags && post.tags.length > 0) blogPosting.keywords = [...post.tags];

  return {
    htmlLang,
    title: post.title,
    description: post.description,
    canonical,
    meta,
    links: links.map((link) => ({ rel: "alternate", ...link })),
    schema: {
      blogPosting,
      breadcrumb: [
        { name: ctx.labels.home, item: absoluteUrl(ctx.siteUrl, "/") },
        { name: ctx.labels.blog, item: absoluteUrl(ctx.siteUrl, BLOG_BASE) },
        { name: post.title, item: canonical },
      ],
    },
  };
}

/** Metadata of pages that are not posts: docs, the blog index and legal pages. */
export function buildPageSeo(page: PageInput, ctx: SeoContext): PageSeo {
  assertTitle(page.title, ctx);
  assertDescription(page.description);
  const canonical = absoluteUrl(ctx.siteUrl, page.path);
  const socialTitle = page.socialTitle ?? page.title;
  const image = resolveSocialImage(undefined, ctx, socialTitle);
  return {
    title: page.title,
    description: page.description,
    canonical,
    meta: {
      ogTitle: socialTitle,
      ogDescription: page.description,
      ogType: "website",
      ogUrl: canonical,
      ogSiteName: ctx.siteName,
      ...socialMeta(image, socialTitle, page.description),
    },
  };
}

// ---------------------------------------------------------------------------------
// Content entries
// ---------------------------------------------------------------------------------

/**
 * A Nuxt Content `blog` entry (untyped at this edge: SQL columns, `null` for absent
 * values) as the input of the builders. Shapes are checked, nothing is defaulted.
 */
export function blogPostFromEntry(entry: Record<string, unknown>): BlogPostInput {
  const where = String(entry.path);
  const present = (key: string): boolean => entry[key] !== undefined && entry[key] !== null;
  const text = (key: string): string => {
    const value = entry[key];
    if (typeof value !== "string") throw new Error(`Blog entry ${where}: "${key}" must be a string`);
    return value;
  };
  const optionalText = (key: string): string | undefined => (present(key) ? text(key) : undefined);

  const lang = text("lang");
  if (!CONTENT_LANGS.some((code) => code === lang)) {
    throw new Error(`Blog entry ${where}: unknown language "${lang}"`);
  }

  let translations: BlogPostInput["translations"];
  if (present("translations")) {
    const raw = entry.translations;
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`Blog entry ${where}: "translations" must be an object`);
    }
    translations = {};
    for (const code of CONTENT_LANGS) {
      const slug = (raw as Record<string, unknown>)[code];
      if (slug !== undefined && slug !== null) {
        if (typeof slug !== "string") throw new Error(`Blog entry ${where}: translations.${code} must be a string`);
        translations[code] = slug;
      }
    }
  }

  const tags = entry.tags;
  if (present("tags") && !(Array.isArray(tags) && tags.every((tag) => typeof tag === "string"))) {
    throw new Error(`Blog entry ${where}: "tags" must be a list of strings`);
  }

  const authorType = optionalText("authorType");
  if (authorType !== undefined && authorType !== "Person" && authorType !== "Organization") {
    throw new Error(`Blog entry ${where}: authorType must be Person or Organization`);
  }

  return {
    path: text("path"),
    title: text("title"),
    description: optionalText("description") ?? "",
    date: text("date"),
    updated: optionalText("updated"),
    author: text("author"),
    authorType,
    lang: lang as ContentLang,
    category: optionalText("category"),
    readTime: optionalText("readTime"),
    tags: present("tags") ? (tags as string[]) : undefined,
    image: optionalText("image"),
    ogImage: optionalText("ogImage"),
    translations,
  };
}

// ---------------------------------------------------------------------------------
// Missing content
// ---------------------------------------------------------------------------------

/**
 * A 404 error for a document that does not exist (or, for docs, has no body), or null.
 * Rendering an empty page with status 200 is a soft 404: search engines index it.
 */
export function contentNotFound(
  doc: unknown,
  options: { path: string; requireBody?: boolean },
): NotFoundError | null {
  const missing =
    doc === null ||
    doc === undefined ||
    (options.requireBody === true && !(doc as { body?: unknown }).body);
  return missing
    ? { statusCode: 404, statusMessage: "Page Not Found", data: { path: options.path } }
    : null;
}
