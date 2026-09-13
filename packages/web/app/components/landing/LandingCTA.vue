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
      :to="signupUrl"
      size="lg"
      radius="lg"
      trailing-icon="i-lucide-arrow-right"
    >
      {{ cta || "GET STARTED TO COMMUNITY" }}
    </CTAButton>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const signupUrl = computed(() => config.public.appUrl || "/signup");

const { title, description, cta } = defineProps<{
  title?: string;
  description?: string;
  cta?: string;
}>();
</script>
