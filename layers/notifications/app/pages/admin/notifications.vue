<template>
  <UDashboardPanel id="admin-notifications">
    <template #header>
      <UDashboardNavbar title="Notifications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountUserDropdown collapsed size="md" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageCard variant="subtle" class="max-w-2xl w-full mx-auto">
        <UAlert
          icon="i-lucide-info"
          color="neutral"
          variant="subtle"
          title="Live notification demo"
          description="This Starter Kit ships a full real-time notification pipeline: a database row plus a WebSocket push over Cloudflare Durable Objects. Pick a team member below and send them a notification — it lands instantly in their bell, in the top bar of the team dashboard, with no page refresh."
        />

        <UForm :schema="schema" :state="state" class="flex flex-col gap-4 mt-6" @submit="onSubmit">
          <UFormField label="Team" name="teamId" required>
            <USelectMenu
              v-model="selectedTeam"
              :items="teamItems"
              value-key="value"
              :loading="teamsStatus === 'pending'"
              placeholder="Choose a team"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Member" name="targetUserId" required :disabled="!selectedTeam">
            <USelectMenu
              v-model="state.targetUserId"
              :items="memberItems"
              value-key="value"
              :loading="detailStatus === 'pending'"
              :disabled="!selectedTeam"
              placeholder="Choose a member"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Title" name="title" required>
            <UInput v-model="state.title" placeholder="Welcome aboard!" class="w-full" />
          </UFormField>

          <UFormField label="Message" name="message" required>
            <UTextarea v-model="state.message" :rows="3" placeholder="Your team just hit 10 members 🎉" class="w-full" />
          </UFormField>

          <UButton
            type="submit"
            icon="i-lucide-send"
            label="Send notification"
            :loading="sending"
            class="self-start"
          />
        </UForm>
      </UPageCard>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

const toast = useToast();

const { data: teams, status: teamsStatus } = await useTrpcClient().admin.teams.listTeams.useQuery({});
const teamItems = computed(
  () => teams.value?.map((t) => ({ label: t.name, value: t.id })) ?? [],
);

const selectedTeam = ref<string | undefined>(undefined);

const { data: teamDetail, status: detailStatus, execute: loadTeamDetail } =
  await useTrpcClient().admin.teams.getTeamDetail.useQuery(
    () => ({ teamIdentifier: selectedTeam.value ?? "" }),
    { immediate: false },
  );

watch(selectedTeam, (teamId) => {
  state.targetUserId = "";
  if (teamId) loadTeamDetail();
});

const memberItems = computed(
  () =>
    teamDetail.value?.memberships.map((m) => ({
      label: `${m.user.name ?? m.user.email} — ${m.role.name}`,
      value: m.user.id,
    })) ?? [],
);

const schema = z.object({
  targetUserId: z.string().min(1, "Choose a member"),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
});
type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ targetUserId: "", title: "", message: "" });
const sending = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  sending.value = true;
  try {
    await useTrpcClient().admin.notifications.send.mutate(event.data);
    toast.add({
      title: "Notification sent",
      description: "The member's bell will update in real time.",
      color: "success",
      icon: "i-lucide-check",
    });
    state.title = "";
    state.message = "";
  } catch (error: any) {
    toast.add({
      title: "Failed to send notification",
      description: error?.message || "Something went wrong",
      color: "error",
      icon: "i-lucide-x",
    });
  } finally {
    sending.value = false;
  }
}
</script>
