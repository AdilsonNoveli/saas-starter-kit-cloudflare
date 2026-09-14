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

  <!--
    Full-bleed: the negative margin cancels the dashboard panel's own
    `p-4 sm:p-6` gutter so the header band, the row separators and the row
    hover run edge to edge — the reference admin (pedped's customers screen)
    puts its table in an unpadded container for exactly this reason. The
    gutter comes back on the outer cells (`tableUi` below), so the text still
    lines up with the toolbar above it instead of hugging the screen edge.
  -->
  <UTable
    ref="table"
    v-model:column-filters="columnFilters"
    v-model:column-visibility="columnVisibility"
    v-model:row-selection="rowSelection"
    v-model:pagination="pagination"
    :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
    class="shrink-0 -mx-4 sm:-mx-6"
    :data="data"
    :columns="columns"
    :loading="loading"
    :ui="tableUi"
    :on-select="onSelect"
  />

  <!-- Bleeds too, so its rule lines up with the table's own separators. -->
  <div
    class="-mx-4 px-4 sm:-mx-6 sm:px-6 flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
  >
    <div v-if="selectable" class="text-sm text-muted">
      {{ selectedRowCount }} of {{ filteredRowCount }} row(s) selected.
    </div>
    <div v-else />

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
import { enterpriseTableUi } from "@nuxfire/design-tokens";

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
  /** Set to `false` for tables with no `id: "select"` checkbox column — hides the meaningless "row(s) selected" count. */
  selectable?: boolean;
  /**
   * When given, each row navigates here on click — the pedped reference's
   * customer rows work this way. `UTable` already ignores clicks that
   * originate on a nested `<button>`/`<a>` (its row-select actions column,
   * or a link inside a cell), so this never fights with either.
   */
  rowTo?: (row: T) => string;
}>();

const selectable = computed(() => props.selectable ?? true);

/**
 * `enterpriseTableUi` is shared with the tables that live inside a `UCard`
 * (the admin overview, the team dashboard's activity list), which are *not*
 * full-bleed — so the edge gutter and the squared-off corners belong here,
 * on the only component that bleeds, rather than in the shared token.
 *
 * The gutter mirrors the panel's own `p-4 sm:p-6` that the table's negative
 * margin cancels: cell text lands back on the same vertical line as the
 * search box above it. `first:`/`last:` beat the theme's blanket `px-4` on
 * specificity, so the inner cells keep their normal padding.
 *
 * `cursor-pointer` only when the row really goes somewhere — the hover tint
 * in `enterpriseTableUi.tr` applies to every table regardless, but a pointer
 * cursor on a row that does nothing on click would be a lie the table tells.
 */
const EDGE_GUTTER = "first:ps-4 sm:first:ps-6 last:pe-4 sm:last:pe-6";

const tableUi = computed(() => ({
  ...enterpriseTableUi,
  root: "rounded-none",
  th: `${enterpriseTableUi.th} ${EDGE_GUTTER}`,
  td: `${enterpriseTableUi.td} ${EDGE_GUTTER}`,
  tr: props.rowTo
    ? `${enterpriseTableUi.tr} cursor-pointer`
    : enterpriseTableUi.tr,
}));

// `UTable` only sets `data-selectable`/`role="button"` on rows when this prop
// is actually given — passing a no-op function unconditionally would make
// every row *look* keyboard-focusable and clickable even with no `rowTo`.
const onSelect = computed(() =>
  props.rowTo
    ? (_event: Event, row: { original: T }) => navigateTo(props.rowTo!(row.original))
    : undefined,
);

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
