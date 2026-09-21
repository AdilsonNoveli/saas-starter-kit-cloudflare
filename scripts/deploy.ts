// `bun run deploy [-- --stage <nome>]`: roda o preflight (scripts/doctor.ts) e só então o
// `sst deploy`, repassando os mesmos argumentos aos dois — o doctor precisa do --stage para
// conferir o arquivo de secrets certo. Um único caminho de deploy: quem chamar `sst deploy`
// direto pula o preflight, e tudo bem.
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
