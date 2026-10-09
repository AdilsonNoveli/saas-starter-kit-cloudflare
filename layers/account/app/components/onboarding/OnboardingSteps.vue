<script setup lang="ts">
import type { StepperItem } from "@nuxt/ui";

// The onboarding step indicator and the frame of the current step (SPEC-0010,
// AC-045, DEC-007). `UStepper` draws the indicator with the `stepper` line of
// sharedUiConfig; the step's own form comes through the default slot. A
// person can go back to a finished step from the indicator, never jump ahead
// of the form they are on: the steps after the current one are disabled.
const step = defineModel<number>({ required: true });

const props = defineProps<{
  /** One title per step, already translated, in order. */
  titles: string[];
}>();

const { t } = useI18n();

const items = computed<StepperItem[]>(() =>
  props.titles.map((title, index) => ({ title, disabled: index > step.value })),
);

const position = computed(() =>
  t("account.onboarding.position", {
    current: step.value + 1,
    total: props.titles.length,
    title: props.titles[step.value] ?? "",
  }),
);

const content = useTemplateRef<HTMLElement>("content");

// The first field of a step, else its heading (the invite variant of the
// Space step has no field).
const FIRST_FIELD = "input:not([type='hidden']), textarea, select, [role='combobox']";

// Keyboard and screen reader users land on the new step's first field
// instead of losing focus with the form that just left the page.
watch(step, async () => {
  await nextTick();
  const root = content.value;
  const target = root?.querySelector<HTMLElement>(FIRST_FIELD) ?? root?.querySelector<HTMLElement>("h2");
  target?.focus();
});
</script>

<template>
  <div class="space-y-8">
    <UStepper v-model="step" :items="items" size="sm" :linear="false" />

    <!-- Read once per change, after the indicator, so the position is announced, not only drawn. -->
    <p class="sr-only" aria-live="polite">{{ position }}</p>

    <div ref="content">
      <slot />
    </div>
  </div>
</template>
