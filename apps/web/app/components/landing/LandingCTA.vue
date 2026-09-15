<template>
  <div
    class="container mx-auto max-w-4xl flex flex-col gap-6 justify-center items-center py-16 lg:py-20 px-4"
  >
    <div class="text-center">
      <h2 class="mb-4 text-pretty text-3xl font-extrabold lg:text-5xl text-highlighted tracking-tight">
        {{ title }}
      </h2>
      <p class="text-muted text-base lg:text-xl max-w-2xl mx-auto leading-relaxed">
        {{ description }}
      </p>
    </div>
    <CTAButton
      :to="to || `${localePath('/')}#pricing`"
      size="lg"
      radius="lg"
      trailing-icon="i-lucide-arrow-right"
    >
      {{ cta || $t("landing.cta.default") }}
    </CTAButton>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath();

const { title, description, cta, to } = defineProps<{
  title?: string;
  description?: string;
  cta?: string;
  to?: string;
}>();
</script>
