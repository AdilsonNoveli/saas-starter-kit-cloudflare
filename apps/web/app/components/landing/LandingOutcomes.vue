<script setup lang="ts">
const { t } = useI18n();

// Each outcome links to the docs page that holds the depth: the page sells, the docs prove.
// Docs deep pages have one URL for every language (the content follows the active locale).
const outcomes = [
  { key: "auth", icon: "i-lucide-user-round", href: "/docs/saas-starter-kit/features/auth" },
  { key: "teams", icon: "i-lucide-users", href: "/docs/saas-starter-kit/features/rbac" },
  { key: "billing", icon: "i-lucide-credit-card", href: "/docs/saas-starter-kit/features/payments" },
  { key: "admin", icon: "i-lucide-layout-dashboard", href: "/docs/saas-starter-kit/features/platform-admin" },
  { key: "realtime", icon: "i-lucide-radio", href: "/docs/saas-starter-kit/features/websockets" },
  { key: "deploy", icon: "i-lucide-rocket", href: "/docs/saas-starter-kit/getting-started/deploy" },
];
</script>

<template>
  <section aria-labelledby="landing-outcomes" class="container mx-auto max-w-6xl px-4 md:px-8 py-20 md:py-28">
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-primary">{{ t("landing.outcomes.eyebrow") }}</p>
      <h2 id="landing-outcomes" class="mt-3 text-pretty text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
        {{ t("landing.outcomes.title") }}
      </h2>
    </div>
    <ul class="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
      <li v-for="item in outcomes" :key="item.key">
        <span class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UIcon :name="item.icon" class="size-6" aria-hidden="true" />
        </span>
        <h3 class="mt-5 text-xl font-bold text-highlighted">
          {{ t(`landing.outcomes.items.${item.key}.title`) }}
        </h3>
        <p class="mt-2 text-base leading-relaxed text-muted">
          {{ t(`landing.outcomes.items.${item.key}.text`) }}
        </p>
        <NuxtLink :to="item.href" class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {{ t("landing.outcomes.linkLabel") }}
          <UIcon name="i-lucide-arrow-right" class="size-4" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
