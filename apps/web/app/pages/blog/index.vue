<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
    <!-- Header -->
    <div class="mb-12 max-w-3xl space-y-3">
      <h1 class="text-3xl font-extrabold text-highlighted sm:text-4xl lg:text-5xl tracking-tight">
        {{ $t("blog.title") }}
      </h1>
      <p class="text-lg text-muted leading-relaxed">
        {{ $t("blog.subtitle") }}
      </p>
    </div>

    <!-- 3 Columns Card Grid -->
    <div
      v-if="posts?.length"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
    >
      <article
        v-for="post in posts"
        :key="post.path"
        class="group relative flex flex-col justify-between rounded-2xl border border-default bg-elevated/60 hover:bg-elevated/90 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden p-6"
      >
        <div class="space-y-4">
          <!-- Top Metadata: Category & Reading Time -->
          <div class="flex items-center justify-between gap-2 text-xs">
            <UBadge
              color="primary"
              variant="subtle"
              size="sm"
              class="font-semibold uppercase tracking-wider text-[11px]"
            >
              {{ post.category || "Engenharia" }}
            </UBadge>
            <span v-if="post.readTime" class="text-muted flex items-center gap-1 font-medium">
              <UIcon name="i-lucide-clock" class="w-3.5 h-3.5 text-muted" />
              {{ post.readTime }}
            </span>
          </div>

          <!-- Title -->
          <h2 class="text-lg sm:text-xl font-bold text-highlighted group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            <NuxtLink :to="post.path" class="focus:outline-none">
              <span class="absolute inset-0 z-0" aria-hidden="true" />
              {{ post.title }}
            </NuxtLink>
          </h2>

          <!-- Description -->
          <p class="text-sm text-muted line-clamp-3 leading-relaxed">
            {{ post.description }}
          </p>
        </div>

        <!-- Footer: Author & Date & Link -->
        <div class="pt-6 mt-6 border-t border-default flex items-center justify-between relative z-10">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {{ (post.author || "N").charAt(0) }}
            </div>
            <div class="flex flex-col text-xs leading-tight">
              <span class="font-semibold text-highlighted">{{ post.author }}</span>
              <span v-if="post.date" class="text-muted text-[11px] mt-0.5">{{ formatDate(post.date) }}</span>
            </div>
          </div>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform duration-200">
            Ler artigo
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
          </span>
        </div>
      </article>
    </div>

    <!-- Empty State -->
    <UAlert
      v-else
      icon="i-lucide-newspaper"
      title="Nenhum artigo publicado ainda"
      description="Novos artigos serão publicados em breve."
      color="neutral"
      variant="subtle"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "page",
  auth: false,
});
const { t } = useI18n();
useSeoMeta({
  title: () => t("blog.seoTitle"),
});

const { data: posts } = await useAsyncData("blog-list", () =>
  queryCollection("blog").order("date", "DESC").all(),
);
</script>
