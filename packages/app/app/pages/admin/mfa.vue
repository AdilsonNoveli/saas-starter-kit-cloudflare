<template>
  <UDashboardPanel id="admin-mfa">
    <template #header>
      <UDashboardNavbar title="Two-factor authentication">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageCard
        v-if="statusPending"
        title="Checking your second factor…"
        icon="i-lucide-loader"
        variant="subtle"
        class="max-w-2xl"
      />

      <UPageCard
        v-else-if="!status"
        title="Could not read your MFA status"
        description="Something went wrong reading your account. Try again."
        icon="i-lucide-circle-alert"
        variant="subtle"
        class="max-w-2xl"
      >
        <UButton
          label="Retry"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          class="self-start"
          loading-auto
          @click="loadStatus"
        />
      </UPageCard>

      <!-- Nothing to do. Normally unreachable: the layout redirects here only
           while MFA is unresolved, and away once it is. -->
      <UPageCard
        v-else-if="status.mfaEnrolled && status.sessionElevated"
        title="You're already authenticated"
        description="Your elevated session is active."
        icon="i-lucide-shield-check"
        variant="subtle"
        class="max-w-2xl"
      >
        <UButton
          label="Go to the console"
          icon="i-lucide-arrow-right"
          trailing
          to="/admin"
          class="self-start"
        />
      </UPageCard>

      <!-- Enrolment and re-authentication share this card: both end in the same
           six-digit field posted to a route that mints the same elevated
           session. Only the copy, and the QR step in front of it, differ. -->
      <UPageCard
        v-else
        :title="isEnrolling ? 'Set up your authenticator' : `Confirm it's you`"
        :description="
          isEnrolling
            ? 'The platform console asks for a time-based code on top of your password. Scan this with an authenticator app, then enter the six digits it shows.'
            : 'Your elevated session has expired. Enter the current code from your authenticator app to continue.'
        "
        :icon="isEnrolling ? 'i-lucide-shield-plus' : 'i-lucide-shield-check'"
        variant="subtle"
        class="max-w-2xl"
      >
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
            <UFormField label="Six-digit code" name="code">
              <UInput
                v-model="state.code"
                class="font-mono"
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
      </UPageCard>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { renderSVG } from "uqr";
import { z } from "zod";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

/**
 * The one screen under `/admin` that must not assume MFA is already resolved —
 * it is where it gets resolved. So it reads `/api/admin/mfa/status` itself: a
 * plain Nitro route, deliberately outside `platformAdminProcedure`, which
 * would otherwise demand the very elevated session this page exists to mint.
 */
type MfaStatus = {
  isPlatformAdmin: boolean;
  mfaEnrolled: boolean;
  sessionElevated: boolean;
};

const toast = useToast();
const { copy, copied } = useClipboard();

const status = ref<MfaStatus | null>(null);
const statusPending = ref(true);

async function loadStatus() {
  statusPending.value = true;
  try {
    status.value = await $fetch<MfaStatus>("/api/admin/mfa/status");
  } catch {
    status.value = null;
  } finally {
    statusPending.value = false;
  }
}

// Client-side only, on purpose: nothing about the enrolment secret should ever
// be part of a server-rendered payload.
onMounted(loadStatus);

const otpauthUri = ref<string | null>(null);
const submitting = ref(false);

const isEnrolling = computed(() => status.value?.mfaEnrolled === false);
// Enrolment has to provision a seed first; re-authentication asks straight away.
const showCodeForm = computed(
  () => !isEnrolling.value || Boolean(otpauthUri.value),
);

/**
 * `uqr` is a zero-dependency pure-JS encoder: it builds the matrix and returns
 * an SVG string, making no network request of any kind. Inlining that SVG as a
 * data URI keeps the seed inside this tab — handing the URI to a hosted QR
 * image endpoint would put the shared secret on the wire in a query string.
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

// Mirrors the `code` regex both Nitro routes validate with — this only saves a
// round trip to learn that four digits is not six.
const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the six digits from your app"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ code: "" });

async function startSetup() {
  try {
    const { otpauthUri: uri } = await $fetch<{ otpauthUri: string }>(
      "/api/admin/mfa/setup",
      { method: "POST" },
    );
    otpauthUri.value = uri;
  } catch {
    toast.add({
      title: "Could not start setup",
      description: "Reload the page and try again.",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  }
}

/**
 * Both flows post `{ code }` and answer `{ verified: true }`; only the route
 * differs — `/verify` completes enrolment, `/challenge` renews an expired
 * session, and each refuses the other's precondition — so one handler covers
 * both rather than two near-identical copies.
 *
 * Failures stay generic. The backend already declines to say whether a
 * rejected code was wrong, replayed or out of window, and echoing its status
 * message here would give that back.
 */
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const endpoint = isEnrolling.value
    ? "/api/admin/mfa/verify"
    : "/api/admin/mfa/challenge";

  submitting.value = true;
  try {
    await $fetch(endpoint, { method: "POST", body: { code: event.data.code } });

    toast.add({
      title: "Two-factor authentication confirmed",
      description: "Your elevated session is active for the next 30 minutes.",
      color: "success",
      icon: "i-lucide-check",
    });
    await navigateTo("/admin");
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
