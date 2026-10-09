#!/usr/bin/env node
/** Records a questionless capture in `specs/inbox/`. */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UNKNOWN = "Not identified in the original text.";
const sourceTemplate = resolve(dirname(fileURLToPath(import.meta.url)), "../../templates/Inbox.md");

function fail(message) { throw new Error(message); }

function parseArgs(argv) {
  const values = {
    summary: UNKNOWN,
    problem: UNKNOWN,
    people: UNKNOWN,
    value: UNKNOWN,
    signals: UNKNOWN,
    risks: UNKNOWN,
    directions: UNKNOWN,
    review: "Review gaps before promotion.",
    session: "Standalone capture.",
    turn: "Not applicable.",
    sources: "No contextual sources consulted.",
    data: UNKNOWN,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) fail(`invalid argument: ${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`missing value for ${key}`);
    values[key.slice(2)] = value;
    index += 1;
  }
  for (const key of ["input", "title"]) if (!values[key]) fail(`--${key} is required`);
  return values;
}

function required(value, field) {
  const normalized = value?.trim();
  if (!normalized) fail(`${field} cannot be empty`);
  return normalized;
}

function title(value) {
  const normalized = required(value, "title");
  if (/\r|\n/u.test(normalized)) fail("title must be a single line");
  return normalized;
}

function slug(value, humanTitle) {
  const result = value === undefined
    ? humanTitle.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "")
    : value.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(result)) fail("invalid slug; use ASCII characters in kebab-case");
  return result;
}

async function resolveTemplate(root) {
  for (const path of [join(root, ".fireskills/templates/custom/Inbox.md"), join(root, ".fireskills/templates/Inbox.md"), sourceTemplate]) {
    try { return await readFile(path, "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  fail("template not found; restore fireskills/skills/templates/Inbox.md");
}

function timestamp(now) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function render(template, values) {
  let result = template;
  for (const [token, value] of Object.entries(values)) {
    if (!result.includes(token)) fail(`missing required token: ${token}`);
    result = result.replaceAll(token, value);
  }
  const unresolved = [...new Set(result.match(/\{\{[A-Z0-9_]+\}\}/gu) ?? [])];
  if (unresolved.length) fail(`unfilled tokens: ${unresolved.join(", ")}`);
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolve(args.root ?? process.cwd());
  const originalInput = required(args.input, "original input");
  const humanTitle = title(args.title);
  const destinationRoot = join(root, "specs", "inbox");
  await mkdir(destinationRoot, { recursive: true });
  const now = new Date();
  const prefix = timestamp(now);
  const slugValue = slug(args.slug, humanTitle);
  let suffix = "";
  for (let index = 2;; index += 1) {
    const candidate = join(destinationRoot, `${prefix}-${slugValue}${suffix}.md`);
    try {
      await writeFile(candidate, render(await resolveTemplate(root), {
        "{{INBOX_NAME}}": humanTitle,
        "{{INBOX_SLUG}}": slugValue,
        "{{CAPTURED_AT}}": now.toISOString().replace(/\.\d{3}Z$/u, "Z"),
        "{{DISCOVERY_SESSION}}": required(args.session, "discovery session"),
        "{{CONVERSATION_TURN}}": required(args.turn, "conversation turn"),
        "{{ORIGINAL_INPUT_SHA256}}": createHash("sha256").update(originalInput).digest("hex"),
        "{{ORIGINAL_INPUT}}": originalInput,
        "{{CONSULTED_SOURCES}}": required(args.sources, "consulted contextual sources"),
        "{{SUMMARY}}": required(args.summary, "summary"),
        "{{PROBLEM_OR_OPPORTUNITY}}": required(args.problem, "problem or opportunity"),
        "{{AFFECTED_PEOPLE}}": required(args.people, "affected people"),
        "{{EXPECTED_VALUE}}": required(args.value, "expected value"),
        "{{EXTRACTED_SIGNALS}}": required(args.signals, "extracted signals"),
        "{{DATA_SIGNALS}}": required(args.data, "data persistence signals"),
        "{{RISKS_AND_DEPENDENCIES}}": required(args.risks, "risks and dependencies"),
        "{{FUTURE_DIRECTIONS}}": required(args.directions, "future directions"),
        "{{FUTURE_REVIEW}}": required(args.review, "points to review"),
      }), { encoding: "utf8", flag: "wx" });
      console.log(resolve(candidate));
      return;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      suffix = `-${index}`;
    }
  }
}

main().catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
