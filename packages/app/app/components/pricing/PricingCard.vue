<template>
  <div
    class="relative flex flex-col p-6 bg-elevated rounded-xl border border-default"
    :class="{ 'ring-2 ring-primary': isCurrent || isFeatured }"
  >
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-highlighted">
        {{ name }}
      </h3>
      <p class="mt-2 text-sm text-muted">
        {{ description }}
      </p>
    </div>

    <div class="mb-6">
      <p class="flex items-baseline">
        <span v-if="originalPrice" class="mr-2 text-3xl line-through">{{
          originalPrice
        }}</span>
        <span
          :class="[originalPrice ? 'text-xl' : 'text-3xl']"
          class="font-bold tracking-tight text-highlighted"
          >{{ price }}</span
        >
        <span v-if="period" class="ml-1 text-sm font-semibold text-muted"
          >/{{ period }}</span
        >
      </p>
    </div>

    <ul class="space-y-3 flex-1">
      <li
        v-for="feature in features"
        :key="feature.text"
        class="flex items-start"
      >
        <div class="flex-shrink-0">
          <UIcon
            :name="feature.included ? 'i-lucide-check' : 'i-lucide-x'"
            class="w-5 h-5"
            :class="feature.included ? 'text-primary' : 'text-dimmed'"
          />
        </div>
        <p
          class="ml-3 text-sm"
          :class="feature.included ? 'text-default' : 'text-muted'"
        >
          {{ feature.text }}
        </p>
      </li>
    </ul>

    <UButton
      variant="solid"
      :color="isCurrent || isFeatured ? 'primary' : 'neutral'"
      class="mt-6"
      block
      :disabled="isCurrent"
      @click="emit('select')"
    >
      {{ buttonText }}
    </UButton>

    <div
      v-if="isCurrent || isFeatured"
      class="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-inverted"
    >
      {{ isCurrent ? "Current Plan" : "Popular" }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface PricingFeature {
  text: string;
  included: boolean;
}

interface Props {
  name: string;
  price: string;
  description: string;
  features: PricingFeature[];
  buttonText?: string;
  isCurrent?: boolean;
  isFeatured?: boolean;
  period?: string;
  originalPrice?: string;
}

withDefaults(defineProps<Props>(), {
  buttonText: "Get started",
  isCurrent: false,
  isFeatured: false,
  period: "",
  originalPrice: undefined,
});

// An event rather than an `onClick` prop: the prop was invoked without `await`
// or `catch`, so the async checkout handler behind it could reject and leave
// the button looking inert with the failure buried in the console.
const emit = defineEmits<{ select: [] }>();
</script>
