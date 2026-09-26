<template>
  <UDashboardGroup unit="rem" :persistent="false">
    <UDashboardSidebar
      id="admin"
      v-model:open="open"
      v-model:collapsed="collapsed"
      :collapsed-size="4.5"
      :default-size="16"
      collapsible
      resizable
      :ui="{ root: 'border-e border-default' }"
    >
      <!--
        No collapse toggle here — every admin page already has one in its
        own UDashboardNavbar #leading slot, so a second one here was two
        controls doing the same thing.
      -->
      <template #header="{ collapsed: isCollapsed }">
        <div class="flex items-center gap-2 w-full py-2" :class="isCollapsed && 'justify-center'">
          <template v-if="isCollapsed">
            <img src="/nuxfire-icon.svg" alt="Nuxfire" class="h-6 w-auto dark:hidden" />
            <img src="/nuxfire-icon-white.svg" alt="Nuxfire" class="h-6 w-auto hidden dark:block" />
          </template>
          <template v-else>
            <img src="/nuxfire.svg" alt="Nuxfire" class="h-5 w-auto dark:hidden" />
            <img src="/nuxfire-white.svg" alt="Nuxfire" class="h-5 w-auto hidden dark:block" />
            <UBadge label="Admin" color="warning" variant="subtle" size="sm" />
          </template>
        </div>
      </template>

      <template #default="{ collapsed: isCollapsed }">
        <!-- See layouts/dashboard.vue: the gutter belongs to the sidebar. -->
        <UNavigationMenu
          :collapsed="isCollapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />
      </template>
    </UDashboardSidebar>

    <!--
      While the MFA status read is in flight, nothing behind this veil has
      real data yet (every admin.* call is independently gated server-side
      by platformAdminProcedure and fails closed) — but showing an
      interactive, unblurred shell for that moment still *reads* as
      unrestricted access. This closes that gap visually, not just by data.
    -->
    <div
      v-if="checkingMfa"
      class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-default/40"
    >
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
    </div>

    <slot />

    <AccountMfaSetupModal
      v-model:open="mfaModalOpen"
      :mode="mfaMode"
      scope="admin"
      :dismissible="false"
      @success="onMfaVerified"
    />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

/**
 * The platform-owner shell. Deliberately not `dashboard.vue`: no team
 * switcher, no tenant notifications, and a badged header — the point is that
 * "am I looking at one customer or at every customer?" is answerable at a
 * glance, because the actions here are cross-tenant.
 */
const open = ref(false);
const collapsed = ref(true);

const closeSidebar = () => {
  open.value = false;
};

/**
 * The MFA gate, centralized in one modal (AccountMfaSetupModal, scope=
 * "admin") instead of the full-page pages/admin/mfa.vue this used to
 * redirect to — that page duplicated the same QR/code-form markup with a
 * plain UDashboardPanel chrome and no blurred backdrop. Every `admin.*`
 * procedure already rejects an unenrolled or un-elevated admin with
 * `FORBIDDEN`, but that leaves the screens empty and the user guessing; one
 * status read as the shell mounts turns that into this modal instead.
 *
 * Still a client-side read, not `middleware/admin.ts`, for the same reason
 * as before: the session payload does not carry MFA state, and one HTTP
 * call per navigation would be the price of putting it there.
 */
const mfaModalOpen = ref(false);
const mfaMode = ref<"enroll" | "challenge">("challenge");
// Starts true so the blurred veil covers the shell from first paint, not
// just from whenever the status read happens to resolve.
const checkingMfa = ref(true);

onMounted(async () => {
  collapsed.value = true;

  try {
    const status = await $fetch<{
      isPlatformAdmin: boolean;
      mfaEnrolled: boolean;
      sessionElevated: boolean;
    }>("/api/admin/mfa/status");

    if (status.isPlatformAdmin && (!status.mfaEnrolled || !status.sessionElevated)) {
      mfaMode.value = status.mfaEnrolled ? "challenge" : "enroll";
      mfaModalOpen.value = true;
    }
  } catch {
    // A failed status read is not grounds to bounce anyone: the procedures
    // behind each screen are the real gate, and this is only the shortcut to
    // the screen that fixes it.
  } finally {
    checkingMfa.value = false;
  }
});

function onMfaVerified() {
  mfaModalOpen.value = false;
}

const links = computed<NavigationMenuItem[]>(() => [
  {
    label: "Overview",
    icon: "i-lucide-bolt",
    to: "/admin",
    exact: true,
    onSelect: closeSidebar,
  },
  {
    label: "Companies",
    icon: "i-lucide-warehouse",
    to: "/admin/companies",
    onSelect: closeSidebar,
  },
  {
    label: "Plans",
    icon: "i-lucide-dollar-sign",
    to: "/admin/plans",
    onSelect: closeSidebar,
  },
  {
    label: "Pending purchases",
    icon: "i-lucide-hourglass",
    to: "/admin/pending-purchases",
    onSelect: closeSidebar,
  },
  {
    label: "Queue",
    icon: "i-lucide-loader",
    to: "/admin/queue",
    onSelect: closeSidebar,
  },
  {
    label: "Audit Log",
    icon: "i-lucide-history",
    to: "/admin/audit-log",
    onSelect: closeSidebar,
  },
  {
    label: "Notifications",
    icon: "i-lucide-bell",
    to: "/admin/notifications",
    onSelect: closeSidebar,
  },
  {
    // Without this the console is a one-way door: nothing else in the admin
    // shell links back to the tenant app.
    label: "Back to app",
    icon: "i-lucide-arrow-left",
    to: "/dashboard",
    onSelect: closeSidebar,
  },
]);
</script>
