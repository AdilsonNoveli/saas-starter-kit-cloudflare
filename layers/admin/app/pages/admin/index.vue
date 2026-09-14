<template>
  <UDashboardPanel id="admin-overview">
    <template #header>
      <UDashboardNavbar title="Overview">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountUserDropdown collapsed size="md" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UPageCard
          v-for="stat in stats"
          :key="stat.label"
          :title="stat.label"
          :icon="stat.icon"
          variant="subtle"
          :ui="{
            leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25',
            title: 'font-normal text-muted text-xs uppercase',
          }"
        >
          <p class="text-3xl font-semibold text-highlighted">
            {{ status === "pending" ? "—" : stat.value }}
          </p>
        </UPageCard>
      </div>

      <UButton
        label="Manage companies"
        icon="i-lucide-building-2"
        color="neutral"
        variant="outline"
        to="/admin/companies"
        class="self-start"
      />

      <UCard>
        <template #header>
          <span class="text-sm font-semibold text-highlighted">Recent Companies</span>
        </template>

        <div v-if="recentCompanies.length === 0" class="py-6 text-center text-muted text-sm">
          No companies yet.
        </div>

        <UTable v-else :data="recentCompanies" :columns="columns" :ui="enterpriseTableUi" />
      </UCard>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { enterpriseTableUi } from "@nuxfire/design-tokens";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

const UBadge = resolveComponent("UBadge");

type Company = {
  id: string;
  name: string;
  planName: string | null;
  status: string;
  memberCount: number;
  createdAt: string | Date;
};

// Counts are derived from the same list the Companies screen loads rather
// than a dedicated endpoint — there is exactly one administered entity so
// far, and a count procedure would exist only to avoid a `.length`.
const { data, status } = await useTrpcClient().admin.teams.listTeams.useQuery(
  {},
);

const companies = computed(() => data.value ?? []);

const stats = computed(() => [
  {
    label: "Companies",
    icon: "i-lucide-building-2",
    value: companies.value.length,
  },
  {
    label: "Active",
    icon: "i-lucide-circle-check",
    value: companies.value.filter((company) => company.status === "ACTIVE")
      .length,
  },
  {
    label: "Suspended",
    icon: "i-lucide-ban",
    value: companies.value.filter((company) => company.status === "SUSPENDED")
      .length,
  },
  {
    label: "Total Members",
    icon: "i-lucide-users",
    value: companies.value.reduce((sum, c) => sum + (c.memberCount ?? 0), 0),
  },
]);

// `listTeams` already orders by `desc(createdAt)` server-side, so the most
// recent signups are simply the first 5 rows.
const recentCompanies = computed<Company[]>(() => companies.value.slice(0, 5));

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const columns: TableColumn<Company>[] = [
  { accessorKey: "name", header: "Company" },
  {
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) => row.original.planName ?? "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        UBadge,
        { color: row.original.status === "ACTIVE" ? "success" : "error", variant: "subtle" },
        () => row.original.status,
      ),
  },
  { accessorKey: "memberCount", header: "Members" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];
</script>
