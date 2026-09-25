#!/usr/bin/env node
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.log("Usage: node build_documentation.mjs [--project <root>] [--check]  Rebuilds docs/ and .fireskills/PACKAGES.md; --check only verifies."); process.exit(0); }
/** Rebuilds technical documentation from existing code without overwriting human notes. */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

const START = "<!-- specsfy:documentator:start -->";
const END = "<!-- specsfy:documentator:end -->";
const ignored = new Set([".git", ".claude", ".venv", "_docs", "fireskills", ".nuxt", ".output", ".sst", ".data", "build", "coverage", "dist", "docs", "node_modules", "storage", "vendor"]);
const args = process.argv.slice(2);
const project = resolve(args.includes("--project") ? args[args.indexOf("--project") + 1] : process.cwd());
const check = args.includes("--check");
const blank = "Purpose not described in local metadata.";

async function json(path) { try { return JSON.parse(await readFile(path, "utf8")); } catch { return {}; } }
async function text(path) { try { return await readFile(path, "utf8"); } catch { return ""; } }
async function walk(folder) {
  const output = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path)); else output.push(path);
  }
  return output;
}
function table(headers, rows) {
  return `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.map((value) => String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`).join("\n")}`;
}
function merge(existing, title, generated) {
  const block = `${START}\n${generated.trim()}\n${END}`;
  if (existing.includes(START) && existing.includes(END)) return `${existing.split(START)[0]}${block}${existing.split(END).slice(1).join(END)}`.trimEnd() + "\n";
  return `${existing.trim() || `# ${title}`}\n\n${block}\n`;
}
function repo(value) {
  const raw = typeof value === "string" ? value : value?.url ?? "";
  return raw.replace(/^git\+/, "").replace(/\.git$/, "");
}
function category(path) {
  const value = path.replaceAll("\\", "/");
  if (/\/(Services?|service)\//i.test(value)) return "Services";
  if (/\/(routes|api|trpc)\//i.test(value) || /route\.(?:ts|js)$/.test(value)) return "Routes and APIs";
  if (/\/(components?)\//i.test(value)) return "Components";
  if (/\/(pages?|views?|app)\//i.test(value) || /page\.(?:tsx?|jsx?)$/.test(value)) return "Pages";
  if (/(^|\/)(tests?|spec)\//i.test(value) || /\.(test|spec)\./.test(value)) return "Tests";
  return "Other sources";
}
function symbols(content) {
  return [...new Set([...content.matchAll(/\b(?:class|function|interface|enum)\s+([A-Z_a-z][\w]*)|\b(?:const|function)\s+([A-Z][\w]*)/g)].map((match) => match[1] ?? match[2]).filter(Boolean))].slice(0, 8).join(", ");
}

if (!existsSync(project)) {
  console.error(`project not found: ${project}`);
  process.exitCode = 2;
} else {
  const files = await walk(project);
  const manifests = files.filter((path) => path.endsWith("package.json"));
  const rootPackage = await json(join(project, "package.json"));
  const composer = await json(join(project, "composer.json"));
  const rows = [];
  const push = (manager, scope, name, version, purpose = blank, source = "") => rows.push([manager, scope, name, version, purpose, source]);
  const addManifest = (manifest, nodeScope = false) => {
    for (const [scope, values] of [["production", manifest.dependencies], ["development", manifest.devDependencies], ["optional", manifest.optionalDependencies], ["peer", manifest.peerDependencies]]) for (const [name, version] of Object.entries(values ?? {})) push("npm", scope, name, version);
  };
  addManifest(rootPackage);
  for (const path of manifests.filter((path) => path !== join(project, "package.json"))) addManifest(await json(path));
  for (const [scope, values] of [["production", composer.require], ["development", composer["require-dev"]]]) for (const [name, version] of Object.entries(values ?? {})) push("Composer", scope, name, version);
  const composerLock = await json(join(project, "composer.lock"));
  for (const item of [...(composerLock.packages ?? []), ...(composerLock["packages-dev"] ?? [])]) push("Composer", "transitive", item.name, item.version, item.description ?? blank, repo(item.source));
  function legacyLock(dependencies) { for (const [name, item] of Object.entries(dependencies ?? {})) { push("npm", "transitive", name, item?.version ?? "—", item?.description ?? blank, repo(item?.repository)); legacyLock(item?.dependencies); } }
  for (const lockPath of files.filter((path) => path.endsWith("package-lock.json"))) {
    const lock = await json(lockPath);
    for (const [key, item] of Object.entries(lock.packages ?? {})) if (key.includes("node_modules/")) push("npm", "transitive", key.split("node_modules/").at(-1), item?.version ?? "—", item?.description ?? blank, repo(item?.repository));
    legacyLock(lock.dependencies);
  }
  const metadataRoots = [...new Set([project, ...manifests.map(dirname)])];
  for (const row of rows) {
    if (row[0] !== "npm") continue;
    for (const root of metadataRoots) {
      const metadata = await json(join(root, "node_modules", row[2], "package.json"));
      if (Object.keys(metadata).length) {
        if (metadata.description) row[4] = metadata.description;
        if (repo(metadata.repository)) row[5] = repo(metadata.repository);
        break;
      }
    }
  }
  const seen = new Set();
  const packages = rows.filter((row) => { const key = `${row[0]}:${row[1]}:${row[2]}:${row[3]}`; if (seen.has(key)) return false; seen.add(key); return true; });
  const code = files.filter((path) => [".astro", ".css", ".go", ".js", ".jsx", ".php", ".rb", ".rs", ".ts", ".tsx", ".vue"].includes(extname(path)) || path.endsWith(".blade.php"));
  const testFiles = code.filter((path) => category(relative(project, path)) === "Tests");
  const declared = Object.keys({ ...(rootPackage.dependencies ?? {}), ...(rootPackage.devDependencies ?? {}), ...(composer.require ?? {}), ...(composer["require-dev"] ?? {}) });
  const frameworks = [["astro", "Astro"], ["next", "Next.js"], ["react", "React"], ["laravel/framework", "Laravel"]].flatMap(([key, label]) => declared.includes(key) ? [label] : []);
  const runner = declared.includes("pestphp/pest") ? "Pest" : declared.includes("vitest") ? "Vitest" : "unidentified";
  const scripts = Object.entries({ ...(rootPackage.scripts ?? {}), ...(composer.scripts ?? {}) }).map(([name, value]) => `${name}: ${typeof value === "string" ? value : "compound command"}`);
  const applicationRows = [];
  for (const path of code.slice(0, 250)) {
    const local = relative(project, path).replaceAll("\\", "/");
    applicationRows.push([category(local), local, symbols(await text(path)) || "—"]);
  }
  const frontendFiles = code.filter((path) => /\.(?:tsx|jsx|vue|astro|css)$/.test(path) || /tailwind\.config/.test(path));
  const frontendContent = await Promise.all(frontendFiles.map(text));
  const tailwind = declared.includes("tailwindcss") || frontendFiles.some((path) => /tailwind\.config/.test(path)) || frontendContent.some((item) => item.includes("tailwindcss"));
  const tokens = [...new Set(frontendContent.flatMap((item) => [...item.matchAll(/--[\w-]+/g)].map((match) => match[0])))];
  const docData = {
    "README.md": ["Technical Documentation", `## Overview\n\n- Detected frameworks: ${frameworks.join(", ") || "unidentified"}.\n- Code files: ${code.length}.\n- Test files: ${testFiles.length}.\n\n## Reading Roadmap\n\n- [Architecture](architecture.md)\n- [Application](application.md)\n- [Database](database.md)\n- [Testing](testing.md)\n- [Packages](packages.md)`],
    "architecture.md": ["Architecture", `## Components\n\n${table(["Type", "Quantity"], [["Code", code.length], ["Tests", testFiles.length]])}\n\n## Diagrams\n\n\`\`\`mermaid\nflowchart TD\n  Application[Application]\n\`\`\`\n\n\`\`\`mermaid\nclassDiagram\n  class Application\n\`\`\``],
    "application.md": ["Application and Implementations", `## Surfaces\n\nCategories: Services, Routes and APIs, Pages, Components, Tests, and Other sources.\n\nInventory: maps each observed file to its surface.\n\n${table(["Category", "File", "Symbols"], applicationRows.length ? applicationRows : [["Other sources", "—", "No code files found"]])}`],
    "database.md": ["Database", `## Persistence Sources\n\n${table(["File"], files.filter((path) => /migration|prisma|\.sql$/i.test(path)).map((path) => [relative(project, path)]).concat([["No confirmed structure beyond listed sources."]]))}\n\n\`\`\`mermaid\nerDiagram\n  ENTITY { string id }\n\`\`\``],
    "flows.md": ["Flows", "## Main Flow\n\n```mermaid\nflowchart LR\n  Input --> Application --> Output\n```\n\n```mermaid\nsequenceDiagram\n  participant Client\n  participant Application\n  Client->>Application: request\n```"],
    "testing.md": ["Testing", `## Summary\n\n- Test files: ${testFiles.length}.\n- Runner: ${runner}.\n- Scripts: ${scripts.join("; ") || "undeclared"}.\n\n${table(["File"], testFiles.map((path) => [relative(project, path)]).concat(testFiles.length ? [] : [["No tests identified"]]))}`],
    "frontend.md": ["Frontend and Design System", `## Observed Surfaces\n\n- Components, pages, or views: ${frontendFiles.length}.\n- Tailwind: ${tailwind ? "detected" : "unidentified"}.\n- CSS tokens: ${tokens.join(", ") || "unidentified"}.\n\n${table(["File"], frontendFiles.map((path) => [relative(project, path)]).concat(frontendFiles.length ? [] : [["No frontend surfaces identified"]]))}`],
    "packages.md": ["Packages and Libraries", `## Inventory\n\n${table(["Category", "Scope", "Package", "Version", "Purpose", "Source", "GitHub"], packages.map((row) => [row[0] === "npm" ? "Third-party" : row[0], row[1], row[2], row[3], row[4], row[5], row[5].includes("github.com") ? row[5] : "—"]))}`],
    "integrations.md": ["Integrations", "## Configuration\n\nEnvironment values and integrations are documented only by their locally declared names, without secrets."],
    "decisions.md": ["Technical Decisions", "## Policy\n\nExplicit decisions in `PROJECT.md` and `.fireskills/` take precedence over inferences in this document."],
  };
  const targets = {...Object.fromEntries(Object.entries(docData).map(([name, [title]]) => [join(project, "docs", name), [title, docData[name][1]]])), [join(project, ".fireskills", "PACKAGES.md")]: ["Packages and libraries", `# Packages and libraries\n\n${table(["Manager", "Scope", "Package", "Version", "Purpose", "Source"], packages)}`]};
  const stale = [];
  for (const [path, [title, generated]] of Object.entries(targets)) {
    const current = await text(path);
    const expected = merge(current, title, generated);
    if (current !== expected) stale.push(relative(project, path));
    if (!check && current !== expected) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, expected); }
  }
  if (check && stale.length) { console.error(`Outdated documentation: ${stale.join(", ")}`); process.exitCode = 1; }
}
