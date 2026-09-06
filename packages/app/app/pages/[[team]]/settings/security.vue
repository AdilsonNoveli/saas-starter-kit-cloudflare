<template>
  <div>
    <Bouncer :ability="deleteTeamAbility" :args="[team?.id || '']">
      <template #can>
        <UCard :ui="{ root: 'border-error/50' }">
          <template #header>
            <div class="flex items-center gap-2 text-error">
              <UIcon name="i-lucide-triangle-alert" />
              <span class="font-medium">Delete Team</span>
            </div>
          </template>
          <p class="text-sm text-muted">
            Once you delete a team, there is no going back. Please be certain.
          </p>
          <template #footer>
            <div class="w-full gap-2 flex justify-end">
              <UButton
                color="error"
                variant="outline"
                @click="showDeleteConfirm = true"
              >
                Delete this team
              </UButton>
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
              <UIcon name="i-lucide-trash" />
              <span class="font-medium">Delete Team</span>
            </div>
          </template>
          <p class="text-sm">
            Are you sure you want to delete this team? This action is
            irreversible.
          </p>
          <template #footer>
            <div class="flex gap-2 w-full justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="deleting"
                @click="showDeleteConfirm = false"
              >
                No
              </UButton>
              <UButton
                :loading="deleting"
                color="error"
                variant="outline"
                @click="deleteTeam"
              >
                Yes
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { deleteTeam as deleteTeamAbility } from "#shared/utils/abilities";

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
