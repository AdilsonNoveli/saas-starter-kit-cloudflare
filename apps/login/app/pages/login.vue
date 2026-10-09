<template>
  <AuthLayout
    :title="state === 'code' ? t('auth.login.checkEmail') : t('auth.login.welcomeBack')"
    :subtitle="
      state === 'code'
        ? t('auth.login.subtitleCode', { email: email || t('auth.login.yourEmail') })
        : t('auth.login.subtitle')
    "
  >
    <!-- Status Alerts -->
    <UAlert
      v-if="errorMessage"
      icon="i-ph-warning-circle-duotone"
      color="error"
      variant="subtle"
      :title="t('auth.login.failedTitle')"
      :description="errorMessage"
    />

    <UAlert
      v-if="state === 'code' && !errorMessage"
      icon="i-ph-envelope-duotone"
      color="success"
      variant="subtle"
      :title="t('auth.login.codeSentTitle')"
      :description="t('auth.login.codeSentDesc', { email })"
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
          :label="t('auth.login.codeLabel')"
          name="code"
          required
          :description="t('auth.login.codeDesc')"
        >
          <UInput
            v-model="data.code"
            name="code"
            icon="i-ph-key-duotone"
            :placeholder="t('auth.login.codePlaceholder')"
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
        <UFormField :label="t('auth.login.emailLabel')" name="email" required>
          <UInput
            v-model="data.email"
            name="email"
            type="email"
            icon="i-ph-envelope-duotone"
            :placeholder="t('auth.login.emailPlaceholder')"
            size="lg"
            class="w-full"
            autocomplete="email"
            tabindex="1"
            autofocus
          />
        </UFormField>

        <UFormField :label="t('auth.login.passwordLabel')" name="password">
          <template #hint>
            <NuxtLink
              :to="`${origin}/password/change`"
              external
              class="text-xs text-primary hover:text-primary/75 font-medium transition-colors"
              tabindex="-1"
            >
              {{ t("auth.login.forgotPassword") }}
            </NuxtLink>
          </template>

          <UInput
            v-model="data.password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            icon="i-ph-lock-duotone"
            :placeholder="t('auth.login.passwordPlaceholder')"
            size="lg"
            class="w-full"
            autocomplete="current-password"
            tabindex="2"
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
          <USeparator :label="t('auth.login.orContinueWith')" class="text-xs text-dimmed uppercase tracking-wider" />
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
            <span>{{ t("auth.login.noCode") }}</span>
            <button
              type="submit"
              class="text-primary hover:text-primary/75 font-medium transition-colors underline underline-offset-4 cursor-pointer"
            >
              {{ t("auth.login.resend") }}
            </button>
          </form>

          <NuxtLink
            :to="`${origin}/password/authorize`"
            external
            class="text-xs text-dimmed hover:text-muted transition-colors inline-flex items-center gap-1 mt-1"
          >
            <UIcon name="i-ph-arrow-left-duotone" class="w-3.5 h-3.5" />
            {{ t("auth.login.returnToEmail") }}
          </NuxtLink>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-muted">
          {{ t("auth.login.noAccount") }}
          <NuxtLink
            :to="`${origin}/password/register`"
            external
            class="text-primary hover:text-primary/75 font-medium transition-colors underline underline-offset-4 ml-1"
          >
            {{ t("auth.login.createAccount") }}
          </NuxtLink>
        </p>
      </template>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { z } from "zod/v4";

type LoginError = "invalid_email" | "invalid_password" | "invalid_code" | null;

const { t } = useI18n();
const route = useRoute();
const notification = useNotification();

const ERROR_MESSAGES = computed<Record<string, string>>(() => ({
  invalid_email: t("auth.login.errors.invalidEmail"),
  invalid_password: t("auth.login.errors.invalidPassword"),
  invalid_code: t("auth.login.errors.invalidCode"),
}));

const loginSchema = computed(() =>
  z.object({
    email: z.string().email(t("auth.login.errors.emailValidation")),
    password: z.string().optional(),
  }),
);

const verifySchema = computed(() =>
  z.object({
    code: z.string().min(1, t("auth.login.errors.codeValidation")),
  }),
);

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

const errorMessage = computed(() => {
  if (!err) return "";
  return ERROR_MESSAGES.value[err] ?? t("auth.login.errors.unexpected");
});

// Trigger toast notification if an error query parameter was provided
onMounted(() => {
  if (err && ERROR_MESSAGES.value[err]) {
    notification.error(t("auth.login.errors.title"), ERROR_MESSAGES.value[err]);
  }
});

const submitButtonLabel = computed(() => {
  if (state === "code") return t("auth.login.btnVerify");
  if (data.password) return t("auth.login.btnSignIn");
  return t("auth.login.btnSendCode");
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
