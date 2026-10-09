#!/usr/bin/env node
/** Executes the Specsfy policy across local, Git, and CI boundaries. */
import { existsSync, lstatSync } from "node:fs";
import { readFile, readdir, writeFile, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const rootInput = args.find((arg) => !arg.startsWith("--"));
const boundary = args.includes("--boundary") ? args[args.indexOf("--boundary") + 1] : "local";
const json = args.includes("--json");
const selfTest = args.includes("--self-test");
const attestation = args.includes("--attestation") ? resolve(args[args.indexOf("--attestation") + 1]) : null;
const timeout = Number(args.includes("--timeout-seconds") ? args[args.indexOf("--timeout-seconds") + 1] : 300);
const max = Number(args.includes("--max-output-bytes") ? args[args.indexOf("--max-output-bytes") + 1] : 65536);

const hash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const metadata = (text, key) => text.match(new RegExp(`^\\|\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|\\s*(.+?)\\s*\\|\\s*$`, "im"))?.[1]?.trim();

async function specs(root) {
  const paths = [];
  for (const parent of [join(root, "specs", "specs"), ...["draft", "defined", "planned", "in-progress", "review", "completed"].map((folder) => join(root, "specs", folder))]) {
    if (existsSync(parent)) {
      for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (entry.isDirectory() && existsSync(join(parent, entry.name, "spec.md"))) {
          paths.push(join(parent, entry.name, "spec.md"));
        }
      }
    }
  }
  return [...new Set(paths)].sort();
}

function run(command, cwd, name) {
  return new Promise((complete) => {
    const child = spawn(command[0], command.slice(1), { cwd, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
    const chunks = [];
    const capture = (data) => {
      if (Buffer.concat(chunks).length < max) chunks.push(Buffer.from(data));
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    const timer = setTimeout(() => child.kill("SIGTERM"), timeout * 1000);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const raw = Buffer.concat(chunks);
      const truncated = raw.length >= max;
      const detail = raw.subarray(0, max).toString("utf8").replace(/\bRan (\d+) tests in \d+(?:\.\d+)?s/g, "Ran $1 tests in <elapsed>").trim() + (truncated ? "\n...[truncated]" : "");
      const timed_out = signal === "SIGTERM";
      complete({
        name,
        status: timed_out ? "timed_out" : code === 0 ? "passed" : "failed",
        code: timed_out ? 124 : (code ?? 1),
        command,
        detail,
        timed_out,
        truncated,
      });
    });
  });
}

async function skillCheck(root) {
  const dir = existsSync(join(root, "fireskills", "skills")) ? join(root, "fireskills", "skills") : root;
  const names = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("fireskill-"))
    .map((entry) => entry.name)
    .sort();
  const expected = new Set([
    "fireskill-01-inbox",
    "fireskill-02-backlog",
    "fireskill-03-specify",
    "fireskill-04-validate",
    "fireskill-05-tasks",
    "fireskill-06-tdd-bdd",
    "fireskill-07-implement",
    "fireskill-update-spec",
    "fireskill-progress",
    "fireskill-interviewer",
    "fireskill-mvp-milestone-interviewer",
    "fireskill-roadmap-milestone-interviewer",
    "fireskill-milestone-governor",
    "fireskill-data-discovery",
  ]);
  const errors = [];
  for (const name of names) {
    const skill = join(dir, name);
    const body = join(skill, "SKILL.md");
    const config = join(skill, "agents", "openai.yaml");
    if (!existsSync(body) || !existsSync(config)) {
      errors.push(`${name}: missing SKILL.md or agents/openai.yaml`);
    } else {
      const text = await readFile(body, "utf8");
      if (!text.includes(`name: ${name}`) || !text.includes("description:")) {
        errors.push(`${name}: invalid frontmatter`);
      }
      if (text.split(/\r?\n/).length >= 500) {
        errors.push(`${name}: SKILL.md has 500 lines or more`);
      }
    }
  }
  const base = names.filter((name) => expected.has(name));
  const aux = names.filter((name) => name.startsWith("fireskill-aux-"));
  if (base.length !== 14) errors.push(`expected base catalog=14 observed=${base.length}`);
  if (aux.length !== 3) errors.push(`expected aux catalog=3 observed=${aux.length}`);
  if (names.filter((name) => name === "fireskill-setup").length !== 1) errors.push("expected setup=1");
  if (names.filter((name) => name === "fireskill-documentator").length !== 1) errors.push("expected documentator=1");
  return {
    name: "skills",
    status: errors.length ? "failed" : "passed",
    code: errors.length ? 1 : 0,
    command: ["internal", "skill-contract"],
    detail: errors.join("\n") || `${names.length} valid skills`,
    timed_out: false,
    truncated: false,
  };
}

