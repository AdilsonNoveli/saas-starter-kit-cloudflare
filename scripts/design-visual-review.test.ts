import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { compareBoard, listScreens, readReviewBoard } from "./design-visual-review";

// SPEC-0008 (Fase 2): every screen is reviewed in the light theme, the dark theme and a phone width
// (decision D-F2-5), and the review is recorded in the board of section 12 of the spec. This suite
// keeps a screen from being forgotten: the board is compared with the files on disk.
const root = join(import.meta.dirname, "..");

describe("visual review board", () => {
  // SPECSFY: US-001 FR-008 NFR-001 AC-021
  it("has every screen verified in light, dark and phone with a date", () => {
    const { unverified } = compareBoard(listScreens(root), readReviewBoard(root));
    expect(unverified).toEqual([]);
  });

  // SPECSFY: FR-008 US-001 NFR-003 AC-022
  it("lists every page and layout file, with a row for each and no row for a missing screen", () => {
    const screens = listScreens(root);
    expect(screens.length).toBe(47);
    expect(screens).toContain("apps/login/app/pages/login.vue");
    expect(screens).toContain("layers/admin/app/layouts/admin.vue");
    const { missing, unknown } = compareBoard(screens, readReviewBoard(root));
    expect(missing).toEqual([]);
    expect(unknown).toEqual([]);
  });

  // SPECSFY: FR-008 US-001 NFR-001 AC-021
  it("reports a screen added after the board was filled and a row pointing to a file that no longer exists", () => {
    const rows = [{ screen: "apps/app/app/pages/old.vue", light: "OK", dark: "OK", phone: "OK", date: "2026-09-30" }];
    const { missing, unknown } = compareBoard(["apps/app/app/pages/new.vue"], rows);
    expect(missing).toEqual(["apps/app/app/pages/new.vue"]);
    expect(unknown).toEqual(["apps/app/app/pages/old.vue"]);
  });
});
