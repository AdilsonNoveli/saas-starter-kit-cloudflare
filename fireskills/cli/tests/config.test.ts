/** Regressions for persistent project configuration. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_WATCH_INTERVAL,
  loadConfig,
  updateConfig,
} from "../src/config.js";
import { temporaryDirectory } from "./helpers.js";

describe("configuration", () => {
  test("applies default and preserves unknown fields", async () => {
    const project = await temporaryDirectory();
    expect((await loadConfig(project)).watch_interval).toBe(
      DEFAULT_WATCH_INTERVAL,
    );
    await mkdir(join(project, ".fireskills"), { recursive: true });
    await writeFile(
      join(project, ".fireskills/config.json"),
      JSON.stringify({ schema_version: 1, extension: true }),
    );

    await updateConfig(project, 0.5);

    const payload = JSON.parse(
      await readFile(join(project, ".fireskills/config.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(payload).toMatchObject({
      schema_version: 1,
      extension: true,
      watch_interval: 0.5,
    });
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid interval %s",
    async (value) => {
      const project = await temporaryDirectory();
      await expect(updateConfig(project, value)).rejects.toThrow(
        "finite number greater than zero",
      );
    },
  );
});
