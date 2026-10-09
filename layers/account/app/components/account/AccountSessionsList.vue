<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";
import { UNKNOWN_BROWSER, UNKNOWN_SYSTEM } from "../../../shared/utils/session-labels";

// Active sessions of the person (SPEC-0010, FR-011, AC-020, AC-021): one card
// per live login, this one marked, an "End" button on the others and "Sign out
// of the other sessions" for all of them at once. Both actions ask first,
// through the app's one confirmation dialog.
const { t, locale } = useI18n();
const notification = useNotification();
const trpc = useTrpcClient();

const {
  data: sessions,
  status,
  refresh,
} = trpc.account.sessions.list.useQuery(undefined, { lazy: true, server: false });

type Session = NonNullable<typeof sessions.value>[number];

const retryActions = computed<ButtonProps[]>(() => [
  {
    label: t("account.common.retry"),
    color: "neutral",
    variant: "outline",
    icon: "i-ph-arrow-clockwise-duotone",
    onClick: () => refresh(),
  },
]);

const MOBILE_SYSTEMS: ReadonlySet<string> = new Set(["iOS", "Android"]);

const others = computed(() => (sessions.value ?? []).filter((session) => !session.current));

function browserOf(session: Session) {
  return session.browser === UNKNOWN_BROWSER ? t("account.sessions.unknownBrowser") : session.browser;
}

function systemOf(session: Session) {
  return session.os === UNKNOWN_SYSTEM ? t("account.sessions.unknownSystem") : session.os;
}

function deviceOf(session: Session) {
  return t("account.sessions.device", { browser: browserOf(session), os: systemOf(session) });
}

function iconOf(session: Session) {
  return MOBILE_SYSTEMS.has(session.os) ? "i-ph-device-mobile-duotone" : "i-ph-desktop-duotone";
}

/** The country code as its name in the person's language, or the code itself. */
function countryName(code: string) {
  try {
    return new Intl.DisplayNames([locale.value], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function placeOf(session: Session) {
  const parts = [session.city, session.region, session.country ? countryName(session.country) : null];
  const known = parts.filter((part): part is string => Boolean(part));
  return known.length > 0 ? known.join(", ") : t("account.sessions.unknownPlace");
}

// The list arrives as JSON, so the dates are ISO strings whatever the type says.
function isoOf(value: Date | string) {
  return new Date(value).toISOString();
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function errorText(error: unknown) {
  return translateErrorCode(error instanceof Error ? error.message : "", (key) => t(key));
}

const revoking = ref<string | null>(null);

async function revoke(session: Session) {
  const confirmed = await notification.confirm({
    title: t("account.sessions.revokeConfirm.title", { device: deviceOf(session) }),
    description: t("account.sessions.revokeConfirm.description"),
    confirmLabel: t("account.sessions.revoke"),
    cancelLabel: t("account.common.cancel"),
    color: "error",
  });
  if (!confirmed) return;
  revoking.value = session.id;
  try {
    await trpc.account.sessions.revoke.mutate({ sid: session.id });
    notification.success(t("account.sessions.revoked"));
    await refresh();
  } catch (error) {
    notification.error(t("account.sessions.revokeFailed"), errorText(error));
  } finally {
    revoking.value = null;
  }
}

const signingOutOthers = ref(false);

async function signOutOthers() {
  const confirmed = await notification.confirm({
    title: t("account.sessions.signOutOthersConfirm.title"),
    description: t("account.sessions.signOutOthersConfirm.description"),
    confirmLabel: t("account.sessions.signOutOthersConfirm.action"),
    cancelLabel: t("account.common.cancel"),
    color: "error",
  });
  if (!confirmed) return;
  signingOutOthers.value = true;
  try {
    const { revoked } = await trpc.account.signOutOtherSessions.mutate();
    notification.success(t("account.sessions.signedOutOthers", { count: revoked }, revoked));
    await refresh();
  } catch (error) {
    notification.error(t("account.sessions.revokeFailed"), errorText(error));
  } finally {
    signingOutOthers.value = false;
  }
}
</script>

<template>
  <UPageCard
    :title="t('account.sessions.title')"
    :description="t('account.sessions.description')"
    variant="subtle"
  >
    <div v-if="status === 'pending' || status === 'idle'" class="space-y-3" aria-hidden="true">
      <USkeleton v-for="index in 2" :key="index" class="h-24 w-full" />
    </div>

    <UAlert
      v-else-if="status === 'error'"
      color="error"
      variant="subtle"
      icon="i-ph-warning-circle-duotone"
      :title="t('account.sessions.loadFailed')"
      :actions="retryActions"
    />

    <template v-else>
      <ul role="list" class="space-y-3" :aria-label="t('account.sessions.title')">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="flex flex-col gap-4 rounded-md border border-default bg-default p-4 sm:flex-row sm:items-start"
        >
          <UIcon :name="iconOf(session)" class="size-6 shrink-0 text-muted" aria-hidden="true" />

          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium text-highlighted break-words">{{ deviceOf(session) }}</p>
              <UBadge
                v-if="session.current"
                color="primary"
                variant="subtle"
                icon="i-ph-check-circle-duotone"
                :label="t('account.sessions.current')"
              />
            </div>

            <p class="flex items-start gap-1.5 text-sm text-muted break-words">
              <UIcon name="i-ph-map-pin-duotone" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{{ placeOf(session) }}</span>
            </p>

            <dl class="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div class="flex flex-wrap gap-x-1.5">
                <dt class="text-muted">{{ t("account.sessions.createdAt") }}</dt>
                <dd class="text-default">
                  <time :datetime="isoOf(session.createdAt)">{{ formatDate(session.createdAt) }}</time>
                </dd>
              </div>
              <div class="flex flex-wrap gap-x-1.5">
                <dt class="text-muted">{{ t("account.sessions.lastUsedAt") }}</dt>
                <dd class="text-default">
                  <time :datetime="isoOf(session.lastUsedAt)">{{ formatDate(session.lastUsedAt) }}</time>
                </dd>
              </div>
            </dl>
          </div>

          <UButton
            v-if="!session.current"
            color="neutral"
            variant="outline"
            icon="i-ph-x-circle-duotone"
            class="w-fit shrink-0"
            :label="t('account.sessions.revoke')"
            :aria-label="t('account.sessions.revokeLabel', { device: deviceOf(session) })"
            :loading="revoking === session.id"
            :disabled="signingOutOthers || (revoking !== null && revoking !== session.id)"
            @click="revoke(session)"
          />
        </li>
      </ul>

      <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p v-if="others.length === 0" class="text-sm text-muted">
          {{ t("account.sessions.onlyThis") }}
        </p>
        <UButton
          v-else
          color="neutral"
          variant="outline"
          icon="i-ph-sign-out-duotone"
          class="w-fit sm:ms-auto"
          :label="t('account.sessions.signOutOthers')"
          :loading="signingOutOthers"
          :disabled="revoking !== null"
          @click="signOutOthers"
        />
      </div>
    </template>
  </UPageCard>
</template>
