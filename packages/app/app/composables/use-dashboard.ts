import { createSharedComposable } from "@vueuse/core";

const _useDashboard = () => {
  const route = useRoute();
  const router = useRouter();
  const currentTeam = useCurrentTeam();
  const isNotificationsSlideoverOpen = ref(false);

  const goToTeamRoute = (path: string) => {
    const slug = currentTeam.value?.slug;
    if (!slug) return;
    router.push(`/${slug}${path}`);
  };

  defineShortcuts({
    "g-d": () => goToTeamRoute("/dashboard"),
    "g-s": () => goToTeamRoute("/settings"),
    n: () => {
      isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value;
    },
  });

  watch(
    () => route.fullPath,
    () => {
      isNotificationsSlideoverOpen.value = false;
    },
  );

  return { isNotificationsSlideoverOpen };
};

export const useDashboard = createSharedComposable(_useDashboard);
