<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
    <div class="mb-10 w-full">
      <h1 class="text-3xl font-bold text-highlighted sm:text-4xl lg:text-5xl">
        {{ page?.title || docsConfig.name }}
      </h1>
      <p class="mt-3 text-lg sm:text-xl text-muted max-w-3xl">
        {{ page?.description || docsConfig.description }}
      </p>
      <!-- Full-width Search Bar -->
      <div class="mt-8 w-full">
        <Search />
      </div>
    </div>

    <!-- 3 columns grid for wider, larger cards -->
    <div
      v-if="products.length"
      class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
    >
      <DocsProductCard
        v-for="product in products"
        :key="product.path"
        :path="product.path"
        :title="product.title"
        :description="product.description"
        :icon="product.icon"
        :badge="product.badge"
        :sections="product.sections"
      />
    </div>

    <UAlert
      v-else
      icon="i-lucide-info"
      :title="$t('docs.index.emptyState')"
      color="neutral"
      variant="subtle"
    />
  </div>
</template>

<script setup lang="ts">
interface CardSection {
  path: string;
  title: string;
  icon?: string;
}

interface ProductCard {
  path: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  sections: CardSection[];
}

definePageMeta({
  layout: "page",
  auth: false,
});

const navigation = useContentNavigation();
const docsConfig = useAppConfig().docs;

// Same query usePage() itself runs — reused so the H1/description above stay
// editable from content/docs/0.index.md's own frontmatter instead of being
// hardcoded here.
const page = await usePage();

useSeoMeta({
  title: docsConfig.name,
  ogTitle: docsConfig.name,
  description: docsConfig.description,
  ogDescription: docsConfig.description,
  twitterCard: "summary_large_image",
});
defineOgImageComponent("NuxtSeo");

// Marketing copy, not a content field — "Enterprise Grade" isn't part of any
// page's frontmatter, so it's attached here by path instead of invented data
// on the content side.
const badgesByPath: Record<string, string> = {
  "/docs/saas-starter-kit": "Enterprise Grade",
};

const productPaths = computed(() => {
  const root = navigation?.value?.[0];
  if (!root) return [];
  return (root.children ?? [])
    .filter((item) => item.path !== root.path)
    .map((item) => item.path);
});

// queryCollectionNavigation() does NOT merge a folder's own page fields (like
// `description`) onto its navigation node once a co-located `.navigation.yml`
// overrides that node's title/icon — verified empirically: title and icon
// come back from `.navigation.yml` correctly, but `description` comes back
// empty even when requested via queryCollectionNavigation's `fields` param.
// Fetched directly from each product's own index page instead, the same way
// usePage() above already does for the root /docs page itself.
const { data: productDescriptions } = await useAsyncData(
  "docs-product-descriptions",
  async () => {
    const entries = await Promise.all(
      productPaths.value.map(async (path) => {
        const productPage = await queryCollection("docs").path(path).first();
        return [path, productPage?.description ?? ""] as const;
      }),
    );
    return Object.fromEntries(entries);
  },
  { watch: [productPaths] },
);

const products = computed<ProductCard[]>(() => {
  const root = navigation?.value?.[0];
  if (!root) return [];

  return (root.children ?? [])
    .filter((item) => item.path !== root.path)
    .map((product) => {
      const sections: CardSection[] = (product.children ?? [])
        .map((section): CardSection | null => {
          const firstPage = section.children?.[0];
          if (!firstPage) return null;
          return {
            path: firstPage.path,
            title: section.title ?? "",
            icon: section.icon,
          };
        })
        .filter((section): section is CardSection => section !== null);

      return {
        path: product.path,
        title: product.title ?? "",
        description: productDescriptions.value?.[product.path] ?? "",
        icon: product.icon ?? "i-lucide-layout-grid",
        badge: badgesByPath[product.path],
        sections,
      };
    });
});
</script>
