import { describe, expect, it } from "vitest";
import { breadcrumbFromNavigation, type BreadcrumbNavItem } from "./breadcrumb";

const navigation: BreadcrumbNavItem[] = [
  {
    path: "/docs",
    title: "Docs",
    children: [
      {
        path: "/docs/features",
        title: "Features",
        page: false,
        children: [{ path: "/docs/features/blog", title: "Blog" }],
      },
    ],
  },
];

describe("breadcrumbFromNavigation", () => {
  // SPECSFY: docs-breadcrumb-links-only-real-pages
  it("does not link a section that has no page of its own", () => {
    expect(breadcrumbFromNavigation("/docs/features/blog", navigation)).toEqual([
      { label: "Docs", to: "/docs" },
      { label: "Features" },
      { label: "Blog", to: "/docs/features/blog" },
    ]);
  });

  // SPECSFY: docs-breadcrumb-unknown-segment
  it("does not link a segment the navigation does not know", () => {
    expect(breadcrumbFromNavigation("/docs/missing", navigation)).toEqual([
      { label: "Docs", to: "/docs" },
      { label: "missing" },
    ]);
  });

  // SPECSFY: docs-breadcrumb-no-navigation
  it("copes with an unavailable navigation and a .html suffix", () => {
    expect(breadcrumbFromNavigation("/docs/a.html", undefined)).toEqual([
      { label: "docs" },
      { label: "a" },
    ]);
  });
});
