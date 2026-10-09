<template>
  <UForm id="team-general-form" :schema="schema" :state="state" @submit="save">
    <UPageCard
      v-if="showUpdate"
      :title="t('teams.settings.general.title')"
      :description="t('teams.settings.general.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="team-general-form"
        :label="t('teams.settings.general.save')"
        color="neutral"
        type="submit"
        :loading="loading"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField :label="t('teams.settings.general.logoLabel')" name="avatar">
        <AvatarUploader
          :src="team?.logo"
          :alt="team?.name ?? t('teams.switcher.avatarAlt')"
          :uploading="updatingTeamLogo"
          :disabled="!showUpdate"
          size="lg"
          @upload="handleAvatarUpload"
          @remove="handleAvatarRemove"
        />
      </UFormField>
      <USeparator />
      <UFormField :label="t('teams.settings.general.nameLabel')" name="name">
        <UInput
          v-model="state.name"
          :disabled="!showUpdate"
          :placeholder="t('teams.settings.general.namePlaceholder')"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>

<script setup lang="ts">
import { z } from "zod/v4";

const { t } = useI18n();
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
    notification.success(t("teams.settings.general.saved"), t("teams.settings.general.savedDescription"));
    await teamsStore.fetchCurrentTeam();
  } catch (error) {
    notification.error(t("teams.settings.general.saveFailed"), translateErrorCode(getErrorMessage(error), t));
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
    notification.success(t("teams.settings.general.logoUpdated"));
  } catch (error) {
    notification.error(t("teams.settings.general.logoUploadFailed"), translateErrorCode(getErrorMessage(error), t));
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
    notification.success(t("teams.settings.general.logoRemoved"));
  } catch (error) {
    notification.error(t("teams.settings.general.logoRemoveFailed"), translateErrorCode(getErrorMessage(error), t));
  }
  updatingTeamLogo.value = false;
}

definePageMeta({
  layout: "dashboard",
});
</script>
