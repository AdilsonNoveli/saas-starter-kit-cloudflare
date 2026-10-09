<template>
  <LayoutSection>
    <article v-if="doc" class="space-y-3">
      <div class="space-y-2">
        <h1 class="text-4xl font-semibold">{{ doc.title }}</h1>
        <div v-if="byline" class="flex gap-3 text-muted">
          <span v-if="byline.author">{{ byline.author }}</span>
          <span v-if="byline.date">{{ formatDate(byline.date) }}</span>
        </div>
        <slot />
      </div>
      <div v-if="isBlogPost(doc) && doc.image" class="overflow-hidden rounded-2xl border border-default aspect-video my-4">
        <img :src="doc.image" :alt="doc.title" class="w-full h-full object-cover" />
      </div>
      <USeparator />
      <ContentRenderer :value="doc" />
    </article>
  </LayoutSection>
</template>

<script setup lang="ts">
import type { PageCollections } from "@nuxt/content";
import { blogPostFromEntry, contentNotFound } from "~/utils/seo/content-seo";

const { type } = defineProps<{
  type?: string;
}>();

const route = useRoute();
const { data: doc } = await useAsyncData(route.path, () =>
  type === "blog"
    ? queryCollection("blog").path(route.path).first()
    : queryCollection("legal").path(route.path).first(),
);

// An unknown slug must be a 404, not an empty page with status 200 (a soft 404 that search
// engines index). During prerender this also fails the build for a link to a missing page.
const notFound = contentNotFound(doc.value, { path: route.path });
if (notFound) throw createError({ ...notFound, fatal: true });

type ContentDoc = NonNullable<typeof doc.value>;

// Only the `blog` collection declares `author`/`date` in its schema, so narrow
// the blog|legal union to the blog member before reading them.
function isBlogPost(value: ContentDoc): value is PageCollections["blog"] {
  return "author" in value;
}

const byline = computed(() => {
  const value = doc.value;
  if (!value || !isBlogPost(value)) return undefined;
  return { author: value.author, date: value.date };
});

// Metadata is decided by the pure builders (utils/seo/content-seo.ts); this page only
// hands them the document. Posts get article metadata, structured data and their own
// language; legal pages get the plain page metadata.
const current = doc.value;
if (current) {
  if (isBlogPost(current)) {
    useArticleSeo(blogPostFromEntry({ ...current }));
  } else {
    usePageSeo({
      path: route.path,
      title: current.title,
      description: current.description,
      kind: "website",
    });
  }
}
</script>