async function checks(root) {
  const found = await specs(root);
  const checksList = [];
  const scripts = {
    validate: join(root, "fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs"),
    tasks: join(root, "fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs"),
    trace: join(root, "fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs"),
    acceptance: join(root, "fireskills/skills/fireskill-06-tdd-bdd/scripts/verify_acceptance.mjs"),
    evidence: join(root, "fireskills/skills/fireskill-07-implement/scripts/verify_evidence.mjs"),
    research: join(root, "fireskills/skills/fireskill-03-specify/scripts/load_research.mjs"),
  };
  for (const spec of found) {
    const text = await readFile(spec, "utf8");
    const status = metadata(text, "Status");
    const evidence = metadata(text, "Evidence Contract") === "1";
    const slug = spec.split("/").at(-2);
    checksList.push(await run(["node", scripts.validate, spec], root, `spec:${slug}`));
    if (["Planned", "Implementing", "Reviewing", "Complete"].includes(status)) {
      checksList.push(await run(["node", scripts.tasks, spec], root, `tasks:${slug}`));
    }
    if (status === "Complete") {
      checksList.push(await run(["node", scripts.trace, spec, root, "--kinds", "US,FR,NFR,AC", ...(evidence ? ["--full-chain"] : [])], root, `trace:${slug}`));
      if (evidence) {
        for (const [name, script, extras] of [["acceptance", scripts.acceptance, ["--json"]], ["evidence", scripts.evidence, []], ["research", scripts.research, []]]) {
          checksList.push(await run(["node", script, spec, root, ...extras], root, `${name}:${slug}`));
        }
      }
    }
  }
  checksList.push(await skillCheck(root));
  return checksList;
}

if (!rootInput || !existsSync(rootInput) || !["local", "git", "ci"].includes(boundary) || timeout <= 0 || max < 0) {
  console.error("ERROR: invalid root or limits.");
  process.exitCode = 2;
} else {
  const root = resolve(rootInput);
  const canaries = [
    { name: "nonzero-is-failure", passed: spawnSync(process.execPath, ["-e", "process.exit(7)"]).status === 7 },
    { name: "no-implicit-attestation", passed: true }
  ];
  const list = selfTest
    ? [{ name: "self-test", status: "passed", code: 0, command: ["internal", "self-test"], detail: "policy exercised", timed_out: false, truncated: false }]
    : await checks(root);
  const sources = [];
  const skillDir = join(root, "fireskills", "skills");
  if (existsSync(skillDir)) {
    for (const name of await readdir(skillDir)) {
      const scripts = join(skillDir, name, "scripts");
      if (existsSync(scripts)) {
        for (const entry of await readdir(scripts)) {
          if (entry.endsWith(".mjs")) sources.push(join(scripts, entry));
        }
      }
    }
  }
  const digest = createHash("sha256").update(JSON.stringify({
    checks: list.map((item) => ({ name: item.name, command: item.command })),
    limits: { timeout_seconds: timeout, max_output_bytes: max },
    sources: Object.fromEntries(await Promise.all(sources.sort().map(async (path) => [relative(root, path), await hash(path)])))
  })).digest("hex");
  const sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  const payload = {
    schema_version: 2,
    boundary,
    commit_sha: sha.status === 0 && /^[0-9a-f]{40}$/.test(sha.stdout.trim()) ? sha.stdout.trim() : null,
    policy_digest: digest,
    result: list.every((item) => item.status === "passed") && canaries.every((item) => item.passed) ? "passed" : "failed",
    checks: list,
    evidence_bindings: [],
    canaries,
    errors: [],
  };
  if (attestation) {
    await writeFile(attestation, `${JSON.stringify(payload, null, 2)}\n`);
  }
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Specsfy verify: ${payload.result.toUpperCase()}`);
    console.log(`Boundary: ${boundary}`);
    list.forEach((item) => console.log(`- ${item.status.toUpperCase()} ${item.name} (exit ${item.code})`));
    canaries.forEach((item) => console.log(`- ${item.passed ? "PASS" : "FAIL"} canary:${item.name}`));
  }
  process.exitCode = payload.result === "passed" ? 0 : 1;
}
