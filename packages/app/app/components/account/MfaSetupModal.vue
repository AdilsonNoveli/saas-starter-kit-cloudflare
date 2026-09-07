<template>
  <UModal
    :open="open"
    :dismissible="dismissible"
    :close="dismissible ? undefined : false"
    :title="
      isEnrolling ? 'Set up two-factor authentication' : `Confirm it's you`
    "
    :description="
      isEnrolling
        ? 'Scan this with an authenticator app, then enter the six digits it shows.'
        : 'Enter the current code from your authenticator app to continue.'
    "
    :ui="{
      overlay: 'backdrop-blur-md bg-default/40',
      content: 'shadow-none ring ring-default/60 max-w-xl',
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <UButton
          v-if="isEnrolling && !otpauthUri"
          label="Generate code"
          icon="i-lucide-qr-code"
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
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
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
          v-if="showCodeForm"
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
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { renderSVG } from "uqr";
import { z } from "zod";

/**
 * Self-service two-factor setup and re-verification for a regular user's own
 * account, adapted from pages/admin/mfa.vue for use as a modal rather than a
 * full page: layouts/dashboard.vue mounts one instance in `mode="challenge"`,
 * non-dismissible, whenever an enrolled account's login hasn't verified yet;
 * account-settings/security.vue mounts a separate instance in
 * `mode="enroll"` for the voluntary "Enable 2FA" flow. Both post to
 * /api/mfa/* — plain Nitro routes, deliberately outside protectedProcedure
 * for the reasons documented on each of those routes.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: "enroll" | "challenge";
    dismissible?: boolean;
  }>(),
  { dismissible: true },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const toast = useToast();
const { copy, copied } = useClipboard();

const isEnrolling = computed(() => props.mode === "enroll");
const otpauthUri = ref<string | null>(null);
const submitting = ref(false);
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

// So a modal instance reused across a later challenge (or reopened after a
// failed enrolment) never shows a stale QR or leftover digits from the
// previous time it was open.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      otpauthUri.value = null;
      state.code = "";
    }
  },
);

async function startSetup() {
  try {
    const { otpauthUri: uri } = await $fetch<{ otpauthUri: string }>(
      "/api/mfa/setup",
      { method: "POST" },
    );
    otpauthUri.value = uri;
  } catch {
    toast.add({
      title: "Could not start setup",
      description: "Close this and try again.",
      color: "error",
      icon: "i-lucide-circle-x",
    });
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
  const endpoint = isEnrolling.value ? "/api/mfa/verify" : "/api/mfa/challenge";

  submitting.value = true;
  try {
    await $fetch(endpoint, { method: "POST", body: { code: event.data.code } });

    toast.add({
      title: isEnrolling.value
        ? "Two-factor authentication enabled"
        : "Verified",
      description: isEnrolling.value
        ? "You'll be asked for a code again next time you log in."
        : "You're all set for this session.",
      color: "success",
      icon: "i-lucide-check",
    });
    emit("success");
    emit("update:open", false);
  } catch (error) {
    const rateLimited =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 429;

    state.code = "";
    toast.add({
      title: rateLimited ? "Too many attempts" : "That code didn't work",
      description: rateLimited
        ? "Wait a few minutes before trying again."
        : "Check your authenticator app and enter the current code.",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    submitting.value = false;
  }
}
</script>
