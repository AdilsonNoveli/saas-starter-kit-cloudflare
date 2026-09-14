<script setup lang="ts">
/**
 * Illustrative only — there is no per-team analytics data model yet, so this
 * renders a synthetic "member growth" trend instead of leaving the chart
 * slot empty. Swap `data` for a real time-series query once one exists; the
 * unovis wiring below (line/area/axis/crosshair/tooltip) already matches the
 * pattern from the reference dashboard template and needs no changes.
 */
import { eachDayOfInterval, format, subDays } from "date-fns";
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip } from "@unovis/vue";

const cardRef = useTemplateRef<HTMLElement | null>("cardRef");
const { width } = useElementSize(cardRef);

type DataRecord = { date: Date; members: number };

const data = ref<DataRecord[]>([]);

const team = useCurrentTeam();
const { data: membersData } = await useTrpcClient().teams.listMembersAndInvites.useQuery({
  teamIdentifier: team.value?.slug || "",
});

watchEffect(() => {
  const currentCount = membersData.value?.members?.length ?? 1;
  const dates = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
  // A plausible-looking ramp up to the real current member count, not a
  // random walk — the last point always matches reality even though the
  // history before it is invented.
  data.value = dates.map((date, i) => ({
    date,
    members: Math.max(1, Math.round(currentCount * ((i + 1) / dates.length))),
  }));
});

const x = (_: DataRecord, i: number) => i;
const y = (d: DataRecord) => d.members;

const formatDate = (date: Date) => format(date, "d MMM");
const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) return "";
  return formatDate(data.value[i].date);
};
const template = (d: DataRecord) => `${formatDate(d.date)}: ${d.members} members`;
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: 'px-0! pt-0! pb-3!' }">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5">Member Growth</p>
          <p class="text-3xl text-highlighted font-semibold">
            {{ membersData?.members?.length ?? 0 }}
          </p>
        </div>
        <UBadge color="neutral" variant="subtle" size="sm">Illustrative data</UBadge>
      </div>
    </template>

    <VisXYContainer :data="data" :padding="{ top: 40 }" :margin="{ left: -5, right: -5 }" class="h-72" :width="width">
      <VisLine :x="x" :y="y" color="var(--ui-primary)" />
      <VisArea :x="x" :y="y" color="var(--ui-primary)" :opacity="0.1" />
      <VisAxis type="x" :x="x" :tick-format="xTicks" />
      <VisCrosshair color="var(--ui-primary)" :template="template" />
      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);
  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);
  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
