import { describe, expect, it } from "vitest";
import { AUTH_KV_USER_PREFIXES, authKvMatches } from "./reset-database-core";

// SPEC-0009 (Fase 3a), AC-024: `db:reset` also purges the issuer's session
// records (`oauth:refresh`), which would otherwise outlive the users they point
// to, and never the issuer's own signing or encryption keys.
// OpenAuth joins key parts with U+001F (storage/cloudflare.js), so every prefix
// ends with it: `users` must not also match a key that merely starts with "users".
const SEPARATOR = "\u001f";
const prefixes: readonly string[] = AUTH_KV_USER_PREFIXES;

describe("AuthKV prefixes cleared by db:reset", () => {
  // SPECSFY: US-005 FR-006 AC-024
  it("includes the oauth:refresh session records", () => {
    expect(prefixes).toContain(`oauth:refresh${SEPARATOR}`);
  });

  // SPECSFY: US-005 FR-006 AC-024
  it("keeps clearing the identity keys and never the signing or encryption keys", () => {
    expect(prefixes).toEqual(expect.arrayContaining([`email${SEPARATOR}`, `users${SEPARATOR}`, `oauth:refresh${SEPARATOR}`]));
    const issuerKeys = [`signing:key${SEPARATOR}abc`, `encryption:key${SEPARATOR}abc`];
    const reached = issuerKeys.filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));
    expect(reached).toEqual([]);
    for (const prefix of prefixes) expect(prefix.endsWith(SEPARATOR), prefix).toBe(true);
  });
});

describe("AuthKV namespace of the app and stage", () => {
  const titles = [
    "nuxfire-desktop-h6uunuvadilson-authkvnamespace-bfoovfou",
    "serelius-stage-authkvnamespace-noouaxaa",
    "serelius-desktop-h6uunuvadilson-authkvnamespace-dmfensmw",
  ].map((title) => ({ title }));

  it("matches the app and the stage, not a namespace an earlier project name left for the same stage", () => {
    expect(authKvMatches(titles, "serelius", "desktop-h6uunuvadilson")).toEqual([
      { title: "serelius-desktop-h6uunuvadilson-authkvnamespace-dmfensmw" },
    ]);
    expect(authKvMatches(titles, "serelius", "stage")).toEqual([{ title: "serelius-stage-authkvnamespace-noouaxaa" }]);
  });

  it("matches nothing for a stage that was never deployed", () => {
    expect(authKvMatches(titles, "serelius", "production")).toEqual([]);
  });
});
