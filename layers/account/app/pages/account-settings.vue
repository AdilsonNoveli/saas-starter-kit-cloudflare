<template>
  <SettingsPanel
    id="account-settings"
    :title="t('account.settings.title')"
    :links="links"
  />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();

// Personal settings — no team scoping or ability gating, every signed-in
// user sees the same sections. The Preferences tab keeps the `appearance`
// route (SPEC-0010, DEC-017).
const links = computed<NavigationMenuItem[]>(() => [
  {
    label: t("account.settings.tabs.profile"),
    icon: "i-ph-user-duotone",
    to: "/account-settings",
    // Without this the index link stays highlighted on the child routes.
    exact: true,
  },
  {
    label: t("account.settings.tabs.preferences"),
    icon: "i-ph-sliders-horizontal-duotone",
    to: "/account-settings/appearance",
  },
  {
    label: t("account.settings.tabs.notifications"),
    icon: "i-ph-bell-duotone",
    to: "/account-settings/notifications",
  },
  {
    label: t("account.settings.tabs.security"),
    icon: "i-ph-shield-duotone",
    to: "/account-settings/security",
  },
]);

definePageMeta({
  layout: "dashboard",
});
</script>
