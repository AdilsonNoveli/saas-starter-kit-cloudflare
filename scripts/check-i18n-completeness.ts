import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Guards the one invariant that makes "translated" a verifiable claim instead
// of an assertion: `en.json` is the source of truth for the key set, and every
// other locale file in the same `i18n/locales/` directory must have exactly
// the same set of dotted key paths — no missing keys (which silently fall back
// to English at runtime, so a half-translated page looks "fine" in dev) and no
// extra ones (dead keys left behind after an English string was renamed).
//
// Scans every `i18n/locales/` directory under apps/* and layers/*, so the
// per-layer namespace skeletons (`{ "kanban": {} }` etc.) are checked by the
// same rule as the apps — a layer that gains a key in `en.json` without the
// matching pt-BR/es entry fails here rather than in a user's browser.
//
// Run standalone with `bun scripts/check-i18n-completeness.ts`, or via
// `bun run check:i18n` from the repo root. Exits non-zero on any mismatch.
const here = fileURLToPath(new URL(".", import.meta.url));

const SCAN_ROOTS = ["apps", "layers"];
const SOURCE_OF_TRUTH = "en.json";

/**
 * Flattens a parsed JSON message tree into dotted key paths
 * (`{"a":{"b":1}}` -> `a.b`). An empty object is a leaf itself — that's what
 * the layer skeletons are, and they'd otherwise flatten to nothing and
 * compare equal to a file that genuinely has no keys at all.
 */
function flatten(value: unknown, prefix = "", out = new Set<string>()) {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0
  ) {
    for (const [key, child] of Object.entries(value as object)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else if (prefix) {
    out.add(prefix);
  }
  return out;
}

// Every existing `i18n/locales` directory one level under apps/ or layers/.
// (Written as a line comment on purpose: the glob that describes it contains
// the block-comment terminator and would close a JSDoc block early.)
function localeDirs(root: string): string[] {
  const dirs: string[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    const base = resolve(root, scanRoot);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      const candidate = join(base, entry, "i18n", "locales");
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        dirs.push(candidate);
      }
    }
  }
  return dirs.sort();
}

export function checkI18nCompleteness(root: string = resolve(here, "..")) {
  const problems: string[] = [];
  const dirs = localeDirs(root);

  for (const dir of dirs) {
    const rel = relative(root, dir).replaceAll("\\", "/");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const reference = join(dir, SOURCE_OF_TRUTH);

    if (!files.includes(SOURCE_OF_TRUTH)) {
      problems.push(`${rel}: missing ${SOURCE_OF_TRUTH} (source of truth)`);
      continue;
    }

    const expected = flatten(JSON.parse(readFileSync(reference, "utf8")));

    for (const file of files.filter((f) => f !== SOURCE_OF_TRUTH).sort()) {
      const locale = basename(file, ".json");
      const actual = flatten(JSON.parse(readFileSync(join(dir, file), "utf8")));
      const missing = [...expected].filter((key) => !actual.has(key)).sort();
      const extra = [...actual].filter((key) => !expected.has(key)).sort();

      if (missing.length) {
        problems.push(
          `${rel}/${file}: missing ${missing.length} key(s) present in ${SOURCE_OF_TRUTH}:\n` +
            missing.map((key) => `    - ${key}`).join("\n"),
        );
      }
      if (extra.length) {
        problems.push(
          `${rel}/${file}: ${extra.length} extra key(s) not in ${SOURCE_OF_TRUTH}:\n` +
            extra.map((key) => `    + ${key}`).join("\n"),
        );
      }
      if (!missing.length && !extra.length) {
        console.log(`ok  ${rel}/${file} (${actual.size} keys, ${locale})`);
      }
    }
  }

  if (problems.length) {
    console.error(`\ncheck:i18n FAILED — ${problems.length} mismatch(es):\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    return { ok: false, dirs: dirs.length, problems };
  }

  console.log(
    `\ncheck:i18n OK — ${dirs.length} locale director${dirs.length === 1 ? "y" : "ies"} consistent with ${SOURCE_OF_TRUTH}.`,
  );
  return { ok: true, dirs: dirs.length, problems };
}

// Same standalone-entry-point trick as scripts/generate-paths.ts and
// scripts/compose-layers.ts (no portable require.main/import.meta.main across
// Bun and jiti).
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  process.exitCode = checkI18nCompleteness().ok ? 0 : 1;
}
