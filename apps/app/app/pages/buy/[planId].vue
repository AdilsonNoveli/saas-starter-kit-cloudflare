<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <template v-if="planStatus === 'pending'">
        <div class="flex justify-center py-6">
          <UIcon name="i-ph-circle-notch-duotone" class="animate-spin size-6" />
        </div>
      </template>

      <template v-else-if="!plan">
        <UAlert
          icon="i-ph-x-circle-duotone"
          variant="subtle"
          color="error"
          :title="t('billing.buy.notFound.title')"
          :description="t('billing.buy.notFound.description')"
        />
      </template>

      <template v-else>
        <div class="space-y-1 mb-6">
          <h1 class="text-xl font-semibold">{{ plan.name }}</h1>
          <p class="text-muted text-sm">{{ plan.description }}</p>
          <p class="text-2xl font-semibold">
            {{ plan.priceLabel }}
            <span class="text-sm font-normal text-muted">/ {{ plan.period }}</span>
          </p>
        </div>

        <UForm :schema="schema" :state="form" :validate-on="['input']" @submit="startCheckout">
          <UFormField :label="t('billing.buy.emailLabel')" name="email" required>
            <UInput
              v-model="form.email"
              type="email"
              :placeholder="t('billing.buy.emailPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="errorMessage"
            class="mt-4"
            icon="i-ph-warning-circle-duotone"
            variant="subtle"
            color="error"
            :description="errorMessage"
          />

          <UButton
            type="submit"
            block
            class="mt-4"
            :loading="submitting"
            :label="t('billing.buy.submit')"
          />
        </UForm>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod/v4";

definePageMeta({ auth: false });

const route = useRoute();
const planId = route.params.planId as string;

const client = useTrpcClient();
const { t } = useI18n();

const { data: plan, status: planStatus } = await client.checkout.getPlanSummary.useQuery(
  () => ({ planId }),
  { default: () => null },
);

const schema = z.object({ email: z.string().email() });
const form = reactive({ email: "" });
const submitting = ref(false);
const errorMessage = ref("");

async function startCheckout() {
  submitting.value = true;
  errorMessage.value = "";
  try {
    const result = await client.checkout.startBuyerCheckout.mutate({
      planId,
      email: form.email,
      redirectUrl: route.fullPath,
    });

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    if (result.paddle) {
      const payments = usePayments("PADDLE");
      await payments?.init();
      await payments?.checkout([{ priceId: result.paddle.priceId }], {
        data: result.paddle.customData,
      });
      return;
    }

    errorMessage.value = t("billing.buy.genericError");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("billing.buy.genericError");
  } finally {
    submitting.value = false;
  }
}
</script>
