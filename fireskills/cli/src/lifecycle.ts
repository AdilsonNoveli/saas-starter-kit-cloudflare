/**
 * Physical lifecycle of specifications in consuming projects.
 *
 * Folder expresses operational state. The `Status` field in `spec.md` is a
 * verifiable mirror, maintained by the transition operation.
 */

import { mkdir, readFile, readdir, rename } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { isFile, pathExists, resolvePath, writeTextAtomic } from "./filesystem.js";

export const SPEC_FOLDERS = [
  "draft",
  "defined",
  "planned",
  "in-progress",
  "review",
  "completed",
] as const;

export type SpecFolder = (typeof SPEC_FOLDERS)[number];

const STATUS_BY_FOLDER: Record<SpecFolder, string> = {
  draft: "Draft",
  defined: "Defined",
  planned: "Planned",
  "in-progress": "Implementing",
  review: "Reviewing",
  completed: "Complete",
};

const FOLDER_BY_STATUS = new Map(
  Object.entries(STATUS_BY_FOLDER).map(([folder, status]) => [
    status.toLowerCase(),
    folder as SpecFolder,
  ]),
);

const NEXT_FOLDERS: Record<SpecFolder, readonly SpecFolder[]> = {
  draft: ["draft", "defined"],
  defined: ["draft", "defined", "planned"],
  planned: ["defined", "planned", "in-progress"],
  "in-progress": ["planned", "in-progress", "review"],
  review: ["in-progress", "review", "completed"],
  completed: ["review", "completed"],
};

const TABLE_STATUS = /^(\|\s*Status\s*\|\s*)([^|]*)(\|\s*)$/imu;
const BOLD_STATUS = /^(\*\*Status\*\*:\s*)(.+?)\s*$/imu;
const TABLE_FIELD = (field: string) => new RegExp(
  `^(\\|\\s*${escapeRegExp(field)}\\s*\\|\\s*)([^|]*)(\\|\\s*)$`,
  "imu",
);

/** Spec package located by stable identifier. */
export interface ResolvedSpec {
  identifier: string;
  folder: SpecFolder;
  path: string;
  directory: string;
  status: string;
}

/** Result of a physical state transition. */
export interface SpecTransition extends ResolvedSpec {
  from: SpecFolder;
  to: SpecFolder;
}

/** Options for reproducible effort updates in automations. */
export interface EffortUpdateOptions {
  updatedAt?: string;
}

/** Lists spec paths across all accepted directory layouts. */
export async function scanSpecPaths(project: string): Promise<string[]> {
  return findSpecPaths(resolvePath(project));
}

/**
 * Resolves a single spec package. Accepts full directory name (`0001-login`)
 * or number prefix only (`0001`).
 */
export async function resolveSpec(project: string, identifier: string): Promise<ResolvedSpec> {
  const root = resolvePath(project);
  const all = await findSpecPaths(root);
  const exact = all.filter((path) => basename(dirname(path)) === identifier);
  const matches = exact.length
    ? exact
    : all.filter((path) => basename(dirname(path)).startsWith(`${identifier}-`));
  if (!matches.length) throw new Error(`spec not found: ${identifier}`);
  if (matches.length > 1) {
    throw new Error(`more than one spec found with identifier: ${identifier}`);
  }
  const path = matches[0]!;
  const content = await readFile(path, "utf8");
  const folder = folderFromPath(root, path, content);
  return {
    identifier: basename(dirname(path)),
    folder,
    path,
    directory: dirname(path),
    status: readStatus(content) ?? STATUS_BY_FOLDER[folder],
  };
}

/** Moves a spec across adjacent states and updates its mirror metadata. */
export async function transitionSpec(
  project: string,
  identifier: string,
  to: SpecFolder,
): Promise<SpecTransition> {
  assertFolder(to);
  const spec = await resolveSpec(project, identifier);
  if (!NEXT_FOLDERS[spec.folder].includes(to)) {
    throw new Error(`invalid transition: ${spec.folder} to ${to}`);
  }
  const status = STATUS_BY_FOLDER[to];
  const content = await readFile(spec.path, "utf8");
  const updated = updateStatus(content, status);
  await writeTextAtomic(spec.path, updated);

  const targetDirectory = join(resolvePath(project), "specs", to, spec.identifier);
  if (spec.directory !== targetDirectory) {
    if (await pathExists(targetDirectory)) {
      throw new Error(`destination already contains a spec: ${targetDirectory}`);
    }
    await mkdir(dirname(targetDirectory), { recursive: true });
    await rename(spec.directory, targetDirectory);
  }
  return {
    identifier: spec.identifier,
    from: spec.folder,
    to,
    folder: to,
    path: join(targetDirectory, "spec.md"),
    directory: targetDirectory,
    status,
  };
}

/** Migrates specs from legacy layouts to current state folders. */
export async function migrateSpecs(project: string): Promise<SpecTransition[]> {
  const root = resolvePath(project);
  const legacy = await findLegacySpecPaths(root);
  const results: SpecTransition[] = [];
  for (const path of legacy) {
    const identifier = basename(dirname(path));
    const content = await readFile(path, "utf8");
    const status = readStatus(content);
    const to = status ? FOLDER_BY_STATUS.get(status.toLowerCase()) : undefined;
    if (!to) {
      throw new Error(`invalid status to migrate ${identifier}: ${status ?? "missing"}`);
    }
    const sourceDirectory = dirname(path);
    const targetDirectory = join(root, "specs", to, identifier);
    if (await pathExists(targetDirectory)) {
      throw new Error(`destination already contains a spec: ${targetDirectory}`);
    }
    await writeTextAtomic(path, updateStatus(content, STATUS_BY_FOLDER[to]));
    await mkdir(dirname(targetDirectory), { recursive: true });
    await rename(sourceDirectory, targetDirectory);
    results.push({
      identifier,
      from: folderFromLegacyStatus(status!),
      to,
      folder: to,
      path: join(targetDirectory, "spec.md"),
      directory: targetDirectory,
      status: STATUS_BY_FOLDER[to],
    });
  }
  return results;
}

