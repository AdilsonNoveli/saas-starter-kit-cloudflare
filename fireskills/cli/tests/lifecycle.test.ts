/** Spec physical lifecycle contracts. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  migrateSpecs,
  resolveSpec,
  transitionSpec,
  updateSpecEffort,
} from "../src/lifecycle.js";
import { temporaryDirectory } from "./helpers.js";

async function createSpec(
  project: string,
  relativePath: string,
  status: string,
): Promise<string> {
  const path = join(project, relativePath, "spec.md");
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(
    path,
    `# Social login\n\n| Status | ${status} |\n| Effort | 4 |\n`,
  );
  return path;
}

describe("spec lifecycle", () => {
  test("moves spec, mirrors Status, and preserves package", async () => {
    const project = await temporaryDirectory();
    await createSpec(project, "specs/planned/0042-social-login", "Planned");
    const result = await transitionSpec(project, "0042-social-login", "in-progress");

    expect(result).toMatchObject({
      from: "planned",
      to: "in-progress",
      status: "Implementing",
    });
    const target = join(project, "specs/in-progress/0042-social-login/spec.md");
    expect(await readFile(target, "utf8")).toContain("| Status | Implementing |");
    await expect(resolveSpec(project, "0042-social-login")).resolves.toMatchObject({
      folder: "in-progress",
      path: target,
    });
  });

  test("accepts spec number only and moves full directory", async () => {
    const project = await temporaryDirectory();
    await createSpec(project, "specs/planned/0042-social-login", "Planned");

    await expect(transitionSpec(project, "0042", "in-progress")).resolves.toMatchObject({
      identifier: "0042-social-login",
      to: "in-progress",
    });
    await expect(
      readFile(join(project, "specs/in-progress/0042-social-login/spec.md"), "utf8"),
    ).resolves.toContain("| Status | Implementing |");
    await expect(resolveSpec(project, "0099")).rejects.toThrow("spec not found: 0099");
  });

  test("reopens a completed spec for review", async () => {
    const project = await temporaryDirectory();
    await createSpec(project, "specs/completed/0042-social-login", "Complete");

    await expect(
      transitionSpec(project, "0042-social-login", "review"),
    ).resolves.toMatchObject({ from: "completed", to: "review", status: "Reviewing" });
    await expect(
      transitionSpec(project, "0042-social-login", "in-progress"),
    ).resolves.toMatchObject({ to: "in-progress" });
  });

  test("rejects transitions that skip states", async () => {
    const project = await temporaryDirectory();
    await createSpec(project, "specs/draft/0042-social-login", "Draft");

    await expect(
      transitionSpec(project, "0042-social-login", "completed"),
    ).rejects.toThrow("draft to completed");
  });

  test("migrates legacy layout to folder matching Status", async () => {
    const project = await temporaryDirectory();
    await createSpec(project, "specs/specs/0042-social-login", "Complete");

    await expect(migrateSpecs(project)).resolves.toEqual([
      expect.objectContaining({
        identifier: "0042-social-login",
        to: "completed",
      }),
    ]);
    await expect(
      readFile(join(project, "specs/completed/0042-social-login/spec.md"), "utf8"),
    ).resolves.toContain("| Status | Complete |");
  });

  test("updates effort between 1 and 10 with rationale and history", async () => {
    const project = await temporaryDirectory();
    await createSpec(project, "specs/draft/0042-social-login", "Draft");

    await updateSpecEffort(project, "0042-social-login", 7, "External integration discovered.", {
      updatedAt: "2026-08-08T14:00:00.000Z",
    });

    const content = await readFile(
      join(project, "specs/draft/0042-social-login/spec.md"),
      "utf8",
    );
    expect(content).toContain("| Effort | 7 |");
    expect(content).toContain("| Effort updated at | 2026-08-08T14:00:00.000Z |");
    expect(content).toContain("| Effort rationale | External integration discovered. |");
    expect(content).toContain("- 2026-08-08T14:00:00.000Z: 4 → 7. External integration discovered.");
    await expect(
      updateSpecEffort(project, "0042-social-login", 11, "Out of range."),
    ).rejects.toThrow("between 1 and 10");
  });
});
