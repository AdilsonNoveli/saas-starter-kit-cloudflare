export interface BreadcrumbNavItem {
  path: string;
  title?: string;
  page?: boolean;
  children?: BreadcrumbNavItem[];
}

export interface BreadcrumbItem {
  label: string;
  /** Absent for a section that has no page of its own: it renders as plain text. */
  to?: string;
}

/**
 * One breadcrumb item per URL segment. A segment links only when the content navigation
 * knows a page at that path: a folder without an index page (`page: false`) has no URL that
 * resolves, and linking to it would send visitors, and crawlers, to a 404.
 */
export function breadcrumbFromNavigation(
  url: string,
  navigation: BreadcrumbNavItem[] | undefined,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];
  let href = "";
  let nav = navigation;
  for (const rawSegment of url.split("/").filter((segment) => segment !== "")) {
    const segment = rawSegment.replace(".html", "");
    href += `/${segment}`;
    const node = nav?.find((item) => item.path === href);
    nav = node?.children;
    const label = node?.title ?? segment;
    items.push(node && node.page !== false ? { label, to: href } : { label });
  }
  return items;
}
