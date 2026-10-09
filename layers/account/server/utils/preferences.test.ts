import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFormatsFor } from "../../shared/utils/preferences";
import { parsePreferences } from "./preferences";

// SPEC-0010 (Fase 3b), AC-008: preferences are validated on the server, the time
// zone through Intl (UTC accepted even when the runtime's list omits it), and
// the date format and name order default from the locale.
describe("parsePreferences", () => {
  afterEach(() => vi.restoreAllMocks());

  // SPECSFY: US-002 FR-002 AC-008
  it("accepts IANA zones and UTC, refuses Mars/Base and fr, and defaults the formats by locale", () => {
    // The runtime list without UTC, as some engines return it.
    vi.spyOn(Intl, "supportedValuesOf").mockReturnValue(["America/Sao_Paulo", "Europe/Madrid"]);

    const saoPaulo = parsePreferences({ locale: "pt-br", timeZone: "America/Sao_Paulo" });
    expect(saoPaulo).toEqual({
      ok: true,
      value: { locale: "pt-br", timeZone: "America/Sao_Paulo", theme: "system", dateFormat: "DMY", nameOrder: "WESTERN" },
    });

    const utc = parsePreferences({ locale: "en", timeZone: "UTC" });
    expect(utc).toEqual({
      ok: true,
      value: { locale: "en", timeZone: "UTC", theme: "system", dateFormat: "MDY", nameOrder: "WESTERN" },
    });

    const es = parsePreferences({ locale: "es", timeZone: "Europe/Madrid" });
    expect(es.ok && es.value.dateFormat).toBe("DMY");
    expect(es.ok && es.value.nameOrder).toBe("WESTERN");

    expect(parsePreferences({ locale: "pt-br", timeZone: "Mars/Base" })).toEqual({ ok: false, error: "invalid_time_zone" });
    expect(parsePreferences({ locale: "fr", timeZone: "UTC" })).toEqual({ ok: false, error: "invalid_locale" });

    expect(defaultFormatsFor("pt-br")).toEqual({ dateFormat: "DMY", nameOrder: "WESTERN" });
    expect(defaultFormatsFor("es")).toEqual({ dateFormat: "DMY", nameOrder: "WESTERN" });
    expect(defaultFormatsFor("en")).toEqual({ dateFormat: "MDY", nameOrder: "WESTERN" });

    // Boundary: explicit values win over the defaults, and each enum is checked.
    const explicit = parsePreferences({
      locale: "en",
      timeZone: "UTC",
      theme: "dark",
      dateFormat: "YMD",
      nameOrder: "EASTERN",
    });
    expect(explicit).toEqual({
      ok: true,
      value: { locale: "en", timeZone: "UTC", theme: "dark", dateFormat: "YMD", nameOrder: "EASTERN" },
    });
    expect(parsePreferences({ locale: "en", timeZone: "UTC", theme: "neon" })).toEqual({ ok: false, error: "invalid_theme" });
    expect(parsePreferences({ locale: "en", timeZone: "UTC", dateFormat: "DDMMYY" })).toEqual({
      ok: false,
      error: "invalid_date_format",
    });
    expect(parsePreferences({ locale: "en", timeZone: "UTC", nameOrder: "SIDEWAYS" })).toEqual({
      ok: false,
      error: "invalid_name_order",
    });
  });
});
