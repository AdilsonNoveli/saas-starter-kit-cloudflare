import { DEFAULT_OG_IMAGE } from "~~/site";
import {
  buildArticleSeo,
  buildPageSeo,
  defaultSocialMeta,
  type BlogPostInput,
  type PageInput,
  type SeoContext,
} from "~/utils/seo/content-seo";

// Thin adapter between the pure builders (utils/seo/content-seo.ts, unit-tested) and the
// Nuxt head APIs. All decisions live in the builders; this file only applies their output.

function useSeoContext(): SeoContext {
  const site = useSiteConfig();
  const { t } = useI18n();
  return {
    siteUrl: site.url,
    siteName: site.name,
    defaultOgImage: DEFAULT_OG_IMAGE,
    // With no title set, the SEO module renders the bare site name.
    fallbackTitles: [site.name],
    labels: { home: t("nav.home"), blog: t("nav.blog") },
  };
}

/**
 * The social image every page carries unless it sets its own. Called once from app.vue, so
 * no page can ship without an og:image and no page declares a large card without an image.
 */
export function useDefaultSocialMeta(): void {
  useSeoMeta(defaultSocialMeta(useSeoContext()));
}

/**
 * Metadata, structured data, language and hreflang of a blog post. The page (not the site
 * locale) owns the language of a post, so it tells app.vue to stop emitting the locale tags.
 */
export function useArticleSeo(post: BlogPostInput): void {
  const seo = buildArticleSeo(post, useSeoContext());
  useState("seo:owns-locale-head", () => false).value = true;

  // `<html lang>` is also set by the SEO and i18n modules from the visitor's locale. Unhead
  // renders lower priority numbers first and, for the same attribute, the later value wins:
  // a number above the default (100) makes the post's own language the one that is kept.
  useHead({ htmlAttrs: { lang: seo.htmlLang }, link: seo.links }, { tagPriority: 200 });
  useSeoMeta({ title: seo.title, description: seo.description, ...seo.meta });

  const { blogPosting, breadcrumb } = seo.schema;
  useSchemaOrg([
    defineArticle({
      "@type": "BlogPosting",
      headline: blogPosting.headline,
      description: blogPosting.description,
      image: blogPosting.image,
      datePublished: blogPosting.datePublished,
      dateModified: blogPosting.dateModified,
      author: blogPosting.author,
      inLanguage: blogPosting.inLanguage,
      articleSection: blogPosting.articleSection,
      keywords: blogPosting.keywords,
    }),
    defineBreadcrumb({ itemListElement: breadcrumb.map(({ name, item }) => ({ name, item })) }),
  ]);
}

/** Metadata of the pages that are not posts: docs, the blog index and legal pages. */
export function usePageSeo(page: PageInput): void {
  const seo = buildPageSeo(page, useSeoContext());
  useSeoMeta({ title: seo.title, description: seo.description, ...seo.meta });
}
