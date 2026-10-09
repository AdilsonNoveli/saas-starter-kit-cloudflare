<template>
  <UDashboardPanel id="admin-plans">
    <template #header>
      <UDashboardNavbar title="Plans">
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
        :data="plans"
        :loading="status === 'pending'"
        search-column="name"
        search-placeholder="Filter plans..."
      >
        <template #filters>
          <USwitch v-model="includeArchived" label="Show archived" />
          <UButton
            label="Setup Stripe portal"
            icon="i-ph-credit-card-duotone"
            color="neutral"
            variant="outline"
            loading-auto
            @click="setupStripePortal"
          />
          <AdminPlansCreateEditModal @success="refresh">
            <UButton label="New plan" icon="i-ph-plus-duotone" />
          </AdminPlansCreateEditModal>
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
import { PlanBuyerTeamMode } from "@nuxfire/layer-billing/shared/types/enums";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

type Plan = RouterOutput["admin"]["plans"]["listPlans"][number];

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const notification = useNotification();
const client = useTrpcClient();
const { t } = useI18n();

/**
 * What the plan does with a buyer, in words. An existing-team plan whose team
 * no longer resolves (deleted since) says so, because whoever consumes the plan
 * refuses to provision without a destination.
 */
function buyerTeamLabel(plan: Plan): string {
  if (plan.buyerTeamMode !== PlanBuyerTeamMode.EXISTING_TEAM) {
    return t("billing.admin.plans.buyerTeam.newTeam");
  }
  return plan.buyerTeamName
    ? t("billing.admin.plans.buyerTeam.joins", { space: plan.buyerTeamName })
    : t("billing.admin.plans.buyerTeam.teamRemoved");
}

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

    notification.success(archived ? "Plan archived" : "Plan restored", `${plan.name} is now ${archived ? "archived" : "active"}.`);
    await refresh();
  } catch (error) {
    notification.error(archived ? "Failed to archive plan" : "Failed to restore plan", error instanceof Error ? error.message : "Something went wrong");
  }
}

/**
 * One-click toggle for the landing page's Buy CTA target. Turning it on for
 * one plan turns it off for every other plan (admin-plans.ts's updatePlan,
 * inside one transaction) — the table refetches afterward so that becomes
 * visible immediately rather than only on the next manual refresh.
 */
async function setPublicOffer(plan: Plan, isPublicOffer: boolean) {
  try {
    await client.admin.plans.updatePlan.mutate({ id: plan.id, isPublicOffer });

    notification.success(
      isPublicOffer
        ? t("billing.admin.plans.publicOffer.notifyOnTitle")
        : t("billing.admin.plans.publicOffer.notifyOffTitle"),
      isPublicOffer
        ? t("billing.admin.plans.publicOffer.notifyOnBody", { plan: plan.name })
        : t("billing.admin.plans.publicOffer.notifyOffBody", { plan: plan.name }),
    );
    await refresh();
  } catch (error) {
    notification.error(
      t("billing.admin.plans.publicOffer.notifyErrorTitle"),
      error instanceof Error ? error.message : "Something went wrong",
    );
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

    notification.success("Stripe portal configured", configurationId);
  } catch (error) {
    notification.error("Failed to configure Stripe portal", error instanceof Error ? error.message : "Something went wrong");
  }
}

function getRowItems(row: Row<Plan>): DropdownMenuItem[] {
  const plan = row.original;

  return [
    { type: "label", label: "Actions" },
    {
      label: "Edit",
      icon: "i-ph-pencil-duotone",
      onSelect: () => edit(plan),
    },
    plan.isPublicOffer
      ? {
          label: t("billing.admin.plans.publicOffer.menuHide"),
          icon: "i-ph-eye-slash-duotone",
          onSelect: () => setPublicOffer(plan, false),
        }
      : {
          label: t("billing.admin.plans.publicOffer.label"),
          icon: "i-ph-eye-duotone",
          onSelect: () => setPublicOffer(plan, true),
        },
    { type: "separator" },
    plan.isArchived
      ? {
          label: "Unarchive",
          icon: "i-ph-archive-duotone",
          onSelect: () => setArchived(plan, false),
        }
      : {
          label: "Archive",
          icon: "i-ph-archive-duotone",
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
    id: "buyerTeam",
    header: () => t("billing.admin.plans.buyerTeam.column"),
    cell: ({ row }) => buyerTeamLabel(row.original),
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
      h("div", { class: "flex flex-wrap gap-1" }, [
        h(
          UBadge,
          {
            variant: "subtle",
            color: row.original.isArchived ? "neutral" : "success",
          },
          () => (row.original.isArchived ? "Archived" : "Active"),
        ),
        row.original.isPublicOffer
          ? h(
              UBadge,
              { variant: "subtle", color: "primary" },
              () => t("billing.admin.plans.publicOffer.badge"),
            )
          : null,
      ]),
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
              icon: "i-ph-dots-three-vertical-duotone",
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
        ? "i-ph-sort-ascending-duotone"
        : "i-ph-sort-descending-duotone"
      : "i-ph-arrows-down-up-duotone",
    class: "-mx-2.5",
    onClick,
  });
}
</script>
