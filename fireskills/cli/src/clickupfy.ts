/** Optional integration with ClickUpfy without replacing local specifications. */
import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface ClickUpfyHandoff {
  available: boolean;
  task_id?: string;
  action?: "transition" | "effort";
}

/** Detects installed ClickUpfy skill and reads task link from spec metadata. */
export async function clickUpfyHandoff(
  project: string,
  specPath: string,
  action: "transition" | "effort",
): Promise<ClickUpfyHandoff> {
  const available = await hasClickUpfySkill(project);
  const content = await readFile(specPath, "utf8");
  const task = content.match(/^\|\s*ClickUp Task\s*\|\s*([^|]+?)\s*\|\s*$/imu)?.[1]?.trim();
  return task ? { available, task_id: task, action } : { available };
}

/**
 * Checks current and legacy ClickUpfy skill installations.
 *
 * Current version uses `clickup-issue-implement` in `.codex/skills`,
 * installed locally or globally. The `.agents/skills` folder remains
 * for backwards compatibility with earlier setups.
 */
export async function hasClickUpfySkill(
  project: string,
  userHome = homedir(),
): Promise<boolean> {
  const candidates = [
    join(project, ".codex", "skills", "clickup-issue-implement", "SKILL.md"),
    join(userHome, ".codex", "skills", "clickup-issue-implement", "SKILL.md"),
    join(project, ".agents", "skills", "clickupfy-executar-tarefa", "SKILL.md"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return true;
    } catch {
      // Absence simply moves to next candidate.
    }
  }

  return false;
}
