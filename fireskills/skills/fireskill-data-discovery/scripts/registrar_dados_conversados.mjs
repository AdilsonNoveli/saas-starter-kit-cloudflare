#!/usr/bin/env node
/** Records confirmed interview information without altering the detected portion of the data map. */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const START = "<!-- specsfy:conversation-data:start -->";
const END = "<!-- specsfy:conversation-data:end -->";

function fail(message) { throw new Error(message); }

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--")) fail(`invalid argument: ${key}`);
    if (value === undefined || value.startsWith("--")) fail(`missing value for ${key}`);
    values[key.slice(2)] = value;
    index += 1;
  }
  const fieldAliases = {
    name: ["name", "nome"],
    purpose: ["purpose", "para-que-serve"],
    toStore: ["to-store", "o-que-guardar"],
    suggestedFormat: ["suggested-format", "formato-sugerido"],
    relations: ["relations", "ligacoes"],
    access: ["access", "acesso"],
    lifecycle: ["lifecycle", "ciclo-de-vida"],
    sources: ["sources", "fontes"],
  };
  const normalized = { project: values.project };
  for (const [canonical, aliases] of Object.entries(fieldAliases)) {
    const foundKey = aliases.find((alias) => values[alias] !== undefined);
    if (!foundKey || !values[foundKey]?.trim()) {
      fail(`--${aliases[0]} (or --${aliases[1]}) is required`);
    }
    normalized[canonical] = values[foundKey];
  }
  return normalized;
}

function safe(value) {
  return value.trim().replaceAll("|", "\\|").replaceAll(/\r?\n/gu, " ");
}

function withSuggestedFormat(row) {
  const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 7) return row;
  return `| ${[...cells.slice(0, 3), "To be confirmed", ...cells.slice(3)].join(" | ")} |`;
}

function block(values, rows) {
  const next = `| ${[values.name, values.purpose, values.toStore, values.suggestedFormat, values.relations, values.access, values.lifecycle, values.sources].map(safe).join(" | ")} |`;
  const name = safe(values.name);
  const kept = rows
    .filter((row) => !row.startsWith(`| ${name} |`))
    .map(withSuggestedFormat);
  return [
    START,
    "## Confirmed Information to Store",
    "",
    "| Information | Purpose | What to Store | Suggested Format | Links | Who Uses | When Changes or Expires | Sources |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...kept,
    next,
    END,
  ].join("\n");
}

async function main() {
  const values = parseArgs(process.argv.slice(2));
  const project = resolve(values.project ?? process.cwd());
  const target = join(project, ".fireskills", "DATABASE.md");
  let current = "# Database\n";
  try { current = await readFile(target, "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  const currentBlock = current.match(new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`));
  const rows = currentBlock?.[0].split(/\r?\n/gu).filter((line) => line.startsWith("| ") && !line.startsWith("| Information ") && !line.startsWith("| Informação ") && !line.startsWith("| ---")) ?? [];
  const nextBlock = block(values, rows);
  const next = currentBlock ? current.replace(currentBlock[0], nextBlock) : `${current.trimEnd()}\n\n${nextBlock}\n`;
  await mkdir(join(project, ".fireskills"), { recursive: true });
  await writeFile(target, next, "utf8");
  console.log(target);
}

main().catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
