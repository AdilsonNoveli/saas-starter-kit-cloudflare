<template>
  <div
    v-if="message"
    class="w-full px-4 py-2.5 rounded-md border border-default bg-elevated/40 text-xs sm:text-sm text-default flex items-center justify-between"
  >
    <div class="flex items-center gap-2">
      <span class="inline-block size-2 rounded-full bg-primary animate-pulse" />
      <span>{{ message }}</span>
    </div>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  planName?: string;
  status?: string;
  endsOnDate?: Date | string | null;
  nextPaymentDate?: Date | string | null;
}

const props = withDefaults(defineProps<Props>(), {
  planName: "Pro",
  status: "TRIALING",
  endsOnDate: null,
  nextPaymentDate: null,
});

function formatDate(date?: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

const message = computed(() => {
  const plan = props.planName || "Pro";
  if (props.status === "TRIALING" || !props.status) {
    const endStr = props.endsOnDate ? formatDate(props.endsOnDate) : "soon";
    return `You are trialing ${plan} · ends on ${endStr}`;
  }
  if (props.status === "ACTIVE") {
    const nextStr = props.nextPaymentDate ? formatDate(props.nextPaymentDate) : null;
    return nextStr
      ? `Active plan: ${plan} · renews on ${nextStr}`
      : `Active plan: ${plan}`;
  }
  if (props.status === "PAST_DUE") {
    return `Payment past due on ${plan}`;
  }
  if (props.status === "CANCELED") {
    const endStr = props.endsOnDate ? formatDate(props.endsOnDate) : null;
    return endStr
      ? `Subscription canceled · access to ${plan} until ${endStr}`
      : `Subscription canceled`;
  }
  return `Current plan: ${plan}`;
});
</script>
