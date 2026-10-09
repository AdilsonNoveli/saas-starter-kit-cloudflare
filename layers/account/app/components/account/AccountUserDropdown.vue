<template>
  <!--
    `sideOffset` (16, not the stock 8): the stock value is measured from the
    trigger button's own edge, not the navbar's — and the button sits
    centered in a 64px header with ~8px of its own margin above that edge.
    Net result at 8: the menu's top landed exactly on the header's bottom
    border, reading as glued to it rather than opened below it.
  -->
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', sideOffset: 16, collisionPadding: 12 }"
    :ui="{
      content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width)',
    }"
  >
    <!-- Collapsed: square icon button with avatar only -->
    <UButton
      v-if="collapsed"
      :avatar="{
        src: user?.image ?? undefined,
        alt: displayName,
        size: avatarSize,
        ui: { root: 'rounded-md' },
      }"
      :size="buttonSize"
      color="neutral"
      variant="ghost"
      square
      class="data-[state=open]:bg-elevated"
    />

    <!-- Expanded: full row with avatar + name + trailing icon -->
    <UButton
      v-else
      color="neutral"
      variant="ghost"
      block
      class="data-[state=open]:bg-elevated py-2 justify-start"
      :ui="{ trailingIcon: 'ms-auto text-dimmed' }"
      trailing-icon="i-ph-dots-three-vertical-duotone"
    >
      <UAvatar
        :src="user?.image ?? undefined"
        :alt="displayName"
        size="2xs"
        class="shrink-0"
        :ui="{ root: 'rounded-md' }"
      />
      <span class="truncate text-sm font-medium text-highlighted">
        {{ displayName }}
      </span>
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { AvatarProps, ButtonProps, DropdownMenuItem } from "@nuxt/ui";

/**
 * `size` only affects the collapsed (icon-only) rendering — the expanded
 * row always uses its own fixed "2xs" avatar. Every header that renders
 * this collapsed passes `size="md"` — the stock "xs" default read as a
 * speck stuck in the corner next to the navbar's own padding.
 */
const { collapsed, size = "xs" } = defineProps<{
  collapsed?: boolean;
  size?: AvatarProps["size"];
}>();

const buttonSizeByAvatarSize: Record<string, ButtonProps["size"]> = {
  "3xs": "xs",
  "2xs": "sm",
  xs: "md",
  sm: "lg",
  md: "xl",
  lg: "xl",
  xl: "xl",
  "2xl": "xl",
  "3xl": "xl",
};

const avatarSize = computed(() => size);
const buttonSize = computed(() => buttonSizeByAvatarSize[size ?? "xs"] ?? "md");

const { user } = useSession();

/*
 * An unset name should never fall straight to a generic "Account" label —
 * the email still identifies the person. "Account" is the last resort, not
 * the first fallback.
 */
const displayName = computed(
  () => user.value?.name ?? user.value?.email ?? "Account",
);

/*
 * Kept deliberately minimal — label, Account Settings, Sign Out. Appearance
 * and Language used to live here as nested checkbox submenus; they now have
 * their own page (/account-settings/appearance) alongside Profile/
 * Notifications/Security, matching how GitHub/Vercel scope theme and locale
 * as settings, not as quick actions in the avatar menu.
 */
const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: "label",
      label: displayName.value,
      avatar: {
        src: user.value?.image ?? undefined,
        alt: displayName.value,
        ui: { root: "rounded-md" },
      },
    },
  ],
  [
    {
      label: "Account Settings",
      icon: "i-ph-gear-duotone",
      to: "/account-settings",
    },
  ],
  [
    {
      label: "Sign Out",
      icon: "i-ph-sign-out-duotone",
      onSelect: async () => {
        await useSession().clear();
        navigateTo("/", { external: true });
      },
    },
  ],
]);
</script>
