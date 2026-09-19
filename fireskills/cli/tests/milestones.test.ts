/** Regressions for milestone maps and projections derived from specs and backlog. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { syncMilestones } from "../src/milestones.js";
import { temporaryDirectory } from "./helpers.js";

describe("milestones", () => {
  test("creates project index and maintains progress from specs", async () => {
    const project = await temporaryDirectory();
    const specPath = join(project, "specs", "completed", "0001-access", "spec.md");
    await mkdir(join(specPath, ".."), { recursive: true });
    await writeFile(
      specPath,
      "# Access\n\n| Status | Complete |\n| Milestones | M01 |\n" +
        "\n- [x] T001 Done\n",
    );

    const result = await syncMilestones(project);

    expect(result.milestones).toEqual([
      expect.objectContaining({ id: "M01", total_specs: 1, completed_specs: 1, percent: 100 }),
    ]);
    const index = await readFile(join(project, "specs.md"), "utf8");
    expect(index).toContain("<!-- specsfy:specs-index:start -->");
    expect(index).toContain("0001-access");
    expect(index).toContain("M01");
    const milestone = await readFile(join(project, "specs", "milestones", "M01.md"), "utf8");
    expect(milestone).toContain("<!-- specsfy:milestone-progress:start -->");
    expect(milestone).toContain("1 of 1 specs completed");
  });

  test("maintains human content and includes backlog without counting it as delivery", async () => {
    const project = await temporaryDirectory();
    const milestonePath = join(project, "specs", "milestones", "M02.md");
    await mkdir(join(milestonePath, ".."), { recursive: true });
    await writeFile(
      milestonePath,
      "# M02 — Conversion\n\n## Exit Condition\n\nThe journey works.\n",
    );
    const backlogPath = join(project, "specs", "backlog", "0002-form.md");
    await mkdir(join(backlogPath, ".."), { recursive: true });
    await writeFile(backlogPath, "# Form\n\n| Milestones | M02 |\n");

    const result = await syncMilestones(project);

    expect(result.milestones[0]).toMatchObject({ id: "M02", total_specs: 0, backlog_items: 1 });
    const milestone = await readFile(milestonePath, "utf8");
    expect(milestone).toContain("The journey works.");
    expect(milestone).toContain("0002-form");
    expect(milestone).toContain("0 of 0 specs completed");
  });
});
