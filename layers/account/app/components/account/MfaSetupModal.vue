<template>
  <UModal
    :open="open"
    :dismissible="canDismiss"
    :close="canDismiss ? undefined : false"
    :title="title"
    :description="description"
    :ui="{
      overlay: 'bg-elevated/75',
      content: 'shadow-none ring ring-default/60 max-w-xl',
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div v-if="recoveryCodes" class="flex flex-col gap-6">
        <AccountMfaRecoveryCodes :codes="recoveryCodes" />

        <UCheckbox
          v-model="acknowledged"
          label="I've saved these codes somewhere safe"
        />

        <UButton
          label="Done"
          class="self-start"
          :disabled="!acknowledged"
          @click="finishEnrolment"
        />
      </div>

      <div v-else class="flex flex-col gap-6">
        <UButton
          v-if="isEnrolling && !otpauthUri"
          label="Generate code"
          icon="i-ph-qr-code-duotone"
          class="self-start"
          loading-auto
          @click="startSetup"
        />

        <div
          v-else-if="isEnrolling"
          class="flex flex-col gap-4 sm:flex-row sm:items-start"
        >
          <!-- Drawn from the URI by `uqr` inside this component and inlined
               as a data URI: that string carries the shared secret in the
               clear, so it must never reach a hosted QR image service — or
               anything else off this page. -->
          <img
            :src="qrDataUri"
            alt="QR code for your authenticator app"
            width="200"
            height="200"
            class="shrink-0 rounded-lg"
          />

          <div class="min-w-0 flex-1 space-y-2">
            <p class="text-sm text-muted">
              Can't scan it? Type this {{ manualKeyLabel }} into your app
              instead.
            </p>

            <div class="flex items-start gap-1.5">
              <UInput
                :model-value="manualKey"
                readonly
                class="min-w-0 flex-1"
                :ui="{ base: 'font-mono break-all' }"
              />
              <UButton
                :icon="copied ? 'i-ph-check-duotone' : 'i-ph-copy-duotone'"
                color="neutral"
                variant="outline"
                :aria-label="`Copy ${manualKeyLabel}`"
                @click="copy(manualKey)"
              />
            </div>

            <p class="text-sm text-muted">
              Keep it secret — anyone holding it can generate your codes.
            </p>
          </div>
        </div>

        <UForm
          v-if="showCodeForm && useRecovery"
          :schema="recoverySchema"
          :state="recoveryState"
          class="flex flex-col gap-4 sm:flex-row sm:items-start"
          @submit="onRecoverySubmit"
        >
          <UFormField label="Recovery code" name="recoveryCode" class="flex-1">
            <UInput
              v-model="recoveryState.recoveryCode"
              class="w-full font-mono"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              maxlength="32"
              placeholder="ABCD-EFGH-JKMN"
            />
          </UFormField>

          <UButton
            label="Use recovery code"
            type="submit"
            :loading="submitting"
            class="sm:mt-6"
          />
        </UForm>

        <UForm
          v-else-if="showCodeForm"
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
            :label="isEnrolling ? 'Verify and enable' : 'Continue'"
            type="submit"
            :loading="submitting"
            class="sm:mt-6"
          />
        </UForm>

        <UButton
          v-if="!isEnrolling"
          :label="
            useRecovery
              ? 'Use an authenticator code instead'
              : 'Lost your authenticator? Use a recovery code'
          "
          color="neutral"
          variant="link"
          class="self-start px-0"
          @click="useRecovery = !useRecovery"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { renderSVG } from "uqr";
import { z } from "zod/v4";

/**
 * Self-service two-factor setup and re-verification, reused across three
 * mount sites: layouts/dashboard.vue mounts one in `mode="challenge"`,
 * non-dismissible, whenever an enrolled account's login hasn't verified yet;
 * account-settings/security.vue mounts a separate instance in
 * `mode="enroll"` for the voluntary "Enable 2FA" flow; layouts/admin.vue
 * mounts a `scope="admin"` instance for the platform-admin elevated-session
 * gate — previously its own full-page UI at pages/admin/mfa.vue (now
 * retired), duplicating this exact QR/code-form markup with no
 * overlay. `scope` only changes which endpoint namespace is called
 * (/api/mfa/* vs /api/admin/mfa/*, both already existed); the modal chrome
 * — including the overlay — is identical for every caller.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: "enroll" | "challenge";
    scope?: "user" | "admin";
    dismissible?: boolean;
  }>(),
  { dismissible: true, scope: "user" },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const notification = useNotification();
const { copy, copied } = useClipboard();

const isEnrolling = computed(() => props.mode === "enroll");
const otpauthUri = ref<string | null>(null);
const submitting = ref(false);
// Shown once, right after enrolment completes; the modal cannot be dismissed
// until the person confirms they saved them.
const recoveryCodes = ref<string[] | null>(null);
const acknowledged = ref(false);
const useRecovery = ref(false);

const canDismiss = computed(() => props.dismissible && !recoveryCodes.value);

const title = computed(() => {
  if (recoveryCodes.value) return "Save your recovery codes";
  if (!isEnrolling.value && useRecovery.value) return "Use a recovery code";
  return isEnrolling.value
    ? "Set up two-factor authentication"
    : `Confirm it's you`;
});

const description = computed(() => {
  if (recoveryCodes.value) {
    return "Use one of these if you ever lose access to your authenticator app.";
  }
  if (isEnrolling.value) {
    return "Scan this with an authenticator app, then enter the six digits it shows.";
  }
  return useRecovery.value
    ? "Enter one of the recovery codes you saved when you turned on two-factor authentication."
    : "Enter the current code from your authenticator app to continue.";
});
// Enrolment has to provision a seed first; challenging asks straight away.
const showCodeForm = computed(
  () => !isEnrolling.value || Boolean(otpauthUri.value),
);

/**
 * `uqr` is a zero-dependency pure-JS encoder: it builds the matrix and
 * returns an SVG string, making no network request of any kind. Inlining
 * that SVG as a data URI keeps the seed inside this tab — handing the URI to
 * a hosted QR image endpoint would put the shared secret on the wire in a
 * query string.
 */
