<template>
  <AuthLayout
    :title="state === 'code' ? t('auth.signup.titleCode') : t('auth.signup.title')"
    :subtitle="
      state === 'code'
        ? t('auth.signup.subtitleCode')
        : t('auth.signup.subtitle', { brand: brandName })
    "
  >
    <!-- Status Alerts -->
    <UAlert
      v-if="errorMessage"
      icon="i-ph-warning-circle-duotone"
      color="error"
      variant="subtle"
      :title="t('auth.signup.errorTitle')"
      :description="errorMessage"
    />

    <UAlert
      v-else-if="confirmUser"
      icon="i-ph-envelope-duotone"
      color="success"
      variant="subtle"
      :title="t('auth.signup.confirmTitle')"
      :description="t('auth.signup.confirmDesc', { email: confirmUser })"
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
          :label="t('auth.signup.codeLabel')"
          name="code"
          required
          :description="t('auth.signup.codeDesc')"
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

      <!-- Standard Registration Fields -->
      <template v-else>
        <UFormField :label="t('auth.signup.emailLabel')" name="email" required>
          <UInput
            v-model="data.email"
            name="email"
            type="email"
            icon="i-ph-envelope-duotone"
            :placeholder="t('auth.signup.emailPlaceholder')"
            size="lg"
            class="w-full"
            autocomplete="email"
            autofocus
          />
        </UFormField>

        <UFormField
          :label="t('auth.signup.passwordLabel')"
          name="password"
          required
          :description="t('auth.signup.passwordDesc')"
        >
          <UInput
            v-model="data.password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            icon="i-ph-lock-duotone"
            :placeholder="t('auth.signup.passwordPlaceholder')"
            size="lg"
            class="w-full"
            autocomplete="new-password"
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

        <UFormField :label="t('auth.signup.repeatLabel')" name="repeat" required>
          <UInput
            v-model="data.repeat"
            name="repeat"
            :type="showRepeatPassword ? 'text' : 'password'"
            icon="i-ph-shield-check-duotone"
            :placeholder="t('auth.signup.repeatPlaceholder')"
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
        <span class="w-full text-center">{{ state === "code" ? t("auth.signup.btnVerify") : t("auth.signup.btnCreate") }}</span>
      </UButton>
    </UForm>

    <!-- Social Sign Up & Agreement -->
    <template v-if="state !== 'code'">
      <template v-if="githubAuthEnabled || googleAuthEnabled">
        <div class="relative py-1">
          <USeparator :label="t('auth.signup.orRegisterWith')" class="text-xs text-dimmed uppercase tracking-wider" />
        </div>
        <AuthSocialLogin :sign-up="true" />
      </template>

      <AuthAgreement />
    </template>

    <!-- Card Footer -->
    <template #footer>
      <p class="text-sm text-muted">
        {{ t("auth.signup.hasAccount") }}
        <NuxtLink
          :to="`${origin}/password/authorize`"
          external
          class="text-primary hover:text-primary/75 font-medium transition-colors underline underline-offset-4 ml-1"
        >
          {{ t("auth.signup.signIn") }}
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { z } from "zod/v4";

type SignupError =
  | "invalid_email"
  | "invalid_code"
  | "email_taken"
  | "invalid_password"
  | null;

const { t } = useI18n();

const ERROR_MESSAGES = computed<Record<string, string>>(() => ({
  invalid_email: t("auth.signup.errors.invalidEmail"),
  invalid_code: t("auth.login.errors.invalidCode"),
  email_taken: t("auth.signup.errors.emailInUse"),
  invalid_password: t("auth.signup.errors.weakPassword"),
}));

const registerSchema = computed(() =>
  z
    .object({
      email: z.string().email(t("auth.signup.errors.emailValidation")),
      password: z.string().min(8, t("auth.signup.errors.passwordValidation")),
      repeat: z.string().min(8, t("auth.signup.errors.passwordValidation")),
    })
    .refine((val) => val.password === val.repeat, {
      message: t("auth.signup.errors.passwordMismatch"),
      path: ["repeat"],
    }),
);

const verifySchema = computed(() =>
  z.object({
    code: z.string().min(1, t("auth.signup.errors.codeValidation")),
  }),
);

const route = useRoute();
const notification = useNotification();

const origin = import.meta.dev ? route.query.origin?.toString() || "" : "";
const state = route.query.state?.toString();
const err = (route.query.err?.toString() || null) as SignupError;

const {
  public: { brandName, githubAuthEnabled, googleAuthEnabled },
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

const errorMessage = computed(() => {
  if (!err) return "";
  return ERROR_MESSAGES.value[err] ?? t("auth.signup.errors.unexpected");
});

onMounted(() => {
  if (err && ERROR_MESSAGES.value[err]) {
    notification.error(t("auth.signup.errorTitle"), ERROR_MESSAGES.value[err]);
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
