/**
 * Persistent project configuration.
 */

import { join } from "node:path";
import { isFile, readJson, resolvePath, writeTextAtomic } from "./filesystem.js";

export const DEFAULT_WATCH_INTERVAL = 0.75;

/** Effective project configuration. */
export interface ProjectConfig {
  project: string;
  watch_interval: number;
}

type ConfigPayload = Record<string, unknown> & {
  schema_version?: number;
  watch_interval?: number;
};

/** Loads project configuration and applies defaults. */
export async function loadConfig(project: string): Promise<ProjectConfig> {
  const root = resolvePath(project);
  const payload = await readPayload(root);
  const interval = Number(payload.watch_interval ?? DEFAULT_WATCH_INTERVAL);
  validateInterval(interval);
  return { project: root, watch_interval: interval };
}

/** Updates watch interval preserving unknown fields. */
export async function updateConfig(
  project: string,
  watchInterval: number,
): Promise<ProjectConfig> {
  const root = resolvePath(project);
  validateInterval(watchInterval);
  const payload = await readPayload(root);
  payload.schema_version = 1;
  payload.watch_interval = watchInterval;
  await writeTextAtomic(
    join(root, ".fireskills", "config.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  return { project: root, watch_interval: watchInterval };
}

async function readPayload(project: string): Promise<ConfigPayload> {
  const path = join(project, ".fireskills", "config.json");
  if (!(await isFile(path))) return { schema_version: 1 };
  const payload = await readJson(path);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`invalid configuration: ${path}`);
  }
  const value = payload as ConfigPayload;
  if ((value.schema_version ?? 1) !== 1) {
    throw new Error("unsupported configuration version");
  }
  return value;
}

function validateInterval(interval: number): void {
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new Error("watch interval must be a finite number greater than zero");
  }
}
