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
                <MembersListItem
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
                <MembersInvitesListItem
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
import { sendInvite as sendInviteAbility } from "#shared/utils/abilities";

const toast = useToast();
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
    toast.add({
      title: "Invite Sent",
      description: `Invitation sent to ${inviteForm.email}`,
      color: "success",
    });
    await refresh();
    inviteForm.email = "";
  } catch {
    toast.add({
      title: "Invite Failed",
      description: "Unable to send invitation. Please try again.",
      color: "error",
      icon: "i-lucide-x",
    });
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
      toast.add({
        title: "Role Updated",
        description: "Member role has been successfully updated",
        color: "success",
      });
      await refresh();
    }
  } catch {
    toast.add({
      title: "Role Update Failed",
      description: "Unable to update member role. Please try again.",
      color: "error",
      icon: "i-lucide-x",
    });
  }
}

async function removeMember(memberId: string) {
  try {
    await removeMemberMutation.mutate({
      teamIdentifier: teamSlug.value,
      memberId,
    });
    await refresh();
    toast.add({
      title: "Member Removed",
      description: "Member has been successfully removed from the team",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Remove Member Failed",
      description: "Unable to remove member. Please try again.",
      color: "error",
      icon: "i-lucide-x",
    });
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
      toast.add({
        title: "Invite Role Updated",
        description: "Invite role has been successfully updated",
        color: "success",
      });
    }
  } catch {
    toast.add({
      title: "Invite Role Update Failed",
      description: "Unable to update invite role. Please try again.",
      color: "error",
      icon: "i-lucide-x",
    });
  }
}

async function removeInvite(inviteId: string) {
  try {
    await deleteInviteMutation.mutate({
      teamIdentifier: teamSlug.value,
      inviteId,
    });
    await refresh();
    toast.add({
      title: "Invite Removed",
      description: "Invite has been successfully deleted",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Remove Invite Failed",
      description: "Unable to delete invite. Please try again.",
      color: "error",
      icon: "i-lucide-x",
    });
  }
}
</script>
