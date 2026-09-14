interface BreadcrumbItem {
  label: string;
  to: string;
}

export async function useBreadcrumb(u?: string): Promise<BreadcrumbItem[]> {
  const url = u || useRoute().path;
  const navigation = useContentNavigation();

  const breadcrumbItems: BreadcrumbItem[] = [];
  // Remove empty segments
  const segments = url.split("/").filter((segment) => segment !== "");

  // Construct breadcrumb for each segment
  let href = "";
  let nav = navigation?.value;
  for (const rawSegment of segments) {
    const segment = rawSegment.replace(".html", "");
    href += `/${segment}`;
    const page = nav?.find((x) => x.path === href);
    nav = page?.children;
    breadcrumbItems.push({ label: page?.title ?? segment, to: href });
  }
  return breadcrumbItems;
}
