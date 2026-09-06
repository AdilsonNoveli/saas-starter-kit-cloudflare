<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{
      content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width)',
    }"
  >
    <UButton
      :label="collapsed ? undefined : (user?.name ?? undefined)"
      :avatar="{ src: user?.image ?? undefined, alt: user?.name ?? 'Account' }"
      :trailing-icon="collapsed ? undefined : 'i-lucide-more-vertical'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{ collapsed?: boolean }>();

const { user } = useSession();
const colorMode = useColorMode();
const { locale, locales, setLocale } = useI18n();

const colorModeIcons = {
  light: "i-lucide-sun",
  dark: "i-lucide-moon",
  system: "i-lucide-monitor",
} as const;

const appearanceChildren = computed<DropdownMenuItem[]>(() =>
  (["light", "dark", "system"] as const).map((preference) => ({
    label: toTitleCase(preference),
    icon: colorModeIcons[preference],
    type: "checkbox",
    checked: colorMode.preference === preference,
    onSelect: (event: Event) => {
      event.preventDefault();
      colorMode.preference = preference;
    },
  })),
);

const localeChildren = computed<DropdownMenuItem[]>(() =>
  locales.value.map((item) => ({
    label: item.name ?? item.code,
    type: "checkbox",
    checked: locale.value === item.code,
    onSelect: (event: Event) => {
      event.preventDefault();
      setLocale(item.code);
    },
  })),
);

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: "label",
      label: user.value?.name ?? "Account",
      avatar: {
        src: user.value?.image ?? undefined,
        alt: user.value?.name ?? "Account",
      },
    },
  ],
  [
    {
      label: "Account Settings",
      icon: "i-lucide-settings",
      to: "/account-settings",
    },
  ],
  [
    {
      label: "Appearance",
      icon: "i-lucide-sun-moon",
      children: appearanceChildren.value,
    },
    {
      label: "Language",
      icon: "i-lucide-languages",
      children: localeChildren.value,
    },
  ],
  [
    {
      label: "Sign Out",
      icon: "i-lucide-log-out",
      onSelect: async () => {
        await useSession().clear();
        navigateTo("/", { external: true });
      },
    },
  ],
]);
</script>
