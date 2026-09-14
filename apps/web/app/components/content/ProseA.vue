<template>
  <NuxtLink
    :href="href"
    :target="target"
    :external="external"
    class="font-semibold underline underline-offset-4"
  >
    <slot />
  </NuxtLink>
</template>

<script setup lang="ts">
import type { NuxtLinkProps } from "#app";

const { href = "", external = false } = defineProps<{
  href?: string;
  target?: NuxtLinkProps["target"];
  external?: boolean;
}>();
</script>
