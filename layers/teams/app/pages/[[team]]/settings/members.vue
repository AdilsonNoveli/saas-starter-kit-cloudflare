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
          <template #header><span>{{ t("teams.settings.members.inviteTitle") }}</span></template>
          <div class="flex items-start gap-2">
            <UFormField class="flex-grow" :label="t('teams.settings.members.emailLabel')" name="email" required>
              <UInput
                v-model="inviteForm.email"
                :placeholder="t('teams.settings.members.emailPlaceholder')"
              />
            </UFormField>
            <UFormField class="basis-40" :label="t('teams.settings.members.roleLabel')" name="role" required>
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
              <UButton :loading="sendingInvite" type="submit" :label="t('teams.settings.members.inviteSubmit')" />
            </div>
          </template>
        </UCard>
      </UForm>
    </Can>
    <UCard>
      <UTabs :items="tabs">
        <template #content="{ item }">
          <div v-if="item.value === 'members'">
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
                  name="i-ph-users-duotone"
                  class="w-12 h-12 text-dimmed mb-4"
                />
                <p class="text-lg font-semibold mb-2">{{ t("teams.settings.members.emptyMembersTitle") }}</p>
                <p class="text-sm text-muted">
                  {{ t("teams.settings.members.emptyMembersDescription") }}
                </p>
              </div>
            </div>
          </div>

          <div v-else-if="item.value === 'invites'">
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
                  name="i-ph-envelope-duotone"
                  class="w-12 h-12 text-dimmed mb-4"
                />
                <p class="text-lg font-semibold mb-2">{{ t("teams.settings.members.emptyInvitesTitle") }}</p>
                <p class="text-sm text-muted">
                  {{ t("teams.settings.members.emptyInvitesDescription") }}
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
import { z } from "zod/v4";
// Not `#shared/utils/abilities`: that alias only ever resolves to the
// Composition Root's own shared/ dir, never a layer's (Fase 3, passo 1b).
import { teamsSendInvite as sendInviteAbility } from "@nuxfire/layer-teams/shared/utils/abilities";

const { t } = useI18n();
const notification = useNotification();
const route = useRoute();
const teamSlug = computed(() => route.params.team as string);
const team = useCurrentTeam();

const inviteSchema = z.object({
  email: z.string().email(t("teams.settings.members.emailInvalid")),
  role: z.string().min(1, t("teams.settings.members.roleRequired")),
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

const tabs = computed(() => [
  { label: t("teams.settings.members.tabMembers"), value: "members" },
  { label: t("teams.settings.members.tabInvites"), value: "invites" },
]);

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
    notification.success(
      t("teams.settings.members.inviteSent"),
      t("teams.settings.members.inviteSentDescription", { email: inviteForm.email }),
    );
    await refresh();
    inviteForm.email = "";
  } catch {
    notification.error(t("teams.settings.members.inviteFailed"), t("teams.settings.members.tryAgain"));
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
      notification.success(t("teams.settings.members.roleUpdated"), t("teams.settings.members.roleUpdatedDescription"));
      await refresh();
    }
  } catch {
    notification.error(t("teams.settings.members.roleUpdateFailed"), t("teams.settings.members.tryAgain"));
  }
}

async function removeMember(memberId: string) {
  try {
    await removeMemberMutation.mutate({
      teamIdentifier: teamSlug.value,
      memberId,
    });
    await refresh();
    notification.success(t("teams.settings.members.memberRemoved"), t("teams.settings.members.memberRemovedDescription"));
  } catch {
    notification.error(t("teams.settings.members.memberRemoveFailed"), t("teams.settings.members.tryAgain"));
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
      notification.success(
        t("teams.settings.members.inviteRoleUpdated"),
        t("teams.settings.members.inviteRoleUpdatedDescription"),
      );
    }
  } catch {
    notification.error(t("teams.settings.members.inviteRoleUpdateFailed"), t("teams.settings.members.tryAgain"));
  }
}

async function removeInvite(inviteId: string) {
  try {
    await deleteInviteMutation.mutate({
      teamIdentifier: teamSlug.value,
      inviteId,
    });
    await refresh();
    notification.success(t("teams.settings.members.inviteRemoved"), t("teams.settings.members.inviteRemovedDescription"));
  } catch {
    notification.error(t("teams.settings.members.inviteRemoveFailed"), t("teams.settings.members.tryAgain"));
  }
}
</script>
