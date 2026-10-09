// The one slug rule (FR-006, AC-037, DEC-014): the create modal, the claim
// page and the server (teams.create, billing provisioning, onboarding) all
// derive and check a Space slug here, so client and server can never disagree.
// Framework-agnostic on purpose: no Nuxt or Nitro global, imported explicitly.

export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 50;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A Space lives at `/<slug>`, next to every static route of the app, so a
 * slug equal to a static first path segment would shadow that route (or be
 * shadowed by it). Covers every static top-level page segment of apps/app and
 * its layers (slug.test.ts fails when a new one is missing), the segments
 * served under the optional `[[team]]` prefix, and the server prefixes.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Static top-level pages of apps/app and the layers.
  "account-settings",
  "admin",
  "buy",
  "claim",
  "invite",
  "onboarding",
  "select-team",
  // Pages under the optional `[[team]]` prefix, reachable without a slug.
  "dashboard",
  "kanban",
  "settings",
  // Server and asset prefixes.
  "_nuxt",
  "api",
  "auth",
  "static",
]);

export type SlugValidation = "ok" | "slug_invalid" | "slug_reserved";

/** Lower-case ASCII slug: accents removed (`João` → `joao`), anything else a single hyphen. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, "");
}

export function validateSlug(slug: string): SlugValidation {
  if (
    slug.length < SLUG_MIN_LENGTH ||
    slug.length > SLUG_MAX_LENGTH ||
    !SLUG_PATTERN.test(slug)
  ) {
    return "slug_invalid";
  }
  return RESERVED_SLUGS.has(slug) ? "slug_reserved" : "ok";
}
