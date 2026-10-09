<!-- Filename is a misnomer kept for URL stability: this page is the team
     Danger Zone (delete team), NOT credentials/2FA — those live at
     /account-settings/security. Renaming the route is a separate change. -->
<template>
  <div>
    <Bouncer :ability="deleteTeamAbility" :args="[team?.id || '']">
      <template #can>
        <UCard :ui="{ root: 'border-error/50' }">
          <template #header>
            <div class="flex items-center gap-2 text-error">
              <UIcon name="i-ph-warning-duotone" />
              <span class="font-medium">{{ t("teams.settings.danger.title") }}</span>
            </div>
          </template>
          <p class="text-sm text-muted">
            {{ t("teams.settings.danger.description") }}
          </p>
          <template #footer>
            <div class="w-full gap-2 flex justify-end">
              <UButton
                color="error"
                variant="outline"
                :label="t('teams.settings.danger.action')"
                @click="showDeleteConfirm = true"
              />
            </div>
          </template>
        </UCard>
      </template>
    </Bouncer>

    <!--
      v-model:open, not v-model — @nuxt/ui v4's Modal takes an `open` prop
      with an `update:open` emit rather than the usual modelValue pair.
    -->
    <UModal v-model:open="showDeleteConfirm" :dismissible="!deleting">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-error">
              <UIcon name="i-ph-trash-duotone" />
              <span class="font-medium">{{ t("teams.settings.danger.title") }}</span>
            </div>
          </template>
          <p class="text-sm">
            {{ t("teams.settings.danger.confirmDescription", { name: team?.name ?? "" }) }}
          </p>
          <template #footer>
            <div class="flex gap-2 w-full justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="deleting"
                :label="t('teams.settings.danger.cancel')"
                @click="showDeleteConfirm = false"
              />
              <UButton
                :loading="deleting"
                color="error"
                variant="outline"
                :label="t('teams.settings.danger.confirm')"
                @click="deleteTeam"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
// Not `#shared/utils/abilities`: that alias only ever resolves to the
// Composition Root's own shared/ dir, never a layer's (Fase 3, passo 1b).
import { teamsDeleteTeam as deleteTeamAbility } from "@nuxfire/layer-teams/shared/utils/abilities";

const { t } = useI18n();
const team = useCurrentTeam();
const teamsStore = useTeamsStore();
const deleteMutation = useTrpcClient().teams.delete;

const showDeleteConfirm = ref(false);
const deleting = ref(false);

async function deleteTeam() {
  deleting.value = true;
  await deleteMutation.mutate({
    teamIdentifier: team.value?.slug || "",
  });
  deleting.value = false;
  await teamsStore.fetchAllTeams();
  navigateTo("/app");
}

definePageMeta({
  layout: "dashboard",
});
</script>
