import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeBootstrapRows, renderBootstrapSql } from "./print-migration-bootstrap.mjs";

// SPEC-0006: verifies the one genuinely pure, unit-testable boundary in the
// bootstrap tool — hash computation and SQL rendering — against a fixture
// migration folder, independent of any real layer's migrations/.

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bootstrap-test-"));
  mkdirSync(join(dir, "meta"), { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeFixture(sql: string, when = 1700000000000, tag = "0000_fixture") {
  writeFileSync(join(dir, `${tag}.sql`), sql);
  writeFileSync(
    join(dir, "meta", "_journal.json"),
    JSON.stringify({ version: "7", dialect: "postgresql", entries: [{ idx: 0, version: "7", when, tag, breakpoints: true }] }),
  );
  return tag;
}

describe("computeBootstrapRows", () => {
  it("computes a sha256 hash matching the migration file's exact content", () => {
    const sql = 'CREATE TABLE "Widget" ("id" text PRIMARY KEY NOT NULL);';
    const tag = writeFixture(sql);
    const rows = computeBootstrapRows(dir);
    expect(rows).toEqual([{ tag, hash: createHash("sha256").update(sql).digest("hex"), when: 1700000000000 }]);
  });

  it("produces a different hash when the migration file's content differs, even with the same tag/when", () => {
    const tagA = writeFixture('CREATE TABLE "A" ("id" text PRIMARY KEY NOT NULL);', 1700000000000, "0000_fixture");
    const [rowA] = computeBootstrapRows(dir);
    rmSync(dir, { recursive: true, force: true });
    dir = mkdtempSync(join(tmpdir(), "bootstrap-test-"));
    mkdirSync(join(dir, "meta"), { recursive: true });
    writeFixture('CREATE TABLE "B" ("id" text PRIMARY KEY NOT NULL);', 1700000000000, "0000_fixture");
    const [rowB] = computeBootstrapRows(dir);
    expect(rowA.tag).toBe(tagA);
    expect(rowB.hash).not.toBe(rowA.hash);
  });

  it("throws a clear error when meta/_journal.json is missing, rather than crashing on a missing-file read", () => {
    expect(() => computeBootstrapRows(dir)).toThrow(/No meta\/_journal\.json found/);
  });
});

describe("renderBootstrapSql", () => {
  it("prints CREATE SCHEMA/CREATE TABLE IF NOT EXISTS and one INSERT per row, never a bare CREATE TABLE or DROP", () => {
    writeFixture('CREATE TABLE "Widget" ("id" text PRIMARY KEY NOT NULL);');
    const rows = computeBootstrapRows(dir);
    const sql = renderBootstrapSql(dir, "__drizzle_migrations_widget", "drizzle", rows);
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS "drizzle";');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations_widget"');
    expect(sql).toContain(`INSERT INTO "drizzle"."__drizzle_migrations_widget" (hash, created_at) VALUES ('${rows[0].hash}', ${rows[0].when});`);
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/^CREATE TABLE "drizzle"/m);
  });
});
