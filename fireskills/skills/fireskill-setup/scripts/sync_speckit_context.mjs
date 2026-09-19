#!/usr/bin/env node
/**
 * Projects GitHub Spec Kit context to Specsfy without modifying source files.
 *
 * Constitution presence activates integration. Each regular file under `specs/` is read
 * as raw bytes to ensure non-textual contracts and attachments are indexed properly.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const START = "<!-- specsfy:speckit:start -->";
const END = "<!-- specsfy:speckit:end -->";
const CONSTITUTION = ".specify/memory/constitution.md";
const TARGET = ".fireskills/SPECKIT.md";

/**
 * Updates exclusively the managed block of the bridge and returns the modified path.
 * The absence of the constitution indicates that the project does not use GitHub Spec Kit.
 */
export async function syncSpecKitContext(projectPath) {
  const project = resolve(projectPath);
  const constitutionPath = join(project, ...CONSTITUTION.split("/"));
  if (!(await isRegularFile(constitutionPath))) return undefined;

  const constitution = await inspectFile(project, constitutionPath);
  const specsPath = join(project, "specs");
  const artifacts = existsSync(specsPath)
    ? await inspectDirectory(project, specsPath)
    : [];
  const block = renderProjection(constitution, artifacts);
  const target = join(project, ...TARGET.split("/"));
  const existing = existsSync(target) ? await readFile(target, "utf8") : "";
  const updated = upsertManagedBlock(existing, block, target);
  if (updated === existing) return undefined;

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, updated);
  return target;
}

/** Recursively traverses `specs/` in stable order, reading every regular file. */
async function inspectDirectory(project, directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await inspectDirectory(project, path)));
    } else if (entry.isFile()) {
      files.push(await inspectFile(project, path));
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

/** Reads bytes, SHA-256 fingerprint, and title without assuming Markdown format. */
async function inspectFile(project, path) {
  const content = await readFile(path);
  const binary = content.includes(0);
  const text = binary ? "" : content.toString("utf8");
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    path: relative(project, path).split(sep).join("/"),
    type: classify(path, binary),
    title: heading || (binary ? "binary file" : basename(path)),
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

/** Classifies known Spec Kit artifacts with a generic fallback. */
function classify(path, binary) {
  if (binary) return "Binary";
  const name = basename(path).toLowerCase();
  const normalizedPath = path.split(sep).join("/");
  if (normalizedPath.endsWith(CONSTITUTION)) return "Constitution";
  if (name === "spec.md") return "Spec";
  if (name === "plan.md") return "Plan";
  if (name === "tasks.md") return "Tasks";
  if (name === "research.md") return "Research";
  if (name === "data-model.md") return "Data";
  if (name === "quickstart.md") return "Guide";
  if (path.split(sep).includes("contracts")) return "Contract";
  return "Artifact";
}

/** Builds derived projection guiding agents back to original sources. */
function renderProjection(constitution, artifacts) {
  const rows = [constitution, ...artifacts]
    .map(
      ({ path, type, title, sha256 }) =>
        `| \`${escapeCell(path)}\` | ${escapeCell(type)} | ${escapeCell(title)} | \`${sha256}\` |`,
    )
    .join("\n");
  return `${START}
## Detected Sources

| Path | Type | Title | SHA-256 |
| --- | --- | --- | --- |
${rows}

## Coexistence Rules

- Read constitution and listed original files before planning or modifying a corresponding feature.
- Treat constitution as project governance. Document incompatibilities with Specsfy rules before proceeding and request user direction.
- Preserve file paths, contents, and layout of \`.specify/\` and \`specs/\`. The \`fireskill-setup\` skill updates solely this derived projection.
- Use existing Spec Kit artifacts as sources for the corresponding feature. Do not silently convert them to native Specsfy format.
${END}`;
}

/** Updates exclusively the delimited managed block, preserving all external notes. */
function upsertManagedBlock(existing, block, path) {
  const starts = existing.split(START).length - 1;
  const ends = existing.split(END).length - 1;
  if (starts !== ends || starts > 1) {
    throw new Error(`malformed compatibility block in ${path}`);
  }
  if (!starts) {
    const header = existing
      ? existing
      : "# Compatibility with GitHub Spec Kit\n\n" +
        "Projection generated from sources preserved in the project.\n";
    const separator = header.endsWith("\n\n")
      ? ""
      : header.endsWith("\n")
        ? "\n"
        : "\n\n";
    return `${header}${separator}${block}\n`;
  }
  const start = existing.indexOf(START);
  const end = existing.indexOf(END, start) + END.length;
  return `${existing.slice(0, start)}${block}${existing.slice(end)}`;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function isRegularFile(path) {
  try {
    return (await lstat(path)).isFile();
  } catch {
    return false;
  }
}
