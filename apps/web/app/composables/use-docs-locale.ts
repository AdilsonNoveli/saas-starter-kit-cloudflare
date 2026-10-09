import type { ContentNavigationItem } from "@nuxt/content";

/**
 * The docs live in `docs` (English, the source of truth) and are translated
 * into the `docs_pt_br` and `docs_es` collections, which serve the same
 * `/docs/...` URLs. The docs routes are not locale-prefixed (see the
 * `i18n: false` note in pages/docs/[...slug].vue), so the active locale, not
 * the URL, decides which collection is read. Anything that is not translated
 * falls back to English.
 */
type DocsCollection = "docs" | "docs_pt_br" | "docs_es";

export function docsCollectionFor(locale: string): DocsCollection {
  if (locale === "pt-br") return "docs_pt_br";
  if (locale === "es") return "docs_es";
  return "docs";
}

export async function queryDocsPage(locale: string, routePath: string) {
  // The docs index is a locale-prefixed route (/pt-br/docs); content paths are not.
  const path = routePath.replace(/^\/(pt-br|es)(?=\/|$)/, "");
  const collection = docsCollectionFor(locale);
  const translated =
    collection === "docs"
      ? null
      : await queryCollection(collection).path(path).first();
  return translated ?? (await queryCollection("docs").path(path).first());
}

/**
 * English navigation with the titles replaced by the translated ones. The
 * structure (which pages exist, their order and paths) always comes from the
 * English tree, so untranslated sections keep showing up.
 */
export async function queryDocsNavigation(
  locale: string,
): Promise<ContentNavigationItem[]> {
  const base = await queryCollectionNavigation("docs");
  const collection = docsCollectionFor(locale);
  if (collection === "docs") return base;

  // A folder and its index page share one path, so the key tells them apart.
  const key = (item: ContentNavigationItem) =>
    `${item.path}#${item.children?.length ? "dir" : "page"}`;
  const titles = new Map<string, string>();
  const index = (items: ContentNavigationItem[]) => {
    for (const item of items) {
      if (item.title) titles.set(key(item), item.title);
      index(item.children ?? []);
    }
  };
  index(await queryCollectionNavigation(collection));

  const translate = (items: ContentNavigationItem[]): ContentNavigationItem[] =>
    items.map((item) => ({
      ...item,
      title: (item.path !== "/docs" && titles.get(key(item))) || item.title,
      ...(item.children ? { children: translate(item.children) } : {}),
    }));
  return translate(base);
}
