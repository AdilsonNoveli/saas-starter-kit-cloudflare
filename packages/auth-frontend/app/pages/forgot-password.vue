<template>
  <AuthLayout
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <!-- Status Alerts -->
    <UAlert
      v-if="successMessage"
      icon="i-lucide-circle-check"
      color="success"
      variant="subtle"
      title="Success"
      :description="successMessage"
    />

    <UAlert
      v-if="errorMessage"
      icon="i-lucide-circle-alert"
      color="error"
      variant="subtle"
      title="Error"
      :description="errorMessage"
    />

    <!--
      loading-auto must stay off: with it on (the @nuxt/ui v4 default),
      UForm disables input fields before native form.submit() runs,
      silently omitting them from the POST body and causing authentication errors.
    -->
    <UForm
      class="space-y-4"
      :schema="formSchema"
      :state="data"
      :validate-on="[]"
      :loading-auto="false"
      @submit="handleSubmit"
    >
      <input
        type="hidden"
        name="action"
        :value="
          state === 'code'
            ? 'verify'
            : state === 'update'
              ? 'update'
              : 'code'
        "
      />

      <!-- Step 1: Request code -->
      <template v-if="state === 'start'">
        <UFormField label="Account Email" name="email" required>
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
      </template>

      <!-- Step 2: Verification code -->
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

      <!-- Step 3: New password -->
      <template v-if="state === 'update'">
        <UFormField
          label="New Password"
          name="password"
          required
          description="Must be at least 8 characters"
        >
          <UInput
            v-model="data.password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            icon="i-lucide-lock"
            placeholder="Enter new password"
            size="lg"
            class="w-full"
            autocomplete="new-password"
            autofocus
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

        <UFormField label="Confirm New Password" name="repeat" required>
          <UInput
            v-model="data.repeat"
            name="repeat"
            :type="showRepeatPassword ? 'text' : 'password'"
            icon="i-lucide-shield-check"
            placeholder="Confirm new password"
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
                class="text-night-400 hover:text-night-200 cursor-pointer"
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
        class="font-semibold justify-center text-center cursor-pointer mt-2"
        :ui="{ base: 'justify-center text-center' }"
      >
        <span class="w-full text-center">{{ submitButtonLabel }}</span>
      </UButton>
    </UForm>

    <!-- Resend action in code state -->
    <template v-if="state === 'code'">
      <div class="text-center pt-2">
        <form :action="`${origin}/password/change`" method="POST" class="inline-flex items-center gap-1.5 text-sm text-night-300">
          <input type="hidden" name="action" value="code" />
          <input type="hidden" name="email" :value="data.email" />
          <span>Didn't receive the code?</span>
          <button
            type="submit"
            class="text-flame-400 hover:text-flame-300 font-medium transition-colors underline underline-offset-4 cursor-pointer"
          >
            Resend
          </button>
        </form>
      </div>
    </template>

    <!-- Card Footer -->
    <template #footer>
      <p class="text-sm text-night-300">
        Remember your password?
        <NuxtLink
          :to="`${origin}/password/authorize`"
          external
          class="text-flame-400 hover:text-flame-300 font-medium transition-colors underline underline-offset-4 ml-1"
        >
          Sign in
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { z } from "zod";

type ForgotError =
  | "invalid_email"
  | "invalid_code"
  | "invalid_password"
  | "password_mismatch"
  | null;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Please enter a valid email address.",
  invalid_code: "The verification code is invalid or has expired.",
  invalid_password: "Password must be at least 8 characters long.",
  password_mismatch: "The entered passwords do not match.",
};

const route = useRoute();
const notification = useNotification();

const state = (route.query.state?.toString() || "start") as
  "start" | "code" | "update";

const startSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const codeSchema = z.object({
  code: z.string().min(1, "Verification code is required"),
});

const updateSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    repeat: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((val) => val.password === val.repeat, {
    message: "Passwords do not match",
    path: ["repeat"],
  });

const formSchema = computed(() => {
  switch (state) {
    case "code":
      return codeSchema;
    case "update":
      return updateSchema;
    default:
      return startSchema;
  }
});

const email = route.query.email?.toString() || "";
const data = reactive({
  email,
  code: "",
  password: "",
  repeat: "",
});

const origin = import.meta.dev ? route.query.origin?.toString() || "" : "";
const loading = ref(false);
const showPassword = ref(false);
const showRepeatPassword = ref(false);
const successMessage = ref("");

const err = (route.query.err?.toString() || null) as ForgotError;
const errorMessage = ref(
  err ? (ERROR_MESSAGES[err] ?? "An unexpected error occurred.") : "",
);

onMounted(() => {
  if (err && ERROR_MESSAGES[err]) {
    notification.error("Reset Error", ERROR_MESSAGES[err]);
  }
});

const pageTitle = computed(() => {
  if (state === "code") return "Check your email";
  if (state === "update") return "Create new password";
  return "Reset your password";
});

const pageSubtitle = computed(() => {
  if (state === "code")
    return `Enter the 6-digit verification code sent to ${data.email || "your email"}`;
  if (state === "update") return "Choose a new strong password for your account";
  return "Enter your email to receive a password reset code";
});

const submitButtonLabel = computed(() => {
  if (state === "code") return "Verify Code";
  if (state === "update") return "Update Password";
  return "Send Reset Code";
});

const handleSubmit = (e: Event) => {
  loading.value = true;
  const form = e.target as HTMLFormElement;
  const action = origin + "/password/change";
  form.setAttribute("action", action);
  form.setAttribute("method", "POST");
  form.submit();
};
</script>
