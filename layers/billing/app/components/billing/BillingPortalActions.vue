<template>
  <div v-if="hasLinks" class="flex items-center gap-2">
    <UButton
      v-if="updateLink"
      size="xs"
      target="_blank"
      color="neutral"
      variant="outline"
      icon="i-ph-arrow-square-out-duotone"
      label="Manage Billing"
      :to="updateLink"
    />
    <UButton
      v-if="canCancel && cancelLink"
      size="xs"
      target="_blank"
      color="error"
      variant="ghost"
      label="Cancel Subscription"
      :to="cancelLink"
    />
  </div>
</template>

<script setup lang="ts">
interface PortalLinksObj {
  updateSubscriptionPaymentMethod?: string;
  cancelSubscription?: string;
}

interface Props {
  portalLinks?: PortalLinksObj | string | null;
  canCancel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  portalLinks: null,
  canCancel: false,
});

const updateLink = computed(() => {
  if (!props.portalLinks) return undefined;
  if (typeof props.portalLinks === "string") return props.portalLinks;
  return props.portalLinks.updateSubscriptionPaymentMethod;
});

const cancelLink = computed(() => {
  if (!props.portalLinks) return undefined;
  if (typeof props.portalLinks === "string") return props.portalLinks;
  return props.portalLinks.cancelSubscription;
});

const hasLinks = computed(() => Boolean(updateLink.value || (props.canCancel && cancelLink.value)));
</script>
