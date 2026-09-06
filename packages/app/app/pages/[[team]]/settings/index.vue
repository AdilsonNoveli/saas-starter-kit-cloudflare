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
        <div class="relative">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileUpload"
          />
          <UChip
            size="3xl"
            position="bottom-right"
            inset
            :ui="{ base: '-mx-2 rounded-none ring-0' }"
          >
            <UAvatar
              :src="team?.logo || undefined"
              :alt="team?.name"
              :ui="{ root: 'h-32 w-32 text-4xl' }"
            />
            <template v-if="showUpdate" #content>
              <UDropdownMenu
                :items="avatarDropdownItems"
                :ui="{ item: 'text-xs' }"
              >
                <UButton
                  icon="i-lucide-pencil"
                  :loading="updatingTeamLogo"
                  color="neutral"
                  variant="solid"
                  :ui="{ base: 'rounded-full' }"
                />
              </UDropdownMenu>
            </template>
          </UChip>
        </div>
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
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadProfilePicture = useUpload("/api/upload/profile-picture", {
  method: "PUT",
});
const toast = useToast();

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
    toast.add({
      title: "Team Settings Updated",
      description: "Your team settings have been successfully saved",
      color: "success",
      icon: "i-lucide-check",
    });
    await teamsStore.fetchCurrentTeam();
  } catch (error: any) {
    toast.add({
      title: "Failed to Update Team Settings",
      description: error?.message || "Something went wrong",
      color: "error",
      icon: "i-lucide-x",
    });
  } finally {
    loading.value = false;
  }
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      title: "File Too Large",
      description: "Team logo must be less than 2MB",
      color: "error",
      icon: "i-lucide-x",
    });
    return;
  }
  updatingTeamLogo.value = true;
  try {
    const [upload] = await uploadProfilePicture(
      event.target as HTMLInputElement,
    );
    if (upload?.pathname) {
      await updateTeamLogoMutation.mutate({
        key: upload?.pathname,
        teamIdentifier: team.value?.slug || "",
      });
    }
    await teamsStore.fetchCurrentTeam();
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
  updatingTeamLogo.value = false;
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
        updatingTeamLogo.value = true;
        try {
          await removeTeamLogoMutation.mutate({
            teamIdentifier: team.value?.slug || "",
          });
          await teamsStore.fetchCurrentTeam();
          toast.add({
            title: "Team Logo Removed",
            color: "success",
            icon: "i-lucide-check",
          });
        } catch (error: any) {
          toast.add({
            title: "Failed to Remove Team Logo",
            description: error?.message || "Something went wrong",
            color: "error",
            icon: "i-lucide-x",
          });
        }
        updatingTeamLogo.value = false;
      },
    },
  ],
];

definePageMeta({
  layout: "dashboard",
});
</script>
