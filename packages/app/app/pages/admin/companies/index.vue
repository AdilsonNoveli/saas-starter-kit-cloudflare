<template>
  <UDashboardPanel id="admin-companies">
    <template #header>
      <UDashboardNavbar title="Companies">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            loading-auto
            @click="refresh"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <AdminDataTable
        ref="dataTable"
        :columns="columns"
        :data="companies"
        :loading="status === 'pending'"
        search-column="name"
        search-placeholder="Filter companies..."
      >
        <template #filters>
          <USelect
            v-model="statusFilter"
            :items="statusFilterItems"
            :ui="{
              trailingIcon:
                'group-data-[state=open]:rotate-180 transition-transform duration-200',
            }"
            placeholder="Filter status"
            class="min-w-32"
          />
        </template>
      </AdminDataTable>

      <AdminCompaniesSuspendModal
        v-if="selectedTeam"
        v-model:open="suspendOpen"
        :team="selectedTeam"
        @success="refresh"
      />
      <AdminCompaniesReactivateModal
        v-if="selectedTeam"
        v-model:open="reactivateOpen"
        :team="selectedTeam"
        @success="refresh"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui";
import type { Row } from "@tanstack/table-core";
import type { RouterOutput } from "~~/server/trpc/routers";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

type Company = RouterOutput["admin"]["teams"]["listTeams"][number];

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const ULink = resolveComponent("ULink");

const { data, status, refresh } =
  await useTrpcClient().admin.teams.listTeams.useQuery({});

const companies = computed(() => data.value ?? []);

const dataTable = useTemplateRef("dataTable");

// `listTeams` accepts a `status` input, but filtering here keeps this screen
// consistent with its own search and sorting — all client-side over a list
// that is already fully loaded — instead of round-tripping for one dropdown.
const statusFilter = ref("all");
const statusFilterItems = [
  { label: "All", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

watch(statusFilter, (value) => {
  const column = dataTable.value?.tableApi?.getColumn("status");
  if (!column) return;
  column.setFilterValue(value === "all" ? undefined : value);
});

const selectedTeam = ref<{ id: string; name: string } | null>(null);
const suspendOpen = ref(false);
const reactivateOpen = ref(false);

function getRowItems(row: Row<Company>): DropdownMenuItem[] {
  const company = row.original;
  const isSuspended = company.status === "SUSPENDED";

  return [
    { type: "label", label: "Actions" },
    {
      label: "View details",
      icon: "i-lucide-list",
      onSelect: () => navigateTo(`/admin/companies/${company.id}`),
    },
    { type: "separator" },
    isSuspended
      ? {
          label: "Reactivate",
          icon: "i-lucide-circle-check",
          onSelect: () => {
            selectedTeam.value = { id: company.id, name: company.name };
            reactivateOpen.value = true;
          },
        }
      : {
          label: "Suspend",
          icon: "i-lucide-ban",
          color: "error",
          onSelect: () => {
            selectedTeam.value = { id: company.id, name: company.name };
            suspendOpen.value = true;
          },
        },
  ];
}

const columns: TableColumn<Company>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: "Select all",
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          row.toggleSelected(!!value),
        ariaLabel: "Select row",
      }),
  },
  {
    accessorKey: "name",
    header: ({ column }) =>
      sortableHeader(column.getIsSorted(), "Name", () =>
        column.toggleSorting(column.getIsSorted() === "asc"),
      ),
    // Linked by id, not slug: a slug can be renamed by the tenant, the id
    // cannot. `getTeamDetail` resolves either.
    cell: ({ row }) =>
      h("div", undefined, [
        h(
          ULink,
          {
            to: `/admin/companies/${row.original.id}`,
            class: "font-medium text-highlighted",
          },
          () => row.original.name,
        ),
        h("p", { class: "text-muted" }, `@${row.original.slug}`),
      ]),
  },
  {
    accessorKey: "planName",
    header: "Plan",
    cell: ({ row }) =>
      h("div", undefined, [
        h("p", undefined, row.original.planName ?? "—"),
        row.original.planTier
          ? h("p", { class: "text-muted" }, row.original.planTier)
          : undefined,
      ]),
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equals",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          class: "capitalize",
          variant: "subtle",
          color: teamStatusColor(row.original.status),
        },
        () => row.original.status.toLowerCase(),
      ),
  },
  {
    accessorKey: "memberCount",
    header: ({ column }) =>
      sortableHeader(column.getIsSorted(), "Members", () =>
        column.toggleSorting(column.getIsSorted() === "asc"),
      ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) =>
      sortableHeader(column.getIsSorted(), "Created", () =>
        column.toggleSorting(column.getIsSorted() === "asc"),
      ),
    cell: ({ row }) => formatDate(new Date(row.original.createdAt)),
  },
  {
    id: "actions",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right" },
        h(
          UDropdownMenu,
          { content: { align: "end" }, items: getRowItems(row) },
          () =>
            h(UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "ghost",
              class: "ml-auto",
            }),
        ),
      ),
  },
];

/** Sortable column header — same button in four columns, so it lives once. */
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
        ? "i-lucide-arrow-up-narrow-wide"
        : "i-lucide-arrow-down-wide-narrow"
      : "i-lucide-arrow-up-down",
    class: "-mx-2.5",
    onClick,
  });
}
</script>
