import { breadcrumbFromNavigation, type BreadcrumbItem } from "~/utils/breadcrumb";

export async function useBreadcrumb(u?: string): Promise<BreadcrumbItem[]> {
  const url = u || useRoute().path;
  return breadcrumbFromNavigation(url, useContentNavigation()?.value);
}