/** Updates estimated effort and preserves traceable history. */
export async function updateSpecEffort(
  project: string,
  identifier: string,
  effort: number,
  rationale: string,
  options: EffortUpdateOptions = {},
): Promise<ResolvedSpec & { effort: number }> {
  if (!Number.isInteger(effort) || effort < 1 || effort > 10) {
    throw new Error("Effort must be an integer between 1 and 10");
  }
  const normalizedRationale = rationale.trim().replace(/\s+/gu, " ");
  if (!normalizedRationale) throw new Error("Effort rationale is required");
  const spec = await resolveSpec(project, identifier);
  const content = await readFile(spec.path, "utf8");
  const previous = readTableField(content, "Effort") ?? "unspecified";
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  let updated = setTableField(content, "Effort", String(effort));
  updated = setTableField(updated, "Effort updated at", updatedAt);
  updated = setTableField(updated, "Effort rationale", normalizedRationale);
  updated = appendEffortHistory(updated, updatedAt, previous, effort, normalizedRationale);
  await writeTextAtomic(spec.path, updated);
  return { ...spec, effort };
}

/** Exposes expected mirror status for a folder. */
export function statusForFolder(folder: SpecFolder): string {
  assertFolder(folder);
  return STATUS_BY_FOLDER[folder];
}

async function findSpecPaths(root: string): Promise<string[]> {
  const current = await Promise.all(
    SPEC_FOLDERS.map(async (folder) => listSpecPaths(join(root, "specs", folder))),
  );
  return [...current.flat(), ...(await findLegacySpecPaths(root))].sort();
}

async function findLegacySpecPaths(root: string): Promise<string[]> {
  const parents = [join(root, "specs", "specs")];
  const directPaths: string[] = [];
  const direct = join(root, "specs");
  try {
    for (const entry of await readdir(direct, { withFileTypes: true })) {
      if (entry.isDirectory() && !SPEC_FOLDERS.includes(entry.name as SpecFolder) &&
        !["inbox", "backlog", "specs"].includes(entry.name)) {
        const path = join(direct, entry.name, "spec.md");
        if (await isFile(path)) directPaths.push(path);
      }
    }
  } catch {
    return [];
  }
  return [...directPaths, ...(await Promise.all(parents.map(listSpecPaths))).flat()].sort();
}

async function listSpecPaths(parent: string): Promise<string[]> {
  try {
    const entries = await readdir(parent, { withFileTypes: true });
    const candidates = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(parent, entry.name, "spec.md"));
    const available = await Promise.all(candidates.map(async (path) => ({ path, ok: await isFile(path) })));
    return available.filter((entry) => entry.ok).map((entry) => entry.path);
  } catch {
    return [];
  }
}

function folderFromPath(root: string, path: string, content?: string): SpecFolder {
  const folder = path.slice(join(root, "specs").length).split(/[\\/]/u)[1];
  if (folder && SPEC_FOLDERS.includes(folder as SpecFolder)) return folder as SpecFolder;
  const status = content ? readStatus(content) : undefined;
  if (status && FOLDER_BY_STATUS.has(status.toLowerCase())) {
    return FOLDER_BY_STATUS.get(status.toLowerCase())!;
  }
  return "draft";
}

function readStatus(content: string): string | undefined {
  for (const line of content.split(/\r?\n/u)) {
    const table = TABLE_STATUS.exec(line);
    if (table?.[2]?.trim()) return table[2].trim();
    const bold = BOLD_STATUS.exec(line);
    if (bold?.[2]?.trim()) return bold[2].trim();
  }
  return undefined;
}

function updateStatus(content: string, status: string): string {
  if (TABLE_STATUS.test(content)) {
    return content.replace(TABLE_STATUS, `$1${status} $3`);
  }
  if (BOLD_STATUS.test(content)) {
    return content.replace(BOLD_STATUS, `$1${status}`);
  }
  const newline = content.endsWith("\n") ? "" : "\n";
  return `${content}${newline}\n| Status | ${status} |\n`;
}

function readTableField(content: string, field: string): string | undefined {
  const expression = TABLE_FIELD(field);
  for (const line of content.split(/\r?\n/u)) {
    const match = expression.exec(line);
    if (match?.[2]?.trim()) return match[2].trim();
  }
  return undefined;
}

function setTableField(content: string, field: string, value: string): string {
  const expression = TABLE_FIELD(field);
  if (expression.test(content)) return content.replace(expression, `$1${value} $3`);
  const newline = content.endsWith("\n") ? "" : "\n";
  return `${content}${newline}| ${field} | ${value} |\n`;
}

function appendEffortHistory(
  content: string,
  updatedAt: string,
  previous: string,
  effort: number,
  rationale: string,
): string {
  const line = `- ${updatedAt}: ${previous} → ${effort}. ${rationale}`;
  const heading = "## Effort history";
  if (content.includes(heading)) {
    return content.replace(heading, `${heading}\n\n${line}`);
  }
  const newline = content.endsWith("\n") ? "" : "\n";
  return `${content}${newline}\n${heading}\n\n${line}\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function folderFromLegacyStatus(status: string): SpecFolder {
  return FOLDER_BY_STATUS.get(status.toLowerCase()) ?? "draft";
}

function assertFolder(folder: string): asserts folder is SpecFolder {
  if (!SPEC_FOLDERS.includes(folder as SpecFolder)) {
    throw new Error(`invalid folder status: ${folder}`);
  }
}
