import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// RULES.md: user notifications go through `useNotification`, never `useToast` at the call
// site (the wrapper owns the colour/icon pairing) and never `window.confirm`.
const root = join(import.meta.dirname, "..");
const WRAPPERS = new Set([
  "apps/app/app/composables/use-notification.ts",
  "apps/login/app/composables/useNotification.ts",
  "apps/web/app/composables/use-notification.ts",
]);

const sources = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(ts|vue)$/.test(file) && !/^(fireskills|apps\/web\/content)\//.test(file));

const offenders = (pattern: RegExp, allowed = new Set<string>()) =>
  sources
    .filter((file) => !allowed.has(file))
    .filter((file) => pattern.test(readFileSync(join(root, file), "utf8")))
    .join(", ");

describe("notification rules", () => {
  it("calls useToast only inside the three useNotification wrappers", () => {
    expect(offenders(/\buseToast\s*\(/, WRAPPERS)).toBe("");
    for (const wrapper of WRAPPERS) expect(readFileSync(join(root, wrapper), "utf8")).toMatch(/\buseToast\s*\(/);
  });

  it("never uses window.confirm", () => {
    expect(offenders(/\bwindow\.confirm\s*\(/)).toBe("");
  });
});
