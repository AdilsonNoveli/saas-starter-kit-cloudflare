// The onboarding gate (SPEC-0010, DEC-002), pure so it runs in Vitest: the
// session already carries `preferences`, so the decision needs no server call.
// `apps/app/app/middleware/2.onboarding.global.ts` only calls it.
const ONBOARDING_PATH = "/onboarding";

// Not app pages: the API, the purchase and claim flows, and the invitation
// page (which must work before onboarding to offer the invited Space).
// Matched per path segment, so a Space slug like `buyers` is still an app page.
const EXEMPT_SEGMENTS: ReadonlySet<string> = new Set(["api", "buy", "claim", "invite"]);

/** Where to send the person, or null to stay. */
export function onboardingRedirect(input: { preferences: unknown | null; path: string }) {
  const segment = input.path.split("/")[1] ?? "";
  if (EXEMPT_SEGMENTS.has(segment)) return null;
  const onOnboarding = segment === ONBOARDING_PATH.slice(1);
  if (input.preferences === null) return onOnboarding ? null : ONBOARDING_PATH;
  return onOnboarding ? "/" : null;
}
