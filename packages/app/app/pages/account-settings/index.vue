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
        <div class="relative">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileUpload"
          />
          <div class="relative inline-block">
            <UAvatar
              :src="user?.image || undefined"
              :alt="user?.name || undefined"
              class="h-24 w-24 text-3xl"
            />
            <UDropdownMenu
              :items="avatarDropdownItems"
              :content="{ side: 'bottom', align: 'end' }"
            >
              <UButton
                icon="i-lucide-pencil"
                :loading="updatingProfilePicture"
                color="neutral"
                variant="solid"
                class="absolute bottom-0 right-0 rounded-full"
              />
            </UDropdownMenu>
          </div>
        </div>
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

const toast = useToast();
const { user } = useSession();

const fileInputRef = ref<HTMLInputElement | null>(null);
const updatingProfilePicture = ref(false);

const uploadProfilePicture = useUpload("/api/upload/profile-picture", {
  method: "PUT",
});

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      title: "File Too Large",
      description: "Profile picture must be less than 2MB",
      color: "error",
      icon: "i-lucide-x",
    });
    return;
  }
  updatingProfilePicture.value = true;
  try {
    const [upload] = await uploadProfilePicture(
      event.target as HTMLInputElement,
    );
    if (upload?.pathname) {
      await updateProfilePictureMutation.mutate({
        key: upload?.pathname,
      });
    }
    useSession().refresh();
    toast.add({
      title: "Profile Picture Updated",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error: any) {
    toast.add({
      title: "Failed to Upload Profile Picture",
      description: error?.message || "Something went wrong",
      color: "error",
      icon: "i-lucide-x",
    });
  }
  updatingProfilePicture.value = false;
}

const avatarDropdownItems = [
  [
    {
      label: "Upload",
      onSelect: () => {
        fileInputRef.value?.click();
      },
    },
    {
      label: "Remove",
      onSelect: async () => {
        updatingProfilePicture.value = true;
        try {
          await removeProfilePictureMutation.mutate();
          useSession().refresh();
          toast.add({
            title: "Profile Picture Removed",
            color: "success",
            icon: "i-lucide-check",
          });
        } catch (error: any) {
          toast.add({
            title: "Failed to Remove Profile Picture",
            description: error?.message || "Something went wrong",
            color: "error",
            icon: "i-lucide-x",
          });
        }
        updatingProfilePicture.value = false;
      },
    },
  ],
];

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
  } catch (error: any) {
    toast.add({
      title: "Profile Update Failed",
      description: error?.message || "Something went wrong.",
      color: "error",
      icon: "i-lucide-x",
    });
  } finally {
    profileLoading.value = false;
  }
}

function resetProfileForm() {
  profileState.name = user.value?.name || "";
}
</script>
