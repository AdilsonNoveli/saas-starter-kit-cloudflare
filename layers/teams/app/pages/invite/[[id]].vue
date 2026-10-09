<template>
  <div>
    <UModal
      :open="true"
      :dismissible="!invite"
      @update:open="(v) => !v && close()"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ t("teams.invite.title") }}</span>
              <UButton
                v-if="!invite"
                icon="i-ph-x-duotone"
                variant="ghost"
                color="neutral"
                :aria-label="t('teams.invite.close')"
                @click="close"
              />
            </div>
          </template>

          <div v-if="invite" class="space-y-4">
            <div class="flex items-center space-x-4">
              <UAvatar :src="invite.team.logo || ''" :alt="invite.team.name" />
              <div>
                <p class="font-semibold">{{ invite.team.name }}</p>
                <p class="text-sm text-muted">
                  {{
                    t("teams.invite.invitedBy", {
                      name: invite.invitedBy.name ?? "",
                      email: invite.invitedBy.email,
                    })
                  }}
                </p>
              </div>
            </div>
            <i18n-t keypath="teams.invite.message" tag="p" scope="global">
              <template #role>
                <span class="font-semibold">{{ invite.role.name }}</span>
              </template>
            </i18n-t>
            <UAlert
              v-if="acceptError"
              icon="i-ph-warning-circle-duotone"
              variant="subtle"
              color="error"
              :description="acceptError"
            />
          </div>

          <div v-else>
            <UAlert
              icon="i-ph-x-duotone"
              variant="subtle"
              color="error"
              :title="t('teams.invite.notFoundTitle')"
              :description="t('teams.invite.notFoundDescription')"
            />
          </div>

          <template v-if="invite" #footer>
            <div class="w-full flex justify-end gap-2">
              <UButton
                color="error"
                variant="outline"
                :loading="declining"
                :label="t('teams.invite.decline')"
                @click="declineInvite"
              />
              <UButton
                :loading="accepting"
                :label="t('teams.invite.accept')"
                @click="acceptInvite"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const inviteId = route.params.id as string;

const accepting = ref(false);
const declining = ref(false);
const acceptError = ref("");

const { t, te } = useI18n();

const { data: teams } = await useTeamsList();
const invite = useInviteStore().invite;

/** The tRPC error code (`NOT_FOUND`, `CONFLICT`, `FORBIDDEN`...) of a failed call, if any. */
function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  const { data } = error as { data?: { code?: unknown } | null };
  return typeof data?.code === "string" ? data.code : undefined;
}

async function acceptInvite() {
  accepting.value = true;
  acceptError.value = "";
  try {
    await useTrpcClient().invites.acceptInvite.mutate({ inviteId });
    navigateTo(`/${invite?.team.slug}`);
  } catch (error) {
    // Shown next to the action, localized by the tRPC error code; a code
    // without its own key gets the generic one, never the server's raw text.
    const key = `teams.invite.errors.${errorCode(error) ?? "UNKNOWN"}`;
    acceptError.value = te(key) ? t(key) : t("teams.invite.errors.UNKNOWN");
  } finally {
    accepting.value = false;
  }
}

function declineInvite() {
  // TODO: decline mutation?
  close();
}

function redirect() {
  if (teams.value) {
    const team = teams.value.find((t) => t.slug === invite?.team.slug);
    if (team) {
      return navigateTo(`/${team.slug}`);
    }
  }
}

function close() {
  navigateTo("/");
}

watch([() => teams.value, () => invite], redirect);
onMounted(redirect);

// Protected, like claim/[id].vue: an anonymous visitor goes through the
// global auth middleware to sign in or sign up and comes back to this URL,
// instead of reaching an accept button that can only fail (AC-007).
definePageMeta({
  middleware: "invite",
});
</script>
