<template>
  <div>
    <div class="flex items-center space-x-2">
      <UButton
        :icon="getItemIcon"
        variant="ghost"
        color="neutral"
        class="flex-grow justify-start"
        @click="hasChildren && toggleExpand()"
      >
        <template v-if="hasChildren" #leading>
          <UIcon
            name="i-lucide-chevron-right"
            class="transition-transform"
            :class="isExpanded ? 'rotate-90' : ''"
          />
          <UIcon class="w-5 h-5" :name="getItemIcon" />
        </template>
        <div class="flex items-center gap-3 w-full">
          <span>{{ name }}</span>
          <span v-if="showHints && hint" class="text-xs text-muted">
            {{ hint }}
          </span>
        </div>
      </UButton>
    </div>
    <div v-if="isExpanded && children" class="ml-6">
      <FolderTreeItem
        v-for="child in children"
        :key="child.path"
        v-bind="child"
        :hints="hints"
        :show-hints="showHints"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface FolderTreeItemProps {
  path: string;
  children?: FolderTreeItemProps[];
  hints: Record<string, string>;
  showHints?: boolean;
}

const props = withDefaults(defineProps<FolderTreeItemProps>(), {
  showHints: false,
});

const isExpanded = ref(false);
const isDirectory = computed(() => props.path.endsWith("/"));
const name = computed(() => {
  const parts = props.path.split("/");
  return parts[parts.length - 1] || parts[parts.length - 2];
});

const hint = computed(() => props.hints[props.path] || "");

const hasChildren = computed(() => props.children && props.children.length > 0);

const getItemIcon = computed(() => {
  if (isDirectory.value) {
    return isExpanded.value ? "i-lucide-folder-open" : "i-lucide-folder";
  }
  return getFileIcon(props.path);
});

function toggleExpand() {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
  }
}

function getFileIcon(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    svg: "i-vscode-icons-file-type-svg",
    patch: "i-vscode-icons-file-type-patch",
    js: "i-vscode-icons-file-type-js",
    mjs: "i-vscode-icons-file-type-js",
    prisma: "i-vscode-icons-file-type-prisma",
    ts: "i-vscode-icons-file-type-typescript",
    vue: "i-vscode-icons-file-type-vue",
    json: "i-vscode-icons-file-type-json",
    md: "i-vscode-icons-file-type-markdown",
    html: "i-vscode-icons-file-type-html",
    css: "i-vscode-icons-file-type-css",
    scss: "i-vscode-icons-file-type-scss",
    py: "i-vscode-icons-file-type-python",
    yaml: "i-vscode-icons-file-type-yaml",
    yml: "i-vscode-icons-file-type-yaml",
    default: "i-lucide-file",
  };
  return iconMap[ext || ""] || (iconMap.default as string);
}
</script>
