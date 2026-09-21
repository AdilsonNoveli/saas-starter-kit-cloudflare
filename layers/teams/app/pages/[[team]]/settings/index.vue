<template>
  <UForm id="team-general-form" :schema="schema" :state="state" @submit="save">
    <UPageCard
      v-if="showUpdate"
      title="General"
      description="These informations will be displayed publicly."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="team-general-form"
        label="Save changes"
        color="neutral"
        type="submit"
        :loading="loading"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField label="Team Avatar" name="avatar">
        <AvatarUploader
          :src="team?.logo"
          :alt="team?.name ?? 'Team'"
          :uploading="updatingTeamLogo"
          :disabled="!showUpdate"
          size="lg"
          @upload="handleAvatarUpload"
          @remove="handleAvatarRemove"
        />
      </UFormField>
      <USeparator />
      <UFormField label="Team Name" name="name">
        <UInput
          v-model="state.name"
          :disabled="!showUpdate"
          placeholder="Team Name"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>

<script setup lang="ts">
import { z } from "zod";

const team = useCurrentTeam();
const teamsStore = useTeamsStore();
const teamID = computed(() => team.value?.id || "");
const updateMutation = useTrpcClient().teams.update;
const updateTeamLogoMutation = useTrpcClient().teams.uploadTeamLogo;
const removeTeamLogoMutation = useTrpcClient().teams.removeTeamLogo;

const { data: showUpdate } = await useUpdateTeamDetailsAbility(teamID);

const loading = ref(false);
const updatingTeamLogo = ref(false);
const uploadProfilePicture = useUpload("/api/upload/profile-picture", {
  method: "PUT",
});
const notification = useNotification();

const schema = z.object({
  name: z.string(),
});
const state = reactive({
  name: team.value?.name,
});

async function save() {
  loading.value = true;
  try {
    await updateMutation.mutate({
      teamIdentifier: team.value?.slug || "",
      name: state.name,
    });
    notification.success("Team Settings Updated", "Your team settings have been successfully saved");
    await teamsStore.fetchCurrentTeam();
  } catch (error) {
    notification.error("Failed to Update Team Settings", getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function handleAvatarUpload(file: File) {
  updatingTeamLogo.value = true;
  try {
    const upload = await uploadProfilePicture(file);
    if (upload?.pathname) {
      await updateTeamLogoMutation.mutate({
        key: upload.pathname,
        teamIdentifier: team.value?.slug || "",
      });
    }
    await teamsStore.fetchCurrentTeam();
    notification.success("Profile Picture Updated");
  } catch (error) {
    notification.error("Failed to Upload Profile Picture", getErrorMessage(error));
  }
  updatingTeamLogo.value = false;
}

async function handleAvatarRemove() {
  updatingTeamLogo.value = true;
  try {
    await removeTeamLogoMutation.mutate({
      teamIdentifier: team.value?.slug || "",
    });
    await teamsStore.fetchCurrentTeam();
    notification.success("Team Logo Removed");
  } catch (error) {
    notification.error("Failed to Remove Team Logo", getErrorMessage(error));
  }
  updatingTeamLogo.value = false;
}

definePageMeta({
  layout: "dashboard",
});
</script>
