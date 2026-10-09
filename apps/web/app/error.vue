<template>
  <NuxtLayout name="page">
    <LayoutSection class="w-full flex flex-col items-center space-y-2">
      <h2 class="font-medium text-4xl">{{ error.statusCode }}</h2>
      <div>
        <span class="text-lg">{{ error.message }}</span>
      </div>
    </LayoutSection>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
const { error } = defineProps<{ error: NuxtError }>();
</script>
