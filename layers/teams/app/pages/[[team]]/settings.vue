<template>
  <SettingsPanel id="team-settings" title="Settings" :links="links" />
</template>

<script setup lang="ts">
const currentTeam = useCurrentTeam();
const teamID = computed(() => currentTeam.value?.id || "");

const links = useTeamSettingsLinks(teamID);

definePageMeta({
  layout: "dashboard",
});
</script>
