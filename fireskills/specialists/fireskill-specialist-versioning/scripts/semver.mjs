#!/usr/bin/env node
/**
 * Gerencia o arquivo VERSION na raiz do projeto (MAJOR.MINOR.PATCH estável).
 *
 * Uso: node semver.mjs <current|bump <patch|minor|major>|verify <versão>> [--project <raiz>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Uso: node semver.mjs <current | bump <patch|minor|major> | verify <versão>> [--project <raiz>]");
  process.exit(0);
}
const at = args.indexOf("--project");
const project = resolve(at >= 0 ? args[at + 1] ?? "" : process.cwd());
const positionals = args.filter((arg, i) => arg !== "--project" && i !== at + 1 || at < 0 && !arg.startsWith("--"));
const [command, value] = positionals;
const file = join(project, "VERSION");

function fail(message) {
  console.error(`erro: ${message}`);
  process.exit(1);
}

function parse(text) {
  const version = text.replace(/\r?\n$/, "");
  if (!STABLE.test(version)) fail(`VERSION deve conter só MAJOR.MINOR.PATCH estável, sem prefixo v (encontrado: "${version}").`);
  return version.split(".").map(Number);
}

let current;
try {
  current = parse(readFileSync(file, "utf8"));
} catch (error) {
  fail(error.code === "ENOENT" ? `${file} não existe.` : error.message);
}

if (command === "current") {
  console.log(current.join("."));
} else if (command === "bump") {
  const index = ["major", "minor", "patch"].indexOf(value);
  if (index < 0) fail("informe patch, minor ou major.");
  const next = current.map((part, i) => (i < index ? part : i === index ? part + 1 : 0));
  writeFileSync(file, `${next.join(".")}\n`);
  console.log(next.join("."));
} else if (command === "verify") {
  if (!value || parse(value).join(".") !== current.join(".")) fail(`VERSION contém ${current.join(".")}, não ${value}.`);
  console.log(`ok ${value}`);
} else {
  fail(`comando desconhecido: ${command ?? "(nenhum)"}.`);
}
