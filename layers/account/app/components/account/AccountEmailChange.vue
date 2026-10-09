<script setup lang="ts">
import { z } from "zod/v4";
import type { Form, FormErrorEvent } from "@nuxt/ui";

// The e-mail change of Security (SPEC-0010, FR-014, AC-027, AC-030, DEC-012),
// inline: the new address, then one code from the current address and one
// from the new, then the change. Accounts whose address belongs to Google or
// GitHub see it read-only, with the reason. The server decides everything;
// this panel only shows its answer next to the field it concerns.
const props = defineProps<{
  /** `account.email.status`, or null when it could not be read. */
  editable: boolean | null;
}>();

const { t } = useI18n();
const notification = useNotification();
const trpc = useTrpcClient();
const { user } = useSession();

type Step = "idle" | "address" | "codes";
const step = ref<Step>("idle");
const busy = ref(false);

const readOnlyReason = computed(() => {
  if (props.editable === null) return t("account.email.statusFailed");
  return props.editable ? undefined : textOf("email_managed_by_provider");
});

function codeOf(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function textOf(code: string) {
  return translateErrorCode(code, (key) => t(key));
}

function focusById(id: string | undefined) {
  if (id) document.getElementById(id)?.focus();
}

/** Keyboard users land on the field that needs fixing (AC-045). */
function focusFirstError(event: FormErrorEvent) {
  focusById(event.errors[0]?.id);
}

// Step 1: the new address.
const addressSchema = z.object({
  newEmail: z
    .email({ error: () => t("account.email.invalidEmail") })
    .max(254, { error: () => t("account.email.invalidEmail") }),
});
const addressForm = useTemplateRef<Form<z.output<typeof addressSchema>>>("addressForm");
const address = reactive({ newEmail: "" });

// Step 2: the two codes, each typed as it arrived.
const codeField = () =>
  z.string().trim().regex(/^\d{6}$/u, { error: () => t("account.email.codeFormat") });
const codesSchema = z.object({ currentCode: codeField(), newCode: codeField() });
const codesForm = useTemplateRef<Form<z.output<typeof codesSchema>>>("codesForm");
const codes = reactive({ currentCode: "", newCode: "" });

/** Refusals about the codes; the server does not say which of the two failed. */
const CODE_ERRORS: ReadonlySet<string> = new Set(["invalid_code", "code_expired"]);

function open() {
  step.value = "address";
}

function cancel() {
  step.value = "idle";
  address.newEmail = "";
  codes.currentCode = "";
  codes.newCode = "";
}

async function requestCodes() {
  busy.value = true;
  try {
    await trpc.account.email.request.mutate({ newEmail: address.newEmail.trim() });
    codes.currentCode = "";
    codes.newCode = "";
    step.value = "codes";
  } catch (error) {
    // Every refusal of the request is about the address.
    addressForm.value?.setErrors([{ name: "newEmail", message: textOf(codeOf(error)) }]);
    await nextTick();
    focusById(addressForm.value?.getErrors("newEmail")[0]?.id);
  } finally {
    busy.value = false;
  }
}

async function confirm() {
  busy.value = true;
  try {
    await trpc.account.email.confirm.mutate({
      currentCode: codes.currentCode.trim(),
      newCode: codes.newCode.trim(),
    });
    const changedTo = address.newEmail.trim();
    cancel();
    await useSession().refresh();
    notification.success(
      t("account.email.changed"),
      t("account.email.changedDescription", { email: changedTo }),
    );
  } catch (error) {
    const code = codeOf(error);
    if (CODE_ERRORS.has(code)) {
      const message = textOf(code);
      codesForm.value?.setErrors([
        { name: "currentCode", message },
        { name: "newCode", message },
      ]);
      await nextTick();
      focusById(codesForm.value?.getErrors("currentCode")[0]?.id);
    } else {
      notification.error(t("account.email.failed"), textOf(code));
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <UPageCard
    :title="t('account.email.title')"
    :description="t('account.email.description')"
    variant="subtle"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
      <UFormField
        :label="t('account.email.current')"
        name="currentEmail"
        :help="readOnlyReason"
        class="min-w-0 flex-1"
      >
        <UInput
          :model-value="user?.email ?? ''"
          type="email"
          readonly
          icon="i-ph-envelope-simple-duotone"
          class="w-full"
        />
      </UFormField>
      <UButton
        v-if="editable && step === 'idle'"
        color="neutral"
        icon="i-ph-pencil-simple-duotone"
        class="w-fit shrink-0"
        :label="t('account.email.change')"
        @click="open"
      />
    </div>

    <UForm
      v-if="editable && step === 'address'"
      ref="addressForm"
      :schema="addressSchema"
      :state="address"
      :validate-on="['blur']"
      class="space-y-4 border-t border-default pt-4"
      @submit="requestCodes"
      @error="focusFirstError"
    >
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-ph-warning-duotone"
        :title="t('account.email.pendingWarning.title')"
        :description="t('account.email.pendingWarning.description')"
      />

      <UFormField name="newEmail" :label="t('account.email.newEmail')" :help="t('account.email.newEmailHelp')" required>
        <UInput
          v-model="address.newEmail"
          type="email"
          autocomplete="email"
          autofocus
          class="w-full"
        />
      </UFormField>

      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('account.common.cancel')"
          :disabled="busy"
          @click="cancel"
        />
        <UButton
          type="submit"
          color="neutral"
          icon="i-ph-paper-plane-tilt-duotone"
          :label="t('account.email.send')"
          :loading="busy"
        />
      </div>
    </UForm>

    <UForm
      v-if="editable && step === 'codes'"
      ref="codesForm"
      :schema="codesSchema"
      :state="codes"
      :validate-on="['blur']"
      class="space-y-4 border-t border-default pt-4"
      @submit="confirm"
      @error="focusFirstError"
    >
      <p class="text-sm text-default" role="status">
        {{ t("account.email.codesSent", { current: user?.email ?? "", next: address.newEmail.trim() }) }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField name="currentCode" :label="t('account.email.currentCode')" required>
          <UInput
            v-model="codes.currentCode"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            autofocus
            class="w-full font-mono"
          />
        </UFormField>
        <UFormField name="newCode" :label="t('account.email.newCode')" required>
          <UInput
            v-model="codes.newCode"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            class="w-full font-mono"
          />
        </UFormField>
      </div>

      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('account.common.cancel')"
          :disabled="busy"
          @click="cancel"
        />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-ph-arrow-clockwise-duotone"
          :label="t('account.email.resend')"
          :disabled="busy"
          @click="open"
        />
        <UButton
          type="submit"
          color="neutral"
          icon="i-ph-check-circle-duotone"
          :label="t('account.email.confirm')"
          :loading="busy"
        />
      </div>
    </UForm>
  </UPageCard>
</template>
