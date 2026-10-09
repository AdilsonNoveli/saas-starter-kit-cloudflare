<script setup lang="ts">
// The right side of every app header (SPEC-0010, AC-012, DEC-005): language,
// light or dark, and the account menu, in one place instead of twelve. The two
// switches are the ones apps/web draws too (packages/tokens). Each change
// applies at once through the switch itself (cookie and screen) and is then
// saved to the person's preferences, so it follows them to other devices.
const { t } = useI18n();
const notification = useNotification();
const updatePreferences = useTrpcClient().account.preferences.update;

/** The tRPC code of a failed call (`PRECONDITION_FAILED`, `BAD_REQUEST`...), if any. */
function trpcCode(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  const { data } = error as { data?: { code?: unknown } | null };
  return typeof data?.code === "string" ? data.code : undefined;
}

async function save(edit: { locale?: string; theme?: string }) {
  try {
    await updatePreferences.mutate(edit);
  } catch (error) {
    // Someone still in the onboarding has no preferences row yet: the cookie
    // already holds the choice and the onboarding saves it at the end.
    if (trpcCode(error) === "PRECONDITION_FAILED") return;
    notification.error(
      t("account.header.notSaved"),
      translateErrorCode(error instanceof Error ? error.message : "", (key) => t(key)),
    );
  }
}

const saveLocale = (locale: string) => save({ locale });
const saveTheme = (theme: string) => save({ theme });
</script>

<template>
  <div class="flex items-center gap-1">
    <LocaleSwitch :label="t('account.header.language')" @change="saveLocale" />
    <ColorModeSwitch :label="t('account.header.colorMode')" @change="saveTheme" />
    <AccountUserDropdown collapsed size="md" />
  </div>
</template>
