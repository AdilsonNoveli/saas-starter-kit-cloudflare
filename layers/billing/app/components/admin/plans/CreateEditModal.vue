<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="!loading"
    :close="!loading"
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
        <!--
          Native fieldset, not a library prop: guaranteed to disable every
          descendant control regardless of Nuxt UI's own API surface, and
          `display: contents` keeps it out of the two-column grid so it can't
          change the layout. Creating/editing a Stripe-managed plan now makes
          a real Stripe API call (1-3s); without this, an operator could keep
          editing fields — or hit Cancel — while that call is still in
          flight, losing track of whether it landed.
        -->
        <fieldset :disabled="loading" class="contents">
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
              <UFormField
                label="Provider"
                name="provider"
                help="Leave empty for a free plan."
              >
                <USelect
                  v-model="state.provider"
                  :items="providerOptions"
                  class="w-full"
                  placeholder="Select a provider"
                />
              </UFormField>

              <UFormField
                label="Period"
                name="period"
                required
                help="Billing interval for the toggle on the billing page."
              >
                <USelect
                  v-model="state.period"
                  :items="periodOptions"
                  class="w-full"
                  placeholder="Select a period"
                />
              </UFormField>
            </div>

            <!--
            Stripe-managed pricing: the operator gives an amount and currency
            instead of pasting a price ID copied from the Stripe Dashboard.
            The backend creates/updates the Product+Price and derives the
            display "Price" string from these two, so that string can never
            show a different number than what Stripe actually charges.
          -->
            <div v-if="isStripeProvider" class="grid gap-4 sm:grid-cols-2">
              <UFormField
                label="Amount"
                name="amount"
                required
                help="Charged in the currency selected, e.g. 179.90."
              >
                <UInput
                  v-model.number="state.amount"
                  class="w-full"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="179.00"
                />
              </UFormField>

              <UFormField label="Currency" name="currency" required>
                <USelect
                  v-model="state.currency"
                  :items="currencyOptions"
                  class="w-full"
                  placeholder="Select a currency"
                />
              </UFormField>

              <p
                v-if="props.plan?.providerPriceId"
                class="text-xs text-muted sm:col-span-2"
              >
                Stripe Price: <code>{{ props.plan.providerPriceId }}</code>
                — changing the amount, currency or period creates a new Price
                and archives this one.
              </p>
            </div>

            <div v-else class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Price" name="price" required>
                <UInput
                  v-model="state.price"
                  class="w-full"
                  placeholder="$29"
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

            <!-- Features & limits -->
            <div class="space-y-3 pt-4 border-t border-default">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-semibold text-highlighted">
                    Features & Limits
                  </h4>
                  <p class="text-xs text-muted">
                    Extra fields and quotas displayed in the comparison table.
                  </p>
                </div>
                <UButton
                  size="xs"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-plus"
                  label="Add feature"
                  type="button"
                  @click="addFeature"
                />
              </div>

              <div v-if="features.length" class="space-y-2 max-h-64 overflow-y-auto pr-1">
                <div
                  v-for="(feat, idx) in features"
                  :key="idx"
                  class="flex items-center gap-2 p-2 rounded-md border border-default bg-elevated/50"
                >
                  <UInput
                    v-model="feat.name"
                    placeholder="Feature name (e.g. WhatsApp numbers, Storage)"
                    class="flex-1"
                    size="sm"
                  />
                  <UInput
                    v-model="feat.value"
                    placeholder="Value (e.g. 5, Unlimited, true)"
                    class="w-36 sm:w-44"
                    size="sm"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    type="button"
                    title="Remove feature"
                    @click="removeFeature(idx)"
                  />
                </div>
              </div>
              <p v-else class="text-xs text-muted italic">
                No custom features added. Click "Add feature" to configure extra fields for this plan.
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-muted">Preview</p>
            <PricingCard
              :name="state.name || 'Plan name'"
              :price="previewPrice"
              :period="state.period"
              :description="state.description"
              :features="previewFeatures"
            />
          </div>
        </fieldset>

        <div class="flex justify-end gap-2 lg:col-span-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
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
import {
  PaymentProvider,
  PLAN_BILLING_INTERVALS,
  STRIPE_PLAN_CURRENCIES,
} from "@nuxfire/layer-billing/shared/types/enums";

type Plan = RouterOutput["admin"]["plans"]["listPlans"][number];

interface CustomFeature {
  name: string;
  value: string;
}

/**
 * Only the providers with a working checkout path. This used to be a free-text
 * field whose placeholder read "stripe", and a plan saved in lower case matched
 * nothing in the billing page — its buy button silently did nothing.
 */
const providerOptions = [PaymentProvider.STRIPE, PaymentProvider.PADDLE];
// USelect wants a mutable array; the source constants are readonly tuples.
const periodOptions = [...PLAN_BILLING_INTERVALS];
const currencyOptions = [...STRIPE_PLAN_CURRENCIES];

type ProviderOption = (typeof providerOptions)[number];

/**
 * Normalises a stored provider onto the closed set. Rows written while the
 * column was free text can hold anything, so an unrecognised value leaves the
 * select unset rather than seeding an option it does not offer.
 */
function toProviderOption(
  value: string | null | undefined,
): ProviderOption | undefined {
  const normalised = value?.trim().toUpperCase();
  return providerOptions.find((option) => option === normalised);
}

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

const notification = useNotification();
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

// Dynamic extra features & limits state
const features = ref<CustomFeature[]>([]);

function addFeature() {
  features.value.push({
    name: "",
    value: "true",
  });
}

function removeFeature(index: number) {
  features.value.splice(index, 1);
}

