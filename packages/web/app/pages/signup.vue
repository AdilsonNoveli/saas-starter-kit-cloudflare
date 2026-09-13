<template>
  <div class="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
    <div class="p-8 max-w-md w-full rounded-2xl border border-night-800 bg-night-950/80 shadow-2xl">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-highlighted mb-2">Redirecting to Registration</h2>
      <p class="text-sm text-muted mb-4">
        Taking you to the community registration and onboarding dashboard...
      </p>
      <UButton
        v-if="targetUrl"
        :to="targetUrl"
        external
        color="neutral"
        variant="outline"
        size="sm"
        class="text-xs"
      >
        Click here if not redirected automatically
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "page",
  auth: false,
});

useSeoMeta({
  title: "Sign Up - Community Registration",
});

const config = useRuntimeConfig();
const targetUrl = computed(() => config.public.appUrl || "/");

onMounted(() => {
  if (targetUrl.value && targetUrl.value !== "/") {
    window.location.href = targetUrl.value;
  }
});
</script>
