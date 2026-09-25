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
  <section aria-labelledby="landing-outcomes" class="container mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24">
    <h2 id="landing-outcomes" class="text-pretty text-3xl sm:text-4xl font-extrabold tracking-tight text-highlighted">
      {{ t("landing.outcomes.title") }}
    </h2>
    <ul class="mt-12 space-y-10 list-none p-0">
      <li v-for="item in outcomes" :key="item.key" class="flex gap-5">
        <UIcon :name="item.icon" class="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 class="text-xl font-bold text-highlighted">
            {{ t(`landing.outcomes.items.${item.key}.title`) }}
          </h3>
          <p class="mt-2 text-base leading-relaxed text-muted">
            {{ t(`landing.outcomes.items.${item.key}.text`) }}
          </p>
          <NuxtLink :to="item.href" class="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            {{ t("landing.outcomes.linkLabel") }}
          </NuxtLink>
        </div>
      </li>
    </ul>
  </section>
</template>
