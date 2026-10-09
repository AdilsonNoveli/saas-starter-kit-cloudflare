<template>
  <UForm
    id="account-profile"
    :validate-on="[]"
    :schema="profileSchema"
    :state="profileState"
    @submit="saveProfile"
    @error="focusFirstError"
  >
    <UPageCard
      :title="t('account.profile.title')"
      :description="t('account.profile.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div class="flex gap-2 lg:ms-auto">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('account.common.discard')"
          @click="resetProfileForm"
        />
        <UButton
          form="account-profile"
          :loading="profileLoading"
          color="neutral"
          type="submit"
          :label="t('account.profile.save')"
        />
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        :label="t('account.profile.avatar.label')"
        name="avatar"
        :description="t('account.profile.avatar.hint')"
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <AvatarUploader
          :src="user?.image"
          :alt="user?.name ?? t('account.profile.avatar.alt')"
          :uploading="updatingProfilePicture"
          size="md"
          @upload="handleAvatarUpload"
          @remove="handleAvatarRemove"
        />
      </UFormField>

      <USeparator />

      <UFormField
        :label="t('account.profile.name')"
        name="name"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profileState.name" autocomplete="name" class="w-full sm:w-72" />
      </UFormField>
    </UPageCard>
  </UForm>
</template>

<script setup lang="ts">
import { z } from "zod/v4";
import type { FormErrorEvent } from "@nuxt/ui";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../../../shared/utils/onboarding-name";

// Perfil (SPEC-0010, AC-014): the name and the picture. The preference fields
// live on the Preferences tab, the e-mail and the password on Security.
const { t } = useI18n();

const updateProfileMutation = useTrpcClient().account.updateProfile;
const removeProfilePictureMutation =
  useTrpcClient().account.removeProfilePicture;
const updateProfilePictureMutation =
  useTrpcClient().account.updateProfilePicture;

const notification = useNotification();
const { user } = useSession();

const updatingProfilePicture = ref(false);

const uploadProfilePicture = useUpload("/api/upload/profile-picture", {
  method: "PUT",
});

async function handleAvatarUpload(file: File) {
  updatingProfilePicture.value = true;
  try {
    const upload = await uploadProfilePicture(file);
    if (upload?.pathname) {
      await updateProfilePictureMutation.mutate({
        key: upload.pathname,
      });
    }
    useSession().refresh();
    notification.success(t("account.profile.avatar.updated"));
  } catch (error) {
    notification.error(t("account.profile.avatar.updateFailed"), getErrorMessage(error));
  }
  updatingProfilePicture.value = false;
}

async function handleAvatarRemove() {
  updatingProfilePicture.value = true;
  try {
    await removeProfilePictureMutation.mutate();
    useSession().refresh();
    notification.success(t("account.profile.avatar.removed"));
  } catch (error) {
    notification.error(t("account.profile.avatar.removeFailed"), getErrorMessage(error));
  }
  updatingProfilePicture.value = false;
}

// The same limits and message as the onboarding's name step.
const lengthError = () =>
  t("account.onboarding.lengthError", { min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH });

const profileLoading = ref(false);
const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, { error: lengthError })
    .max(NAME_MAX_LENGTH, { error: lengthError }),
});
const profileState = reactive({
  name: user.value?.name || "",
});

/** Keyboard users land on the field that needs fixing (AC-045). */
function focusFirstError(event: FormErrorEvent) {
  const id = event.errors[0]?.id;
  if (id) document.getElementById(id)?.focus();
}

async function saveProfile() {
  profileLoading.value = true;
  try {
    await updateProfileMutation.mutate({
      name: profileState.name.trim(),
    });
    await useSession().refresh();
    notification.success(t("account.profile.saved"));
  } catch (error) {
    notification.error(t("account.profile.saveFailed"), getErrorMessage(error, t("errors.generic")));
  } finally {
    profileLoading.value = false;
  }
}

function resetProfileForm() {
  profileState.name = user.value?.name || "";
}
</script>
