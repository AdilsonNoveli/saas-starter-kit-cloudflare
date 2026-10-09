<template>
  <footer class="w-full border-t border-default bg-default/60 backdrop-blur-sm">
    <div class="container mx-auto max-w-6xl px-6 py-12">
      <div class="grid gap-8 grid-cols-2 md:grid-cols-4">
        <!-- Brand -->
        <div class="col-span-2 flex flex-col gap-4">
          <NuxtLink
            :to="localePath('/')"
            :aria-label="$t('nav.brand')"
            class="flex items-center"
          >
            <img src="/svg/nuxfire.svg" alt="Nuxfire" class="h-7 w-auto dark:hidden" />
            <img src="/svg/nuxfire-white.svg" alt="Nuxfire" class="h-7 w-auto hidden dark:block" />
          </NuxtLink>
          <p class="text-sm text-muted max-w-xs leading-relaxed">
            {{ $t("footer.tagline") }}
          </p>
          <p class="text-xs text-muted">
            {{ $t("footer.copyright", { year: currentYear }) }}
          </p>
        </div>

        <!-- Legal -->
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted">
            {{ $t("footer.legalTitle") }}
          </span>
          <div v-for="link in legal" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="text-sm text-muted hover:text-highlighted transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Links -->
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted">
            {{ $t("footer.navTitle") }}
          </span>
          <div v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="text-sm text-muted hover:text-highlighted transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear();

const { t } = useI18n();
const localePath = useLocalePath();

// The legal pages are English-only and have no localized routes (i18n: false), so `localePath`
// returns an empty string for them and the footer rendered anchors without an href.
const legal = computed(() => [
  { label: t("footer.legal.terms"), to: "/terms-of-service" },
  { label: t("footer.legal.privacy"), to: "/privacy-policy" },
  { label: t("footer.legal.license"), to: "/license" },
]);
const links = computed(() => [
  { label: t("nav.home"), to: localePath("/") },
  { label: t("nav.docs"), to: localePath("/docs") },
  { label: t("nav.blog"), to: localePath("/blog") },
]);
</script>

