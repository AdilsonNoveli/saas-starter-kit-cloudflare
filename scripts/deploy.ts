// `bun run deploy [-- --stage <name>]`: runs the preflight (scripts/doctor.ts) and only then
// `sst deploy`, forwarding the same arguments to both — the doctor needs the --stage to check
// the right secrets file. Calling `sst deploy` directly skips the preflight, which is fine.
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const args = process.argv.slice(2);
const run = (cmd: string[]) =>
  Bun.spawn(cmd, { cwd: root, stdio: ["inherit", "inherit", "inherit"] });

const doctor = run([process.execPath, join(import.meta.dir, "doctor.ts"), ...args]);
process.on("SIGINT", () => doctor.kill());
if ((await doctor.exited) !== 0) process.exit(1);

// `bun x` resolves the workspace's own sst binary regardless of how this script was started.
const deploy = run([process.execPath, "x", "sst", "deploy", ...args]);
process.on("SIGINT", () => deploy.kill());
process.on("SIGTERM", () => deploy.kill());
process.exit(await deploy.exited);
