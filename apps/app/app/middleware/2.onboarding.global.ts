// The onboarding gate (SPEC-0010, DEC-002). Lives in the Composition Root, like
// 1.teams.global.ts, because a layer's global middleware runs before
// 0.auth.global.ts (see that file); it holds no rule of its own: the decision
// is onboardingRedirect (layers/account/shared/utils/onboarding-gate.ts),
// over the preferences the session already carries.
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useSession();
  // No session: a public page (`auth: false`) or 0.auth.global.ts already
  // sent the visitor to sign in.
  if (!user.value) return;
  const target = onboardingRedirect({
    preferences: user.value.preferences ?? null,
    path: to.path,
  });
  if (target) return navigateTo(target);
});
