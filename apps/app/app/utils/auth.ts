import { createClient, type Client } from "@openauthjs/openauth/client";
import type { SubjectUser } from "@nuxfire/functions/subjects";

/**
 * What /api/auth/session actually returns: the OpenAuth subject plus the
 * fields getUser() adds on the server. `SubjectUser` alone describes the token
 * payload, not this response — `permissions`/`teams` have always been sent and
 * were simply never typed here (nuxt-authorization reads them off this same
 * object through its own `User` interface in shared/utils/abilities.ts).
 *
 * `isPlatformAdmin` is a UX hint only — it decides whether admin navigation is
 * rendered. Authorisation for anything under `admin.*` is decided server-side
 * by platformAdminProcedure, which additionally requires enrolled MFA and a
 * fresh elevated session; neither is reflected here on purpose.
 *
 * `mfaEnabled` is the same kind of hint, for the account's own two-factor
 * setting: whether *this login* has already passed its one-time TOTP
 * challenge is not reflected here either — layouts/dashboard.vue reads that
 * separately from /api/mfa/status, and protectedProcedure is what actually
 * enforces it.
 */
type SessionUser = SubjectUser & {
  permissions?: Record<string, string[]>;
  teams?: string[];
  isPlatformAdmin?: boolean;
  mfaEnabled?: boolean;
};

type UserSession = {
  user?: SessionUser;
};

const useSessionState = () =>
  useState<UserSession>("nuxfire-session", () => ({}));

export const useSession = () => {
  const sessionState = useSessionState();
  const clear = async () => {
    sessionState.value = {};
    await $fetch("/api/auth/session", { method: "DELETE" });
  };
  const refresh = async () => {
    // See middleware/0.auth.global.ts for why this isn't plain useFetch().
    const data = import.meta.server
      ? await useRequestFetch()("/api/auth/session").catch(() => null)
      : await $fetch("/api/auth/session").catch(() => null);
    if (data) {
      sessionState.value = { user: data };
      return;
    } else {
      sessionState.value = {};
    }
  };
  return {
    loggedIn: computed(() => !!sessionState.value.user),
    user: computed(() => sessionState.value.user || null),
    session: sessionState,
    clear,
    refresh,
  };
};

const useAuthRedirect = () =>
  useCookie("nuxfire-redirect", {
    sameSite: "lax",
  });

let _client: Client;
export const useAuth = () => {
  const client = _client
    ? _client
    : (_client = createClient({
        issuer: useRuntimeConfig().public.authUrl,
        clientID: useRuntimeConfig().public.authClientID,
      }));
  const callback = useRequestURL().origin + "/api/auth/callback";
  const redirect = useAuthRedirect();
  const sessionState = useSessionState();
  return {
    sessionState,
    client,
    callback,
    redirect,
  };
};
