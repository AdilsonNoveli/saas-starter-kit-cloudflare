<template>
  <AuthLayout
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <!-- Status Alerts -->
    <UAlert
      v-if="successMessage"
      icon="i-ph-check-circle-duotone"
      color="success"
      variant="subtle"
      :title="t('auth.forgotPassword.successTitle')"
      :description="successMessage"
    />

    <UAlert
      v-if="errorMessage"
      icon="i-ph-warning-circle-duotone"
      color="error"
      variant="subtle"
      :title="t('auth.forgotPassword.errorTitle')"
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
        <UFormField :label="t('auth.forgotPassword.emailLabel')" name="email" required>
          <UInput
            v-model="data.email"
            name="email"
            type="email"
            icon="i-ph-envelope-duotone"
            :placeholder="t('auth.forgotPassword.emailPlaceholder')"
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
          :label="t('auth.forgotPassword.codeLabel')"
          name="code"
          required
          :description="t('auth.forgotPassword.codeDesc')"
        >
          <UInput
            v-model="data.code"
            name="code"
            icon="i-ph-key-duotone"
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
          :label="t('auth.forgotPassword.passwordLabel')"
          name="password"
          required
          :description="t('auth.forgotPassword.passwordDesc')"
        >
          <UInput
            v-model="data.password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            icon="i-ph-lock-duotone"
            :placeholder="t('auth.forgotPassword.passwordPlaceholder')"
            size="lg"
            class="w-full"
            autocomplete="new-password"
            autofocus
          >
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-ph-eye-slash-duotone' : 'i-ph-eye-duotone'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
                class="text-dimmed hover:text-muted cursor-pointer"
                tabindex="-1"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('auth.forgotPassword.repeatLabel')" name="repeat" required>
          <UInput
            v-model="data.repeat"
            name="repeat"
            :type="showRepeatPassword ? 'text' : 'password'"
            icon="i-ph-shield-check-duotone"
            :placeholder="t('auth.forgotPassword.repeatPlaceholder')"
            size="lg"
            class="w-full"
            autocomplete="new-password"
          >
            <template #trailing>
              <UButton
                :icon="showRepeatPassword ? 'i-ph-eye-slash-duotone' : 'i-ph-eye-duotone'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="showRepeatPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
                class="text-dimmed hover:text-muted cursor-pointer"
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
        <form :action="`${origin}/password/change`" method="POST" class="inline-flex items-center gap-1.5 text-sm text-muted">
          <input type="hidden" name="action" value="code" />
          <input type="hidden" name="email" :value="data.email" />
          <span>{{ t("auth.forgotPassword.noCode") }}</span>
          <button
            type="submit"
            class="text-primary hover:text-primary/75 font-medium transition-colors underline underline-offset-4 cursor-pointer"
          >
            {{ t("auth.forgotPassword.resend") }}
          </button>
        </form>
      </div>
    </template>

    <!-- Card Footer -->
    <template #footer>
      <p class="text-sm text-muted">
        {{ t("auth.forgotPassword.rememberPassword") }}
        <NuxtLink
          :to="`${origin}/password/authorize`"
          external
          class="text-primary hover:text-primary/75 font-medium transition-colors underline underline-offset-4 ml-1"
        >
          {{ t("auth.forgotPassword.signIn") }}
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { z } from "zod/v4";

type ForgotError =
  | "invalid_email"
  | "invalid_code"
  | "invalid_password"
  | "password_mismatch"
  | null;

const { t } = useI18n();

const ERROR_MESSAGES = computed<Record<string, string>>(() => ({
  invalid_email: t("auth.forgotPassword.errors.invalidEmail"),
  invalid_code: t("auth.forgotPassword.errors.invalidCode"),
  invalid_password: t("auth.forgotPassword.errors.weakPassword"),
  password_mismatch: t("auth.forgotPassword.errors.passwordMismatch"),
}));

const route = useRoute();
const notification = useNotification();

const state = (route.query.state?.toString() || "start") as
  "start" | "code" | "update";

const startSchema = computed(() =>
  z.object({
    email: z.string().email(t("auth.forgotPassword.errors.emailValidation")),
  }),
);

const codeSchema = computed(() =>
  z.object({
    code: z.string().min(1, t("auth.forgotPassword.errors.codeValidation")),
  }),
);

const updateSchema = computed(() =>
  z
    .object({
      password: z.string().min(8, t("auth.forgotPassword.errors.passwordValidation")),
      repeat: z.string().min(8, t("auth.forgotPassword.errors.passwordValidation")),
    })
    .refine((val) => val.password === val.repeat, {
      message: t("auth.forgotPassword.errors.passwordMismatch"),
      path: ["repeat"],
    }),
);

const formSchema = computed(() => {
  switch (state) {
    case "code":
      return codeSchema.value;
    case "update":
      return updateSchema.value;
    default:
      return startSchema.value;
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
const errorMessage = computed(() => {
  if (!err) return "";
  return ERROR_MESSAGES.value[err] ?? t("auth.forgotPassword.errors.unexpected");
});

onMounted(() => {
  if (err && ERROR_MESSAGES.value[err]) {
    notification.error(t("auth.forgotPassword.errorTitle"), ERROR_MESSAGES.value[err]);
  }
});

const pageTitle = computed(() => {
  if (state === "code") return t("auth.login.checkEmail");
  if (state === "update") return t("auth.forgotPassword.titleUpdate");
  return t("auth.forgotPassword.titleStart");
});

const pageSubtitle = computed(() => {
  if (state === "code")
    return t("auth.forgotPassword.subtitleCode", { email: data.email || t("auth.login.yourEmail") });
  if (state === "update") return t("auth.forgotPassword.subtitleUpdate");
  return t("auth.forgotPassword.subtitleStart");
});

const submitButtonLabel = computed(() => {
  if (state === "code") return t("auth.forgotPassword.btnVerifyCode");
  if (state === "update") return t("auth.forgotPassword.btnUpdatePassword");
  return t("auth.forgotPassword.btnSendCode");
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
