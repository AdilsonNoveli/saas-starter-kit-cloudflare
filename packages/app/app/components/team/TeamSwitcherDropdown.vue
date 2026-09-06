<template>
  <div>
    <UDropdownMenu
      :items="items"
      :content="{ align: 'center', collisionPadding: 12 }"
      :ui="{
        content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)',
      }"
    >
      <UButton
        :label="collapsed ? undefined : (team?.name ?? 'Select Team')"
        :avatar="{ src: team?.logo || undefined, alt: team?.name ?? 'Team' }"
        :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
        color="neutral"
        variant="ghost"
        block
        :square="collapsed"
        class="data-[state=open]:bg-elevated"
        :class="[!collapsed && 'py-2']"
        :ui="{ trailingIcon: 'text-dimmed' }"
      />
    </UDropdownMenu>

    <TeamCreateModal v-model:open="showCreateTeamDialog" />
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{ collapsed?: boolean }>();

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

const items = computed<DropdownMenuItem[][]>(() => {
  const teamItems: DropdownMenuItem[] = teamsStore.allTeams.map((teamItem) => ({
    label: teamItem.name,
    avatar: { src: teamItem.logo || undefined, alt: teamItem.name },
    onSelect: () => navigateToTeam(teamItem.slug),
  }));

  return [
    ...(teamItems.length > 0 ? [teamItems] : []),
    [
      {
        label: "Create new team",
        icon: "i-lucide-circle-plus",
        onSelect: () => {
          showCreateTeamDialog.value = true;
        },
      },
    ],
  ];
});
</script>