const qrDataUri = computed(() => {
  if (!otpauthUri.value) return "";

  const svg = renderSVG(otpauthUri.value, {
    // A QR code is read by a camera, not a person, so it stays true black on
    // true white in both themes rather than following the colour tokens: a
    // low-contrast or inverted code is one many scanners refuse.
    whiteColor: "#ffffff",
    blackColor: "#000000",
    border: 2,
  });

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
});

/**
 * The `secret=` parameter is what an authenticator asks for when typed by
 * hand. If the URI ever fails to parse, the whole URI is offered instead —
 * still usable, just less pleasant, which beats an empty field.
 */
const manualKey = computed(() => {
  const uri = otpauthUri.value;
  if (!uri) return "";

  try {
    return new URL(uri).searchParams.get("secret") ?? uri;
  } catch {
    return uri;
  }
});

const manualKeyLabel = computed(() =>
  manualKey.value === otpauthUri.value ? "setup URI" : "setup key",
);

// Mirrors the `code` regex both Nitro routes validate with — this only saves
// a round trip to learn that four digits is not six.
const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the six digits from your app"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ code: "" });

// Length only: the server normalises case, dashes and look-alike letters, and
// says nothing about why a code was refused.
const recoverySchema = z.object({
  recoveryCode: z.string().min(12, "Enter the full recovery code"),
});

const recoveryState = reactive({ recoveryCode: "" });

// So a modal instance reused across a later challenge (or reopened after a
// failed enrolment) never shows a stale QR or leftover digits from the
// previous time it was open.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      otpauthUri.value = null;
      recoveryCodes.value = null;
      acknowledged.value = false;
      useRecovery.value = false;
      state.code = "";
      recoveryState.recoveryCode = "";
    }
  },
);

const apiBase = computed(() =>
  props.scope === "admin" ? "/api/admin/mfa" : "/api/mfa",
);

async function startSetup() {
  try {
    const { otpauthUri: uri } = await $fetch<{ otpauthUri: string }>(
      `${apiBase.value}/setup`,
      { method: "POST" },
    );
    otpauthUri.value = uri;
  } catch {
    notification.error("Could not start setup", "Close this and try again.");
  }
}

/**
 * Both flows post `{ code }` and answer `{ verified: true }`; only the route
 * differs — `/verify` completes enrolment, `/challenge` renews a login's
 * verified session, and each refuses the other's precondition.
 *
 * Failures stay generic. The backend already declines to say whether a
 * rejected code was wrong, replayed or out of window, and echoing its status
 * message here would give that back.
 */
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const endpoint = isEnrolling.value
    ? `${apiBase.value}/verify`
    : `${apiBase.value}/challenge`;

  submitting.value = true;
  try {
    const result = await $fetch<{ recoveryCodes?: string[] }>(endpoint, {
      method: "POST",
      body: { code: event.data.code },
    });

    if (isEnrolling.value && result.recoveryCodes?.length) {
      // Enrolment is complete server-side; the codes step keeps the modal
      // open, so `success` waits for it (callers close the modal on it).
      notification.success(
        "Two-factor authentication enabled",
        "Save your recovery codes before you continue.",
      );
      recoveryCodes.value = result.recoveryCodes;
      return;
    }

    notification.success(
      isEnrolling.value ? "Two-factor authentication enabled" : "Verified",
      isEnrolling.value
        ? "You'll be asked for a code again next time you log in."
        : "You're all set for this session.",
    );
    emit("success");
    emit("update:open", false);
  } catch (error) {
    state.code = "";
    notifyFailure(error, "Check your authenticator app and enter the current code.");
  } finally {
    submitting.value = false;
  }
}

function finishEnrolment() {
  notification.info(
    "You're all set",
    "You'll be asked for a code again next time you log in.",
  );
  emit("success");
  emit("update:open", false);
}

/**
 * Redeems one recovery code in place of the authenticator. The account keeps
 * its authenticator, so the message points at Security settings: a recovery code
 * is meant to be followed by fixing whatever made it necessary.
 */
async function onRecoverySubmit(event: FormSubmitEvent<{ recoveryCode: string }>) {
  submitting.value = true;
  try {
    const result = await $fetch<{ recoveryCodesRemaining: number }>(
      `${apiBase.value}/challenge`,
      { method: "POST", body: { recoveryCode: event.data.recoveryCode } },
    );
    const remaining = result.recoveryCodesRemaining;
    notification.warning(
      "Recovery code used",
      remaining === 0
        ? "That was your last code. Turn two-factor authentication off and on again in Security settings to get a new set."
        : `${remaining} recovery ${remaining === 1 ? "code" : "codes"} left. Set up a new authenticator in Security settings.`,
    );
    emit("success");
    emit("update:open", false);
  } catch (error) {
    recoveryState.recoveryCode = "";
    notifyFailure(error, "Check the code and try again. Each code works only once.");
  } finally {
    submitting.value = false;
  }
}

function notifyFailure(error: unknown, hint: string) {
  const rateLimited =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === 429;

  notification.error(
    rateLimited ? "Too many attempts" : "That code didn't work",
    rateLimited ? "Wait a few minutes before trying again." : hint,
  );
}
</script>
