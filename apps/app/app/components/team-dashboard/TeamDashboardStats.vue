<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <UPageCard
      v-for="stat in stats"
      :key="stat.title"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        leading: 'p-2.5 rounded-sm bg-primary/10 ring ring-inset ring-primary/25',
        title: 'font-normal text-muted text-xs uppercase',
      }"
    >
      <span class="text-2xl font-semibold text-highlighted">
        {{ status === "pending" ? "—" : stat.value }}
      </span>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const team = useCurrentTeam();
const teamSlug = computed(() => team.value?.slug || "");
const route = useRoute();

const { data: membersData, status: membersStatus } = await useTrpcClient()
  .teams.listMembersAndInvites.useQuery({ teamIdentifier: teamSlug.value });

const { data: billingData, status: billingStatus } = await useTrpcClient()
  .billing.getBillingInfo.useQuery({
    teamIdentifier: teamSlug.value,
    returnUrl: route.fullPath,
  });

const status = computed(() =>
  membersStatus.value === "pending" || billingStatus.value === "pending"
    ? "pending"
    : "success",
);

function formatDate(date?: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const stats = computed(() => [
  {
    title: "Members",
    icon: "i-ph-users-duotone",
    value: membersData.value?.members?.length ?? 0,
  },
  {
    title: "Pending Invites",
    icon: "i-ph-envelope-duotone",
    value: membersData.value?.invites?.length ?? 0,
  },
  {
    title: "Current Plan",
    icon: "i-ph-credit-card-duotone",
    value: billingData.value?.currentPlan?.name ?? "No Plan",
  },
  {
    title: t("teams.dashboard.created"),
    icon: "i-ph-calendar-duotone",
    // `useCurrentTeam()` types as `teams.get | teams.list[0]`, and only the
    // former carries `createdAt` — but the team dashboard route only ever
    // populates it via `fetchCurrentTeam` -> `teams.get`, so it's always
    // present here at runtime.
    value: formatDate((team.value as { createdAt?: string | Date })?.createdAt),
  },
]);
</script>
