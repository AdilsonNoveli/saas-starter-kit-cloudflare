<template>
  <UDashboardPanel id="admin-company-detail">
    <template #header>
      <UDashboardNavbar :title="team?.name ?? 'Company'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <AccountHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <LoaderSpin v-if="status === 'pending'" />

      <div v-else-if="team" class="space-y-4">
        <div class="flex items-center justify-between gap-4">
          <UButton
            label="Back"
            icon="i-ph-arrow-left-duotone"
            color="neutral"
            variant="ghost"
            to="/admin/companies"
          />

          <div class="flex items-center gap-2">
            <AdminCompaniesReactivateModal
              v-if="team.status === 'SUSPENDED'"
              :team="{ id: team.id, name: team.name }"
              @success="refresh"
            >
              <UButton label="Reactivate" icon="i-ph-check-circle-duotone" />
            </AdminCompaniesReactivateModal>
            <AdminCompaniesSuspendModal
              v-else
              :team="{ id: team.id, name: team.name }"
              @success="refresh"
            >
              <UButton label="Suspend" icon="i-ph-prohibit-duotone" color="error" />
            </AdminCompaniesSuspendModal>
          </div>
        </div>

        <UPageCard title="Company" variant="subtle">
          <template #description>
            {{ team.description ?? "No description." }}
          </template>

          <dl class="grid gap-4 sm:grid-cols-4">
            <div v-for="field in fields" :key="field.label">
              <dt class="text-sm text-muted">{{ field.label }}</dt>
              <dd class="font-medium text-highlighted">{{ field.value }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Status</dt>
              <dd>
                <UBadge
                  class="capitalize"
                  variant="subtle"
                  :color="teamStatusColor(team.status)"
                >
                  {{ team.status.toLowerCase() }}
                </UBadge>
              </dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard
          :title="`Members (${team.memberships.length})`"
          variant="subtle"
        >
          <div
            v-if="team.memberships.length"
            class="divide-y divide-default -my-3"
          >
            <div
              v-for="membership in team.memberships"
              :key="membership.id"
              class="flex items-center gap-3 py-3"
            >
              <UAvatar
                :src="membership.user.image ?? undefined"
                :alt="
                  membership.user.name ?? membership.user.email ?? undefined
                "
              />
              <div class="min-w-0 flex-1">
                <p class="font-medium text-highlighted truncate">
                  {{ membership.user.name ?? "Unnamed" }}
                </p>
                <p class="text-sm text-muted truncate">
                  {{ membership.user.email }}
                </p>
              </div>
              <UBadge variant="subtle" color="neutral">
                {{ membership.role.name }}
              </UBadge>
            </div>
          </div>
          <p v-else class="text-sm text-muted">This company has no members.</p>
        </UPageCard>

        <UPageCard title="Subscription" variant="subtle">
          <dl v-if="subscriptionFields" class="grid gap-4 sm:grid-cols-4">
            <div v-for="field in subscriptionFields" :key="field.label">
              <dt class="text-sm text-muted">{{ field.label }}</dt>
              <dd class="font-medium text-highlighted">{{ field.value }}</dd>
            </div>
          </dl>
          <p v-else class="text-sm text-muted">No subscription on record.</p>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "admin",
});

const route = useRoute();

// `getTeamDetail` takes an id or a slug; the table links by id.
const {
  data: team,
  status,
  refresh,
} = await useTrpcClient().admin.teams.getTeamDetail.useQuery({
  teamIdentifier: route.params.id as string,
});

const fields = computed(() =>
  team.value
    ? [
        { label: "Slug", value: `@${team.value.slug}` },
        { label: "Jobs", value: String(team.value.jobCount) },
        {
          label: "Created",
          value: formatDate(new Date(team.value.createdAt)),
        },
      ]
    : [],
);

const subscriptionFields = computed(() => {
  const subscription = team.value?.subscription;
  if (!subscription) return null;
  return [
    { label: "Plan", value: subscription.plan?.name ?? "—" },
    { label: "Status", value: subscription.status },
    { label: "Provider", value: subscription.provider },
    {
      label: "Current period ends",
      value: subscription.currentPeriodEnd
        ? formatDate(new Date(subscription.currentPeriodEnd))
        : "—",
    },
  ];
});
</script>
