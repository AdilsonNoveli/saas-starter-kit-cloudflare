<template>
  <div class="w-full max-w-4xl mx-auto">
    <div class="text-2xl py-6 font-medium">{{ t("teams.switcher.title") }}</div>

    <div
      v-if="teamsStore.allTeams.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
    >
      <!--
        Dashed "create" card, first in the grid — the same affordance the
        pedped reference uses for adding a new entity, applied here for the
        first time in this app.
      -->
      <button
        type="button"
        class="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-default hover:border-accented text-dimmed hover:text-default transition-colors cursor-pointer min-h-[164px]"
        @click="showCreateTeamDialog = true"
      >
        <UIcon name="i-ph-plus-circle-duotone" class="size-8" />
        <span class="text-sm font-medium">{{ t("teams.switcher.create") }}</span>
      </button>

      <div
        v-for="teamItem in teamsStore.allTeams"
        :key="teamItem.id"
        class="group relative rounded-lg bg-elevated ring ring-default hover:ring-accented transition-colors overflow-hidden"
      >
        <!-- Cover banner — no cover-image field on a team yet, so this is a
             flat brand-tinted band rather than a photo. -->
        <div class="h-14 bg-primary/15" />

        <UTooltip :text="t('teams.switcher.settings')">
          <UButton
            icon="i-ph-gear-duotone"
            size="xs"
            color="neutral"
            variant="solid"
            :ui="{ base: 'rounded-sm' }"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            :aria-label="t('teams.switcher.settingsOf', { name: teamItem.name })"
            @click.stop="navigateTo(`/${teamItem.slug}/settings`)"
          />
        </UTooltip>

        <button
          type="button"
          class="flex flex-col items-start gap-3 p-5 pt-0 -mt-7 w-full text-start cursor-pointer"
          @click="navigateToTeam(teamItem.slug)"
        >
          <UAvatar
            :src="teamItem.logo || undefined"
            :alt="teamItem.name"
            size="xl"
            class="ring-4 ring-elevated"
          />
          <div class="min-w-0 w-full">
            <div class="font-semibold text-highlighted truncate">
              {{ teamItem.name }}
            </div>
            <div class="text-sm text-muted truncate">{{ teamItem.slug }}</div>
          </div>
        </button>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center p-8 text-center rounded-lg bg-elevated ring ring-default"
    >
      <UIcon name="i-ph-users-duotone" class="size-12 text-dimmed mb-4" />
      <p class="text-lg font-semibold mb-2">{{ t("teams.switcher.emptyTitle") }}</p>
      <p class="text-sm text-muted mb-4">{{ t("teams.switcher.emptyDescription") }}</p>
      <UButton icon="i-ph-plus-circle-duotone" :label="t('teams.switcher.create')" @click="showCreateTeamDialog = true" />
    </div>

    <TeamCreateModal v-model:open="showCreateTeamDialog" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
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
