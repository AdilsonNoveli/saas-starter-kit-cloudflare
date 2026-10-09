import type { ContentNavigationItem } from "@nuxt/content";
import type { BadgeProps } from "@nuxt/ui";

/**
 * Badge rendered next to a sidebar entry, declared in a page's `navBadges`
 * frontmatter. `@nuxt/content` types every frontmatter-driven navigation field
 * as `unknown`, so the docs sidebar narrows it through `DocsNavigationItem`.
 */
export interface DocsNavBadge {
  value?: string;
  color?: BadgeProps["color"];
  variant?: BadgeProps["variant"];
  size?: BadgeProps["size"];
}

/**
 * `ContentNavigationItem` plus the docs-specific frontmatter fields the sidebar
 * reads. Extending the base type keeps it assignable everywhere `@nuxt/content`
 * expects a navigation item.
 */
export interface DocsNavigationItem extends ContentNavigationItem {
  children?: DocsNavigationItem[];
  icon?: string;
  hide?: boolean;
  collapse?: boolean;
  navBadges?: DocsNavBadge[];
  sidebar?: { style?: "default" | "group" };
}

export const useContentNavigation = () => {
  return inject<Ref<DocsNavigationItem[]>>("navigation");
};

export function findNavItemByPath(
  items: DocsNavigationItem[],
  path: string,
): DocsNavigationItem | undefined {
  for (const item of items) {
    if (item.path === path) return item;
    const found = item.children && findNavItemByPath(item.children, path);
    if (found) return found;
  }
  return undefined;
}
