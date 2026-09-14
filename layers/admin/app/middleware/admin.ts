/**
 * Keeps non-admins out of the `/admin` shell. This is UX only — it decides
 * whether the console is rendered, nothing more. Every `admin.*` procedure is
 * independently guarded server-side by `platformAdminProcedure` (which also
 * demands enrolled MFA and a fresh elevated session), so bypassing this
 * middleware gets you an empty shell and a `FORBIDDEN` from every request.
 */
export default defineNuxtRouteMiddleware(() => {
  const { user } = useSession();
  if (!user.value?.isPlatformAdmin) {
    // `/dashboard` is the app's landing route for a signed-in user; without a
    // team it forwards to `/select-team` via middleware/1.teams.global.ts.
    return navigateTo("/dashboard");
  }
});
