/**
 * Execução dos testes do projeto consumidor.
 *
 * Substitui o detector do Specsfy (que só conhecia Laravel + Pest): no Nuxfire
 * o runner é o Vitest, exposto pelo script `test` do `package.json` da raiz.
 */

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { isFile, pathExists, resolvePath } from "./filesystem.js";

/** Comando de teste detectado, sem interpretação por shell. */
export interface TestCommand {
  label: string;
  argv: readonly string[];
  cwd: string;
  display: string;
}

/** Resultado de uma execução do runner do projeto. */
export interface TestRun {
  command: TestCommand;
  exit_code: number;
  duration_seconds: number;
}

/** Detecta `bun run test` a partir do `package.json` da raiz. */
export async function detectProjectTestCommand(
  project: string,
): Promise<TestCommand> {
  const root = resolvePath(project);
  if (!(await pathExists(root))) {
    throw new Error(`projeto não encontrado: ${root}`);
  }
  const manifest = join(root, "package.json");
  if (!(await isFile(manifest))) {
    throw new Error(`package.json não encontrado em ${root}`);
  }
  const parsed = JSON.parse(await readFile(manifest, "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!parsed.scripts?.test) {
    throw new Error("o package.json da raiz não define o script `test`");
  }
  const argv = ["bun", "run", "test"] as const;
  return { label: "Vitest (bun)", argv, cwd: root, display: argv.join(" ") };
}

/** Executa o runner detectado, repassa a saída e preserva o exit code. */
export async function runProjectTests(project: string): Promise<TestRun> {
  const command = await detectProjectTestCommand(project);
  const startedAt = performance.now();
  const [executable, ...arguments_] = command.argv;
  if (!executable) throw new Error("comando de teste vazio");
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
    duration_seconds: (performance.now() - startedAt) / 1000,
  };
}
