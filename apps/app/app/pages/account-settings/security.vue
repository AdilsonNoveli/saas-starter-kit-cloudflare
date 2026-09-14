<template>
  <div class="flex flex-col gap-4 sm:gap-6">
    <UPageCard
      title="Password"
      description="We'll email you a verification code to confirm the change."
      variant="subtle"
      orientation="horizontal"
    >
      <UButton
        label="Change Password"
        color="neutral"
        class="w-fit lg:ms-auto"
        @click="goToChangePassword"
      />
    </UPageCard>

    <UPageCard
      title="Two-Factor Authentication"
      :description="
        mfaEnabled
          ? 'Enabled. You will be asked for a code from your authenticator app the next time you log in on a new device or browser.'
          : 'Add a time-based code from an authenticator app on top of your password.'
      "
      variant="subtle"
      orientation="horizontal"
    >
      <UButton
        v-if="mfaEnabled"
        label="Disable 2FA"
        color="error"
        variant="outline"
        class="w-fit lg:ms-auto"
        @click="showDisableMfaConfirm = true"
      />
      <UButton
        v-else
        label="Enable 2FA"
        color="neutral"
        class="w-fit lg:ms-auto"
        @click="mfaEnrollOpen = true"
      />
    </UPageCard>

    <UPageCard
      title="Sessions"
      description="Sign out of every other browser or device currently signed in to your account."
      variant="subtle"
      orientation="horizontal"
    >
      <UButton
        label="Sign out other sessions"
        color="neutral"
        variant="outline"
        :loading="signingOut"
        class="w-fit lg:ms-auto"
        @click="onSignOutOthers"
      />
    </UPageCard>

    <AccountMfaSetupModal
      v-model:open="mfaEnrollOpen"
      mode="enroll"
      @success="onMfaEnrolled"
    />

    <UModal
      v-model:open="showDisableMfaConfirm"
      :dismissible="!disablingMfa"
      title="Disable two-factor authentication"
      description="You will only need your password to log in again. You can re-enable it any time."
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="disablingMfa"
          @click="close"
        />
        <UButton
          label="Disable"
          color="error"
          :loading="disablingMfa"
          @click="onDisableMfa"
        />
      </template>
    </UModal>

    <UPageCard
      title="Danger Zone"
      description="Permanently delete your account, credentials and profile. This cannot be undone."
      variant="subtle"
      orientation="horizontal"
      :ui="{ root: 'border-error/50' }"
    >
      <UButton
        label="Delete Account"
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
              <UIcon name="i-lucide-trash" />
              <span class="font-medium">Delete Account</span>
            </div>
          </template>
          <div class="space-y-4">
            <p class="text-sm">
              This permanently deletes your credentials, every active session,
              and your profile. Teams you don't own are unaffected; if you are
              the sole owner of a team with other members, remove them or
              transfer ownership first.
            </p>
            <UFormField
              :label="`Type ${user?.email} to confirm`"
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
                @click="showDeleteConfirm = false"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                :loading="deleting"
                :disabled="
                  confirmEmail.trim().toLowerCase() !==
                  user?.email?.toLowerCase()
                "
                @click="onDeleteAccount"
              >
                Permanently Delete
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();
const { user } = useSession();
const runtimeConfig = useRuntimeConfig();

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
    const result = await disableMfaMutation.mutate();
    await useSession().refresh();
    showDisableMfaConfirm.value = false;
    toast.add({
      title: "Two-Factor Authentication Disabled",
      description: result.message,
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.message || "Something went wrong",
      color: "error",
      icon: "i-lucide-x",
    });
  } finally {
    disablingMfa.value = false;
  }
}

const signOutOthersMutation = useTrpcClient().account.signOutOtherSessions;
const signingOut = ref(false);

async function onSignOutOthers() {
  signingOut.value = true;
  try {
    const result = await signOutOthersMutation.mutate();
    toast.add({
      title: "Done",
      description: result.message,
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.message || "Something went wrong",
      color: "error",
      icon: "i-lucide-x",
    });
  } finally {
    signingOut.value = false;
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
  } catch (error: any) {
    toast.add({
      title: "Account Deletion Failed",
      description: error?.message || "Something went wrong.",
      color: "error",
      icon: "i-lucide-x",
    });
    deleting.value = false;
  }
}
</script>
