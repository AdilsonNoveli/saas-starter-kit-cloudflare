<template>
  <UCard>
    <template #header>
      <span class="text-sm font-semibold text-highlighted">Recent Activity</span>
    </template>

    <div v-if="rows.length === 0" class="py-6 text-center text-muted text-sm">
      No recent member or invite activity yet.
    </div>

    <UTable v-else :data="rows" :columns="columns" :ui="enterpriseTableUi" />
  </UCard>
</template>

<script setup lang="ts">
import { formatTimeAgo } from "@vueuse/core";
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { enterpriseTableUi } from "@nuxfire/design-tokens";

const UAvatar = resolveComponent("UAvatar");
const UBadge = resolveComponent("UBadge");

type Row = {
  id: string;
  label: string;
  detail: string;
  status: "member" | "pending";
  createdAt: Date;
};

const team = useCurrentTeam();
const { data: membersData } = await useTrpcClient().teams.listMembersAndInvites.useQuery({
  teamIdentifier: team.value?.slug || "",
});

/*
 * Real data, not mock — the same members/invites query the Members settings
 * page already uses, merged into one recency-sorted feed instead of the
 * "sales" table the reference dashboard uses (which has no equivalent here).
 */
const rows = computed<Row[]>(() => {
  const memberRows: Row[] = (membersData.value?.members ?? []).map((m) => ({
    id: `member-${m.id}`,
    label: m.user?.name ?? m.user?.email ?? "Unknown",
    detail: m.role?.name ?? "Member",
    status: "member",
    createdAt: new Date(m.createdAt),
  }));

  const inviteRows: Row[] = (membersData.value?.invites ?? []).map((i) => ({
    id: `invite-${i.id}`,
    label: i.email,
    detail: i.role?.name ?? "Member",
    status: "pending",
    createdAt: new Date(i.createdAt),
  }));

  return [...memberRows, ...inviteRows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);
});

const columns: TableColumn<Row>[] = [
  {
    accessorKey: "label",
    header: "Name / Email",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-3" }, [
        h(UAvatar, { alt: row.original.label, size: "sm" }),
        h("p", { class: "font-medium text-highlighted truncate" }, row.original.label),
      ]),
  },
  { accessorKey: "detail", header: "Role" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        UBadge,
        { color: row.original.status === "member" ? "success" : "warning", variant: "subtle" },
        () => (row.original.status === "member" ? "Joined" : "Invited"),
      ),
  },
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => formatTimeAgo(row.original.createdAt),
  },
];
</script>
