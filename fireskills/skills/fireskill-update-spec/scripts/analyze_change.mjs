#!/usr/bin/env node
/** Projects impact between spec in Git and working tree version. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const areas = {
  definition: new Set([
    "problem and outcome", "problema e resultado",
    "research and clarifications", "research e esclarecimentos",
    "scope and actors", "escopo e atores",
    "project principles and constraints", "principios e restricoes do projeto",
    "user stories", "historias de usuario",
    "acceptance bdd scenarios", "cenarios bdd de aceite",
    "requirements", "requisitos",
    "decisions", "decisoes",
    "definition of done"
  ]),
  plan: new Set([
    "technical plan", "plano tecnico",
    "data model", "modelo de dados",
    "interfaces and contracts", "interfaces e contratos",
    "tasks", "tarefas",
    "execution order", "ordem de execucao",
    "dependencies risks and assumptions", "dependencias riscos e suposicoes"
  ]),
  evidence: new Set([
    "tdd strategy", "estrategia tdd",
    "testing and traceability plan", "plano de testes e rastreabilidade",
    "validations", "validacoes"
  ])
};

const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function identifiers(text) { return new Map([...text.matchAll(/^\s*(?:-\s+\*\*|#{4,6}\s+)((?:US|FR|NFR|AC)-\d{3,})\b(?:\*\*)?[^\n]*/gm)].map((match) => [match[1], match[0].replace(/\s+/g, " ")])); }
function sections(text) { const matches = [...text.matchAll(/^###\s+(\d+)\.\s+(.+?)\s*$/gm)]; return new Map(matches.map((match, index) => [normalize(match[2]), { number: Number(match[1]), title: match[2].trim(), body: text.slice(match.index + match[0].length, index + 1 < matches.length ? matches[index + 1].index : text.length).trim() }])); }

const args = process.argv.slice(2);
const specInput = args.find((arg) => !arg.startsWith("--"));
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "HEAD";
const mode = args.includes("--mode") ? args[args.indexOf("--mode") + 1] : "impact";
const json = args.includes("--json");

if (!specInput || !existsSync(specInput) || !["impact", "changelog"].includes(mode)) {
  console.error("ERROR: non-existent spec or invalid mode.");
  process.exitCode = 2;
} else {
  const spec = resolve(specInput);
  const rootResult = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: dirname(spec), encoding: "utf8" });
  const root = rootResult.status === 0 ? resolve(rootResult.stdout.trim()) : null;
  let error;
  let old = "";
  if (!root || !spec.replaceAll("\\", "/").startsWith(`${root.replaceAll("\\", "/")}/`)) {
    error = "Git repository unavailable";
  } else {
    const git = spawnSync("git", ["show", `${base}:${relative(root, spec).replaceAll("\\", "/")}`], { cwd: root, encoding: "utf8" });
    if (git.status) error = `base reference unavailable: ${base}:${relative(root, spec).replaceAll("\\", "/")}`;
    else old = git.stdout;
  }
  if (error) {
    const payload = { schema_version: 1, mode, result: "error", base, errors: [error] };
    console.log(json ? JSON.stringify(payload, null, 2) : `ERROR: ${error}`);
    process.exitCode = 2;
  } else {
    const fresh = await readFile(spec, "utf8");
    const before = identifiers(old);
    const after = identifiers(fresh);
    const previous = sections(old);
    const current = sections(fresh);
    const added = [...after.keys()].filter((id) => !before.has(id)).sort();
    const removed = [...before.keys()].filter((id) => !after.has(id)).sort();
    const changed = [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id)).sort();
    const titles = [...new Set([...previous.keys(), ...current.keys()])].filter((title) => previous.get(title)?.body !== current.get(title)?.body).sort();
    const changedSections = [...new Set(titles.map((title) => (current.get(title) ?? previous.get(title)).number))].sort((a, b) => a - b);
    const changedAreas = [...new Set(titles.map((title) => {
      const normalized = normalize((current.get(title) ?? previous.get(title)).title);
      return Object.entries(areas).find(([, titles]) => titles.has(normalized))?.[0] ?? "unknown";
    }))].sort();
    const reopen = changedAreas.includes("definition") || changedAreas.includes("unknown") ? "Act I" : changedAreas.includes("plan") ? "Act II" : "None";
    const payload = {
      schema_version: 1,
      mode,
      base,
      result: "passed",
      added,
      removed,
      changed,
      errors: [],
      ...(mode === "impact" ? {
        changed_sections: changedSections,
        changed_areas: changedAreas,
        reopen_from: reopen,
        invalidated_gates: reopen === "Act I" ? ["Definition Gate", "Plan Gate", "Delivery Gate"] : reopen === "Act II" ? ["Plan Gate", "Delivery Gate"] : []
      } : {})
    };
    if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else if (mode === "impact") {
      console.log(`Impact: reopen from ${payload.reopen_from}`);
      console.log(`Gates: ${payload.invalidated_gates.join(", ") || "none"}`);
    } else {
      ["added", "removed", "changed"].forEach((key) => console.log(`${key}: ${payload[key].join(", ") || "none"}`));
    }
  }
}
