<template>
  <div class="w-full max-w-4xl mx-auto">
    <div class="text-2xl py-6 font-medium flex w-full justify-between">
      <span>Select a Team</span>
      <UButton icon="i-lucide-circle-plus" @click="showCreateTeamDialog = true">
        Create New Team
      </UButton>
    </div>

    <UCard>
      <div
        v-if="teamsStore.allTeams.length > 0"
        class="ring ring-default rounded-lg divide-y divide-default"
      >
        <div
          v-for="teamItem in teamsStore.allTeams"
          :key="teamItem.id"
          class="p-4 flex justify-between items-center hover:bg-elevated/50 cursor-pointer"
          @click="navigateToTeam(teamItem.slug)"
        >
          <div class="flex items-center gap-3">
            <UAvatar
              :src="teamItem.logo || undefined"
              :alt="teamItem.name"
              size="md"
            />
            <div>
              <div class="font-semibold text-highlighted">
                {{ teamItem.name }}
              </div>
              <div class="text-sm text-muted">{{ teamItem.slug }}</div>
            </div>
          </div>
          <UIcon name="i-lucide-chevron-right" class="size-5 text-dimmed" />
        </div>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center p-8 text-center"
      >
        <UIcon name="i-lucide-users" class="size-12 text-dimmed mb-4" />
        <p class="text-lg font-semibold mb-2">No teams yet</p>
        <p class="text-sm text-muted">Create your first team to get started</p>
      </div>
    </UCard>

    <TeamCreateModal v-model:open="showCreateTeamDialog" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const teamsStore = useTeamsStore();
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
</script>
