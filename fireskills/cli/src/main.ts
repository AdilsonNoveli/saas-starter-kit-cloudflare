/**
 * Processo executável do Specsfy CLI.
 */

import { runCli } from "./cli.js";

void runCli()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
