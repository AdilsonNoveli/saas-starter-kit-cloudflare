<template>
  <UPageCard
    title="Recovery codes"
    :description="description"
    variant="subtle"
    orientation="horizontal"
  >
    <UButton
      label="Generate new codes"
      color="neutral"
      variant="outline"
      class="w-fit lg:ms-auto"
      @click="open = true"
    />

    <UModal
      v-model:open="open"
      :dismissible="canDismiss"
      :close="canDismiss ? undefined : false"
      :title="codes ? 'Save your new recovery codes' : 'Generate new recovery codes'"
      :description="
        codes
          ? 'Your previous codes no longer work.'
          : 'Enter the current code from your authenticator app. Your previous recovery codes will stop working.'
      "
    >
      <template #body>
        <div v-if="codes" class="flex flex-col gap-6">
          <AccountMfaRecoveryCodes :codes="codes" />

          <UCheckbox
            v-model="acknowledged"
            label="I've saved these codes somewhere safe"
          />

          <UButton
            label="Done"
            class="self-start"
            :disabled="!acknowledged"
            @click="open = false"
          />
        </div>

        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="flex flex-col gap-4 sm:flex-row sm:items-start"
          @submit="onSubmit"
        >
          <UFormField label="Six-digit code" name="code" class="flex-1">
            <UInput
              v-model="state.code"
              class="w-full font-mono"
              autocomplete="one-time-code"
              inputmode="numeric"
              maxlength="6"
              placeholder="123456"
            />
          </UFormField>

          <UButton
            label="Generate codes"
            type="submit"
            :loading="submitting"
            class="sm:mt-6"
          />
        </UForm>
      </template>
    </UModal>
  </UPageCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

/**
 * Recovery-code status and regeneration for an account that already has
 * two-factor authentication on. `scope` only picks the endpoint namespace,
 * like AccountMfaSetupModal: /api/mfa/* for the person's own account,
 * /api/admin/mfa/* for the platform-admin factor.
 */
const props = withDefaults(defineProps<{ scope?: "user" | "admin" }>(), {
  scope: "user",
});

const notification = useNotification();

const apiBase = computed(() =>
  props.scope === "admin" ? "/api/admin/mfa" : "/api/mfa",
);

const remaining = ref<number | null>(null);
const open = ref(false);
const submitting = ref(false);
const codes = ref<string[] | null>(null);
const acknowledged = ref(false);

const canDismiss = computed(() => !submitting.value && !codes.value);

const description = computed(() => {
  const count = remaining.value;
  if (count === null) return "Codes that let you in if you lose your authenticator.";
  if (count === 0) {
    return "You have no unused codes. Generate a new set so you are not locked out if you lose your authenticator.";
  }
  const left = `${count} of 10 unused.`;
  return count <= 3
    ? `${left} Running low: generate a new set soon.`
    : `${left} Generating a new set invalidates the old one.`;
});

async function loadRemaining() {
  try {
    const status = await $fetch<{ recoveryCodesRemaining?: number }>(
      `${apiBase.value}/status`,
    );
    remaining.value = status.recoveryCodesRemaining ?? 0;
  } catch {
    remaining.value = null;
  }
}

onMounted(loadRemaining);

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the six digits from your app"),
});
type Schema = z.output<typeof schema>;
const state = reactive<Schema>({ code: "" });

watch(open, (isOpen) => {
  if (isOpen) return;
  const generated = codes.value !== null;
  codes.value = null;
  acknowledged.value = false;
  state.code = "";
  if (generated) void loadRemaining();
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;
  try {
    const result = await $fetch<{ recoveryCodes: string[] }>(
      `${apiBase.value}/recovery-codes`,
      { method: "POST", body: { code: event.data.code } },
    );
    codes.value = result.recoveryCodes;
  } catch (error) {
    const rateLimited =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 429;
    state.code = "";
    notification.error(
      rateLimited ? "Too many attempts" : "That code didn't work",
      rateLimited
        ? "Wait a few minutes before trying again."
        : "Check your authenticator app and enter the current code.",
    );
  } finally {
    submitting.value = false;
  }
}
</script>
