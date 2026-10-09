#!/usr/bin/env node
/**
 * Manages the VERSION file at project root (stable MAJOR.MINOR.PATCH).
 *
 * Usage: node semver.mjs <current|bump <patch|minor|major>|verify <version>> [--project <root>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node semver.mjs <current | bump <patch|minor|major> | verify <version>> [--project <root>]");
  process.exit(0);
}
const at = args.indexOf("--project");
const project = resolve(at >= 0 ? args[at + 1] ?? "" : process.cwd());
const positionals = args.filter((arg, i) => arg !== "--project" && i !== at + 1 || at < 0 && !arg.startsWith("--"));
const [command, value] = positionals;
const file = join(project, "VERSION");

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parse(text) {
  const version = text.replace(/\r?\n$/, "");
  if (!STABLE.test(version)) fail(`VERSION must contain only stable MAJOR.MINOR.PATCH, without v prefix (found: "${version}").`);
  return version.split(".").map(Number);
}

let current;
try {
  current = parse(readFileSync(file, "utf8"));
} catch (error) {
  fail(error.code === "ENOENT" ? `${file} does not exist.` : error.message);
}

if (command === "current") {
  console.log(current.join("."));
} else if (command === "bump") {
  const index = ["major", "minor", "patch"].indexOf(value);
  if (index < 0) fail("specify patch, minor, or major.");
  const next = current.map((part, i) => (i < index ? part : i === index ? part + 1 : 0));
  writeFileSync(file, `${next.join(".")}\n`);
  console.log(next.join("."));
} else if (command === "verify") {
  if (!value || parse(value).join(".") !== current.join(".")) fail(`VERSION contains ${current.join(".")}, not ${value}.`);
  console.log(`ok ${value}`);
} else {
  fail(`unknown command: ${command ?? "(none)"}.`);
}
