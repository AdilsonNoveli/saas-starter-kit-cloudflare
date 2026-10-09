<template>
  <UDashboardPanel id="admin-audit-log">
    <template #header>
      <UDashboardNavbar title="Audit Log">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <AdminDataTable
        :columns="columns"
        :data="entries"
        :loading="status === 'pending'"
        :selectable="false"
        search-column="action"
        search-placeholder="Filter by action..."
      >
        <template #filters>
          <UButton
            label="Refresh"
            icon="i-ph-arrows-clockwise-duotone"
            color="neutral"
            variant="outline"
            loading-auto
            @click="refresh"
          />
        </template>
      </AdminDataTable>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { RouterOutput } from "~~/server/trpc/routers";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

/**
 * A read-only window on the append-only trail. There is deliberately no
 * actions column: nothing here can be edited, replayed or deleted, and a
 * dropdown with nothing behind it would only suggest otherwise.
 */
type AuditEntry = RouterOutput["admin"]["auditLog"]["list"][number];

const UAvatar = resolveComponent("UAvatar");
const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UTooltip = resolveComponent("UTooltip");

const { data, status, refresh } =
  await useTrpcClient().admin.auditLog.list.useQuery({});

const entries = computed(() => data.value ?? []);

/**
 * `metadata` is a jsonb column, so it arrives as `unknown` — same care the
 * Queue screen takes with a dead letter's message. It is shown only as a
 * tooltip on the action, and only when it really serialises to an object with
 * something in it, rather than asserting a shape no writer ever promised.
 */
function describeMetadata(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) return undefined;
  const json = JSON.stringify(metadata);
  return json === "{}" ? undefined : json;
}

const columns: TableColumn<AuditEntry>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) =>
      sortableHeader(column.getIsSorted(), "When", () =>
        column.toggleSorting(column.getIsSorted() === "asc"),
      ),
    // Full timestamp, not `formatDate`: an audit trail is read to reconstruct
    // an order of events, and several actions routinely land in one minute.
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: "actor",
    accessorKey: "actorName",
    header: "Who",
    // The join is best-effort by design — `actorUserId` is not a foreign key,
    // so the trail outlives the account it names. Falling all the way back to
    // the raw id keeps a deleted actor's lines attributable.
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-3 min-w-0" }, [
        h(UAvatar, {
          alt: row.original.actorName ?? row.original.actorEmail ?? row.original.actorUserId,
          size: "sm",
        }),
        h("div", { class: "min-w-0" }, [
          h(
            "p",
            { class: "font-medium text-highlighted truncate" },
            row.original.actorName ??
              row.original.actorEmail ??
              row.original.actorUserId,
          ),
          row.original.actorName && row.original.actorEmail
            ? h("p", { class: "text-muted truncate" }, row.original.actorEmail)
            : undefined,
        ]),
      ]),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const metadata = describeMetadata(row.original.metadata);
      const badge = h(
        UBadge,
        { variant: "subtle", color: "neutral", class: "font-mono" },
        () => row.original.action,
      );

      return metadata
        ? h(UTooltip, { text: metadata, delayDuration: 0 }, () => badge)
        : badge;
    },
  },
  {
    id: "target",
    accessorKey: "targetType",
    header: "Target",
    cell: ({ row }) =>
      h("div", { class: "min-w-0" }, [
        h("p", { class: "text-highlighted truncate" }, row.original.targetType),
        row.original.targetId
          ? h(
              "p",
              { class: "text-muted font-mono truncate" },
              row.original.targetId,
            )
          : undefined,
      ]),
  },
  {
    accessorKey: "ip",
    header: "IP",
    cell: ({ row }) => row.original.ip ?? "—",
  },
];

/** Sortable column header — same button as on Companies, Plans and Queue. */
function sortableHeader(
  isSorted: false | "asc" | "desc",
  label: string,
  onClick: () => void,
) {
  return h(UButton, {
    color: "neutral",
    variant: "ghost",
    label,
    icon: isSorted
      ? isSorted === "asc"
        ? "i-ph-sort-ascending-duotone"
        : "i-ph-sort-descending-duotone"
      : "i-ph-arrows-down-up-duotone",
    class: "-mx-2.5",
    onClick,
  });
}
</script>
