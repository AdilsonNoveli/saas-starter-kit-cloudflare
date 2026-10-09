import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0007 (Fase 0): the `_reference-*` folders stay on disk for consultation but are out of
// version control and out of every scan. Anything copied from one carries its origin.
const root = join(import.meta.dirname, "..");
const REFERENCES = ["_reference-app", "_reference-person", "_reference-web"];

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" });
const tracked = () => git("ls-files").split("\n").filter(Boolean);

// In CI the _reference-* folders are .gitignored and never cloned.
// Tests that inspect disk contents are skipped there; the index checks below still run.
const refsOnDisk = REFERENCES.every((dir) => existsSync(join(root, dir)));

describe("references policy", () => {
  // SPECSFY: US-001 FR-001 FR-002 NFR-001 AC-001
  it("keeps every _reference-* file out of the tracked list the policy tests scan", () => {
    const leaked = tracked().filter((file) => file.startsWith("_reference-"));
    expect(leaked.length).toBe(0);
    // Disk-presence check only meaningful when folders exist locally.
    if (refsOnDisk) {
      for (const dir of REFERENCES)
        expect(existsSync(join(root, dir))).toBe(true);
    }
  });

  // SPECSFY: US-001 FR-001 FR-002 FR-003 AC-002
  it("ignores _reference-* and documents the origin rule in RULES.md", () => {
    expect(git("ls-files", ...REFERENCES).trim()).toBe("");
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toMatch(
      /^_reference-\*\s*$/m,
    );
    const rules = readFileSync(join(root, ".fireskills", "RULES.md"), "utf8");
    expect(rules).toMatch(/@copied-from/);
    expect(rules).toMatch(/@commit/);
    expect(rules).toMatch(/@license/);
  });

  // SPECSFY: US-001 FR-001 FR-002 FR-003 NFR-002 AC-003
  it("ignores a brand-new _reference-* folder and leaves the existing ones untouched", () => {
    const probe = join(root, "_reference-policy-probe");
    // Where the references exist on disk (a developer machine) their contents must not change; in
    // CI they are never cloned, so only the ignore rule can be proven there.
    const before = refsOnDisk
      ? REFERENCES.map((dir) => readdirSync(join(root, dir)).length)
      : [];
    mkdirSync(probe, { recursive: true });
    try {
      const ignored = (() => {
        try {
          execFileSync(
            "git",
            ["check-ignore", "-q", "_reference-policy-probe/file.txt"],
            { cwd: root },
          );
          return true;
        } catch {
          return false;
        }
      })();
      expect(ignored).toBe(true);
    } finally {
      rmSync(probe, { recursive: true, force: true });
    }
    if (refsOnDisk)
      expect(
        REFERENCES.map((dir) => readdirSync(join(root, dir)).length),
      ).toEqual(before);
  });

  // SPECSFY: US-001 FR-003 NFR-001 AC-004
  it("rejects a copied file whose header lacks origin, commit or license", () => {
    const COPY_MARK = /@copied-from\b/;
    const SOURCE = /\.(ts|tsx|mts|vue)$/;
    const SKIPPED = [/^fireskills\//, /^scripts\/references-policy\.test\.ts$/];
    const offenders = tracked()
      .filter(
        (file) => SOURCE.test(file) && !SKIPPED.some((skip) => skip.test(file)),
      )
      .filter((file) => {
        const header = readFileSync(join(root, file), "utf8")
          .split("\n")
          .slice(0, 20)
          .join("\n");
        return (
          COPY_MARK.test(header) &&
          !(/@commit\s+\S+/.test(header) && /@license\s+\S+/.test(header))
        );
      });
    expect(offenders.join(", ")).toBe("");
    // The convention itself must be written down, or there is nothing to enforce.
    expect(readFileSync(join(root, ".fireskills", "RULES.md"), "utf8")).toMatch(
      /@copied-from/,
    );
  });
});
