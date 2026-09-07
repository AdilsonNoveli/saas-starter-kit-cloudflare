<template>
  <AuthLayout
    :title="state === 'code' ? 'Verify your email' : 'Create your account'"
    :subtitle="
      state === 'code'
        ? 'Enter the 6-digit verification code sent to your inbox'
        : 'Get started with NuxFire in just a few minutes'
    "
  >
    <!-- Status Alerts -->
    <UAlert
      v-if="errorMessage"
      icon="i-lucide-circle-alert"
      color="error"
      variant="subtle"
      title="Registration Error"
      :description="errorMessage"
    />

    <UAlert
      v-else-if="confirmUser"
      icon="i-lucide-mail-check"
      color="success"
      variant="subtle"
      title="Confirmation Sent"
      :description="`A confirmation link was sent to ${confirmUser}. Please check your email to complete registration.`"
    />

    <!--
      loading-auto must stay off: with it on (the @nuxt/ui v4 default),
      UForm disables input fields before native form.submit() runs,
      silently omitting them from the POST body and causing authentication errors.
    -->
    <UForm
      class="space-y-4"
      :schema="state === 'code' ? verifySchema : registerSchema"
      :state="data"
      :validate-on="[]"
      :loading-auto="false"
      @submit="signUp($event)"
    >
      <input
        type="hidden"
        name="action"
        :value="state === 'code' ? 'verify' : 'register'"
      />

      <!-- Verification Code State -->
      <template v-if="state === 'code'">
        <UFormField
          label="Verification Code"
          name="code"
          required
          description="Enter the one-time code sent to your email"
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

      <!-- Standard Registration Fields -->
      <template v-else>
        <UFormField label="Work Email" name="email" required>
          <UInput
            v-model="data.email"
            name="email"
            type="email"
            icon="i-lucide-mail"
            placeholder="name@company.com"
            size="lg"
            class="w-full"
            autocomplete="email"
            autofocus
          />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
          required
          description="Must be at least 8 characters"
        >
          <UInput
            v-model="data.password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            icon="i-lucide-lock"
            placeholder="Create a strong password"
            size="lg"
            class="w-full"
            autocomplete="new-password"
          >
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                class="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                tabindex="-1"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField label="Confirm Password" name="repeat" required>
          <UInput
            v-model="data.repeat"
            name="repeat"
            :type="showRepeatPassword ? 'text' : 'password'"
            icon="i-lucide-shield-check"
            placeholder="Confirm your password"
            size="lg"
            class="w-full"
            autocomplete="new-password"
          >
            <template #trailing>
              <UButton
                :icon="showRepeatPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="showRepeatPassword ? 'Hide password' : 'Show password'"
                class="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                tabindex="-1"
                @click="showRepeatPassword = !showRepeatPassword"
              />
            </template>
          </UInput>
        </UFormField>
      </template>

      <UButton
        type="submit"
        color="primary"
        size="lg"
        block
        :loading="loading"
        class="font-semibold shadow-lg shadow-primary-500/20 cursor-pointer mt-2"
        trailing-icon="i-lucide-arrow-right"
      >
        {{ state === "code" ? "Verify Email" : "Create Account" }}
      </UButton>
    </UForm>

    <!-- Social Sign Up & Agreement -->
    <template v-if="state !== 'code'">
      <template v-if="githubAuthEnabled || googleAuthEnabled">
        <div class="relative py-1">
          <USeparator label="Or register with" class="text-xs text-zinc-500 uppercase tracking-wider" />
        </div>
        <AuthSocialLogin :sign-up="true" />
      </template>

      <AuthAgreement />
    </template>

    <!-- Card Footer -->
    <template #footer>
      <p class="text-sm text-zinc-400">
        Already have an account?
        <NuxtLink
          :to="`${origin}/password/authorize`"
          external
          class="text-primary-500 hover:text-primary-400 font-medium transition-colors underline underline-offset-4 ml-1"
        >
          Sign in
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { z } from "zod";

type SignupError =
  | "invalid_email"
  | "invalid_code"
  | "email_taken"
  | "invalid_password"
  | null;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  invalid_code: "The verification code is invalid or has expired.",
  email_taken: "An account with this email address already exists.",
  invalid_password: "Password must be at least 8 characters long.",
};

const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    repeat: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((val) => val.password === val.repeat, {
    message: "Passwords do not match",
    path: ["repeat"],
  });

const verifySchema = z.object({
  code: z.string().min(1, "Verification code is required"),
});

const route = useRoute();
const notification = useNotification();

const origin = import.meta.dev ? route.query.origin?.toString() || "" : "";
const state = route.query.state?.toString();
const err = (route.query.err?.toString() || null) as SignupError;

const {
  public: { githubAuthEnabled, googleAuthEnabled },
} = useRuntimeConfig();

const data = reactive({
  email: "",
  password: "",
  repeat: "",
  code: "",
});

const loading = ref(false);
const showPassword = ref(false);
const showRepeatPassword = ref(false);
const confirmUser = ref<string | null>(null);

const errorMessage = ref(
  err ? (ERROR_MESSAGES[err] ?? "An unexpected error occurred.") : "",
);

onMounted(() => {
  if (err && ERROR_MESSAGES[err]) {
    notification.error("Registration Error", ERROR_MESSAGES[err]);
  }
});

const signUp = (e: Event) => {
  loading.value = true;
  const form = e.target as HTMLFormElement;
  const action = origin + "/password/register";
  form.setAttribute("action", action);
  form.setAttribute("method", "POST");
  form.submit();
};
</script>