// Mirrors `planFieldsSchema` in `server/trpc/routers/admin/plans.ts` — the
// backend stays the authority, this only keeps the user from round-tripping to
// learn that a field is required. `price`/`amount`+`currency` are required
// only conditionally on `provider`, which is why that check lives in
// `superRefine` instead of on the fields themselves — same reason the server
// schema keeps it out of `planFieldsSchema` proper.
const schema = z
  .object({
    name: z.string().trim().min(1, "Required").max(100),
    description: z.string().trim().min(1, "Required").max(500),
    tier: z.string().trim().min(1, "Required").max(50),
    price: z.string().trim().max(50),
    period: z.enum(PLAN_BILLING_INTERVALS, {
      message: "Required",
    }),
    // Unset is `undefined`, matching both the nullable column and how USelect
    // represents an empty selection.
    provider: z
      .enum([PaymentProvider.STRIPE, PaymentProvider.PADDLE])
      .optional(),
    providerPriceId: z.string().trim().max(200),
    // `UInput type="number"` yields a number, but leaves an emptied field as
    // the string `""` — same idiom as `maxSeats` below.
    amount: z.union([z.string(), z.number()]),
    currency: z.enum(STRIPE_PLAN_CURRENCIES).optional(),
    maxSeats: z
      .union([z.string(), z.number()])
      .refine(
        (value) =>
          value === "" ||
          (typeof value === "number" && Number.isInteger(value) && value > 0),
        "Leave empty for unlimited, or enter a whole number above zero",
      ),
  })
  .superRefine((data, ctx) => {
    if (data.provider === PaymentProvider.STRIPE) {
      if (typeof data.amount !== "number" || data.amount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Required for a Stripe-managed plan",
        });
      }
      if (!data.currency) {
        ctx.addIssue({
          code: "custom",
          path: ["currency"],
          message: "Required for a Stripe-managed plan",
        });
      }
    } else if (!data.price.trim()) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Required" });
    }
  });

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  description: "",
  tier: "",
  price: "",
  period: "month",
  provider: undefined,
  providerPriceId: "",
  amount: "",
  currency: undefined,
  maxSeats: "",
});

const isStripeProvider = computed(
  () => state.provider === PaymentProvider.STRIPE,
);

// The preview needs a live number as amount/currency change, unlike the
// saved `price` string which only reflects what the last submit resolved to.
const previewPrice = computed(() => {
  if (
    isStripeProvider.value &&
    typeof state.amount === "number" &&
    state.currency
  ) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: state.currency.toUpperCase(),
    }).format(state.amount);
  }
  return state.price || "—";
});

const loading = ref(false);

function reset() {
  const plan = props.plan;
  state.name = plan?.name ?? "";
  state.description = plan?.description ?? "";
  state.tier = plan?.tier ?? "";
  state.price = plan?.price ?? "";
  state.period =
    plan?.period === "year" || plan?.period === "month" ? plan.period : "month";
  state.provider = toProviderOption(plan?.provider);
  state.providerPriceId = plan?.providerPriceId ?? "";
  state.amount = plan?.unitAmount != null ? plan.unitAmount / 100 : "";
  state.currency = STRIPE_PLAN_CURRENCIES.find((c) => c === plan?.currency);
  state.maxSeats = plan?.maxSeats ?? "";

  const limits = plan?.limits as Record<string, unknown> | null;
  if (limits && Array.isArray(limits.features)) {
    features.value = (
      limits.features as Array<{ name?: string; label?: string; value?: string }>
    ).map((f) => ({
      name: f.name || f.label || "",
      value: f.value || "true",
    }));
  } else {
    features.value = [];
  }
}

// Reseeding on open (rather than once on mount) is what lets the table keep a
// single edit instance alive while swapping which plan it points at.
watch(
  open,
  (isOpen) => {
    if (isOpen) reset();
  },
  { immediate: true },
);

const previewFeatures = computed(() => {
  const base = [
    {
      text:
        typeof state.maxSeats === "number"
          ? `Up to ${state.maxSeats} seats`
          : "Unlimited seats",
      included: true,
    },
    { text: `${state.tier || "Custom"} tier`, included: true },
  ];

  const extra = features.value
    .filter((f) => f.name.trim() && f.value !== "false")
    .slice(0, 3)
    .map((f) => ({
      text: `${f.name}: ${f.value === "true" ? "Included" : f.value}`,
      included: true,
    }));

  return [...base, ...extra];
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const data = event.data;
  const stripeManaged = data.provider === PaymentProvider.STRIPE;
  const existingLimits = (props.plan?.limits as Record<string, unknown> | null) ?? {};

  const fields = {
    name: data.name,
    description: data.description,
    tier: data.tier,
    price: data.price,
    period: data.period,
    provider: data.provider ?? null,
    // Auto-managed once the plan is Stripe-backed: whatever a stale text
    // input might have held before switching providers must not overwrite
    // what the backend resolves.
    providerPriceId: stripeManaged ? null : data.providerPriceId || null,
    amount:
      stripeManaged && typeof data.amount === "number" ? data.amount : null,
    currency: stripeManaged ? (data.currency ?? null) : null,
    maxSeats: typeof data.maxSeats === "number" ? data.maxSeats : null,
    limits: {
      ...existingLimits,
      features: features.value.filter((f) => Boolean(f.name.trim())),
    },
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
    notification.success(
      plan ? "Plan updated" : "Plan created",
      `${fields.name} was saved.`,
    );
    // The caller owns the data, so it owns the refetch.
    emit("success");
  } catch (error) {
    notification.error(
      props.plan ? "Failed to update plan" : "Failed to create plan",
      error instanceof Error ? error.message : "Something went wrong",
    );
  } finally {
    loading.value = false;
  }
}
</script>
