import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./user-agent";

// SPEC-0010 (Fase 3b), AC-017: browser and operating system come out of the
// User-Agent through this one function, and anything unknown never throws.
const CASES: Array<[string, string, string]> = [
  // [User-Agent, browser, os]
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", "Chrome", "Windows"],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.42", "Edge", "Windows"],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0", "Firefox", "Windows"],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/113.0.0.0", "Opera", "Windows"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15", "Safari", "macOS"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", "Chrome", "macOS"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.42", "Edge", "macOS"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:130.0) Gecko/20100101 Firefox/130.0", "Firefox", "macOS"],
  ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", "Chrome", "Linux"],
  ["Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0", "Firefox", "Linux"],
  ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/113.0.0.0", "Opera", "Linux"],
  ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36", "Chrome", "Android"],
  ["Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0", "Firefox", "Android"],
  ["Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36 EdgA/128.0.2739.73", "Edge", "Android"],
  ["Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 OPR/84.0.4452.81", "Opera", "Android"],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1", "Safari", "iOS"],
  ["Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1", "Safari", "iOS"],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1", "Chrome", "iOS"],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15", "Firefox", "iOS"],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/128.2739.60 Mobile/15E148 Safari/605.1.15", "Edge", "iOS"],
];

describe("parseUserAgent", () => {
  // SPECSFY: US-004 FR-010 NFR-007 AC-017
  it("returns the expected browser and system for Chrome, Edge, Firefox, Safari and Opera across five systems, and the unknown pair without throwing", () => {
    for (const [userAgent, browser, os] of CASES) {
      expect(parseUserAgent(userAgent), userAgent).toEqual({ browser, os });
    }
    const unknown = { browser: "Navegador desconhecido", os: "Sistema desconhecido" };
    for (const userAgent of ["curl/8.4.0", "", "???", undefined]) {
      expect(() => parseUserAgent(userAgent), String(userAgent)).not.toThrow();
      expect(parseUserAgent(userAgent), String(userAgent)).toEqual(unknown);
    }
  });
});
