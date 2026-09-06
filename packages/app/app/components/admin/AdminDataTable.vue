<template>
  <div class="flex flex-wrap items-center justify-between gap-1.5">
    <UInput
      v-model="search"
      class="max-w-sm"
      icon="i-lucide-search"
      :placeholder="searchPlaceholder"
    />

    <div class="flex flex-wrap items-center gap-1.5">
      <slot name="filters" />

      <UDropdownMenu :items="displayItems" :content="{ align: 'end' }">
        <UButton
          label="Display"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-settings-2"
        />
      </UDropdownMenu>
    </div>
  </div>

  <UTable
    ref="table"
    v-model:column-filters="columnFilters"
    v-model:column-visibility="columnVisibility"
    v-model:row-selection="rowSelection"
    v-model:pagination="pagination"
    :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
    class="shrink-0"
    :data="data"
    :columns="columns"
    :loading="loading"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default',
      separator: 'h-0',
    }"
  />

  <div
    class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
  >
    <div class="text-sm text-muted">
      {{ selectedRowCount }} of {{ filteredRowCount }} row(s) selected.
    </div>

    <UPagination
      :default-page="(tableApi?.getState().pagination.pageIndex ?? 0) + 1"
      :items-per-page="tableApi?.getState().pagination.pageSize"
      :total="filteredRowCount"
      @update:page="(page: number) => tableApi?.setPageIndex(page - 1)"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends TableData">
import type { TableColumn, TableData } from "@nuxt/ui";
import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  Table,
  VisibilityState,
} from "@tanstack/table-core";
import { getPaginationRowModel } from "@tanstack/table-core";

/**
 * The one table every `/admin` listing screen is built from — search bar,
 * column-visibility menu, the `UTable` itself and the selection/pagination
 * footer. Domain screens declare only their `columns` and hand over `data`;
 * anything they need beyond that (a status `USelect`, a tier filter) goes in
 * the `#filters` slot, so the toolbar and footer are never reimplemented.
 *
 * Filtering, sorting and pagination all run client-side on purpose: the admin
 * queries return a bounded list rather than a server-paginated page, so the
 * whole dataset is already here.
 */
const props = defineProps<{
  columns: TableColumn<T>[];
  data: T[] | undefined;
  /** `true` while the backing query is in flight. */
  loading?: boolean;
  /** Column id the search box filters on, e.g. `"name"`. */
  searchColumn: string;
  searchPlaceholder?: string;
}>();

// Annotated rather than inferred: the template reads `tableApi`, so letting
// Volar infer the ref's type from the template it is used in is circular.
const table = useTemplateRef<{ tableApi?: Table<T> }>("table");
const tableApi = computed<Table<T> | undefined>(() => table.value?.tableApi);

// Seeded with the search column so the first keystroke updates an existing
// filter instead of appending a second one for the same column.
const columnFilters = ref<ColumnFiltersState>([
  { id: props.searchColumn, value: "" },
]);
const columnVisibility = ref<VisibilityState>({});
const rowSelection = ref<RowSelectionState>({});
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 });

// Reading through the table API rather than a free ref keeps TanStack the
// single owner of filter state — clearing a filter elsewhere empties the box.
const search = computed({
  get: () =>
    (tableApi.value?.getColumn(props.searchColumn)?.getFilterValue() as
      string | undefined) ?? "",
  set: (value: string) =>
    tableApi.value
      ?.getColumn(props.searchColumn)
      ?.setFilterValue(value || undefined),
});

const filteredRowCount = computed(
  () => tableApi.value?.getFilteredRowModel().rows.length ?? 0,
);
const selectedRowCount = computed(
  () => tableApi.value?.getFilteredSelectedRowModel().rows.length ?? 0,
);

const displayItems = computed(() =>
  (tableApi.value?.getAllColumns() ?? [])
    .filter((column) => column.getCanHide())
    .map((column) => ({
      label: toTitleCase(column.id),
      type: "checkbox" as const,
      checked: column.getIsVisible(),
      onUpdateChecked: (checked: boolean) => column.toggleVisibility(!!checked),
      onSelect: (event?: Event) => event?.preventDefault(),
    })),
);

// Domain screens need the API to drive their own `#filters` controls.
defineExpose({ tableApi });
</script>
