/**
 * Fireskills CLI executable process.
 */

import { runCli } from "./cli.js";

void runCli()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
