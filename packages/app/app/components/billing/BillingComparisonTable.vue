<template>
  <div class="w-full overflow-hidden rounded-md border border-default bg-elevated shadow-xs">
    <div v-if="!plans.length" class="p-12 text-center text-sm text-muted">
      No plans available for the selected billing cycle.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[700px] border-collapse text-left">
        <!-- Header: Plan Columns -->
        <thead>
          <tr class="border-b border-default bg-muted/20">
            <th class="p-5 w-2/5 align-bottom">
              <span class="text-xs uppercase tracking-wider text-muted font-semibold">
                Features & Limits
              </span>
            </th>
            <th
              v-for="plan in plans"
              :key="plan.id"
              class="p-5 text-center align-top w-1/5 min-w-[160px]"
            >
              <div class="flex flex-col items-center gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-base font-bold text-highlighted">
                    {{ plan.name }}
                  </span>
                  <UBadge
                    v-if="currentPlanId === plan.id"
                    size="xs"
                    color="primary"
                    variant="subtle"
                  >
                    Current
                  </UBadge>
                </div>

                <div class="text-lg font-bold text-highlighted">
                  {{ plan.price }}
                  <span v-if="plan.period" class="text-xs font-normal text-muted">
                    /{{ plan.period }}
                  </span>
                </div>

                <p v-if="plan.description" class="text-xs text-muted line-clamp-1">
                  {{ plan.description }}
                </p>

                <UButton
                  class="mt-2 w-full max-w-[140px]"
                  size="xs"
                  :variant="currentPlanId === plan.id ? 'outline' : 'solid'"
                  :color="currentPlanId === plan.id ? 'neutral' : 'primary'"
                  :disabled="currentPlanId === plan.id || loadingPlanId === plan.id"
                  :loading="loadingPlanId === plan.id"
                  @click="emit('select', plan)"
                >
                  {{ currentPlanId === plan.id ? "Current Plan" : "Select Plan" }}
                </UButton>
              </div>
            </th>
          </tr>
        </thead>

        <!-- Body: Feature Rows -->
        <tbody class="divide-y divide-default text-sm">
          <tr
            v-for="featureName in featureNames"
            :key="featureName"
            class="hover:bg-elevated/40 transition-colors"
          >
            <!-- Feature Name -->
            <td class="py-3.5 px-5 align-middle">
              <div class="font-medium text-highlighted text-sm">
                {{ featureName }}
              </div>
            </td>

            <!-- Plan Values -->
            <td
              v-for="plan in plans"
              :key="plan.id + '-' + featureName"
              class="py-3.5 px-4 text-center align-middle"
            >
              <template v-if="getPlanFeatureValue(plan, featureName) === 'true'">
                <UIcon
                  name="i-lucide-check"
                  class="size-4 text-primary inline-block"
                />
              </template>
              <template
                v-else-if="
                  getPlanFeatureValue(plan, featureName) === 'false' ||
                  getPlanFeatureValue(plan, featureName) === '—'
                "
              >
                <span class="text-muted font-normal select-none">—</span>
              </template>
              <template v-else>
                <span class="text-xs sm:text-sm font-medium text-default">
                  {{ getPlanFeatureValue(plan, featureName) }}
                </span>
              </template>
            </td>
          </tr>

          <!-- Fallback when plans have no features or benefits configured -->
          <tr v-if="!featureNames.length">
            <td :colspan="plans.length + 1" class="py-8 text-center text-sm text-muted italic">
              No specific features listed for these plans.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TPlan extends PlanItem">
export interface PlanItem {
  id: string;
  name: string;
  description: string;
  tier: string;
  price: string;
  period: string;
  provider?: string | null;
  providerPriceId?: string | null;
  maxSeats?: number | null;
  limits?: unknown;
  benefits?: Array<{ name?: string }>;
}

interface Props {
  plans: TPlan[];
  currentPlanId?: string;
  loadingPlanId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  plans: () => [],
  currentPlanId: undefined,
  loadingPlanId: undefined,
});

const emit = defineEmits<{
  select: [plan: TPlan];
}>();

interface StoredFeature {
  name?: string;
  label?: string;
  value?: string;
}

// Dynamically extract all unique feature names from the passed plans
const featureNames = computed<string[]>(() => {
  const namesSet = new Set<string>();

  for (const plan of props.plans) {
    // Check maxSeats
    if (plan.maxSeats !== undefined) {
      namesSet.add("Seats");
    }

    // Check plan.limits.features
    const limits =
      plan.limits && typeof plan.limits === "object"
        ? (plan.limits as Record<string, unknown>)
        : null;

    if (limits && Array.isArray(limits.features)) {
      for (const item of limits.features as StoredFeature[]) {
        const name = item.name || item.label;
        if (name && name.trim()) {
          namesSet.add(name.trim());
        }
      }
    }

    // Check plan.benefits
    if (Array.isArray(plan.benefits)) {
      for (const b of plan.benefits) {
        if (b.name && b.name.trim()) {
          namesSet.add(b.name.trim());
        }
      }
    }
  }

  return Array.from(namesSet);
});

// Lookup table of planId -> featureName -> value
const planFeatureMap = computed(() => {
  const map = new Map<string, Map<string, string>>();

  for (const plan of props.plans) {
    const featureValues = new Map<string, string>();

    // Seats
    if (plan.maxSeats !== undefined) {
      featureValues.set(
        "Seats",
        plan.maxSeats ? String(plan.maxSeats) : "Unlimited",
      );
    }

    // Limits features
    const limits =
      plan.limits && typeof plan.limits === "object"
        ? (plan.limits as Record<string, unknown>)
        : null;

    if (limits && Array.isArray(limits.features)) {
      for (const item of limits.features as StoredFeature[]) {
        const name = item.name || item.label;
        if (name && name.trim()) {
          featureValues.set(name.trim(), item.value ?? "true");
        }
      }
    }

    // Benefits
    if (Array.isArray(plan.benefits)) {
      for (const b of plan.benefits) {
        if (b.name && b.name.trim() && !featureValues.has(b.name.trim())) {
          featureValues.set(b.name.trim(), "true");
        }
      }
    }

    map.set(plan.id, featureValues);
  }

  return map;
});

function getPlanFeatureValue(plan: TPlan, featureName: string): string {
  const values = planFeatureMap.value.get(plan.id);
  const val = values?.get(featureName);
  if (val !== undefined && val !== "") return val;
  return "—";
}
</script>
