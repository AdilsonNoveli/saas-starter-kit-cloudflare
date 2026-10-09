import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AC-037: one slug function for client and server, accents normalized, and a
// slug can never shadow a static route of the app.
const repoRoot = join(import.meta.dirname, "..", "..", "..", "..");
const readRepo = (relative: string) =>
  readFileSync(join(repoRoot, relative), "utf8");

/** First path segment of every static page route served by apps/app (its own pages and every layer's). */
function staticRouteSegments(): string[] {
  const files = execFileSync("git", ["ls-files", "apps/app/app/pages", "layers"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => /^(apps\/app|layers\/[^/]+)\/app\/pages\/.+\.vue$/.test(file));

  const segments = new Set<string>();
  for (const file of files) {
    const rest = file.replace(/^.*?\/app\/pages\//, "");
    const first = (rest.split("/")[0] ?? "").replace(/\.vue$/, "");
    if (!first || first === "index" || first.startsWith("[")) continue;
    segments.add(first);
  }
  return [...segments].sort();
}

describe("slug (AC-037)", () => {
  // SPECSFY: US-006 FR-006 NFR-007 AC-037
  it("normalizes accents, rejects names with nothing usable and reserves account-settings", async () => {
    const { slugify, validateSlug } = await import("./slug");

    expect(slugify("João")).toBe("joao");
    expect(slugify("Clínica São José")).toBe("clinica-sao-jose");
    expect(slugify("Account Settings")).toBe("account-settings");
    expect(slugify("!!!")).toBe("");
    expect(validateSlug(slugify("!!!"))).toBe("slug_invalid");
    expect(validateSlug("joao")).toBe("ok");
    expect(validateSlug("account-settings")).toBe("slug_reserved");
  });

  // SPECSFY: US-006 FR-006 NFR-007 AC-037
  it("reserves every static route of the app", async () => {
    const { RESERVED_SLUGS, validateSlug } = await import("./slug");
    const routes = staticRouteSegments();

    expect(routes).toEqual(expect.arrayContaining(["account-settings", "admin", "invite", "select-team"]));
    for (const route of routes) {
      expect(RESERVED_SLUGS.has(route), `${route} is reserved`).toBe(true);
      expect(validateSlug(route)).toBe("slug_reserved");
    }
  });

  // SPECSFY: US-006 FR-006 NFR-007 AC-037
  it("is the single slug rule: the create modal, the claim page and billing provisioning reuse it", () => {
    const consumers = [
      "layers/teams/app/components/TeamCreateModal.vue",
      "apps/app/app/pages/claim/[id].vue",
      "layers/billing/server/utils/billing/buyer-provisioning.ts",
    ];
    for (const file of consumers) {
      const source = readRepo(file);
      // An own slug pattern (`/^[a-z0-9-]+$/`) or an own slug builder (`.replace(/[^a-z...]/g, "")`).
      expect(source, `${file} keeps its own slug regex`).not.toMatch(/\/\^\[a-z0-9/);
      expect(source, `${file} keeps its own slug builder`).not.toMatch(/\.replace\(\s*\/\[\^a-z/);
      expect(source, `${file} uses slugify or validateSlug`).toMatch(/\b(slugify|validateSlug)\s*\(/);
    }
    // The server file has no auto-import: it imports the shared module explicitly.
    expect(readRepo("layers/billing/server/utils/billing/buyer-provisioning.ts")).toMatch(
      /from\s+["'][^"']*shared\/utils\/slug["']/,
    );
  });
});
