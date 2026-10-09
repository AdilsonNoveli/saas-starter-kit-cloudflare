<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <template v-if="status === 'pending'">
        <div class="flex justify-center py-6">
          <UIcon name="i-ph-circle-notch-duotone" class="animate-spin size-6" />
        </div>
      </template>

      <template v-else-if="!purchase || purchase.ineligibleReason === 'not_confirmed'">
        <UAlert
          icon="i-ph-x-circle-duotone"
          variant="subtle"
          color="error"
          :title="t('billing.claim.notFound.title')"
          :description="t('billing.claim.notFound.description')"
        />
      </template>

      <template v-else-if="purchase.ineligibleReason === 'expired'">
        <UAlert
          icon="i-ph-clock-duotone"
          variant="subtle"
          color="warning"
          :title="t('billing.claim.expired.title')"
          :description="t('billing.claim.expired.description')"
        />
      </template>

      <template v-else-if="purchase.ineligibleReason === 'rejected'">
        <UAlert
          icon="i-ph-warning-circle-duotone"
          variant="subtle"
          color="error"
          :title="t('billing.claim.rejected.title')"
          :description="t('billing.claim.rejected.description')"
        />
      </template>

      <template v-else-if="purchase.ineligibleReason === 'already_claimed'">
        <UAlert
          icon="i-ph-check-circle-duotone"
          variant="subtle"
          color="neutral"
          :title="t('billing.claim.alreadyClaimed.title')"
          :description="t('billing.claim.alreadyClaimed.description')"
        />
      </template>

      <template v-else>
        <div class="space-y-1 mb-6">
          <h1 class="text-xl font-semibold">{{ t("billing.claim.title", { plan: purchase.planName }) }}</h1>
          <p v-if="purchase.destination" class="text-muted text-sm">
            {{ t(`billing.claim.destination.${purchase.destination.kind}`, destinationParams(purchase.destination)) }}
          </p>
        </div>

        <UAlert
          v-if="errorMessage"
          class="mb-4"
          icon="i-ph-warning-circle-duotone"
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
import { z } from "zod/v4";
import { slugify, validateSlug } from "@nuxfire/layer-teams/shared/utils/slug";

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
  // The one slug rule (layers/teams/shared/utils/slug.ts), worded by the
  // error catalog (`errors.slug_*`, auto-imported `translateErrorCode`).
  teamSlug: z.string().superRefine((slug, ctx) => {
    const result = validateSlug(slug);
    if (result !== "ok") ctx.addIssue({ code: "custom", message: translateErrorCode(result, t) });
  }),
});
const form = reactive({ teamName: "", teamSlug: "" });
const isSlugUserEdited = ref(false);
const claiming = ref(false);
const errorMessage = ref("");

function onNameInput() {
  if (isSlugUserEdited.value) return;
  form.teamSlug = slugify(form.teamName);
}

type Destination = NonNullable<NonNullable<typeof purchase.value>["destination"]>;

/** The named parameter of `billing.claim.destination.existing_space`; the other two take none. */
function destinationParams(destination: Destination) {
  return destination.kind === "existing_space" ? { name: destination.name } : {};
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
    // A stable code (`slug_taken`...) becomes its message; anything else,
    // including the server's English text, the generic one.
    errorMessage.value = translateErrorCode(getErrorMessage(error), t);
    notification.error(t("billing.claim.genericError"), errorMessage.value);
  } finally {
    claiming.value = false;
  }
}
</script>
