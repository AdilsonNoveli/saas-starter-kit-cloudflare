<template>
  <UDashboardPanel id="admin-overview">
    <template #header>
      <UDashboardNavbar title="Overview">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-3">
        <UPageCard
          v-for="stat in stats"
          :key="stat.label"
          :title="stat.label"
          :icon="stat.icon"
          variant="subtle"
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
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "admin",
});

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
]);
</script>
