/** Regressions for reading and projecting backlog items. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { backlogsFingerprint, scanBacklogs } from "../src/backlog.js";
import { temporaryDirectory } from "./helpers.js";

describe("backlogs", () => {
  test("reads title and metadata in both formats", async () => {
    const project = await temporaryDirectory();
    const root = join(project, "specs/backlog");
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, "0001-first.md"),
      "# Backlog: First\n\n**ID**: BACKLOG-0001\n**Status**: Captured\n",
    );
    await writeFile(
      join(root, "0002-second.md"),
      "# Second\n\n| ID | BACKLOG-0002 |\n| Status | Refining |\n",
    );

    const items = await scanBacklogs(project);

    expect(items.map(({ title, identifier, status }) => ({
      title,
      identifier,
      status,
    }))).toEqual([
      { title: "First", identifier: "BACKLOG-0001", status: "Captured" },
      { title: "Second", identifier: "BACKLOG-0002", status: "Refining" },
    ]);
    expect(await backlogsFingerprint(project)).toHaveLength(64);
  });
});
