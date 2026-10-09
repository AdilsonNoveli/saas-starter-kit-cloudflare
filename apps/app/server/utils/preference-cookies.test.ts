import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0010 (Fase 3b), AC-011 and AC-013 (DEC-006): the login callback copies
// the locale and theme from the person's preferences row into the cookies the
// i18n module and the color mode module read on the server, and the color mode
// is stored in a cookie so the first paint already has the right theme.

const app = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(app, path), "utf8");
const IMPORT_TIMEOUT = 30_000;

describe("AC-011 the login brings the server preference to a new browser", () => {
  // SPECSFY: US-002 FR-002 FR-003 FR-008 AC-011
  it(
    "maps the preferences row to the i18n and color mode cookies, and the callback writes them",
    async () => {
      const { preferenceCookies } = await import("./preference-cookies");

      expect(preferenceCookies({ locale: "es", theme: "dark" })).toEqual({
        i18n_redirected: "es",
        "nuxt-color-mode": "dark",
      });
      expect(preferenceCookies({ locale: "pt-br", theme: "system" })).toEqual({
        i18n_redirected: "pt-br",
        "nuxt-color-mode": "system",
      });

      // The callback registers the session and writes the cookies from the
      // row after the User upsert and before the redirect (first paint).
      const callback = read("server/api/auth/callback.ts");
      const upsert = callback.indexOf("onConflictDoUpdate");
      const session = callback.indexOf("buildSessionRecord(");
      const cookies = callback.indexOf("preferenceCookies(");
      const redirect = callback.indexOf("sendRedirect(");
      expect(upsert).toBeGreaterThan(-1);
      expect(session).toBeGreaterThan(upsert);
      expect(cookies).toBeGreaterThan(upsert);
      expect(redirect).toBeGreaterThan(cookies);
      expect(callback.slice(cookies, redirect)).toMatch(/setCookie\(/u);
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-013 the first paint already uses the person's theme", () => {
  // SPECSFY: US-002 FR-007 FR-008 NFR-003 AC-013
  it("stores the color mode in the cookie the callback writes", () => {
    const config = read("nuxt.config.ts");
    const colorMode = config.match(/colorMode\s*:\s*\{([\s\S]*?)\}/u);
    expect(colorMode, "apps/app/nuxt.config.ts has no colorMode block").not.toBeNull();
    expect(colorMode?.[1]).toMatch(/storage\s*:\s*["']cookie["']/u);
    // The default key is the cookie name preferenceCookies writes; a custom one must match it.
    const key = colorMode?.[1]?.match(/storageKey\s*:\s*["']([^"']+)["']/u)?.[1];
    expect(key ?? "nuxt-color-mode").toBe("nuxt-color-mode");
  });
});
