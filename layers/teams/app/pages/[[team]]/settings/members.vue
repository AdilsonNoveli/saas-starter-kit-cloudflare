<template>
  <div class="space-y-6">
    <Can :ability="sendInviteAbility" :args="[team?.id || '']">
      <UForm
        :schema="inviteSchema"
        :state="inviteForm"
        :validate-on="[]"
        @submit="sendInvite"
      >
        <UCard>
          <template #header><span>Invite People</span></template>
          <div class="flex items-start gap-2">
            <UFormField class="flex-grow" label="Email" name="email" required>
              <UInput
                v-model="inviteForm.email"
                placeholder="Enter an email to invite"
              />
            </UFormField>
            <UFormField class="basis-40" label="Role" name="role" required>
              <USelect
                v-model="inviteForm.role"
                :options="roles"
                option-attribute="name"
                value-attribute="id"
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="w-full gap-2 flex justify-end">
              <UButton :loading="sendingInvite" type="submit">Invite</UButton>
            </div>
          </template>
        </UCard>
      </UForm>
    </Can>
    <UCard>
      <UTabs :items="[{ label: 'Members' }, { label: 'Invites' }]">
        <template #content="{ item }">
          <div v-if="item.label === 'Members'">
            <div class="ring-1 ring-default rounded-lg divide-y divide-default">
              <div v-if="membersData?.members?.length">
                <TeamMembersListItem
                  v-for="member in membersData?.members"
                  :key="member.user.id"
                  :member="member"
                  :roles="roles"
                  :team-id="team?.id || ''"
                  @update-role="updateMemberRole"
                  @remove="removeMember"
                />
              </div>
              <div
                v-else
                class="flex flex-col items-center justify-center p-8 text-center"
              >
                <UIcon
                  name="i-lucide-users"
                  class="w-12 h-12 text-dimmed mb-4"
                />
                <p class="text-lg font-semibold mb-2">No team members yet</p>
                <p class="text-sm text-muted">
                  Invite people to join your team
                </p>
              </div>
            </div>
          </div>

          <div v-else-if="item.label === 'Invites'">
            <div class="ring-1 ring-default rounded-lg divide-y divide-default">
              <div v-if="membersData?.invites?.length">
                <TeamInvitesListItem
                  v-for="invite in membersData?.invites"
                  :key="invite.id"
                  :invite="invite"
                  :roles="roles"
                  :team-id="team?.id || ''"
                  @update-role="updateInviteRole"
                  @remove="removeInvite"
                />
              </div>
              <div
                v-else
                class="flex flex-col items-center justify-center p-8 text-center"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="w-12 h-12 text-dimmed mb-4"
                />
                <p class="text-lg font-semibold mb-2">No pending invites</p>
                <p class="text-sm text-muted">
                  Invite team members to collaborate
                </p>
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";
// Not `#shared/utils/abilities`: that alias only ever resolves to the
// Composition Root's own shared/ dir, never a layer's (Fase 3, passo 1b).
import { teamsSendInvite as sendInviteAbility } from "@nuxfire/layer-teams/shared/utils/abilities";

const notification = useNotification();
const route = useRoute();
const teamSlug = computed(() => route.params.team as string);
const team = useCurrentTeam();

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

const inviteForm = reactive({
  email: "",
  role: "",
});

const { data: membersData, refresh } =
  await useTrpcClient().teams.listMembersAndInvites.useQuery({
    teamIdentifier: teamSlug.value,
  });

const sendInviteMutation = useTrpcClient().invites.sendInvite;
const updateRoleMutation = useTrpcClient().teams.updateMemberRole;
const removeMemberMutation = useTrpcClient().teams.removeMember;
const updateInviteRoleMutation = useTrpcClient().invites.updateInviteRole;
const deleteInviteMutation = useTrpcClient().invites.deleteInvite;

const roles = computed(() => membersData.value?.roles || []);

const sendingInvite = ref(false);

async function sendInvite() {
  sendingInvite.value = true;
  try {
    await sendInviteMutation.mutate({
      teamIdentifier: teamSlug.value,
      email: inviteForm.email,
      roleId: inviteForm.role,
    });
    notification.success("Invite Sent", `Invitation sent to ${inviteForm.email}`);
    await refresh();
    inviteForm.email = "";
  } catch {
    notification.error("Invite Failed", "Unable to send invitation. Please try again.");
  } finally {
    sendingInvite.value = false;
  }
}

async function updateMemberRole(memberId: string, newRoleId: string) {
  try {
    if (newRoleId) {
      await updateRoleMutation.mutate({
        teamIdentifier: teamSlug.value,
        memberId,
        newRoleId,
      });
      notification.success("Role Updated", "Member role has been successfully updated");
      await refresh();
    }
  } catch {
    notification.error("Role Update Failed", "Unable to update member role. Please try again.");
  }
}

async function removeMember(memberId: string) {
  try {
    await removeMemberMutation.mutate({
      teamIdentifier: teamSlug.value,
      memberId,
    });
    await refresh();
    notification.success("Member Removed", "Member has been successfully removed from the team");
  } catch {
    notification.error("Remove Member Failed", "Unable to remove member. Please try again.");
  }
}

async function updateInviteRole(inviteId: string, newRoleId: string) {
  try {
    if (newRoleId) {
      await updateInviteRoleMutation.mutate({
        teamIdentifier: teamSlug.value,
        inviteId,
        newRoleId,
      });
      await refresh();
      notification.success("Invite Role Updated", "Invite role has been successfully updated");
    }
  } catch {
    notification.error("Invite Role Update Failed", "Unable to update invite role. Please try again.");
  }
}

async function removeInvite(inviteId: string) {
  try {
    await deleteInviteMutation.mutate({
      teamIdentifier: teamSlug.value,
      inviteId,
    });
    await refresh();
    notification.success("Invite Removed", "Invite has been successfully deleted");
  } catch {
    notification.error("Remove Invite Failed", "Unable to delete invite. Please try again.");
  }
}
</script>
