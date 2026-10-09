<template>
  <UForm
    id="account-profile"
    :validate-on="[]"
    :schema="profileSchema"
    :state="profileState"
    @submit="saveProfile"
  >
    <UPageCard
      title="Profile"
      description="This is how you appear across the app."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div class="flex gap-2 lg:ms-auto">
        <UButton color="neutral" variant="ghost" @click="resetProfileForm">
          Cancel
        </UButton>
        <UButton
          form="account-profile"
          :loading="profileLoading"
          color="neutral"
          type="submit"
        >
          Save Profile
        </UButton>
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        label="Avatar"
        name="avatar"
        description="JPG, GIF or PNG. 2MB max."
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <AvatarUploader
          :src="user?.image"
          :alt="user?.name ?? 'Account'"
          :uploading="updatingProfilePicture"
          size="md"
          @upload="handleAvatarUpload"
          @remove="handleAvatarRemove"
        />
      </UFormField>

      <USeparator />

      <UFormField
        label="Name"
        name="name"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profileState.name" placeholder="John Doe" />
      </UFormField>
    </UPageCard>
  </UForm>
</template>

<script setup lang="ts">
import { z } from "zod";

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
    notification.success("Profile Picture Updated");
  } catch (error) {
    notification.error("Failed to Upload Profile Picture", getErrorMessage(error));
  }
  updatingProfilePicture.value = false;
}

async function handleAvatarRemove() {
  updatingProfilePicture.value = true;
  try {
    await removeProfilePictureMutation.mutate();
    useSession().refresh();
    notification.success("Profile Picture Removed");
  } catch (error) {
    notification.error("Failed to Remove Profile Picture", getErrorMessage(error));
  }
  updatingProfilePicture.value = false;
}

const profileLoading = ref(false);
const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be max 50 characters"),
});
const profileState = reactive({
  name: user.value?.name || "",
});

async function saveProfile() {
  profileLoading.value = true;
  try {
    await updateProfileMutation.mutate({
      name: profileState.name,
    });
    await useSession().refresh();
  } catch (error) {
    notification.error("Profile Update Failed", getErrorMessage(error, "Something went wrong."));
  } finally {
    profileLoading.value = false;
  }
}

function resetProfileForm() {
  profileState.name = user.value?.name || "";
}
</script>
