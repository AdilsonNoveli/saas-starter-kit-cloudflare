<script setup lang="ts">
import type { Preferences } from "../../shared/utils/preferences";
// Pure and free of server imports: the same defaults the server applies when
// the formats are left out (DMY in pt-br and es, MDY in en).
import { defaultFormatsFor } from "../../shared/utils/preferences";

// The onboarding (SPEC-0010, FR-004, AC-002): three steps that the gate
// (apps/app/app/middleware/2.onboarding.global.ts) sends a person to until
// their preferences exist. Nothing is saved until the end: one call writes the
// name, the preferences and the Space (or accepts the invitation) together.
definePageMeta({ layout: "onboarding" });

const { t, locale } = useI18n();
const colorMode = useColorMode();
const notification = useNotification();
const trpc = useTrpcClient();

useSeoMeta({ title: () => t("account.onboarding.brand.title") });

const { data: onboarding } = await trpc.account.onboarding.state.useQuery();

const THEMES = ["system", "light", "dark"] as const;

const step = ref(0);
const name = ref(onboarding.value?.name ?? "");
const space = ref({ name: onboarding.value?.spaceName ?? "", slug: "" });
const preferences = ref<Preferences>({
  locale: locale.value,
  // Replaced by the browser's own zone once on the client.
  timeZone: "UTC",
  theme: THEMES.find((theme) => theme === colorMode.preference) ?? "system",
  ...defaultFormatsFor(locale.value),
});
const invite = computed(() => onboarding.value?.invite ?? null);

onMounted(() => {
  preferences.value = {
    ...preferences.value,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
});

const titles = computed(() => [
  t("account.onboarding.steps.profile"),
  t("account.onboarding.steps.preferences"),
  t("account.onboarding.steps.space"),
]);

const spaceStep = useTemplateRef<{ setSlugError(message: string): void }>("spaceStep");
const completing = ref(false);

async function complete() {
  completing.value = true;
  const common = { name: name.value.trim(), preferences: preferences.value };
  try {
    const { slug } = await trpc.account.onboarding.complete.mutate(
      invite.value
        ? { ...common, inviteId: invite.value.id }
        : { ...common, space: { name: space.value.name.trim(), slug: space.value.slug } },
    );
    // The session must carry the new preferences, or the gate sends the
    // person straight back here.
    await useSession().refresh();
    await navigateTo(`/${slug}/dashboard`);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const message = translateErrorCode(code, (key) => t(key));
    // An address refusal belongs next to its field; anything else is a notice.
    if (code.startsWith("slug_") && spaceStep.value) spaceStep.value.setSlugError(message);
    else notification.error(t("account.onboarding.failed"), message);
  } finally {
    completing.value = false;
  }
}
</script>

<template>
  <OnboardingSteps v-model="step" :titles="titles">
    <OnboardingProfileStep v-if="step === 0" v-model="name" @next="step = 1" />
    <OnboardingPreferencesStep
      v-else-if="step === 1"
      v-model="preferences"
      @back="step = 0"
      @next="step = 2"
    />
    <OnboardingSpaceStep
      v-else
      ref="spaceStep"
      v-model="space"
      :invite="invite"
      :loading="completing"
      @back="step = 1"
      @submit="complete"
    />
  </OnboardingSteps>
</template>
