<template>
  <div class="w-full flex justify-center">
    <!-- sideOffset: see AccountUserDropdown.vue — same 64px header, same fix. -->
    <UDropdownMenu
      :items="items"
      :content="{ align: 'center', sideOffset: 16, collisionPadding: 12 }"
      :ui="{
        content: collapsed ? 'w-64' : 'w-64',
      }"
    >
      <UButton
        :label="collapsed ? undefined : (team?.name ?? t('teams.switcher.placeholder'))"
        :avatar="{
          src: team?.logo || undefined,
          alt: team?.name ?? t('teams.switcher.avatarAlt'),
          size: collapsed ? 'xl' : '2xs',
          ui: { root: 'rounded-md' },
        }"
        :trailing-icon="collapsed ? undefined : 'i-ph-caret-down-duotone'"
        color="neutral"
        variant="ghost"
        block
        :square="collapsed"
        class="bg-elevated ring ring-default hover:bg-accented data-[state=open]:bg-accented"
        :class="collapsed ? 'size-11 p-0.5 rounded-lg' : 'py-2'"
        :ui="{ label: 'text-base', trailingIcon: 'text-dimmed' }"
      />
    </UDropdownMenu>

    <TeamCreateModal v-model:open="showCreateTeamDialog" />
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{ collapsed?: boolean }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const teamsStore = useTeamsStore();
const { currentTeam: team } = storeToRefs(teamsStore);
const showCreateTeamDialog = ref(false);

if (!teamsStore.loaded) {
  await teamsStore.fetchAllTeams();
}

function navigateToTeam(slug: string) {
  const routeName = route.name?.toString()?.startsWith("team-")
    ? route.name
    : "team-dashboard";
  navigateTo(router.resolve({ name: routeName, params: { team: slug } }));
}

/**
 * Kept to just switching + creating — team settings is reached from the
 * team card on the "Select a Team" grid (TeamSwitcher.vue) instead, via its
 * own gear icon, so this compact dropdown doesn't have to carry a
 * destination unrelated to picking a team.
 */
const items = computed<DropdownMenuItem[][]>(() => {
  const teamItems: DropdownMenuItem[] = teamsStore.allTeams.map((teamItem) => ({
    label: teamItem.name,
    avatar: { src: teamItem.logo || undefined, alt: teamItem.name, ui: { root: "rounded-md" } },
    type: "checkbox",
    checked: teamItem.slug === team.value?.slug,
    onSelect: () => navigateToTeam(teamItem.slug),
  }));

  return [
    ...(teamItems.length > 0 ? [teamItems] : []),
    [
      {
        label: t("teams.switcher.create"),
        icon: "i-ph-plus-circle-duotone",
        onSelect: () => {
          showCreateTeamDialog.value = true;
        },
      },
    ],
  ];
});
</script>
