// The fallbacks are stored in the row, so they stay as the contract fixes them;
// they live in shared/ because the session list compares against them.
import { UNKNOWN_BROWSER, UNKNOWN_SYSTEM } from "../../shared/utils/session-labels";

// Browser and system of a session, read from the User-Agent by ordered checks
// (DEC-013): no parsing library, because the session list needs no finer
// detail than these names. Order matters: Edge and Opera also say "Chrome",
// Chrome also says "Safari", and iOS also says "Mac OS X", Android "Linux".
const BROWSERS: ReadonlyArray<[name: string, pattern: RegExp]> = [
  ["Edge", /\b(?:Edg|EdgA|EdgiOS)\//u],
  ["Opera", /\b(?:OPR|OPiOS)\//u],
  ["Firefox", /\b(?:Firefox|FxiOS)\//u],
  ["Chrome", /\b(?:Chrome|CriOS)\//u],
  ["Safari", /\bVersion\/[\d.]+.*\bSafari\//u],
];

const SYSTEMS: ReadonlyArray<[name: string, pattern: RegExp]> = [
  ["iOS", /\b(?:iPhone|iPad|iPod)\b/u],
  ["Android", /\bAndroid\b/u],
  ["Windows", /\bWindows\b/u],
  ["macOS", /\bMacintosh\b/u],
  ["Linux", /\bLinux\b/u],
];

function firstMatch(table: ReadonlyArray<[string, RegExp]>, userAgent: string) {
  return table.find(([, pattern]) => pattern.test(userAgent))?.[0];
}

export function parseUserAgent(userAgent: string | undefined) {
  const value = userAgent ?? "";
  return {
    browser: firstMatch(BROWSERS, value) ?? UNKNOWN_BROWSER,
    os: firstMatch(SYSTEMS, value) ?? UNKNOWN_SYSTEM,
  };
}
