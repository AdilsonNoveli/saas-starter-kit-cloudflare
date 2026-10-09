<template>
  <div class="p-4 flex justify-between">
    <div class="flex items-center gap-2">
      <UAvatar :src="member.user.image ?? undefined" size="md" />
      <div class="flex flex-col text-sm">
        <span class="font-medium">{{ member.user.name }}</span>
        <span class="text-muted">{{ member.user.email }}</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Bouncer
        :ability="updateMemberRoleAbility"
        :args="[teamId, member.user.id]"
      >
        <template #can>
          <div>
            <USelect
              :model-value="member.role.id"
              :options="roles"
              option-attribute="name"
              value-attribute="id"
              @update:model-value="
                (newRole) =>
                  emit('update-role', member.user.id, String(newRole))
              "
            />
          </div>
        </template>
        <template #cannot>
          <span class="text-sm">{{ member.role.name }}</span>
        </template>
      </Bouncer>
      <Can :ability="removeMemberAbility" :args="[teamId, member.user.id]">
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
  teamsRemoveMember as removeMemberAbility,
  teamsUpdateMemberRole as updateMemberRoleAbility,
} from "@nuxfire/layer-teams/shared/utils/abilities";

type MembersAndInvites = RouterOutput["teams"]["listMembersAndInvites"];

const props = defineProps<{
  member: MembersAndInvites["members"][number];
  roles: MembersAndInvites["roles"];
  teamId: string;
}>();

const emit = defineEmits<{
  "update-role": [memberId: string, newRoleId: string];
  remove: [memberId: string];
}>();

const dropdownItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: "Remove",
      color: "error" as const,
      onSelect: () => emit("remove", props.member.user.id),
    },
  ],
]);
</script>
