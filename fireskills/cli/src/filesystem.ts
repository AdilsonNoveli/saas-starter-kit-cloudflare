/**
 * Shared filesystem utilities.
 *
 * Centralizes path resolution, atomic writes, and file system scans
 * used by the CLI without hiding destructive operations.
 */

import { constants } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

/** Expands `~` and returns a normalized absolute path. */
export function resolvePath(value: string): string {
  const expanded =
    value === "~"
      ? homedir()
      : value.startsWith("~/")
        ? join(homedir(), value.slice(2))
        : value;
  return isAbsolute(expanded) ? resolve(expanded) : resolve(process.cwd(), expanded);
}

/** Checks whether a path exists without throwing on absence. */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Checks whether a path exists and is a regular file. */
export async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Atomically writes UTF-8 text via a temporary file in the same directory. */
export async function writeTextAtomic(
  target: string,
  content: string,
  mode?: number,
): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const temporary = join(
    dirname(target),
    `.${basename(target) || "file"}.${process.pid}.tmp`,
  );
  await writeFile(temporary, content, { encoding: "utf8", mode });
  await rename(temporary, target);
}

/** Reads and parses a JSON file into an unknown object. */
export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

/** Lists files directly inside a directory. */
export async function listDirectoryFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(directory, entry.name));
  } catch {
    return [];
  }
}
