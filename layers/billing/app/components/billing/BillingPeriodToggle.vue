<template>
  <div
    class="inline-flex items-center rounded-md p-0.5 bg-muted/60 dark:bg-muted/40 border border-default text-xs font-medium"
    role="group"
    aria-label="Billing cycle"
  >
    <button
      v-for="item in options"
      :key="item.value"
      type="button"
      :class="[
        'px-3 py-1 rounded-xs transition-all duration-150 select-none',
        model === item.value
          ? 'bg-default text-highlighted shadow-xs font-semibold ring-1 ring-default/60'
          : 'text-muted hover:text-default',
      ]"
      @click="model = item.value"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export type BillingPeriod = "month" | "semester" | "year";

interface PeriodOption {
  label: string;
  value: BillingPeriod;
}

const options: PeriodOption[] = [
  { label: "Monthly", value: "month" },
  { label: "Biannual", value: "semester" },
  { label: "Yearly", value: "year" },
];

const model = defineModel<BillingPeriod>({ default: "month" });
</script>
