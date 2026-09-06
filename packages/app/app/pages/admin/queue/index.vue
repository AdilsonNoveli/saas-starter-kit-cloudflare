<template>
  <UDashboardPanel id="admin-queue">
    <template #header>
      <UDashboardNavbar title="Queue">
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
            @click="refreshAll"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UPageCard
          v-for="stat in stats"
          :key="stat.status"
          :title="stat.label"
          :icon="stat.icon"
          variant="subtle"
        >
          <p class="text-3xl font-semibold text-highlighted">
            {{ statsStatus === "pending" ? "—" : stat.count }}
          </p>
        </UPageCard>
      </div>

      <div class="flex flex-col gap-4">
        <div>
          <h2 class="font-semibold text-highlighted">Dead letter queue</h2>
          <p class="text-sm text-muted">
            Messages that exhausted every retry. Replaying sends one back to the
            job queue.
          </p>
        </div>

        <AdminDataTable
          :columns="columns"
          :data="deadLetters"
          :loading="deadLettersStatus === 'pending'"
          search-column="error"
          search-placeholder="Filter by error..."
        />
      </div>

      <UPageCard
        title="Cron logs"
        description="The 20 most recent platform cron runs."
        variant="subtle"
      >
        <p v-if="cronLogs.length === 0" class="text-sm text-muted">
          {{
            cronStatus === "pending" ? "Loading…" : "No cron runs recorded yet."
          }}
        </p>

        <ul v-else class="divide-y divide-default text-sm">
          <li
            v-for="log in cronLogs"
            :key="log.id"
            class="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0"
          >
            <span class="text-highlighted break-words">{{ log.message }}</span>
            <span class="shrink-0 text-muted">{{
              formatDateTime(log.createdAt)
            }}</span>
          </li>
        </ul>
      </UPageCard>

      <AdminQueueReplayModal
        v-if="selectedRecord"
        v-model:open="replayOpen"
        :record="selectedRecord"
        @success="refreshDeadLetters"
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

type DeadLetter =
  RouterOutput["admin"]["queue"]["getDeadLetterMessages"][number];

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UTooltip = resolveComponent("UTooltip");

const client = useTrpcClient();

const {
  data: statsData,
  status: statsStatus,
  refresh: refreshStats,
} = await client.admin.queue.getQueueStats.useQuery();
const {
  data: deadLetterData,
  status: deadLettersStatus,
  refresh: refreshDeadLetters,
} = await client.admin.queue.getDeadLetterMessages.useQuery();
const {
  data: cronData,
  status: cronStatus,
  refresh: refreshCronLogs,
} = await client.admin.queue.getCronLogs.useQuery();

const deadLetters = computed(() => deadLetterData.value ?? []);
const cronLogs = computed(() => cronData.value ?? []);

async function refreshAll() {
  await Promise.all([refreshStats(), refreshDeadLetters(), refreshCronLogs()]);
}

/**
 * `Job.status` is a text column, so the four values the consumer writes are
 * listed here rather than derived from the rows: a status with no jobs still
 * has to show a zero, and an unexpected value must not invent a card.
 */
const JOB_STATUSES = [
  { status: "pending", label: "Pending", icon: "i-lucide-clock" },
  { status: "processing", label: "Processing", icon: "i-lucide-loader" },
  { status: "completed", label: "Completed", icon: "i-lucide-circle-check" },
  { status: "failed", label: "Failed", icon: "i-lucide-circle-x" },
] as const;

const stats = computed(() =>
  JOB_STATUSES.map((entry) => ({
    ...entry,
    count:
      statsData.value?.find((row) => row.status === entry.status)?.count ?? 0,
  })),
);

const selectedRecord = ref<{
  id: string;
  teamName: string | null;
  error: string;
} | null>(null);
const replayOpen = ref(false);

/**
 * The stored message is the original `Job` row, but the column is jsonb and so
 * arrives as `unknown`. Only its `message` field is worth showing, and only if
 * it really is a string — anything else falls back to the raw JSON rather than
 * asserting a shape the queue never promised.
 */
function describeMessage(message: unknown): string {
  const payload = (message as { message?: unknown } | null)?.message;
  return typeof payload === "string" ? payload : JSON.stringify(message);
}

function getRowItems(row: Row<DeadLetter>): DropdownMenuItem[] {
  const record = row.original;

  return [
    { type: "label", label: "Actions" },
    {
      label: "Replay",
      icon: "i-lucide-rotate-ccw",
      // Kept visible but disabled once replayed: an empty menu reads as a bug,
      // a greyed-out item reads as "already done".
      disabled: record.replayedAt !== null,
      onSelect: () => {
        selectedRecord.value = {
          id: record.id,
          teamName: record.teamName,
          error: record.error,
        };
        replayOpen.value = true;
      },
    },
  ];
}

const columns: TableColumn<DeadLetter>[] = [
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
    accessorKey: "error",
    header: "Error",
    // A stack trace is far too long for a cell, so the row shows one truncated
    // line and the tooltip carries the full text — enough to triage without a
    // detail screen that would only reprint this string.
    cell: ({ row }) =>
      h(UTooltip, { text: row.original.error, delayDuration: 0 }, () =>
        h("div", { class: "min-w-0" }, [
          h(
            "p",
            { class: "font-medium text-highlighted truncate" },
            row.original.error,
          ),
          h(
            "p",
            { class: "text-muted truncate" },
            describeMessage(row.original.message),
          ),
        ]),
      ),
  },
  {
    id: "team",
    accessorKey: "teamName",
    header: "Company",
    cell: ({ row }) => row.original.teamName ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) =>
      sortableHeader(column.getIsSorted(), "Failed at", () =>
        column.toggleSorting(column.getIsSorted() === "asc"),
      ),
    // Time of day matters here in a way it does not for a company signup:
    // several messages can land in the same minute during one bad deploy.
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: "subtle",
          color: row.original.replayedAt ? "success" : "warning",
        },
        () => (row.original.replayedAt ? "Replayed" : "Pending"),
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

/** Sortable column header — same button as on Companies and Plans. */
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
