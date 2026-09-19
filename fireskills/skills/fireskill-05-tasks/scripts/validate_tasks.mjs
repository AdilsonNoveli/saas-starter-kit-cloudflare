#!/usr/bin/env node
/** Validates tasks embedded in section 14 of the integrated spec. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

/** Canonical checklist order and minimum TDD case coverage. */
const KEYS = ["PREP", "EXECUTE", "VERIFY", "VISUAL", "EVIDENCE", "IMPROVE"], MIN = 3;
/** Identifies structural database mutations requiring a migration in the plan. */
const SCHEMA_CHANGE_TASK = /\b(?:create|alter|add|remove|rename|modify|drop|delete|criar|alterar|adicionar|remover|renomear|modificar|excluir)\b.*\b(?:schema|table|column|persistent\s+field|persistent\s+model|index|índice|indice|foreign\s+key|chave\s+estrangeira|constraint|persistent\s+relation|relação\s+persistente)\b|\b(?:schema|table|column|persistent\s+field|persistent\s+model|index|índice|indice|foreign\s+key|chave\s+estrangeira|constraint|persistent\s+relation|relação\s+persistente)\b.*\b(?:create|alter|add|remove|rename|modify|drop|delete|criar|alterar|adicionar|remover|renomear|modificar|excluir)\b/i;
/** Accepts versioned migration paths used by supported frameworks. */
const MIGRATION_PATH = /(?:^|[\s`])(?:database\/migrations|migrations|prisma\/migrations|supabase\/migrations)\/[\w./-]+/i;

const args = process.argv.slice(2);
const specInput = args.find((arg) => !arg.startsWith("--"));
const draft = args.includes("--allow-draft");
const json = args.includes("--json");

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const metadata = (text, keys) => {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    const match = text.match(new RegExp(`^\\|\\s*${escape(key)}\\s*\\|\\s*(.+?)\\s*\\|\\s*$`, "im"));
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};

const ids = (text, kind) => new Set([...text.matchAll(kind === "US" || kind === "AC" ? new RegExp(`^#{4,6}\\s+(${kind}-\\d{3,})\\b`, "gm") : new RegExp(`^\\s*-\\s+\\*\\*(${kind}-\\d{3,})\\*\\*\\s*:`, "gm"))].map((match) => match[1]));

function body(text) {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => /^#{1,6}\s+(?:14\.\s+)?(?:Tasks|Tarefas)\s*$/i.test(line));
  if (index < 0) return null;
  const level = lines[index].match(/^#+/)[0].length;
  const content = [];
  for (const line of lines.slice(index + 1)) {
    const heading = line.match(/^(#+)\s/);
    if (heading && heading[1].length <= level) break;
    content.push(line);
  }
  return { content, start: index + 1 };
}

function parse(text, errors) {
  const section = body(text);
  if (!section) {
    errors.push("Missing mandatory section 14. Tasks.");
    return [];
  }
  const tasks = [];
  let active;
  section.content.forEach((line, offset) => {
    const number = section.start + offset + 1;
    const match = line.match(/^\s*-\s+\[([ xX])\]\s+(T\d{3,})\s+(.+)$/);
    if (match) {
      const contract = match[3].match(/\s+[—-]\s+Refs:\s*(.*?)\s+[—-]\s+Depends:\s*(.+?)\s*$/);
      if (!contract) errors.push(`Line ${number} (${match[2]}) does not follow '— Refs: ... — Depends: ...'.`);
      active = {
        id: match[2],
        complete: match[1].toLowerCase() === "x",
        raw: line,
        tags: new Set([...match[3].matchAll(/\[([A-Z]+(?:-\d{3,})?)\]/g)].map((item) => item[1])),
        refs: new Set(contract ? [...contract[1].matchAll(/\b(?:US|AC|FR|NFR)-\d{3,}\b/g)].map((item) => item[0]) : []),
        depends: new Set(contract ? [...contract[2].matchAll(/\bT\d{3,}\b/g)].map((item) => item[0]) : []),
        line: number,
        checklist: []
      };
      tasks.push(active);
      return;
    }
    const checklist = line.match(/^\s{2,}-\s+\[([ xX])\]\s+\*\*(PREP|EXECUTE|VERIFY|VISUAL|EVIDENCE|IMPROVE)\*\*:\s+(.+?)\s*$/);
    if (checklist && active) {
      active.checklist.push({ key: checklist[2], complete: checklist[1].toLowerCase() === "x", text: checklist[3], line: number });
    } else if (/^\s{2,}-\s+\[[ xX]\]\s+/.test(line) && active) {
      errors.push(`Line ${number} (${active.id}) contains checklist item outside canonical format.`);
    }
  });
  return tasks;
}

if (!specInput || !existsSync(specInput)) {
  console.error(`ERROR: File not found: ${specInput ?? ""}`);
  process.exitCode = 1;
} else {
  const path = resolve(specInput);
  const text = await readFile(path, "utf8");
  const errors = [];
  const warnings = [];
  const format = metadata(text, ["Format", "Formato"]);
  const definition = metadata(text, "Definition Gate");
  const plan = metadata(text, "Plan Gate");
  const status = metadata(text, "Status");

  if (format !== "Specsfy/2.0") errors.push("spec.md header does not declare Format | Specsfy/2.0.");
  if (definition !== "Passed") errors.push("Definition Gate must be Passed prior to validating tasks.");
  if (!["Defined", "Planned", "Implementing", "Reviewing", "Complete"].includes(status)) {
    errors.push("Status must be Defined, Planned, Implementing, Reviewing, or Complete.");
  }
  if (!["Pending", "Failed", "Passed"].includes(plan)) {
    errors.push("Plan Gate must be Pending, Failed, or Passed.");
  } else if (plan !== "Passed" && !draft) {
    errors.push("Plan Gate must be Passed for strict validation.");
  }

  const tasks = parse(text, errors);
  const specIds = new Set([...["US", "AC", "FR", "NFR"].flatMap((kind) => [...ids(text, kind)])]);
  if (!tasks.length) errors.push("No TNNN task found in section 14.");

  const byId = new Map();
  tasks.forEach((task) => {
    if (byId.has(task.id)) errors.push(`Duplicate task ID: ${task.id}.`);
    byId.set(task.id, task);
  });

  const covered = new Set();
  const allowed = new Set(["P", "TEST", "TDD", "CODE", "DOC", "OPS", "MIGRATION", ...ids(text, "US")]);
  const ancestors = (task, found = new Set()) => {
    task.depends.forEach((id) => {
      if (!found.has(id) && byId.has(id)) {
        found.add(id);
        ancestors(byId.get(id), found);
      }
    });
    return found;
  };

  for (const task of tasks) {
    const list = task.checklist.map((item) => item.key);
    if (list.join("|") !== KEYS.join("|")) {
      errors.push(`${task.id} must declare canonical checklist ${KEYS.join(", ")} in exact order.`);
    }
    const visual = task.checklist.find((item) => item.key === "VISUAL");
    if (!visual) {
      errors.push(`${task.id} requires VISUAL checklist item before EVIDENCE.`);
    } else {
      const notApplicable = /(?:not\s+applicable|n(?:ão|ao)\s+aplic(?:ável|avel))/i.test(visual.text);
      const visualChecks = [
        [/borders?|bord(?:a|as)/i, "borders"],
        [/spacings?|espaç|spacing/i, "spacing"],
        [/margins?|marg(?:em|ens)|margin/i, "margins"],
        [/padding/i, "padding"],
        [/typography|tipograf|font/i, "typography"]
      ];
      const missing = notApplicable ? [] : visualChecks.filter(([pattern]) => !pattern.test(visual.text)).map(([, label]) => label);
      if (missing.length) errors.push(`${task.id} must check ${missing.join(", ")} in VISUAL item.`);
    }

    const open = task.checklist.filter((item) => !item.complete).map((item) => item.key);
    if (task.complete && open.length) errors.push(`${task.id} is marked completed with open checklist items: ${open.join(", ")}.`);
    if (!task.complete && task.checklist.length && !open.length) errors.push(`${task.id} is open, but all checklist items are checked.`);

    const badTags = [...task.tags].filter((tag) => !allowed.has(tag));
    if (badTags.length) errors.push(`${task.id} contains invalid tags: ${badTags.sort().join(", ")}.`);
    if (["TEST", "CODE", "DOC", "OPS"].filter((tag) => task.tags.has(tag)).length !== 1) {
      errors.push(`${task.id} must have exactly one type tag.`);
    }
    if (task.tags.has("TDD") && !task.tags.has("TEST")) errors.push(`${task.id} uses TDD without TEST tag.`);
    if (task.tags.has("MIGRATION") && !task.tags.has("CODE") && !task.tags.has("OPS")) {
      errors.push(`${task.id} uses MIGRATION without CODE or OPS tag.`);
    }
    if (task.tags.has("MIGRATION") && !MIGRATION_PATH.test(task.raw)) {
      errors.push(`${task.id} must specify a versioned file inside a migrations directory.`);
    }
    if (!/(?:[\w.-]+\/)+[\w.-]+|\b[\w.-]+\.(?:cs|feature|go|html|java|js|jsx|json|kt|md|php|py|rb|rs|sql|swift|ts|tsx|vue|yaml|yml)\b/i.test(task.raw)) {
      errors.push(`${task.id} does not declare an exact file path.`);
    }
    if (!task.refs.size) errors.push(`${task.id} has no specification references.`);
    const unknown = [...task.refs].filter((id) => !specIds.has(id));
    if (unknown.length) errors.push(`${task.id} references non-existent IDs: ${unknown.sort().join(", ")}.`);
    task.refs.forEach((id) => { if (specIds.has(id)) covered.add(id); });

    const absent = [...task.depends].filter((id) => !byId.has(id));
    if (absent.length) errors.push(`${task.id} depends on non-existent tasks: ${absent.sort().join(", ")}.`);
    if (task.depends.has(task.id)) errors.push(`${task.id} depends on itself.`);
    const unfinished = [...task.depends].filter((id) => byId.has(id) && !byId.get(id).complete);
    if (task.complete && unfinished.length) errors.push(`${task.id} is marked complete with unfinished dependencies: ${unfinished.sort().join(", ")}.`);
    if (task.checklist.some((item) => item.complete) && unfinished.length) {
      errors.push(`${task.id} has checklist progress while dependencies remain open: ${unfinished.sort().join(", ")}.`);
    }
  }

  const schemaChangeTasks = tasks.filter((task) => !task.tags.has("TEST") && !task.tags.has("DOC") && SCHEMA_CHANGE_TASK.test(task.raw));
  const migrationTasks = tasks.filter((task) => task.tags.has("MIGRATION"));
  if (schemaChangeTasks.length && !migrationTasks.length) {
    errors.push(`Plan contains structural database changes (${schemaChangeTasks.map((task) => task.id).join(", ")}) without a [MIGRATION] task.`);
  }

  const tdd = tasks.filter((task) => task.tags.has("TEST") && (task.tags.has("TDD") || /\btests?[\/_.]|\btest[_./]|\bspec[_./]/i.test(task.raw)) && !/\.feature/i.test(task.raw));
  const required = [...specIds].filter((id) => !covered.has(id));
  if (required.length) errors.push(`Specification IDs without associated task: ${required.sort().join(", ")}.`);
  [...ids(text, "AC")].forEach((id) => {
    if (!tdd.some((task) => task.refs.has(id))) errors.push(`${id} has no TDD task informed by spec BDD.`);
  });
  if (tdd.length < MIN) errors.push(`Feature has ${tdd.length} TDD predecessor(s); minimum required is ${MIN}.`);
  ["US", "FR", "NFR"].forEach((kind) => ids(text, kind).forEach((id) => {
    const count = tdd.filter((task) => task.refs.has(id)).length;
    if (count < MIN) errors.push(`${id} has ${count} TDD predecessor(s); minimum required is ${MIN}.`);
  }));

  tasks.filter((task) => task.tags.has("CODE")).forEach((task) => {
    const matching = [...ancestors(task)].map((id) => byId.get(id)).filter((candidate) => candidate && tdd.includes(candidate) && [...candidate.refs].some((id) => task.refs.has(id)));
    if (!matching.length) errors.push(`${task.id} is CODE without a TDD predecessor covering the same IDs.`);
    else if (matching.length < MIN) errors.push(`${task.id} has ${matching.length} traceable TDD predecessor(s); minimum required is ${MIN}.`);
    if (plan === "Passed") {
      matching.filter((candidate) => !candidate.complete).forEach((candidate) => errors.push(`Plan Gate requires TDD predecessor ${candidate.id} completed before ${task.id}.`));
    }
  });

  if (metadata(text, "Evidence Contract") === "1") {
    const root = (() => {
      let cursor = dirname(path);
      while (dirname(cursor) !== cursor) {
        if (existsSync(resolve(cursor, ".git"))) return cursor;
        cursor = dirname(cursor);
      }
      return dirname(dirname(path));
    })();
    const verifier = resolve(root, "fireskills/skills/fireskill-07-implement/scripts/verify_evidence.mjs");
    if (!existsSync(verifier)) {
      errors.push("Evidence Contract 1 requires verify_evidence.mjs.");
    } else {
      const verifierArgs = [verifier, path, root, "--json"];
      if (["Reviewing", "Complete"].includes(status)) verifierArgs.push("--delivery");
      const run = spawnSync("node", verifierArgs, { encoding: "utf8" });
      if (run.status === 1) {
        try {
          JSON.parse(run.stdout).errors?.forEach((message) => errors.push(`Material evidence: ${message}`));
        } catch {
          errors.push("verify_evidence.mjs returned invalid JSON.");
        }
      } else if (run.status) {
        errors.push(`Failed to execute verify_evidence.mjs: ${run.stderr.trim() || `exit ${run.status}`}`);
      }
    }
  } else if (metadata(text, "Evidence Contract")) {
    errors.push(`Unsupported Evidence Contract: ${metadata(text, "Evidence Contract")}.`);
  }

  const result = {
    errors,
    warnings,
    status: plan,
    counts: {
      total: tasks.length,
      complete: tasks.filter((task) => task.complete).length,
      tdd: tdd.length,
      code: tasks.filter((task) => task.tags.has("CODE")).length,
      checklist_items: tasks.reduce((sum, task) => sum + task.checklist.length, 0),
      checklist_complete: tasks.reduce((sum, task) => sum + task.checklist.filter((item) => item.complete).length, 0),
      covered_spec_ids: covered.size,
      required_spec_ids: specIds.size
    }
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (Object.keys(result.counts).length) {
      console.log(`Counts: ${Object.entries(result.counts).map(([key, value]) => `${key}=${value}`).join(" ")}`);
    }
    errors.forEach((message) => console.log(`ERROR: ${message}`));
    warnings.forEach((message) => console.log(`WARNING: ${message}`));
    console.log(errors.length ? "RESULT: NOT READY" : plan !== "Passed" ? "RESULT: VALID DRAFT" : "RESULT: READY");
  }
  process.exitCode = errors.length ? 1 : 0;
}
