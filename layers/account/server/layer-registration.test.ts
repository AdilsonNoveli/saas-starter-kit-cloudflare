import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { layers } from "../../../config";

// SPEC-0009 (Fase 3a), AC-012: layers/account joins `layers.core`. It was born
// with no history; SPEC-0010 (Fase 3b, T053) gave it its own
// (`migrations/0000_account.sql`), which the deploy loop picks up through the
// same `existsSync(... "migrations")` check (infra/utils/nuxt.ts) with no edit
// there, and one line in the schema barrel. AC-042
// (server/database/schema.test.ts) covers the history itself.
const root = join(import.meta.dirname, "../../..");
const layerRoot = join(root, "layers/account");
const EXISTING_CORE = ["teams", "notifications", "admin"];

describe("layers/account registration", () => {
  // SPECSFY: US-003 FR-004 NFR-003 AC-012
  it("is listed in layers.core after the existing core layers, whose order does not change", () => {
    expect(layers.core).toContain("account");
    expect(layers.core.slice(0, EXISTING_CORE.length)).toEqual(EXISTING_CORE);
    expect(layers.core.indexOf("account")).toBeGreaterThanOrEqual(EXISTING_CORE.length);
  });

  // SPECSFY: US-003 FR-004 NFR-003 AC-012
  it("is a real layer package with its own drizzle config and migrations folder, found by the deploy loop unchanged", () => {
    expect(existsSync(join(layerRoot, "package.json")), "layers/account/package.json").toBe(true);
    expect(existsSync(join(layerRoot, "nuxt.config.ts")), "layers/account/nuxt.config.ts").toBe(true);
    expect(existsSync(join(layerRoot, "drizzle.config.ts")), "layers/account/drizzle.config.ts").toBe(true);
    expect(existsSync(join(layerRoot, "migrations")), "layers/account/migrations").toBe(true);
    // The deploy loop applies any layer with a `migrations/` folder by that
    // check alone, so the account history needs no edit there.
    const deploy = readFileSync(join(root, "infra/utils/nuxt.ts"), "utf8");
    expect(deploy).toMatch(/existsSync\([^)]*["']migrations["']\)\)\)\s*return/);
    expect(deploy).not.toContain('"account"');
  });

  // SPECSFY: US-003 FR-004 NFR-003 AC-012
  it("adds exactly one line to the schema barrel, by package specifier", () => {
    expect(existsSync(join(layerRoot, "server/database/schema.ts")), "layers/account/server/database/schema.ts").toBe(true);
    const barrel = readFileSync(join(root, "apps/functions/src/database/schema.ts"), "utf8");
    expect(barrel.match(/@nuxfire\/layer-account/gu)).toHaveLength(1);
    expect(barrel).toContain('export * from "@nuxfire/layer-account/server/database/schema";');
  });
});
