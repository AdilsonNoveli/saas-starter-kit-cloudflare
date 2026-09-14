export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith("/api")) return;
  // routes can opt out of forced auth with definePageMeta({ auth: false }),
  // e.g. the invite page — a logged-out user must be able to see it before
  // being sent to sign up.
  if (to.meta.auth === false) return;
  const { callback, client, redirect, sessionState } = useAuth();
  // Plain useFetch()/$fetch() to our own /api route during SSR goes through
  // Nitro's generic internal dispatch, which does not carry the incoming
  // request's cookies and — observed directly via wrangler tail — hung
  // indefinitely for every single page route once this middleware started
  // awaiting it. useRequestFetch() is Nuxt's own request-bound $fetch tied
  // to the current H3 event: it correctly carries the incoming request's
  // context (cookies included) and goes through the request's own
  // dispatch path instead of the generic one.
  const data = import.meta.server
    ? await useRequestFetch()("/api/auth/session").catch(() => null)
    : await $fetch("/api/auth/session").catch(() => null);
  if (data) {
    sessionState.value = { user: data };
    return;
  }
  sessionState.value = {};
  redirect.value = to.path;
  const { url } = await client.authorize(callback, "code");
  return navigateTo(url, { external: true });
});
