<template>
  <div>
    <UModal
      :open="true"
      :dismissible="!invite"
      @update:open="(v) => !v && close()"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold"> Team Invite </span>
              <UButton
                v-if="!invite"
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                @click="close"
              />
            </div>
          </template>

          <div v-if="invite" class="space-y-4">
            <div class="flex items-center space-x-4">
              <UAvatar :src="invite.team.logo || ''" :alt="invite.team.name" />
              <div>
                <p class="font-semibold">{{ invite.team.name }}</p>
                <p class="text-sm text-muted">
                  Invited by {{ invite.invitedBy.name }} ({{
                    invite.invitedBy.email
                  }})
                </p>
              </div>
            </div>
            <div>
              <p>
                You've been invited to join this team as a
                <span class="font-semibold">{{ invite.role.name }}</span
                >.
              </p>
            </div>
          </div>

          <div v-else>
            <UAlert
              icon="i-lucide-x"
              variant="subtle"
              color="error"
              title="Invite not found"
              description="The invite doesn't exist or has expired."
            />
          </div>

          <template v-if="invite" #footer>
            <div class="w-full flex justify-end gap-2">
              <UButton
                color="error"
                variant="outline"
                :loading="declining"
                @click="declineInvite"
              >
                Decline
              </UButton>
              <UButton :loading="accepting" @click="acceptInvite">
                Accept
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const inviteId = route.params.id as string;

const accepting = ref(false);
const declining = ref(false);

const { data: teams } = await useTeamsList();
const invite = useInviteStore().invite;

async function acceptInvite() {
  accepting.value = true;
  try {
    await useTrpcClient().invites.acceptInvite.mutate({ inviteId });
    navigateTo(`/${invite?.team.slug}`);
  } catch {
    // accept invite failed
  } finally {
    accepting.value = false;
  }
}

function declineInvite() {
  // TODO: decline mutation?
  close();
}

function redirect() {
  if (teams.value) {
    const team = teams.value.find((t) => t.slug === invite?.team.slug);
    if (team) {
      return navigateTo(`/${team.slug}`);
    }
  }
}

function close() {
  navigateTo("/");
}

watch([() => teams.value, () => invite], redirect);
onMounted(redirect);

definePageMeta({
  middleware: "invite",
  auth: false,
});
</script>
