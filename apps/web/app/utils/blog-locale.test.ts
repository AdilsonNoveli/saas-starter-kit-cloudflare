import { describe, expect, it } from "vitest";
import { postsForLocale, type BlogListEntry } from "./blog-locale";

const GIT = { en: "git-en", "pt-br": "git-pt", es: "git-es" };

const post = (slug: string, lang: string, translations?: Record<string, string>): BlogListEntry => ({
  path: `/blog/${slug}`,
  lang,
  translations,
});

// Ordered as the blog index queries them: newest first.
const posts: BlogListEntry[] = [
  post("git-pt", "pt-br", GIT),
  post("git-en", "en", GIT),
  post("git-es", "es", GIT),
  post("only-pt", "pt-br"),
  post("only-es", "es"),
];

const paths = (list: BlogListEntry[]): string[] => list.map((entry) => entry.path);

describe("postsForLocale", () => {
  // SPECSFY: US-003 FR-004 blog-index-one-card-per-post
  it("lists one card for a post that exists in three languages", () => {
    expect(paths(postsForLocale(posts, "en")).filter((path) => path.startsWith("/blog/git-"))).toEqual(["/blog/git-en"]);
  });

  // SPECSFY: US-003 FR-004 blog-index-follows-active-locale
  it("shows the version written in the active language", () => {
    expect(paths(postsForLocale(posts, "pt-br"))).toContain("/blog/git-pt");
    expect(paths(postsForLocale(posts, "es"))).toContain("/blog/git-es");
    expect(paths(postsForLocale(posts, "pt-br"))).not.toContain("/blog/git-en");
  });

  // SPECSFY: US-003 FR-004 blog-index-fallback-english
  it("falls back to the English version when the active language has none", () => {
    const withoutSpanish = [post("a-pt", "pt-br", { en: "a-en", "pt-br": "a-pt" }), post("a-en", "en", { en: "a-en", "pt-br": "a-pt" })];
    expect(paths(postsForLocale(withoutSpanish, "es"))).toEqual(["/blog/a-en"]);
  });

  // SPECSFY: US-003 FR-004 blog-index-keeps-untranslated
  it("keeps a post that has no translation, in its own language, for every locale", () => {
    for (const locale of ["en", "pt-br", "es"]) {
      expect(paths(postsForLocale(posts, locale))).toEqual(expect.arrayContaining(["/blog/only-pt", "/blog/only-es"]));
    }
  });

  // SPECSFY: US-003 FR-004 blog-index-keeps-order
  it("keeps the newest-first order of the query", () => {
    expect(paths(postsForLocale(posts, "en"))).toEqual(["/blog/git-en", "/blog/only-pt", "/blog/only-es"]);
    expect(paths(postsForLocale(posts, "pt-br"))).toEqual(["/blog/git-pt", "/blog/only-pt", "/blog/only-es"]);
  });

  // SPECSFY: US-003 FR-004 blog-index-no-translations-no-loss
  it("never drops a post: a cluster without English or the locale shows its first version", () => {
    const pair = [post("x-pt", "pt-br", { "pt-br": "x-pt", es: "x-es" }), post("x-es", "es", { "pt-br": "x-pt", es: "x-es" })];
    expect(paths(postsForLocale(pair, "en"))).toEqual(["/blog/x-pt"]);
  });
});
