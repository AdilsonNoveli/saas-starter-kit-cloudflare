<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="{ content: 'max-w-3xl' }"
  >
    <slot />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="grid gap-6 lg:grid-cols-[1fr_16rem]"
        @submit="onSubmit"
      >
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Name" name="name" required>
              <UInput v-model="state.name" class="w-full" placeholder="Pro" />
            </UFormField>

            <UFormField
              label="Tier"
              name="tier"
              required
              help="Free-form, e.g. FREE or PRO."
            >
              <UInput v-model="state.tier" class="w-full" placeholder="PRO" />
            </UFormField>
          </div>

          <UFormField label="Description" name="description" required>
            <UTextarea
              v-model="state.description"
              class="w-full"
              :rows="2"
              placeholder="Everything a growing team needs"
            />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Price" name="price" required>
              <UInput v-model="state.price" class="w-full" placeholder="$29" />
            </UFormField>

            <UFormField label="Period" name="period" required>
              <UInput
                v-model="state.period"
                class="w-full"
                placeholder="month"
              />
            </UFormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Provider" name="provider">
              <UInput
                v-model="state.provider"
                class="w-full"
                placeholder="stripe"
              />
            </UFormField>

            <UFormField label="Provider price ID" name="providerPriceId">
              <UInput
                v-model="state.providerPriceId"
                class="w-full"
                placeholder="price_..."
              />
            </UFormField>
          </div>

          <UFormField
            label="Max seats"
            name="maxSeats"
            help="Leave empty for unlimited."
          >
            <UInput
              v-model.number="state.maxSeats"
              class="w-full"
              type="number"
              min="1"
              placeholder="Unlimited"
            />
          </UFormField>

          <UFormField
            label="Limits"
            name="limits"
            help='Optional JSON object of quotas, e.g. {"projects": 10}.'
          >
            <UTextarea
              v-model="state.limits"
              class="w-full font-mono"
              :rows="3"
              placeholder="{}"
            />
          </UFormField>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium text-muted">Preview</p>
          <PricingCard
            :name="state.name || 'Plan name'"
            :price="state.price || '—'"
            :period="state.period"
            :description="state.description"
            :features="previewFeatures"
          />
        </div>

        <div class="flex justify-end gap-2 lg:col-span-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="isEdit ? 'Save changes' : 'Create plan'"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";
import type { RouterOutput } from "~~/server/trpc/routers";

type Plan = RouterOutput["admin"]["plans"]["listPlans"][number];

/**
 * One component for both mutations: with a `plan` it edits that plan, without
 * one it creates a new one. Two components would mean two copies of the same
 * nine fields and the same JSON handling.
 *
 * Usable two ways, like the Companies modals: pass a trigger through the
 * default slot (the "New plan" button), or drive `v-model:open` from outside
 * (the table's dropdown item, which cannot wrap this component).
 */
const props = defineProps<{ plan?: Plan | null }>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ success: [] }>();

const toast = useToast();
const client = useTrpcClient();

const isEdit = computed(() => Boolean(props.plan));
const title = computed(() =>
  props.plan ? `Edit ${props.plan.name}` : "New plan",
);
const description = computed(() =>
  props.plan
    ? "Changes apply to every team already on this plan."
    : "Create a plan tenants can subscribe to.",
);

/**
 * Parses the `limits` textarea. Shared by the validation rule and the submit
 * handler so "valid JSON" means exactly one thing; throws on anything the
 * column cannot hold, and returns `null` for empty (the column is nullable).
 */
function parseLimits(raw: string): Record<string, unknown> | null {
  if (!raw.trim()) return null;

  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Limits must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

// Mirrors `planFieldsSchema` in `server/trpc/routers/admin/plans.ts` — the
// backend stays the authority, this only keeps the user from round-tripping to
// learn that a field is required.
const schema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  description: z.string().trim().min(1, "Required").max(500),
  tier: z.string().trim().min(1, "Required").max(50),
  price: z.string().trim().min(1, "Required").max(50),
  period: z.string().trim().min(1, "Required").max(50),
  provider: z.string().trim().max(50),
  providerPriceId: z.string().trim().max(200),
  // `UInput type="number"` yields a number, but leaves an emptied field as the
  // string `""` — which is how the form spells "unlimited" before it becomes
  // `null` on the way out. The union stays wide (`string | number`) rather
  // than `"" | number` so `UInput` can infer a model type from it.
  maxSeats: z
    .union([z.string(), z.number()])
    .refine(
      (value) =>
        value === "" ||
        (typeof value === "number" && Number.isInteger(value) && value > 0),
      "Leave empty for unlimited, or enter a whole number above zero",
    ),
  limits: z.string().refine((value) => {
    try {
      parseLimits(value);
      return true;
    } catch {
      return false;
    }
  }, "Must be a JSON object, or empty"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  description: "",
  tier: "",
  price: "",
  period: "",
  provider: "",
  providerPriceId: "",
  maxSeats: "",
  limits: "",
});

const loading = ref(false);

function reset() {
  const plan = props.plan;
  state.name = plan?.name ?? "";
  state.description = plan?.description ?? "";
  state.tier = plan?.tier ?? "";
  state.price = plan?.price ?? "";
  state.period = plan?.period ?? "";
  state.provider = plan?.provider ?? "";
  state.providerPriceId = plan?.providerPriceId ?? "";
  state.maxSeats = plan?.maxSeats ?? "";
  state.limits = plan?.limits ? JSON.stringify(plan.limits, null, 2) : "";
}

// Reseeding on open (rather than once on mount) is what lets the table keep a
// single edit instance alive while swapping which plan it points at.
watch(open, (isOpen) => {
  if (isOpen) reset();
});

/**
 * There is no structured benefits column yet, so the preview shows only what
 * the form actually holds — inventing a feature list here would put text on
 * the card that no plan can ever store.
 */
const previewFeatures = computed(() => [
  {
    text:
      typeof state.maxSeats === "number"
        ? `Up to ${state.maxSeats} seats`
        : "Unlimited seats",
    included: true,
  },
  { text: `${state.tier || "Custom"} tier`, included: true },
]);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const data = event.data;
  const fields = {
    name: data.name,
    description: data.description,
    tier: data.tier,
    price: data.price,
    period: data.period,
    provider: data.provider || null,
    providerPriceId: data.providerPriceId || null,
    maxSeats: typeof data.maxSeats === "number" ? data.maxSeats : null,
    limits: parseLimits(data.limits),
  };

  loading.value = true;
  try {
    const plan = props.plan;
    if (plan) {
      await client.admin.plans.updatePlan.mutate({ id: plan.id, ...fields });
    } else {
      await client.admin.plans.createPlan.mutate(fields);
    }

    open.value = false;
    toast.add({
      title: plan ? "Plan updated" : "Plan created",
      description: `${fields.name} was saved.`,
      color: "success",
      icon: "i-lucide-check",
    });
    // The caller owns the data, so it owns the refetch.
    emit("success");
  } catch (error) {
    toast.add({
      title: props.plan ? "Failed to update plan" : "Failed to create plan",
      description:
        error instanceof Error ? error.message : "Something went wrong",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    loading.value = false;
  }
}
</script>
