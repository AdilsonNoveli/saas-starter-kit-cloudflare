<template>
  <SettingsPanel id="team-settings" :title="t('teams.settings.title')" :links="links" />
</template>

<script setup lang="ts">
const { t } = useI18n();
const currentTeam = useCurrentTeam();
const teamID = computed(() => currentTeam.value?.id || "");

const links = useTeamSettingsLinks(teamID);

definePageMeta({
  layout: "dashboard",
});
</script>
