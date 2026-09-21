<template>
  <div
    class="bg-elevated/30 backdrop-blur-lg rounded-lg w-full"
  >
    <FolderTreeItem
      v-for="path in processedPaths"
      :key="path.path"
      :path="path.path"
      :children="path.children"
      :hints="hints"
      :show-hints="showHints"
    />
  </div>
</template>

<script setup lang="ts">
import hints from "~~/constants/hints.json";
import paths from "~~/constants/paths.json";
import type { FolderTreeNode } from "./FolderTreeItem.vue";

const { filter = "", showHints = false } = defineProps<{
  filter?: string;
  showHints?: boolean;
}>();

const processedPaths = computed(() => {
  const pathMap = new Map<string, FolderTreeNode>();
  const filteredPaths = paths.filter(
    (path) => path.startsWith(filter) || filter.startsWith(path),
  );
  for (const path of filteredPaths) {
    pathMap.set(path, { path, children: [] });
  }
  for (const path of filteredPaths) {
    const trimmedPath = path.replace(/\/$/, "");
    const parentPath = trimmedPath.slice(0, trimmedPath.lastIndexOf("/") + 1);
    const parent = parentPath ? pathMap.get(parentPath) : undefined;
    const node = pathMap.get(path);
    if (parent && node) parent.children.push(node);
  }

  // Sort children to put directories first, then sort alphabetically
  const sortChildren = (items: FolderTreeNode[]): FolderTreeNode[] => {
    return items
      .sort((a, b) => {
        const aIsDir = a.path.endsWith("/");
        const bIsDir = b.path.endsWith("/");
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.path.localeCompare(b.path);
      })
      .map((item) => {
        if (item.children?.length) {
          item.children = sortChildren(item.children);
        }
        return item;
      });
  };

  return sortChildren(
    Array.from(pathMap.values()).filter(
      (item) => item.path.replace(/\/$/, "").indexOf("/") === -1,
    ),
  );
});
</script>
