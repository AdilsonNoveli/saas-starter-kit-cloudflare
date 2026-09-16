<template>
  <!-- Header Bar expanded to match natural container width -->
  <div class="w-full backdrop-blur-xl bg-default/90 border-b border-default">
    <div
      class="container mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between"
    >
      <!-- Left: Brand Logo -->
      <div class="flex items-center shrink-0">
        <NuxtLink
          :to="localePath('/')"
          :aria-label="$t('nav.brand')"
          class="flex items-center shrink-0"
        >
          <img src="/nuxfire.svg" alt="Nuxfire" class="h-8 w-auto dark:hidden" />
          <img src="/nuxfire-white.svg" alt="Nuxfire" class="h-8 w-auto hidden dark:block" />
        </NuxtLink>
      </div>

      <!-- Center: Navigation Links (HOME | DOCS | BLOG) -->
      <div class="hidden lg:flex items-center justify-center">
        <UNavigationMenu
          class="text-xs uppercase tracking-widest font-semibold"
          :items="links"
          variant="link"
        />
      </div>

      <!-- Right: ColorMode + Language + Search + Login button -->
      <div class="hidden lg:flex items-center justify-end gap-2.5 shrink-0">
        <ColorModeSwitch />
        <UDropdownMenu :items="localeItems">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-languages"
            :label="currentLocaleCode"
            :aria-label="$t('nav.language')"
            class="cursor-pointer font-semibold tracking-wide"
          />
        </UDropdownMenu>
        <NuxtLink
          :to="useRuntimeConfig().public.appUrl || localePath('/signup')"
          external
          class="ml-1 inline-flex items-center justify-center h-9 px-4 rounded-md text-xs font-bold tracking-wider uppercase bg-[#fc444c] hover:bg-[#e03a42] text-white shadow-sm shadow-[#fc444c]/25 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
        >
          {{ $t("nav.login") }}
        </NuxtLink>
      </div>

      <!-- Mobile toggle -->
      <div class="flex items-center justify-end gap-2 lg:hidden">
        <ColorModeSwitch />
        <UDropdownMenu :items="localeItems">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-languages"
            :label="currentLocaleCode"
            :aria-label="$t('nav.language')"
            class="cursor-pointer font-semibold tracking-wide"
          />
        </UDropdownMenu>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-menu"
          :aria-label="$t('nav.openMenu')"
          @click="show = !show"
        />
      </div>
    </div>
  </div>

  <!-- Mobile Drawer -->
  <div
    class="block lg:hidden overflow-hidden transition-all duration-300 bg-default/95 border-b border-default backdrop-blur-xl"
    :class="[show ? 'h-auto py-4' : 'h-0 py-0']"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <UNavigationMenu
        orientation="vertical"
        :items="mobileLinks"
        variant="link"
      />
      <div class="pt-3 mt-3 flex items-center justify-between border-t border-default">
        <NuxtLink
          :to="useRuntimeConfig().public.appUrl || localePath('/signup')"
          external
          class="inline-flex items-center justify-center h-9 px-4 rounded-md text-xs font-bold tracking-wider uppercase bg-[#fc444c] hover:bg-[#e03a42] text-white shadow-sm shadow-[#fc444c]/25 transition-all duration-150 active:scale-95 cursor-pointer"
        >
          {{ $t("nav.login") }}
        </NuxtLink>
      </div>
      <div v-if="route.path?.startsWith(localePath('/docs'))" class="pt-3">
        <USeparator />
        <DocsSidebar is-mobile />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const show = ref(false);

const { t, locale, locales } = useI18n();
const localePath = useLocalePath();
// `prefix_except_default` puts the locale in the URL, so switching languages
// has to be a real navigation to the prefixed route — `setLocale()` alone
// would leave the browser on the old prefix. `switchLocalePath()` resolves
// the current route's equivalent path in the target locale.
const switchLocalePath = useSwitchLocalePath();

const isHome = computed(() => route.path === localePath("/"));

const links = computed(() => [
  {
    label: t("nav.home"),
    to: localePath("/"),
    exact: true,
    active: isHome.value && route.hash !== "#pricing",
  },
  {
    label: t("nav.pricing"),
    to: `${localePath("/")}#pricing`,
    exact: true,
    active: isHome.value && route.hash === "#pricing",
  },
  {
    label: t("nav.docs"),
    to: localePath("/docs"),
    active: route.path.startsWith(localePath("/docs")),
  },
  {
    label: t("nav.blog"),
    to: localePath("/blog"),
    active: route.path.startsWith(localePath("/blog")),
  },
]);

const mobileLinks = computed(() => [...links.value]);

// Short, uppercase code shown next to the language icon (EN/PT/ES) so the
// current language is visible at a glance instead of just an unlabeled icon.
// Locale codes aren't translated text, so no $t() key needed here.
const currentLocaleCode = computed(() =>
  (locale.value.split("-")[0] ?? locale.value).toUpperCase(),
);

const localeItems = computed(() =>
  locales.value.map((l) => ({
    label: l.name ?? l.code,
    // On routes deliberately excluded from localization (the docs/blog
    // catch-alls, see their definePageMeta) switchLocalePath() has no
    // equivalent to resolve and returns an empty string — fall back to that
    // locale's home page instead of rendering a link to nowhere.
    to: switchLocalePath(l.code) || localePath("/", l.code),
    icon: locale.value === l.code ? "i-lucide-check" : undefined,
  })),
);
</script>

