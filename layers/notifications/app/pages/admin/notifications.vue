<template>
  <UDashboardPanel id="admin-notifications">
    <template #header>
      <UDashboardNavbar title="Notifications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageCard variant="subtle" class="max-w-2xl w-full mx-auto">
        <UAlert
          icon="i-ph-info-duotone"
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
            <UInput v-model="state.title" placeholder="Welcome to the team" class="w-full" />
          </UFormField>

          <UFormField label="Message" name="message" required>
            <UTextarea v-model="state.message" :rows="3" placeholder="Your team now has 10 members" class="w-full" />
          </UFormField>

          <UButton
            type="submit"
            icon="i-ph-paper-plane-tilt-duotone"
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
import { z } from "zod/v4";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

const notification = useNotification();

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
    notification.success("Notification sent", "The member's bell will update in real time.");
    state.title = "";
    state.message = "";
  } catch (error) {
    notification.error("Failed to send notification", getErrorMessage(error));
  } finally {
    sending.value = false;
  }
}
</script>
