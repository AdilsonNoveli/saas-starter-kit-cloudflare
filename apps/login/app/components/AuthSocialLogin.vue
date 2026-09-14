<template>
  <div v-if="hasOAuth" class="space-y-3">
    <div
      :class="[
        githubAuthEnabled && googleAuthEnabled
          ? 'grid grid-cols-2 gap-3'
          : 'space-y-2',
      ]"
    >
      <UButton
        v-if="githubAuthEnabled"
        :loading="loadingProvider === 'github'"
        variant="outline"
        color="neutral"
        size="md"
        icon="i-simple-icons-github"
        block
        class="font-medium hover:border-accented transition-colors"
        @click="handleSocialSignIn('github')"
      >
        GitHub
      </UButton>

      <UButton
        v-if="googleAuthEnabled"
        :loading="loadingProvider === 'google'"
        variant="outline"
        color="neutral"
        size="md"
        icon="i-simple-icons-google"
        block
        class="font-medium hover:border-accented transition-colors"
        @click="handleSocialSignIn('google')"
      >
        Google
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  signUp?: boolean;
}>();

const {
  public: { githubAuthEnabled, googleAuthEnabled },
} = useRuntimeConfig();

const hasOAuth = computed(() => Boolean(githubAuthEnabled || googleAuthEnabled));
const loadingProvider = ref<string>("");

const route = useRoute();
const origin = import.meta.dev ? route.query.origin?.toString() || "" : "";

function handleSocialSignIn(provider: "github" | "google") {
  loadingProvider.value = provider;
  window.location.href = `${origin}/${provider}/authorize`;
}
</script>
