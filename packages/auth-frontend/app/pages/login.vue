<template>
  <AuthLayout
    :title="state === 'code' ? 'Check your email' : 'Welcome back'"
    :subtitle="
      state === 'code'
        ? `We sent a 6-digit verification code to ${email || 'your email'}`
        : 'Sign in to access your account and workspaces'
    "
  >
    <!-- Status Alerts -->
    <UAlert
      v-if="errorMessage"
      icon="i-lucide-circle-alert"
      color="error"
      variant="subtle"
      title="Authentication Failed"
      :description="errorMessage"
    />

    <UAlert
      v-if="state === 'code' && !errorMessage"
      icon="i-lucide-mail-check"
      color="success"
      variant="subtle"
      title="Verification code sent"
      :description="`Please check your inbox at ${email}. The code will expire shortly.`"
    />

    <!--
      loading-auto must stay off: with it on (the @nuxt/ui v4 default),
      UForm disables input fields before native form.submit() runs,
      silently omitting them from the POST body and causing authentication errors.
    -->
    <UForm
      class="space-y-4"
      :schema="state === 'code' ? verifySchema : loginSchema"
      :state="data"
      :validate-on="[]"
      :loading-auto="false"
      @submit="signIn($event)"
    >
      <input
        type="hidden"
        name="action"
        :value="
          state === 'code'
            ? 'verify'
            : data.password
              ? 'authorize'
              : 'request'
        "
      />

      <!-- Verification Code State -->
      <template v-if="state === 'code'">
        <UFormField
          label="Verification Code"
          name="code"
          required
          description="Enter the one-time code sent to your inbox"
        >
          <UInput
            v-model="data.code"
            name="code"
            icon="i-lucide-key-round"
            placeholder="000000"
            size="lg"
            class="w-full font-mono tracking-widest text-center text-lg"
            inputmode="numeric"
            autocomplete="one-time-code"
            autofocus
          />
        </UFormField>
      </template>

      <!-- Standard Email & Password State -->
      <template v-else>
        <UFormField label="Email" name="email" required>
          <UInput
            v-model="data.email"
            name="email"
            type="email"
            icon="i-lucide-mail"
            placeholder="name@company.com"
            size="lg"
            class="w-full"
            autocomplete="email"
            tabindex="1"
            autofocus
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <template #hint>
            <NuxtLink
              :to="`${origin}/password/change`"
              external
              class="text-xs text-primary hover:text-primary/75 font-medium transition-colors"
              tabindex="-1"
            >
              Forgot password?
            </NuxtLink>
          </template>

          <UInput
            v-model="data.password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            icon="i-lucide-lock"
            placeholder="Enter password (optional for code sign-in)"
            size="lg"
            class="w-full"
            autocomplete="current-password"
            tabindex="2"
          >
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                class="text-dimmed hover:text-muted cursor-pointer"
                tabindex="-1"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>
      </template>

      <UButton
        tabindex="3"
        type="submit"
        color="primary"
        size="lg"
        block
        :loading="loading"
        class="font-semibold justify-center text-center cursor-pointer mt-2"
        :ui="{ base: 'justify-center text-center' }"
      >
        <span class="w-full text-center">{{ submitButtonLabel }}</span>
      </UButton>
    </UForm>

    <!-- Social Providers & Legal -->
    <template v-if="state !== 'code'">
      <template v-if="githubAuthEnabled || googleAuthEnabled">
        <div class="relative py-1">
          <USeparator label="Or continue with" class="text-xs text-dimmed uppercase tracking-wider" />
        </div>
        <AuthSocialLogin />
      </template>

      <AuthAgreement />
    </template>

    <!-- Card Footer Links -->
    <template #footer>
      <template v-if="state === 'code'">
        <div class="flex flex-col items-center gap-2 text-sm text-muted">
          <form :action="`${origin}/code/authorize`" method="POST" class="inline-flex items-center gap-1.5">
            <input type="hidden" name="action" value="request" />
            <input type="hidden" name="email" :value="email" />
            <span>Didn't receive a code?</span>
            <button
              type="submit"
              class="text-primary hover:text-primary/75 font-medium transition-colors underline underline-offset-4 cursor-pointer"
            >
              Resend
            </button>
          </form>

          <NuxtLink
            :to="`${origin}/password/authorize`"
            external
            class="text-xs text-dimmed hover:text-muted transition-colors inline-flex items-center gap-1 mt-1"
          >
            <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5" />
            Return to email sign in
          </NuxtLink>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-muted">
          Don't have an account?
          <NuxtLink
            :to="`${origin}/password/register`"
            external
            class="text-primary hover:text-primary/75 font-medium transition-colors underline underline-offset-4 ml-1"
          >
            Create account
          </NuxtLink>
        </p>
      </template>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { z } from "zod";

type LoginError = "invalid_email" | "invalid_password" | "invalid_code" | null;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  invalid_password: "The credentials you provided are incorrect.",
  invalid_code: "The verification code is invalid or has expired.",
};

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
});

const verifySchema = z.object({
  code: z.string().min(1, "Verification code is required"),
});

const route = useRoute();
const notification = useNotification();

const origin = import.meta.dev ? route.query.origin?.toString() || "" : "";
const email = route.query.email?.toString() || "";
const err = (route.query.err?.toString() || null) as LoginError;
const state = route.query.state?.toString() || "";

const {
  public: { githubAuthEnabled, googleAuthEnabled },
} = useRuntimeConfig();

const data = reactive({
  email,
  password: "",
  code: "",
});

const loading = ref(false);
const showPassword = ref(false);

const errorMessage = ref(
  err ? (ERROR_MESSAGES[err] ?? "An unexpected error occurred.") : "",
);

// Trigger toast notification if an error query parameter was provided
onMounted(() => {
  if (err && ERROR_MESSAGES[err]) {
    notification.error("Authentication Error", ERROR_MESSAGES[err]);
  }
});

const submitButtonLabel = computed(() => {
  if (state === "code") return "Verify Code";
  if (data.password) return "Sign In";
  return "Send One-Time Code";
});

const signIn = (e: Event) => {
  loading.value = true;
  const form = e.target as HTMLFormElement;
  const action =
    origin + (data.password ? "/password/authorize" : "/code/authorize");
  form.setAttribute("action", action);
  form.setAttribute("method", "POST");
  form.submit();
};
</script>
