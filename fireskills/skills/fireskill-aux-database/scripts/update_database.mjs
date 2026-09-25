#!/usr/bin/env node
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node update_database.mjs [--project <root>]  Updates the managed block in .fireskills/DATABASE.md.");
  process.exit(0);
}
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const START = "<!-- specsfy:database:start -->";
const END = "<!-- specsfy:database:end -->";
const project = resolve(process.argv.includes("--project") ? process.argv[process.argv.indexOf("--project") + 1] : process.cwd());

async function walk(directory) {
  const files = [];
  if (!existsSync(directory)) return files;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", ".claude", "node_modules", "vendor", "_docs", "fireskills", ".nuxt", ".output", ".sst", ".data", "dist"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const structures = [];
const add = (name, kind, source, fields = [], relations = []) => {
  const found = structures.find((item) => item.name === name && item.source === source);
  if (found) {
    found.fields.push(...fields);
    found.relations.push(...relations);
  } else {
    structures.push({ name, kind, source, fields, relations });
  }
};

for (const path of await walk(join(project, "database", "migrations"))) {
  if (path.endsWith(".php")) {
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(/Schema::(?:create|table)\(\s*['"]([^'"]+)/g)) {
      const fields = [...text.matchAll(/\$table->([A-Za-z_]\w*)\(\s*['"]([^'"]+)/g)].map((item) => `${item[2]}:${item[1]}`);
      if (text.includes("$table->id()")) fields.unshift("id:id");
      add(match[1], "Table", relative(project, path).replaceAll("\\", "/"), fields, fields.filter((item) => /:(foreignId|foreignUuid)$/.test(item)).map((item) => item.split(":")[0]));
    }
  }
}

for (const path of await walk(project)) {
  if (path.endsWith(".sql") || path.endsWith(".prisma")) {
    const text = await readFile(path, "utf8");
    const source = relative(project, path).replaceAll("\\", "/");
    if (path.endsWith(".sql")) {
      for (const match of text.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([\w.]+)["`]?\s*\(([\s\S]*?)\);/gi)) {
        add(match[1], "SQL Table", source, match[2].split(",").flatMap((line) => {
          const part = line.match(/^\s*["`]?(\w+)["`]?\s+([\w()]+)/);
          return part && !["PRIMARY", "FOREIGN", "CONSTRAINT"].includes(part[1].toUpperCase()) ? [`${part[1]}:${part[2]}`] : [];
        }));
      }
    } else {
      for (const match of text.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\}/g)) {
        add(match[1], "Prisma Model", source, match[2].split(/\r?\n/).flatMap((line) => {
          const item = line.match(/^\s*(\w+)\s+([\w[\]?]+)/);
          return item ? [`${item[1]}:${item[2]}`] : [];
        }));
      }
    }
  }
}

const target = join(project, ".fireskills", "DATABASE.md");
const existing = existsSync(target) ? await readFile(target, "utf8") : "";
const safe = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const sources = [];
const environment = join(project, ".env.example");
if (existsSync(environment)) {
  const connection = (await readFile(environment, "utf8")).match(/^DB_CONNECTION\s*=\s*([A-Za-z0-9_-]+)/m)?.[1]?.toLowerCase();
  const labels = { pgsql: "PostgreSQL", postgres: "PostgreSQL", postgresql: "PostgreSQL", mysql: "MySQL", mariadb: "MariaDB", sqlite: "SQLite", sqlsrv: "SQL Server" };
  if (connection) sources.push(`| Primary | ${labels[connection] ?? connection} | \`.env.example\` (\`DB_CONNECTION\`) |`);
}
sources.push(...[...new Set(structures.map((item) => item.source))].map((source) => `| Structure | Schema/migration | \`${source}\` |`));
const sourceRows = sources.join("\n") || "| To be confirmed | No recognized structure | To be confirmed |";
const tableRows = structures.length ? structures.map((item) => `| ${safe(item.name)} | ${safe(item.kind)} | ${safe([...new Set(item.fields)].join(", ") || "To be confirmed")} | ${safe([...new Set(item.relations)].join(", ") || "Not detected")} | \`${safe(item.source)}\` |`).join("\n") : "| To be confirmed | To be confirmed | To be confirmed | To be confirmed | To be confirmed |";
const block = `${START}\n| Source | Technology/form | Evidence |\n| --- | --- | --- |\n${sourceRows}\n\n## Detected Structures\n\n| Structure | Type | Fields | Relations | Source |\n| --- | --- | --- | --- | --- |\n${tableRows}\n${END}`;
const updated = existing.includes(START) && existing.includes(END) ? `${existing.split(START)[0]}${block}${existing.split(END).slice(1).join(END)}`.trimEnd() + "\n" : `${(existing.trim() || "# Database")}\n\n## Detected Inventory\n\n${block}\n`;

if (updated !== existing) {
  await mkdir(join(project, ".fireskills"), { recursive: true });
  await writeFile(target, updated);
  console.log(target);
}
