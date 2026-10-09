/**
 * Milestone projections for consuming projects of Fireskills.
 *
 * The canonical source remains distributed: each spec and backlog item declares
 * its links, while this module maintains derived blocks in `specs.md` and
 * `specs/milestones/<ID>.md`. Human content outside delimiters is never replaced.
 */

import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { pathExists, resolvePath, writeTextAtomic } from "./filesystem.js";
import { scanSpecPaths } from "./lifecycle.js";

const TABLE_FIELD = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/u;
const BOLD_FIELD = /^\*\*([^*]+?)\*\*:\s*(.+?)\s*$/u;
const START = "<!-- specsfy:milestone-progress:start -->";
const END = "<!-- specsfy:milestone-progress:end -->";
const INDEX_START = "<!-- specsfy:specs-index:start -->";
const INDEX_END = "<!-- specsfy:specs-index:end -->";

/** Aggregated milestone state exposed for CLI, agents, and local automations. */
export interface MilestoneProgress {
  id: string;
  path: string;
  total_specs: number;
  completed_specs: number;
  backlog_items: number;
  percent: number;
}

/** Result of local deterministic milestone synchronization. */
export interface MilestoneSyncResult {
  index_path: string;
  milestones: MilestoneProgress[];
}

interface LinkedRecord {
  slug: string;
  title: string;
  status: string;
  milestones: string[];
}

/**
 * Reconstructs milestone projections from backlog and specs.
 */
export async function syncMilestones(project: string): Promise<MilestoneSyncResult> {
  const root = resolvePath(project);
  const [specs, backlog] = await Promise.all([scanLinkedSpecs(root), scanBacklog(root)]);
  const ids = [...new Set([...specs, ...backlog].flatMap((record) => record.milestones))]
    .sort(compareMilestone);
  const milestones: MilestoneProgress[] = [];

  for (const id of ids) {
    const linkedSpecs = specs.filter((spec) => spec.milestones.includes(id));
    const linkedBacklog = backlog.filter((item) => item.milestones.includes(id));
    const completedSpecs = linkedSpecs.filter(isComplete).length;
    const path = join(root, "specs", "milestones", `${id}.md`);
    const progress: MilestoneProgress = {
      id,
      path,
      total_specs: linkedSpecs.length,
      completed_specs: completedSpecs,
      backlog_items: linkedBacklog.length,
      percent: linkedSpecs.length ? Math.round((completedSpecs * 100) / linkedSpecs.length) : 0,
    };
    await writeMilestone(path, progress, linkedSpecs, linkedBacklog);
    milestones.push(progress);
  }

  const indexPath = join(root, "specs.md");
  await writeSpecsIndex(indexPath, specs, milestones);
  return { index_path: indexPath, milestones };
}

async function scanLinkedSpecs(project: string): Promise<LinkedRecord[]> {
  const paths = await scanSpecPaths(project);
  return Promise.all(paths.map(async (path) => recordFromFile(path)));
}

async function scanBacklog(project: string): Promise<LinkedRecord[]> {
  const directory = join(project, "specs", "backlog");
  if (!(await pathExists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => recordFromFile(join(directory, entry.name))));
}

async function recordFromFile(path: string): Promise<LinkedRecord> {
  const content = await readFile(path, "utf8");
  const fields = fieldsFrom(content);
  return {
    slug: basename(path, ".md") === "spec" ? basename(dirname(path)) : basename(path, ".md"),
    title: content.match(/^#\s+(.+?)\s*$/mu)?.[1]?.trim() ?? basename(path, ".md"),
    status: fields.get("status") ?? "Unknown",
    milestones: parseMilestones(fields.get("milestones") ?? fields.get("milestone")),
  };
}

function fieldsFrom(content: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of content.split(/\r?\n/u)) {
    const field = TABLE_FIELD.exec(line) ?? BOLD_FIELD.exec(line);
    if (field?.[1] && field[2]) fields.set(field[1].trim().toLowerCase(), field[2].trim());
  }
  return fields;
}

function parseMilestones(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(/[;,]/u).map((item) => item.trim().toUpperCase())
    .filter((item) => /^M\d{2,}(?:-[a-z0-9-]+)?$/iu.test(item)))].sort(compareMilestone);
}

function isComplete(record: LinkedRecord): boolean {
  return record.status.trim().toLowerCase() === "complete";
}

async function writeMilestone(
  path: string,
  progress: MilestoneProgress,
  specs: LinkedRecord[],
  backlog: LinkedRecord[],
): Promise<void> {
  const current = (await pathExists(path)) ? await readFile(path, "utf8") : milestoneSkeleton(progress.id);
  const body = [
    START,
    "## Derived Progress",
    "",
    `- ${progress.completed_specs} of ${progress.total_specs} specs completed (${progress.percent}%).`,
    `- ${progress.backlog_items} related backlog items.`,
    "",
    "### Linked Specs",
    "",
    ...(specs.length ? specs.map((spec) => `- ${spec.slug} — ${spec.title} (${spec.status})`) : ["- No linked specs."]),
    "",
    "### Related Backlog",
    "",
    ...(backlog.length ? backlog.map((item) => `- ${item.slug} — ${item.title}`) : ["- No related backlog items."]),
    END,
    "",
  ].join("\n");
  await writeTextAtomic(path, replaceBlock(current, START, END, body));
}

async function writeSpecsIndex(
  path: string,
  specs: LinkedRecord[],
  milestones: MilestoneProgress[],
): Promise<void> {
  const current = (await pathExists(path)) ? await readFile(path, "utf8") : "# Specifications Index\n\n";
  const rows = specs.map((spec, index) =>
    `| ${String(index + 1).padStart(2, "0")} | ${spec.slug} | ${spec.status} | ${spec.milestones.join(", ") || "—"} |`,
  );
  const body = [
    INDEX_START,
    "## Sequence and Status",
    "",
    "| Order | Spec | Status | Milestones |",
    "| --- | --- | --- | --- |",
    ...(rows.length ? rows : ["| — | No specs | — | — |"]),
    "",
    "## Milestones",
    "",
    ...(milestones.length
      ? milestones.map((milestone) => `- ${milestone.id}: ${milestone.completed_specs}/${milestone.total_specs} specs completed (${milestone.percent}%).`)
      : ["- No milestones linked yet."]),
    INDEX_END,
    "",
  ].join("\n");
  await writeTextAtomic(path, replaceBlock(current, INDEX_START, INDEX_END, body));
}

function milestoneSkeleton(id: string): string {
  return `# ${id}\n\n## Objective\n\nTo be confirmed during interview.\n\n## Exit Condition\n\nTo be confirmed during interview.\n\n## Out of Scope\n\nTo be confirmed during interview.\n\n`;
}

function replaceBlock(current: string, start: string, end: string, next: string): string {
  const begin = current.indexOf(start);
  const finish = current.indexOf(end);
  if (begin >= 0 && finish >= begin) return `${current.slice(0, begin)}${next}${current.slice(finish + end.length).replace(/^\r?\n/u, "")}`;
  const separator = current.endsWith("\n\n") ? "" : current.endsWith("\n") ? "\n" : "\n\n";
  return `${current}${separator}${next}`;
}

function compareMilestone(left: string, right: string): number {
  return left.localeCompare(right, "en", { numeric: true });
}
