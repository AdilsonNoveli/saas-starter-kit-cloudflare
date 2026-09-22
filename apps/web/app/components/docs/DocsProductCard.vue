<template>
  <NuxtLink
    :to="path"
    class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-default bg-elevated/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :aria-label="$t('docs.productCard.openAriaLabel', { title })"
  >
    <!-- Cover -->
    <div
      class="relative flex h-52 sm:h-56 shrink-0 flex-col justify-end items-center overflow-hidden bg-linear-to-br from-primary/15 via-primary/5 to-secondary/10 px-6 pt-12 pb-5 sm:px-8 sm:pb-6"
    >
      <div
        class="absolute inset-0 opacity-30 bg-[radial-gradient(var(--ui-border)_1px,transparent_1px)] bg-size-[16px_16px]"
      />

      <UBadge
        v-if="badge"
        color="primary"
        variant="subtle"
        size="sm"
        class="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 z-10"
      >
        {{ badge }}
      </UBadge>

      <div
        class="relative flex h-full w-full max-w-70 flex-col overflow-hidden rounded-xl border border-default/70 bg-default/85 shadow-sm backdrop-blur-sm"
      >
        <div
          class="flex items-center gap-1.5 border-b border-default/60 px-3 py-2"
        >
          <span class="h-2 w-2 rounded-full bg-error/70" />
          <span class="h-2 w-2 rounded-full bg-warning/70" />
          <span class="h-2 w-2 rounded-full bg-success/70" />
          <span
            class="ml-2 h-2 max-w-28 flex-1 rounded-full border border-default/50 bg-default/60"
          />
        </div>
        <div class="flex flex-1 items-center justify-center gap-3.5 sm:gap-4 py-3">
          <UIcon
            v-for="mockIcon in previewIcons"
            :key="mockIcon"
            :name="mockIcon"
            class="h-6 w-6 text-primary/75 transition-transform duration-200 group-hover:scale-110"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-1 flex-col p-5 pt-5">
      <div class="mb-2 flex items-center gap-2">
        <UIcon :name="icon" class="h-5 w-5 shrink-0 text-primary" />
        <h3 class="text-base font-semibold text-highlighted">{{ title }}</h3>
      </div>

      <p class="flex-1 text-sm leading-relaxed text-muted">
        {{ description }}
      </p>

      <div v-if="sections?.length" class="mt-4 flex flex-wrap gap-1.5">
        <NuxtLink
          v-for="section in sections"
          :key="section.path"
          :to="section.path"
          class="inline-flex items-center gap-1 rounded-full border border-default px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary/50 hover:text-primary"
          @click.stop
        >
          <UIcon v-if="section.icon" :name="section.icon" class="h-3 w-3" />
          {{ section.title }}
        </NuxtLink>
      </div>

      <div
        class="mt-4 flex items-center border-t border-default pt-4 text-sm font-medium text-primary"
      >
        {{ $t("docs.productCard.learnMore") }}
        <UIcon
          name="i-lucide-arrow-right"
          class="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
        />
      </div>
    </div>
  </NuxtLink>
</template>

<!-- cSpell:ignore Nuxt lucide -->
<script setup lang="ts">
interface CardSection {
  path: string;
  title: string;
  icon?: string;
}

withDefaults(
  defineProps<{
    path: string;
    title: string;
    description?: string;
    icon?: string;
    badge?: string;
    sections?: CardSection[];
    previewIcons?: string[];
  }>(),
  {
    description: "",
    icon: "i-lucide-layout-grid",
    badge: undefined,
    sections: () => [],
    previewIcons: () => [
      "i-lucide-shield-check",
      "i-lucide-users",
      "i-lucide-credit-card",
      "i-lucide-bell",
    ],
  },
);
</script>
