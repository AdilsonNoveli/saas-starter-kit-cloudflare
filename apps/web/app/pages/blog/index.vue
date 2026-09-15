<template>
  <LayoutSection>
    <main class="space-y-3">
      <div class="flex flex-col">
        <span class="text-4xl font-semibold">{{ $t("blog.title") }}</span>
        <span class="text-muted">{{ $t("blog.subtitle") }}</span>
      </div>
      <USeparator />
      <div v-if="posts?.length" class="divide-y divide-default">
        <div v-for="post in posts" :key="post.path" class="py-4 space-y-1">
          <UButton :to="post.path" variant="link" class="p-0 text-xl">
            {{ post.title }}
          </UButton>
          <p>{{ post.description }}</p>
          <div class="flex gap-3 text-sm text-muted">
            <span v-if="post.author">{{ post.author }}</span>
            <span v-if="post.date">{{ formatDate(post.date) }}</span>
          </div>
        </div>
      </div>
    </main>
  </LayoutSection>
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
