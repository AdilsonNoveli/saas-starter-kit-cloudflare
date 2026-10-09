import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

// SPEC-0007 (Fase 0): the whole repository imports zod from "zod/v4".
const root = join(import.meta.dirname, "..");
const SOURCE = /\.(ts|tsx|mts|vue)$/;
const SCOPE = /^(apps|layers|packages|scripts)\//;
const SKIPPED = [/^apps\/web\/content\//, /^scripts\/zod-version\.test\.ts$/];

const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => SOURCE.test(file) && SCOPE.test(file) && !SKIPPED.some((skip) => skip.test(file)));

describe("zod v4 everywhere", () => {
  // SPECSFY: US-005 FR-006 NFR-002 AC-008
  it("has no file importing zod from the v3 entry point", () => {
    const v3 = files.filter((file) => /from\s+["']zod["']/.test(readFileSync(join(root, file), "utf8")));
    expect(v3.join(", ")).toBe("");
  });

  // SPECSFY: US-005 FR-006 NFR-001 NFR-002 AC-009
  it("validates representative v4 schemas like the ones forms and procedures rely on", () => {
    const base = z.object({ name: z.string().min(1), seats: z.number().int().positive() });
    const extended = base.extend({ slug: z.string().regex(/^[a-z0-9-]+$/) });
    const parsed: z.output<typeof extended> = extended.parse({ name: "Acme", seats: 3, slug: "acme" });
    expect(parsed.slug).toBe("acme");
    expect(extended.safeParse({ name: "", seats: 0, slug: "Bad Slug" }).success).toBe(false);

    // UForm (@nuxt/ui) validates through the Standard Schema interface; tRPC calls parse().
    const result = extended["~standard"].validate({ name: "", seats: 0, slug: "Bad Slug" });
    expect(result instanceof Promise).toBe(false);
    if (!(result instanceof Promise)) {
      expect(result.issues?.map((issue) => issue.path?.join("."))).toEqual(expect.arrayContaining(["name", "seats", "slug"]));
    }
  });

  // SPECSFY: US-005 FR-006 NFR-002 AC-010
  it("keeps the extra field of a looseObject, as the DeskcommCRM envelopes expect", () => {
    const envelope = z.looseObject({ id: z.string() });
    expect(envelope.parse({ id: "a", extra: 1 })).toEqual({ id: "a", extra: 1 });
  });
});
