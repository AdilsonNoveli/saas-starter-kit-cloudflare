import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Generates `apps/web/constants/paths.json`, the flat path list
// `FolderTree.global.vue` renders on the docs "project structure" page
// (`::folder-tree`). That component does no filesystem walking of its own —
// it just links parent to child by exact string match on a directory path
// ending in "/" — so this is the one place that has to actually walk the
// repo. Previously hand-maintained, which went stale silently (dead entries
// for files moved elsewhere, whole new top-level dirs like layers/ missing
// entirely). Same principle as scripts/compose-layers.ts: data derivable
// from the filesystem should never be hand-maintained.
//
// Called automatically from apps/web/nuxt.config.ts on every `nuxt dev`/
// `build`/`generate`/`typecheck`/`prepare`. `bun scripts/generate-paths.ts`
// also works standalone to inspect the output.
const here = fileURLToPath(new URL(".", import.meta.url));

// Top-level entries `git` tracks (so already past .gitignore) but that
// aren't part of the shipped starter-kit a customer would navigate — this
// fork's own AI-agent tooling config and internal working docs. Everything
// else git tracks shows up automatically; there's no separate allowlist to
// keep in sync as real product dirs (layers/, etc.) get added.
const EXCLUDED_ROOTS = new Set([".agents", ".claude", "_docs", "skills-lock.json"]);

/**
 * `git ls-files` rather than a manual directory walk: it already applies
 * .gitignore (node_modules, .nuxt, .output, dist, .sst, .env.* except
 * .env.example, etc.) with zero risk of this generator's exclude list
 * drifting from the real one in .gitignore.
 */
function gitTrackedFiles(root: string): string[] {
  const out = execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

/**
 * Builds the flat list: every tracked file, plus every ancestor directory
 * (suffixed with "/") so FolderTree.global.vue can find each parent by exact
 * string match. Final sort is just for a stable, readable diff — the
 * component re-sorts itself (directories first, then alphabetically) before
 * rendering, so array order here has no visual effect.
 */
function buildPaths(root: string): string[] {
  const files = gitTrackedFiles(root).filter(
    (path) => !EXCLUDED_ROOTS.has(path.split("/")[0]!),
  );

  const entries = new Set<string>();
  for (const file of files) {
    entries.add(file);
    const segments = file.split("/");
    for (let i = 1; i < segments.length; i++) {
      entries.add(`${segments.slice(0, i).join("/")}/`);
    }
  }

  return [...entries].sort();
}

function write(outFile: string, paths: string[]) {
  const content = `${JSON.stringify(paths, null, 2)}\n`;
  mkdirSync(dirname(outFile), { recursive: true });

  // If the file already exists with identical content, skip writing entirely.
  // This avoids Windows file-lock collisions during concurrent Nuxt/Nitro processes.
  if (existsSync(outFile)) {
    try {
      const existing = readFileSync(outFile, "utf8");
      if (existing === content) {
        return;
      }
    } catch {
      // If reading fails for any reason, proceed to write.
    }
  }

  // Safe write with retry for transient Windows file-lock errors (EBUSY, EPERM, UNKNOWN)
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const tmpFile = `${outFile}.${process.pid}.${Date.now()}.tmp`;
      writeFileSync(tmpFile, content, "utf8");
      try {
        renameSync(tmpFile, outFile);
      } catch {
        // Fallback to direct write if atomic rename is blocked on Windows
        writeFileSync(outFile, content, "utf8");
        try { unlinkSync(tmpFile); } catch {}
      }
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        // If still blocked but file exists, do not crash the entire build
        if (existsSync(outFile)) {
          console.warn(`generate-paths: could not update ${outFile} due to file lock; using existing file`);
          return;
        }
        throw err;
      }
      // Brief sleep before retry
      const waitTill = Date.now() + 100 * attempt;
      while (Date.now() < waitTill) {}
    }
  }
}

export function generatePaths(root: string = resolve(here, "..")) {
  const outFile = resolve(root, "apps/web/constants/paths.json");
  const paths = buildPaths(root);
  write(outFile, paths);
  console.log(`generate-paths: ${paths.length} entries -> ${outFile}`);
  return { outFile, count: paths.length };
}

// Allow `bun scripts/generate-paths.ts` as a standalone debug entry point —
// same file-path-comparison trick as scripts/compose-layers.ts (no portable
// require.main/import.meta.main across Bun and jiti).
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  generatePaths();
}
