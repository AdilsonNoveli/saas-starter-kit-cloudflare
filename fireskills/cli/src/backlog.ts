/**
 * Backlog item reader for consuming projects.
 */

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { isFile, resolvePath } from "./filesystem.js";

const FIELD = /^\*\*([^*]+)\*\*:\s*(.+?)\s*$/;
const TABLE_FIELD = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/;

/** Projection of a file in `specs/backlog/`. */
export interface BacklogItem {
  slug: string;
  title: string;
  identifier: string;
  status: string;
  path: string;
  content: string;
}

/** Reads all project backlog items in stable order. */
export async function scanBacklogs(project: string): Promise<BacklogItem[]> {
  const root = resolvePath(project);
  return Promise.all((await backlogPaths(root)).map(parseBacklog));
}

/** Computes sha256 fingerprint of backlog paths and contents. */
export async function backlogsFingerprint(project: string): Promise<string> {
  const root = resolvePath(project);
  const digest = createHash("sha256");
  for (const path of await backlogPaths(root)) {
    digest.update(relative(root, path));
    digest.update("\0");
    try {
      digest.update(await readFile(path));
    } catch {
      continue;
    }
    digest.update("\0");
  }
  return digest.digest("hex");
}

async function backlogPaths(root: string): Promise<string[]> {
  const directory = join(root, "specs", "backlog");
  let names: string[];
  try {
    names = await readdir(directory);
  } catch {
    return [];
  }
  const paths = names
    .filter((name) => name.endsWith(".md"))
    .map((name) => join(directory, name));
  const checks = await Promise.all(paths.map(isFile));
  return paths.filter((_, index) => checks[index]).sort();
}

async function parseBacklog(path: string): Promise<BacklogItem> {
  const content = await readFile(path, "utf8");
  const slug = basename(path, ".md");
  let title = slug;
  let identifier = slug;
  let status = "Captured";
  for (const line of content.split(/\r?\n/u)) {
    if (line.startsWith("# ") && title === slug) {
      const heading = line.slice(2).trim();
      title = heading.replace(/^Backlog:\s*/iu, "");
    }
    const match = FIELD.exec(line) ?? TABLE_FIELD.exec(line);
    if (!match?.[1] || !match[2]) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "id") identifier = value;
    if (key === "status") status = value;
  }
  return { slug, title, identifier, status, path, content };
}
