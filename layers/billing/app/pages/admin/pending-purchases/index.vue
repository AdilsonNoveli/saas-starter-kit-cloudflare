<template>
  <UDashboardPanel id="admin-pending-purchases">
    <template #header>
      <UDashboardNavbar :title="t('billing.admin.pendingPurchases.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountUserDropdown collapsed size="md" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <AdminDataTable
        :columns="columns"
        :data="purchases"
        :loading="status === 'pending'"
        :selectable="false"
        search-column="email"
        :search-placeholder="t('billing.admin.pendingPurchases.searchPlaceholder')"
      >
        <template #filters>
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            :placeholder="t('billing.admin.pendingPurchases.statusFilter')"
            class="w-48"
          />
        </template>
      </AdminDataTable>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { RouterOutput } from "~~/server/trpc/routers";
import { PENDING_PURCHASE_STATUSES } from "@nuxfire/layer-billing/shared/types/enums";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

type PendingPurchase =
  RouterOutput["admin"]["pendingPurchases"]["listPendingPurchases"][number];

const UBadge = resolveComponent("UBadge");

const client = useTrpcClient();
const { t, d } = useI18n();

const statusFilter = ref<(typeof PENDING_PURCHASE_STATUSES)[number] | undefined>(undefined);
const statusOptions = computed(() => [
  { label: t("billing.admin.pendingPurchases.allStatuses"), value: undefined },
  ...PENDING_PURCHASE_STATUSES.map((value) => ({
    label: t(`billing.admin.pendingPurchases.status.${value}`),
    value,
  })),
]);

const { data, status } = await client.admin.pendingPurchases.listPendingPurchases.useQuery(
  () => ({ status: statusFilter.value }),
);

const purchases = computed(() => data.value ?? []);

const STATUS_COLOR: Record<string, "neutral" | "success" | "warning" | "error"> = {
  PENDING: "neutral",
  CLAIMED: "success",
  EXPIRED: "warning",
  REJECTED: "error",
};

const columns: TableColumn<PendingPurchase>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "email",
    header: () => t("billing.admin.pendingPurchases.columns.email"),
  },
  {
    accessorKey: "planName",
    header: () => t("billing.admin.pendingPurchases.columns.plan"),
  },
  {
    accessorKey: "provider",
    header: () => t("billing.admin.pendingPurchases.columns.provider"),
  },
  {
    accessorKey: "status",
    header: () => t("billing.admin.pendingPurchases.columns.status"),
    cell: ({ row }) => {
      const value = row.original.status;
      return h(
        UBadge,
        { color: STATUS_COLOR[value] ?? "neutral", variant: "subtle" },
        () => t(`billing.admin.pendingPurchases.status.${value}`),
      );
    },
  },
  {
    accessorKey: "failureReason",
    header: () => t("billing.admin.pendingPurchases.columns.reason"),
    cell: ({ row }) => row.original.failureReason ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: () => t("billing.admin.pendingPurchases.columns.createdAt"),
    cell: ({ row }) => d(new Date(row.original.createdAt), "short"),
  },
];
</script>
