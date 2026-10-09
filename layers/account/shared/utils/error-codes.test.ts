import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES, translateErrorCode } from "./error-codes";

// SPEC-0010 (Fase 3b), AC-040: the touched procedures answer with a stable code
// and the client translates it from `errors.<code>` in the layer's locale files;
// an unknown code falls to `errors.generic`, never to the server's raw text.
const layerRoot = join(import.meta.dirname, "../..");
const LOCALE_FILES = ["en.json", "pt-BR.json", "es.json"];
const STABLE_CODES = [
  "slug_taken",
  "slug_reserved",
  "slug_invalid",
  "email_taken",
  "email_unchanged",
  "email_managed_by_provider",
  "invalid_code",
  "code_expired",
  "too_many_requests",
  "invalid_time_zone",
  "invalid_locale",
  "invite_unavailable",
];

type Messages = { errors?: Record<string, unknown> };

function readLocale(file: string): Messages {
  return JSON.parse(readFileSync(join(layerRoot, "i18n/locales", file), "utf8")) as Messages;
}

function translatorFor(messages: Messages) {
  return (key: string) => {
    const [scope, code] = key.split(".");
    const value = scope === "errors" && code ? messages.errors?.[code] : undefined;
    return typeof value === "string" ? value : key;
  };
}

describe("error codes", () => {
  // SPECSFY: US-006 FR-016 NFR-005 AC-040
  it("has a message for every stable code in en, pt-BR and es, and falls back to the generic message for anything else", () => {
    expect(ERROR_CODES).toEqual(expect.arrayContaining(STABLE_CODES));

    const locales = Object.fromEntries(LOCALE_FILES.map((file) => [file, readLocale(file)]));
    for (const file of LOCALE_FILES) {
      const errors = locales[file]?.errors ?? {};
      for (const code of [...ERROR_CODES, "generic"]) {
        const message = errors[code];
        expect(typeof message === "string" && message.trim().length > 0, `${file} errors.${code}`).toBe(true);
      }
    }
    // Translated, not copied from English.
    expect(locales["pt-BR.json"]?.errors?.generic).not.toBe(locales["en.json"]?.errors?.generic);
    expect(locales["es.json"]?.errors?.generic).not.toBe(locales["en.json"]?.errors?.generic);

    for (const file of LOCALE_FILES) {
      const messages = locales[file] ?? {};
      const t = translatorFor(messages);
      for (const code of ["slug_taken", "email_taken", "invalid_code", "code_expired", "email_managed_by_provider"]) {
        expect(translateErrorCode(code, t), `${file} ${code}`).toBe(messages.errors?.[code]);
      }
      // Unknown codes, raw server text and prototype names never leak through.
      for (const raw of ["Team slug already exists", "UNAUTHORIZED", "constructor", "__proto__", ""]) {
        const translated = translateErrorCode(raw, t);
        expect(translated, `${file} ${raw}`).toBe(messages.errors?.generic);
        if (raw) expect(translated).not.toBe(raw);
      }
    }

    // Without this block the i18n module never reads the layer's locale files.
    const nuxtConfig = readFileSync(join(layerRoot, "nuxt.config.ts"), "utf8");
    expect(nuxtConfig).toMatch(/i18n:\s*\{\s*locales:\s*\[/u);
    for (const file of LOCALE_FILES) expect(nuxtConfig).toContain(`file: "${file}"`);
  });
});
