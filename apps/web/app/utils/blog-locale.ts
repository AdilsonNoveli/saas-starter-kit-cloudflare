export interface BlogListEntry {
  /** `/blog/<slug>` */
  path: string;
  lang: string;
  /** Language to slug of every version of the post, itself included. */
  translations?: Record<string, string>;
}

const slugOf = (path: string): string => path.replace(/^\/blog\//, "").replace(/\/$/, "");

/** All versions of a post share one key: the same set of slugs. A post with none is its own. */
function clusterKey(entry: BlogListEntry): string {
  const slugs = Object.values(entry.translations ?? {});
  return (slugs.length > 0 ? [...slugs] : [slugOf(entry.path)]).sort().join("|");
}

/**
 * The blog index shows each post once, in the language the visitor is browsing in, the same
 * rule the docs follow: the version of the active language, else English (the default
 * language), else the first version found, so a post is never dropped. `posts` keeps the
 * order of the query (newest first); a post takes the place of its first version.
 */
export function postsForLocale<T extends BlogListEntry>(posts: readonly T[], locale: string): T[] {
  const clusters = new Map<string, T[]>();
  for (const entry of posts) {
    const key = clusterKey(entry);
    clusters.set(key, [...(clusters.get(key) ?? []), entry]);
  }
  return [...clusters.values()].map(
    (versions) =>
      versions.find((entry) => entry.lang === locale) ??
      versions.find((entry) => entry.lang === "en") ??
      versions[0]!,
  );
}
