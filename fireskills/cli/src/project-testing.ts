/**
 * Consumer project test execution.
 *
 * Runs Vitest exposed via the root `package.json` test script (`bun run test`).
 */

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { isFile, pathExists, resolvePath } from "./filesystem.js";

/** Detected test command without shell interpretation. */
export interface TestCommand {
  label: string;
  argv: readonly string[];
  cwd: string;
  display: string;
}

/** Result of executing the project runner. */
export interface TestRun {
  command: TestCommand;
  exit_code: number;
  duration_seconds: number;
}

/** Detects `bun run test` from root `package.json`. */
export async function detectProjectTestCommand(
  project: string,
): Promise<TestCommand> {
  const root = resolvePath(project);
  if (!(await pathExists(root))) {
    throw new Error(`project not found: ${root}`);
  }
  const manifest = join(root, "package.json");
  if (!(await isFile(manifest))) {
    throw new Error(`package.json not found in ${root}`);
  }
  const parsed = JSON.parse(await readFile(manifest, "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!parsed.scripts?.test) {
    throw new Error("root package.json does not define a `test` script");
  }
  const argv = ["bun", "run", "test"] as const;
  return { label: "Vitest (bun)", argv, cwd: root, display: argv.join(" ") };
}

/** Executes detected test runner, pipes stdout/stderr and preserves exit code. */
export async function runProjectTests(project: string): Promise<TestRun> {
  const command = await detectProjectTestCommand(project);
  const startedAt = performance.now();
  const [executable, ...arguments_] = command.argv;
  if (!executable) throw new Error("empty test command");
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(executable, arguments_, {
      cwd: command.cwd,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
  return {
    command,
    exit_code: exitCode,
    duration_seconds: Number(((performance.now() - startedAt) / 1000).toFixed(2)),
  };
}
