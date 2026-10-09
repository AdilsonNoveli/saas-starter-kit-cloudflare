<template>
  <div class="flex flex-col gap-4 sm:gap-6">
    <UPageCard
      :title="t('account.security.password.title')"
      :description="passwordDescription"
      variant="subtle"
      orientation="horizontal"
    >
      <UButton
        v-if="hasPassword"
        :label="t('account.security.password.change')"
        color="neutral"
        class="w-fit lg:ms-auto"
        @click="goToChangePassword"
      />
    </UPageCard>

    <AccountEmailChange :editable="emailEditable" />

    <UPageCard
      :title="t('account.security.mfa.title')"
      :description="
        mfaEnabled
          ? t('account.security.mfa.enabledDescription')
          : t('account.security.mfa.disabledDescription')
      "
      variant="subtle"
      orientation="horizontal"
    >
      <UButton
        v-if="mfaEnabled"
        :label="t('account.security.mfa.disable')"
        color="error"
        variant="outline"
        class="w-fit lg:ms-auto"
        @click="showDisableMfaConfirm = true"
      />
      <UButton
        v-else
        :label="t('account.security.mfa.enable')"
        color="neutral"
        class="w-fit lg:ms-auto"
        @click="mfaEnrollOpen = true"
      />
    </UPageCard>

    <AccountMfaRecoveryPanel v-if="mfaEnabled" />

    <AccountSessionsList />

    <AccountMfaSetupModal
      v-model:open="mfaEnrollOpen"
      mode="enroll"
      @success="onMfaEnrolled"
    />

    <UModal
      v-model:open="showDisableMfaConfirm"
      :dismissible="!disablingMfa"
      :title="t('account.security.mfa.disableConfirm.title')"
      :description="t('account.security.mfa.disableConfirm.description')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          :label="t('account.common.cancel')"
          color="neutral"
          variant="outline"
          :disabled="disablingMfa"
          @click="close"
        />
        <UButton
          :label="t('account.security.mfa.disable')"
          color="error"
          :loading="disablingMfa"
          @click="onDisableMfa"
        />
      </template>
    </UModal>

    <UPageCard
      :title="t('account.security.danger.title')"
      :description="t('account.security.danger.description')"
      variant="subtle"
      orientation="horizontal"
      :ui="{ root: 'border-error/50' }"
    >
      <UButton
        :label="t('account.security.danger.delete')"
        color="error"
        variant="outline"
        class="w-fit lg:ms-auto"
        @click="showDeleteConfirm = true"
      />
    </UPageCard>

    <!--
      v-model:open, not v-model — @nuxt/ui v4's Modal takes an `open` prop
      with an `update:open` emit rather than the usual modelValue pair, so a
      bare v-model silently binds to nothing (same class of v2-vs-v4 mismatch
      already found in apps/login's UForm loading-auto default).
    -->
    <UModal v-model:open="showDeleteConfirm" :dismissible="!deleting">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-error">
              <UIcon name="i-ph-trash-duotone" />
              <span class="font-medium">{{ t("account.security.danger.delete") }}</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm">
              {{ t("account.security.danger.confirmBody") }}
            </p>
            <UFormField
              :label="t('account.security.danger.confirmLabel', { email: user?.email ?? '' })"
              name="confirmEmail"
            >
              <UInput
                v-model="confirmEmail"
                :placeholder="user?.email || ''"
                autocomplete="off"
              />
            </UFormField>
          </div>
          <template #footer>
            <div class="flex gap-2 w-full justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="deleting"
                :label="t('account.common.cancel')"
                @click="showDeleteConfirm = false"
              />
              <UButton
                color="error"
                :loading="deleting"
                :disabled="
                  confirmEmail.trim().toLowerCase() !==
                  user?.email?.toLowerCase()
                "
                :label="t('account.security.danger.confirm')"
                @click="onDeleteAccount"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
// Segurança (SPEC-0010, AC-015, AC-021, AC-030): password, e-mail, two-factor
// authentication, sessions and account deletion. `account.email.status` says
// whether this account has a password and whether its e-mail can change here;
// when it cannot be read, neither action is offered.
const { t } = useI18n();
const notification = useNotification();
const { user } = useSession();
const runtimeConfig = useRuntimeConfig();

const { data: emailStatus, error: emailStatusError } =
  await useTrpcClient().account.email.status.useQuery();
const hasPassword = computed(() =>
  emailStatusError.value || !emailStatus.value ? null : emailStatus.value.hasPassword,
);
const passwordDescription = computed(() => {
  if (hasPassword.value === null) return t("account.email.statusFailed");
  return hasPassword.value
    ? t("account.security.password.description")
    : t("account.security.password.provider");
});
const emailEditable = computed(() =>
  emailStatusError.value || !emailStatus.value ? null : emailStatus.value.editable,
);

/**
 * There is no "change password while signed in" endpoint — the auth Worker
 * only knows the email-OTP reset flow (apps/login's forgot-password.vue),
 * so a password change is that flow, pre-filled.
 */
function goToChangePassword() {
  const url = new URL(`${runtimeConfig.public.authUrl}/forgot-password`);
  if (user.value?.email) url.searchParams.set("email", user.value.email);
  navigateTo(url.toString(), { external: true });
}

const mfaEnabled = computed(() => Boolean(user.value?.mfaEnabled));
const mfaEnrollOpen = ref(false);
const showDisableMfaConfirm = ref(false);
const disablingMfa = ref(false);

async function onMfaEnrolled() {
  // The modal already confirmed enrolment with the server; this only syncs
  // the cached session so `mfaEnabled` above flips without a full reload.
  await useSession().refresh();
}

const disableMfaMutation = useTrpcClient().account.disableMfa;

async function onDisableMfa() {
  disablingMfa.value = true;
  try {
    await disableMfaMutation.mutate();
    await useSession().refresh();
    showDisableMfaConfirm.value = false;
    notification.success(t("account.security.mfa.disabled"));
  } catch (error) {
    notification.error(t("account.security.mfa.disableFailed"), getErrorMessage(error));
  } finally {
    disablingMfa.value = false;
  }
}

const deleteAccountMutation = useTrpcClient().account.deleteAccount;
const showDeleteConfirm = ref(false);
const deleting = ref(false);
const confirmEmail = ref("");

watch(showDeleteConfirm, (open) => {
  if (!open) confirmEmail.value = "";
});

async function onDeleteAccount() {
  deleting.value = true;
  try {
    await deleteAccountMutation.mutate({
      confirmEmail: confirmEmail.value.trim(),
    });
    // The server already cleared the session cookies; this only resets the
    // client's local copy and forces a full reload through auth, the same
    // way sign-out does (AccountUserDropdown.vue).
    await useSession().clear();
    await navigateTo("/", { external: true });
  } catch (error) {
    notification.error(t("account.security.danger.failed"), getErrorMessage(error, t("errors.generic")));
    deleting.value = false;
  }
}
</script>
