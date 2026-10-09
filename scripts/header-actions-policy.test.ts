import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0010 (Fase 3b), AC-012. One header-actions component serves every screen: the avatar
// dropdown is no longer repeated next to the page, and apps/web and apps/app draw the same
// ColorModeSwitch and LocaleSwitch from packages/tokens.
const root = join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const exists = (file: string) => existsSync(join(root, file));

// Tracked files plus new, not-ignored ones, minus files deleted but not yet staged.
const repoFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file && existsSync(join(root, file)));

const HEADER_ACTIONS = "layers/account/app/components/account/AccountHeaderActions.vue";
const LOOSE_DROPDOWN = /<AccountUserDropdown\s+collapsed\s+size="md"\s*\/>/;

// The twelve files that repeat the loose dropdown today (research/espacos-onboarding-i18n.md, 3.4).
const HEADER_PAGES = [
  "apps/app/app/pages/[[team]]/dashboard.vue",
  "layers/account/app/components/settings/SettingsPanel.vue",
  "layers/kanban/app/pages/[[team]]/kanban/index.vue",
  "layers/kanban/app/pages/[[team]]/kanban/[boardId].vue",
  "layers/admin/app/pages/admin/audit-log.vue",
  "layers/admin/app/pages/admin/index.vue",
  "layers/admin/app/pages/admin/companies/index.vue",
  "layers/admin/app/pages/admin/companies/[id].vue",
  "layers/admin/app/pages/admin/queue/index.vue",
  "layers/billing/app/pages/admin/plans/index.vue",
  "layers/billing/app/pages/admin/pending-purchases/index.vue",
  "layers/notifications/app/pages/admin/notifications.vue",
];

describe("AC-012: one header-actions component serves every screen", () => {
  // SPECSFY: US-002 FR-007 NFR-006 NFR-007 AC-012
  it("no tracked file repeats the loose account dropdown outside AccountHeaderActions", () => {
    // The pattern must match the real form, or the scan would pass vacuously.
    expect(LOOSE_DROPDOWN.test('<AccountUserDropdown collapsed size="md" />')).toBe(true);
    const repeated = repoFiles
      .filter((file) => /\.vue$/.test(file) && file !== HEADER_ACTIONS && !file.startsWith("fireskills/"))
      .filter((file) => LOOSE_DROPDOWN.test(read(file)));
    expect(repeated.join("\n")).toBe("");
  });

  // SPECSFY: US-002 FR-007 NFR-006 NFR-007 AC-012
  it("the twelve screens that carried the dropdown use <AccountHeaderActions", () => {
    expect(exists(HEADER_ACTIONS), HEADER_ACTIONS).toBe(true);
    const missing = HEADER_PAGES.filter((file) => !exists(file) || !read(file).includes("<AccountHeaderActions"));
    expect(missing.join("\n")).toBe("");
  });

  // SPECSFY: US-002 FR-007 NFR-006 NFR-007 AC-012
  it("ColorModeSwitch and LocaleSwitch live in packages/tokens and apps/web's NavigationBar uses them without its own language menu", () => {
    for (const name of ["ColorModeSwitch", "LocaleSwitch"]) {
      expect(exists(`packages/tokens/app/components/${name}.vue`), name).toBe(true);
    }
    const bar = read("apps/web/app/components/navigation/NavigationBar.vue");
    expect(bar).toContain("<ColorModeSwitch");
    expect(bar).toContain("<LocaleSwitch");
    // The duplicated language block (desktop and mobile) is gone: at most one dropdown remains.
    expect((bar.match(/<UDropdownMenu\b/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  // SPECSFY: US-002 FR-007 NFR-006 NFR-007 AC-012
  it("apps/app draws the same two switches through AccountHeaderActions, with no copy of its own", () => {
    expect(exists(HEADER_ACTIONS), HEADER_ACTIONS).toBe(true);
    const actions = read(HEADER_ACTIONS);
    expect(actions).toContain("<ColorModeSwitch");
    expect(actions).toContain("<LocaleSwitch");
    const copies = repoFiles.filter((file) => /(^|\/)(ColorModeSwitch|LocaleSwitch)\.vue$/.test(file) && !file.startsWith("packages/tokens/"));
    expect(copies.join("\n")).toBe("");
  });
});
