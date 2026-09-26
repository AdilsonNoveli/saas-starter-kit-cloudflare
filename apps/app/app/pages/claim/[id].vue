<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <template v-if="status === 'pending'">
        <div class="flex justify-center py-6">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-6" />
        </div>
      </template>

      <template v-else-if="!purchase || purchase.ineligibleReason === 'not_confirmed'">
        <UAlert
          icon="i-lucide-circle-x"
          variant="subtle"
          color="error"
          :title="t('billing.claim.notFound.title')"
          :description="t('billing.claim.notFound.description')"
        />
      </template>

      <template v-else-if="purchase.ineligibleReason === 'expired'">
        <UAlert
          icon="i-lucide-clock-alert"
          variant="subtle"
          color="warning"
          :title="t('billing.claim.expired.title')"
          :description="t('billing.claim.expired.description')"
        />
      </template>

      <template v-else-if="purchase.ineligibleReason === 'rejected'">
        <UAlert
          icon="i-lucide-circle-alert"
          variant="subtle"
          color="error"
          :title="t('billing.claim.rejected.title')"
          :description="t('billing.claim.rejected.description')"
        />
      </template>

      <template v-else-if="purchase.ineligibleReason === 'already_claimed'">
        <UAlert
          icon="i-lucide-circle-check"
          variant="subtle"
          color="neutral"
          :title="t('billing.claim.alreadyClaimed.title')"
          :description="t('billing.claim.alreadyClaimed.description')"
        />
      </template>

      <template v-else>
        <div class="space-y-1 mb-6">
          <h1 class="text-xl font-semibold">{{ t("billing.claim.title", { plan: purchase.planName }) }}</h1>
          <p class="text-muted text-sm">
            {{ t("billing.claim.destination", { destination: purchase.destinationSummary }) }}
          </p>
        </div>

        <UAlert
          v-if="errorMessage"
          class="mb-4"
          icon="i-lucide-circle-alert"
          variant="subtle"
          color="error"
          :description="errorMessage"
        />

        <UForm
          v-if="purchase.needsTeamName"
          :schema="schema"
          :state="form"
          :validate-on="['input']"
          @submit="claim"
        >
          <UFormField :label="t('billing.claim.teamNameLabel')" name="teamName" required>
            <UInput v-model="form.teamName" class="w-full" @update:model-value="onNameInput" />
          </UFormField>
          <UFormField :label="t('billing.claim.teamSlugLabel')" name="teamSlug" required class="mt-4">
            <UInput v-model="form.teamSlug" class="w-full" @update:model-value="isSlugUserEdited = true" />
          </UFormField>
          <UButton type="submit" block class="mt-4" :loading="claiming" :label="t('billing.claim.createTeam')" />
        </UForm>

        <UButton v-else block :loading="claiming" :label="t('billing.claim.joinTeam')" @click="claim" />
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";

// Protected on purpose (DEC-002): no `auth: false` here, so a logged-out
// visitor is sent through the existing global auth middleware and back to
// this same URL, instead of the invite page's public-page-plus-silent-
// failure shape (R-003).

const route = useRoute();
const pendingPurchaseId = route.params.id as string;

const client = useTrpcClient();
const { t } = useI18n();
const notification = useNotification();

const { data: purchase, status } = await client.checkout.getPendingPurchase.useQuery(
  () => ({ pendingPurchaseId }),
  { default: () => null },
);

const schema = z.object({
  teamName: z.string().min(2).max(50),
  teamSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});
const form = reactive({ teamName: "", teamSlug: "" });
const isSlugUserEdited = ref(false);
const claiming = ref(false);
const errorMessage = ref("");

function onNameInput() {
  if (isSlugUserEdited.value) return;
  form.teamSlug = form.teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

async function claim() {
  claiming.value = true;
  errorMessage.value = "";
  try {
    const result = await client.checkout.claimPurchase.mutate({
      pendingPurchaseId,
      teamName: purchase.value?.needsTeamName ? form.teamName : undefined,
      teamSlug: purchase.value?.needsTeamName ? form.teamSlug : undefined,
    });
    await useSession().refresh();
    navigateTo(`/${result.teamSlug}/dashboard`);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("billing.claim.genericError");
    notification.error(t("billing.claim.genericError"), errorMessage.value);
  } finally {
    claiming.value = false;
  }
}
</script>
