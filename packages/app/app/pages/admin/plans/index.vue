<template>
  <UDashboardPanel id="admin-plans">
    <template #header>
      <UDashboardNavbar title="Plans">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Setup Stripe portal"
            icon="i-lucide-credit-card"
            color="neutral"
            variant="outline"
            loading-auto
            @click="setupStripePortal"
          />

          <AdminPlansCreateEditModal @success="refresh">
            <UButton label="New plan" icon="i-lucide-plus" />
          </AdminPlansCreateEditModal>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <AdminDataTable
        :columns="columns"
        :data="plans"
        :loading="status === 'pending'"
        search-column="name"
        search-placeholder="Filter plans..."
      >
        <template #filters>
          <USwitch v-model="includeArchived" label="Show archived" />
        </template>
      </AdminDataTable>

      <AdminPlansCreateEditModal
        v-if="editingPlan"
        v-model:open="editOpen"
        :plan="editingPlan"
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

type Plan = RouterOutput["admin"]["plans"]["listPlans"][number];

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const toast = useToast();
const client = useTrpcClient();

// Unlike the status dropdown on Companies, this one refetches: `listPlans`
// filters archived rows in SQL, so asking for them is a different query, not a
// subset of the one already loaded. Passing a getter is what makes trpc-nuxt
// watch it and re-run the query on toggle.
const includeArchived = ref(false);
const { data, status, refresh } = await client.admin.plans.listPlans.useQuery(
  () => ({ includeArchived: includeArchived.value }),
);

const plans = computed(() => data.value ?? []);

const editingPlan = ref<Plan | null>(null);
const editOpen = ref(false);

function edit(plan: Plan) {
  editingPlan.value = plan;
  editOpen.value = true;
}

/**
 * Archiving is a reversible soft delete that only hides the plan from this
 * list — no tenant loses anything — so it runs straight from the menu instead
 * of behind a confirmation modal like suspending a company.
 */
async function setArchived(plan: Plan, archived: boolean) {
  try {
    const mutation = archived
      ? client.admin.plans.archivePlan
      : client.admin.plans.unarchivePlan;
    await mutation.mutate({ id: plan.id });

    toast.add({
      title: archived ? "Plan archived" : "Plan restored",
      description: `${plan.name} is now ${archived ? "archived" : "active"}.`,
      color: "success",
      icon: "i-lucide-check",
    });
    await refresh();
  } catch (error) {
    toast.add({
      title: archived ? "Failed to archive plan" : "Failed to restore plan",
      description:
        error instanceof Error ? error.message : "Something went wrong",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

/**
 * Reprovisions the Stripe portal configuration the tenant "Cancel
 * Subscription" link reads. Idempotent and destroys no data, so it is a plain
 * button rather than a confirmation step.
 */
async function setupStripePortal() {
  try {
    const { configurationId } =
      await client.admin.plans.setupStripeCancelConfiguration.mutate();

    toast.add({
      title: "Stripe portal configured",
      description: configurationId,
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error) {
    toast.add({
      title: "Failed to configure Stripe portal",
      description:
        error instanceof Error ? error.message : "Something went wrong",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

function getRowItems(row: Row<Plan>): DropdownMenuItem[] {
  const plan = row.original;

  return [
    { type: "label", label: "Actions" },
    {
      label: "Edit",
      icon: "i-lucide-pencil",
      onSelect: () => edit(plan),
    },
    { type: "separator" },
    plan.isArchived
      ? {
          label: "Unarchive",
          icon: "i-lucide-archive-restore",
          onSelect: () => setArchived(plan, false),
        }
      : {
          label: "Archive",
          icon: "i-lucide-archive",
          color: "error",
          onSelect: () => setArchived(plan, true),
        },
  ];
}

const columns: TableColumn<Plan>[] = [
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
    cell: ({ row }) =>
      h("div", undefined, [
        h("p", { class: "font-medium text-highlighted" }, row.original.name),
        h("p", { class: "text-muted truncate" }, row.original.description),
      ]),
  },
  {
    accessorKey: "tier",
    header: "Tier",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: "subtle",
          color: planTierColor(row.original.tier),
        },
        () => row.original.tier,
      ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) =>
      h("div", undefined, [
        h("p", undefined, row.original.price),
        h("p", { class: "text-muted" }, `/${row.original.period}`),
      ]),
  },
  {
    id: "seats",
    accessorKey: "maxSeats",
    header: "Seats",
    cell: ({ row }) => row.original.maxSeats ?? "Unlimited",
  },
  {
    id: "teams",
    accessorKey: "teamCount",
    header: ({ column }) =>
      sortableHeader(column.getIsSorted(), "Teams", () =>
        column.toggleSorting(column.getIsSorted() === "asc"),
      ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: "subtle",
          color: row.original.isArchived ? "neutral" : "success",
        },
        () => (row.original.isArchived ? "Archived" : "Active"),
      ),
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

/** Sortable column header — same button in two columns, so it lives once. */
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
