<template>
  <div v-if="githubAuthEnabled || googleAuthEnabled" class="space-y-2">
    <UButton
      v-if="githubAuthEnabled"
      :loading="loading === 'github'"
      color="neutral"
      :label="`${signUp ? 'Sign Up' : 'Sign In'} with GitHub`"
      icon="i-simple-icons-github"
      block
      @click="signIn('github')"
    />
    <UButton
      v-if="googleAuthEnabled"
      :loading="loading === 'google'"
      color="neutral"
      :label="`${signUp ? 'Sign Up' : 'Sign In'} with Google`"
      icon="i-simple-icons-google"
      block
      @click="signIn('google')"
    />
  </div>
</template>

<script setup lang="ts">
const loading = ref<string>("");
const { signUp } = defineProps<{
  signUp?: boolean;
}>();

// Set from infra/auth.ts at build time, based on whether real credentials
// are actually loaded for that provider — not just whether it's flagged on
// in config.ts. A button for an unconfigured provider would otherwise
// error the moment it's clicked.
const {
  public: { githubAuthEnabled, googleAuthEnabled },
} = useRuntimeConfig();

const origin = import.meta.dev ? useRoute().query.origin?.toString() || "" : "";
async function signIn(provider: string) {
  loading.value = provider;
  window.location.href = `${origin}/${provider}/authorize`;
}
</script>
