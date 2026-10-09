import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Every English page under content/docs/{1.saas-starter-kit,2.fireskills} must
// have a pt-br and an es counterpart with the same structure: same headings,
// table rows, fenced code blocks and internal links. Code blocks are compared
// verbatim, so a command changed in English cannot silently stay stale in a
// translation. Run with `bun scripts/check-docs-translations.ts` or `bun run check:i18n`.
const here = fileURLToPath(new URL(".", import.meta.url));
const content = resolve(here, "..", "apps/web/content");
const SOURCES = ["docs/1.saas-starter-kit", "docs/2.fireskills"];
const LOCALES = ["pt-br", "es"];

function list(root: string): string[] {
  const walk = (dir: string): string[] =>
    existsSync(dir)
      ? readdirSync(dir).flatMap((name) => {
          const path = join(dir, name);
          return statSync(path).isDirectory() ? walk(path) : [path];
        })
      : [];
  return walk(root)
    .map((path) => relative(root, path).replaceAll("\\", "/"))
    .sort();
}

function shape(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  const prose: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s*(`{3,})/.exec(lines[i]!);
    if (!open) {
      prose.push(lines[i]!);
      continue;
    }
    const start = i;
    const closer = new RegExp(`^\\s*\`{${open[1]!.length},}\\s*$`);
    while (++i < lines.length && !closer.test(lines[i]!));
    blocks.push(lines.slice(start, i + 1).join("\n"));
  }
  return {
    blocks,
    headings: prose.filter((l) => /^#{1,6}\s/.test(l)).length,
    rows: prose.filter((l) => l.startsWith("|")).length,
    links: (prose.join("\n").match(/\]\((\/docs[^)]*)\)/g) ?? []).sort(),
  };
}

export function checkDocsTranslations(): string[] {
  const problems: string[] = [];

  for (const srcRel of SOURCES) {
    const sourceDir = join(content, srcRel);
    const english = list(sourceDir);

    for (const locale of LOCALES) {
      const target = join(content, locale, srcRel);
      const translated = list(target);

      for (const file of english.filter((f) => !translated.includes(f))) {
        problems.push(`${locale}: missing ${srcRel}/${file}`);
      }
      for (const file of translated.filter((f) => !english.includes(f))) {
        problems.push(`${locale}: ${srcRel}/${file} has no English source`);
      }
      for (const file of english.filter(
        (f) => f.endsWith(".md") && translated.includes(f),
      )) {
        const en = shape(readFileSync(join(sourceDir, file), "utf8"));
        const tr = shape(readFileSync(join(target, file), "utf8"));
        const diffs: string[] = [];
        if (en.headings !== tr.headings) diffs.push("headings");
        if (en.rows !== tr.rows) diffs.push("table rows");
        if (en.blocks.join("\0") !== tr.blocks.join("\0"))
          diffs.push("code blocks");
        if (en.links.join("\0") !== tr.links.join("\0")) diffs.push("links");
        if (diffs.length)
          problems.push(
            `${locale}: ${srcRel}/${file} differs from English in ${diffs.join(", ")}`,
          );
      }
    }
  }

  return problems;
}

if (import.meta.main) {
  const problems = checkDocsTranslations();
  if (problems.length) {
    console.error(problems.map((p) => `  ${p}`).join("\n"));
    console.error(
      `\ncheck-docs-translations FAILED (${problems.length} problems)`,
    );
    process.exit(1);
  }
  const totalEnglish = SOURCES.reduce(
    (acc, src) => acc + list(join(content, src)).length,
    0,
  );
  console.log(
    `check-docs-translations OK — ${LOCALES.join(" and ")} match ${totalEnglish} English files across ${SOURCES.join(", ")}.`,
  );
}
