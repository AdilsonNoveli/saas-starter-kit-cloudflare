<template>
  <main class="w-full">
    <!-- Breadcrumb & Header -->
    <div class="mb-6 space-y-1">
      <div class="text-xs text-muted flex items-center gap-1.5 mb-2">
        <span>Settings</span>
        <span class="text-dimmed">/</span>
        <span class="text-highlighted font-medium">Billing</span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-highlighted tracking-tight">
            Billing
          </h1>
          <p class="text-sm text-muted mt-0.5">
            Your plan, add-ons, payment methods, and invoices.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <BillingPortalActions
            v-if="billingData?.subscription?.billingPortalLinks"
            :portal-links="billingData.subscription.billingPortalLinks"
            :can-cancel="canCancel"
          />
          <UButton
            v-if="status !== 'pending'"
            icon="i-lucide-refresh-cw"
            variant="ghost"
            square
            size="sm"
            color="neutral"
            title="Refresh"
            @click="() => refresh()"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <LoaderSpin v-if="status === 'pending'" height="h-64" />

    <!-- Error State -->
    <div
      v-else-if="error"
      class="text-center text-error p-8 border border-default rounded-md bg-elevated"
    >
      <p>{{ error?.message || "Something went wrong while loading billing information." }}</p>
      <UButton
        class="mt-4"
        color="neutral"
        variant="outline"
        @click="() => refresh()"
      >
        Try again
      </UButton>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- Plan Section Title + Cycle Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-highlighted">
            Plans
          </h2>
          <p class="text-xs sm:text-sm text-muted mt-0.5">
            Compare plans and manage your subscription.
          </p>
        </div>
        <BillingPeriodToggle v-model="selectedPeriod" />
      </div>

      <!-- Trial / Plan Status Alert Banner -->
      <BillingTrialBanner
        :plan-name="currentPlan?.name"
        :status="subscriptionStatus"
        :ends-on-date="endsOnDate"
        :next-payment-date="nextPaymentDate"
      />

      <!-- Comparison Matrix Table -->
      <BillingComparisonTable
        :plans="plans"
        :current-plan-id="currentPlan?.id"
        :loading-plan-id="loadingPlanId"
        @select="openCheckout"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import type { RouterOutput } from "~~/server/trpc/routers";
import { PaymentProvider } from "~~/types/enums";
import type { BillingPeriod } from "~~/app/components/billing/BillingPeriodToggle.vue";

definePageMeta({
  wide: true,
});

type Plan = RouterOutput["billing"]["getBillingInfo"]["availablePlans"][number];

const { init: initPaymentsPaddle, checkout: checkoutPaddle } =
  usePayments("PADDLE") || {};
const { checkout: checkoutStripe } = usePayments("STRIPE") || {};

const selectedPeriod = ref<BillingPeriod>("month");
const loadingPlanId = ref<string | undefined>(undefined);

const team = useCurrentTeam();
const route = useRoute();
const router = useRouter();
const notification = useNotification();

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
  (billingData.value?.availablePlans ?? []).filter((plan) => {
    // A plan with no price isn't billed monthly or yearly at all — it has no
    // period to match against. Keeping it always visible.
    if (!plan.providerPriceId) return true;

    if (selectedPeriod.value === "year") {
      return plan.period === "year";
    }

    if (selectedPeriod.value === "semester") {
      const hasSemesterPlans = billingData.value?.availablePlans.some(
        (p) => p.period === "semester" || p.period === "semiannual",
      );
      return hasSemesterPlans
        ? plan.period === "semester" || plan.period === "semiannual"
        : plan.period !== "year";
    }

    return plan.period !== "year";
  }),
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

const canCancel = computed<boolean>(
  () =>
    subscriptionStatus.value !== "CANCELED" &&
    Boolean(billingData.value?.subscription?.nextPaymentDate || !endsOnDate.value),
);

onMounted(() => {
  initPaymentsPaddle?.();

  // Checkout redirects back here carrying its outcome. Success only means
  // Stripe accepted the payment — the subscription row arrives moments later by
  // webhook, so the copy promises activation rather than claiming it happened.
  const outcome = route.query.checkout;
  if (!outcome) return;

  if (outcome === "success") {
    notification.success(
      "Payment received",
      "Your plan is being activated, this can take a few seconds.",
    );
    refresh();
  } else if (outcome === "cancelled") {
    notification.info("Checkout cancelled", "You have not been charged.");
  }

  // Dropped from the URL so a reload does not replay the toast.
  const query = { ...route.query };
  delete query.checkout;
  delete query.session_id;
  router.replace({ query });
});

async function openCheckout(plan: Plan) {
  if (!plan.providerPriceId) {
    notification.error(
      "This plan cannot be purchased",
      "It has no price configured for its payment provider.",
    );
    return;
  }

  const provider = plan.provider?.trim().toUpperCase();
  loadingPlanId.value = plan.id;

  try {
    if (provider === PaymentProvider.PADDLE) {
      await checkoutPaddle?.([{ priceId: plan.providerPriceId }], {
        data: { team_id: team.value?.id },
      });
      return;
    }

    if (provider === PaymentProvider.STRIPE) {
      const sessionUrl = await checkoutStripe?.(
        plan.providerPriceId,
        team.value?.id || "",
      );
      if (sessionUrl) {
        await navigateTo(sessionUrl, { external: true });
      }
      return;
    }

    notification.error(
      "Payment provider not supported",
      `"${plan.name}" is set to "${plan.provider || "none"}".`,
    );
  } catch (error) {
    notification.error(
      "Could not open checkout",
      error instanceof Error ? error.message : "Please try again.",
    );
  } finally {
    loadingPlanId.value = undefined;
  }
}
</script>
