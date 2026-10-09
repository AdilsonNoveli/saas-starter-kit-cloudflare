<template>
  <div class="p-4 flex justify-between">
    <div class="flex items-center gap-2">
      <div class="flex flex-col text-sm">
        <span class="font-medium">{{ inviteRow.email }}</span>
        <span class="text-muted">{{
          t("teams.settings.members.invitedBy", { name: inviteRow.invitedBy.name ?? "" })
        }}</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Bouncer :ability="updateInviteAbility" :args="[teamId]">
        <template #can>
          <USelect
            :model-value="inviteRow.role.id"
            :options="roles"
            option-attribute="name"
            value-attribute="id"
            @update:model-value="
              (newRole) => emit('update-role', inviteRow.id, String(newRole))
            "
          />
        </template>
        <template #cannot>
          <span class="text-sm">{{ inviteRow.role.name }}</span>
        </template>
      </Bouncer>
      <Can :ability="deleteInviteAbility" :args="[teamId]">
        <UDropdownMenu :items="dropdownItems">
          <UButton color="neutral" icon="i-ph-dots-three-vertical-duotone" />
        </UDropdownMenu>
      </Can>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { RouterOutput } from "~~/server/trpc/routers";
// Not `#shared/utils/abilities`: that alias only ever resolves to the
// Composition Root's own shared/ dir, never a layer's (Fase 3, passo 1b).
import {
  teamsDeleteInvite as deleteInviteAbility,
  teamsUpdateInvite as updateInviteAbility,
} from "@nuxfire/layer-teams/shared/utils/abilities";

type MembersAndInvites = RouterOutput["teams"]["listMembersAndInvites"];
type Invite = MembersAndInvites["invites"][number];

// The inferred tRPC output for `invites` drops the `invitedBy` / `role`
// relations that the query actually selects, so their shape is re-attached here.
type InviteWithRelations = Invite & {
  invitedBy: { name: string | null };
  role: { id: string; name: string };
};

const props = defineProps<{
  invite: Invite;
  roles: MembersAndInvites["roles"];
  teamId: string;
}>();

const emit = defineEmits<{
  "update-role": [inviteId: string, newRoleId: string];
  remove: [inviteId: string];
}>();

const { t } = useI18n();

const inviteRow = computed(() => props.invite as InviteWithRelations);

const dropdownItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t("teams.settings.members.cancelInvite"),
      color: "error" as const,
      onSelect: () => emit("remove", props.invite.id),
    },
  ],
]);
</script>
