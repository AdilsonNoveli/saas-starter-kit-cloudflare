<template>
  <SettingsPanel
    id="account-settings"
    title="Account Settings"
    :links="links"
  />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

// Personal settings — no team scoping or ability gating, every signed-in
// user sees the same three sections.
const links: NavigationMenuItem[] = [
  {
    label: "Profile",
    icon: "i-lucide-user",
    to: "/account-settings",
    // Without this the index link stays highlighted on the child routes.
    exact: true,
  },
  {
    label: "Appearance",
    icon: "i-lucide-paintbrush-vertical",
    to: "/account-settings/appearance",
  },
  {
    label: "Notifications",
    icon: "i-lucide-bell",
    to: "/account-settings/notifications",
  },
  {
    label: "Security",
    icon: "i-lucide-shield",
    to: "/account-settings/security",
  },
];

definePageMeta({
  layout: "dashboard",
});
</script>
