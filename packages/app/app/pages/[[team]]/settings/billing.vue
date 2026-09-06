<template>
  <main class="w-full px-2 lg:px-0">
    <div class="container mx-auto max-w-4xl">
      <div class="flex justify-between items-center py-6">
        <div class="text-2xl font-medium flex items-center gap-3">
          Billing
          <UButton
            v-if="status !== 'pending'"
            icon="i-lucide-refresh-cw"
            variant="solid"
            square
            color="neutral"
            @click="() => refresh()"
          />
        </div>
      </div>

      <LoaderSpin v-if="status === 'pending'" height="h-64" />

      <div v-else-if="error" class="text-center text-error p-8">
        <p>{{ error?.message || "Something went wrong." }}</p>
        <UButton class="mt-4" @click="retry">Retry</UButton>
      </div>

      <div v-else class="space-y-6">
        <!-- Current Plan Section -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <span>Current Plan</span>
              <UBadge
                v-if="subscriptionStatus"
                :color="getStatusColor(subscriptionStatus)"
                size="sm"
              >
                {{ subscriptionStatus }}
              </UBadge>
            </div>
          </template>
          <div class="flex items-center justify-between p-4">
            <div>
              <h3 class="text-lg font-semibold flex items-center gap-2">
                {{ currentPlan?.name || "No Active Plan" }}
              </h3>
              <p class="text-muted">
                {{
                  currentPlan
                    ? currentPlan.description
                    : "You are not subscribed to any plan"
                }}
              </p>
              <p v-if="nextPaymentDate" class="text-sm text-muted mt-1">
                Next payment: {{ formatDate(nextPaymentDate) }}
              </p>
              <p v-else-if="endsOnDate" class="text-sm text-muted mt-1">
                Ends on: {{ formatDate(endsOnDate) }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span class="text-xl font-bold">
                {{ currentPlan?.price || "0" }}/{{
                  currentPlan?.period || "month"
                }}
              </span>
              <div
                v-if="
                  billingData?.subscription &&
                  billingData.subscription.billingPortalLinks
                "
                class="flex gap-2"
              >
                <UButton
                  size="xs"
                  target="_blank"
                  :to="
                    billingData.subscription.billingPortalLinks
                      .updateSubscriptionPaymentMethod
                  "
                >
                  Manage Billing
                </UButton>
                <UButton
                  v-if="canCancel"
                  size="xs"
                  target="_blank"
                  color="error"
                  variant="outline"
                  :to="
                    billingData.subscription.billingPortalLinks
                      .cancelSubscription
                  "
                >
                  Cancel Subscription
                </UButton>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Pricing Plans Section -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <span>Update Your Plan</span>
              <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-2">
                  <span class="text-sm">Monthly</span>
                  <USwitch v-model="isPeriodYearly" />
                  <span class="text-sm">Yearly</span>
                </div>
              </div>
            </div>
          </template>
          <div class="grid md:grid-cols-3 gap-4 p-4">
            <PricingCard
              v-for="plan in plans"
              :key="plan.id"
              :name="plan.name"
              :price="plan.price.toString()"
              :description="plan.description"
              :features="
                plan.benefits.map((benefit) => ({
                  text: benefit.toString(),
                  included: true,
                }))
              "
              :period="plan.period"
              :is-current="currentPlan?.id === plan.id"
              :button-text="
                currentPlan?.id === plan.id ? 'Current Plan' : 'Select Plan'
              "
              :on-click="() => openCheckout(plan)"
            />
          </div>
        </UCard>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { RouterOutput } from "~~/server/trpc/routers";

const { init: initPaymentsPaddle, checkout: checkoutPaddle } =
  usePayments("PADDLE") || {};
const { checkout: checkoutStripe } = usePayments("STRIPE") || {};

onMounted(() => {
  initPaymentsPaddle?.();
});

const isPeriodYearly = ref(false);
const team = useCurrentTeam();
const route = useRoute();

const {
  data: billingData,
  error,
  status,
  refresh,
} = await useTrpcClient().billing.getBillingInfo.useQuery({
  teamIdentifier: team.value?.slug || "",
  returnUrl: route.fullPath,
});

const currentPlan = computed(() => billingData.value?.currentPlan);
const plans = computed(() =>
  billingData.value?.availablePlans.filter((plan) =>
    isPeriodYearly.value ? plan.period === "year" : plan.period !== "year",
  ),
);
const subscriptionStatus = computed(
  () => billingData.value?.subscription?.status,
);
const nextPaymentDate = computed(
  () => billingData.value?.subscription?.nextPaymentDate,
);
const endsOnDate = computed(
  () => billingData.value?.subscription?.currentPeriodEnd,
);
const canCancel = computed(
  () =>
    subscriptionStatus.value !== "CANCELED" &&
    (billingData.value?.subscription?.nextPaymentDate || !endsOnDate.value),
);

function retry() {
  refresh();
}

function getStatusColor(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "CANCELED":
      return "error";
    case "PAST_DUE":
      return "warning";
    default:
      return "neutral";
  }
}

// Format date for display
function formatDate(date?: Date | string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function openCheckout(
  plan: RouterOutput["billing"]["getBillingInfo"]["availablePlans"][0],
) {
  if (plan.providerPriceId) {
    if (plan?.provider === "PADDLE") {
      if (checkoutPaddle) {
        await checkoutPaddle([{ priceId: plan.providerPriceId }], {
          data: { team_id: team.value?.id },
        });
      }
    } else if (plan?.provider === "STRIPE") {
      if (checkoutStripe) {
        const sessionUrl = (await checkoutStripe(
          plan?.providerPriceId,
          team.value?.id || "",
        )) as string;
        navigateTo(sessionUrl, { external: true });
      }
    }
  }
}
</script>
