<template>
  <div
    class="container mx-auto max-w-4xl flex flex-col gap-4 justify-center items-center py-12"
  >
    <div class="text-center">
      <h1 class="mb-4 text-pretty text-2xl font-bold lg:text-5xl">
        {{ title }}
      </h1>
      <p class="text-muted text-md lg:text-lg">
        {{ description }}
      </p>
    </div>
    <CTAButton to="/docs" size="md" radius="lg">
      {{ cta || "Get Started" }}
    </CTAButton>
  </div>
</template>

<script setup lang="ts">
const { title, description, cta } = defineProps<{
  title?: string;
  description?: string;
  cta?: string;
}>();
</script>
