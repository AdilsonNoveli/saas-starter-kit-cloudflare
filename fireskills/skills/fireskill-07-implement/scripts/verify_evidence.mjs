#!/usr/bin/env node
/** Validates material evidence of completed tasks under opt-in contract. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const values = args.filter((arg) => !arg.startsWith("--"));
const [spec, root] = values;
const option = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const json = args.includes("--json");
const delivery = args.includes("--delivery");
const taskFilter = option("--task");
const attestation = option("--attestation");

if (!spec || !root || !existsSync(spec) || !existsSync(root)) {
  console.error("ERROR: non-existent spec or root.");
  process.exitCode = 2;
} else {
  const specPath = resolve(spec);
  const rootPath = resolve(root);
  const text = await readFile(specPath, "utf8");
  const contract = text.match(/^\|\s*Evidence Contract\s*\|\s*(\d+)\s*\|\s*$/imu);
  let payload;
  if (!contract) {
    payload = { schema_version: 1, result: "passed", mode: "legacy", tasks: [], errors: [], warnings: ["Evidence Contract missing; legacy compatibility applied."] };
  } else if (contract[1] !== "1") {
    payload = { schema_version: 1, result: "failed", mode: "strict", tasks: [], errors: [`Unsupported Evidence Contract: ${contract[1]}`], warnings: [] };
  } else {
    const definitions = new Set([...text.matchAll(/\b(?:US|FR|NFR|AC)-\d{3,}\b/g)].map((item) => item[0]));
    const errors = [];
    const evidence = new Map();
    for (const found of text.matchAll(/^\s*<!--\s*specsfy:evidence\s+(\{.*?\})\s*-->\s*$/gm)) {
      try {
        const item = JSON.parse(found[1]);
        if (typeof item.task !== "string") errors.push("evidence missing task");
        else {
          if (evidence.has(item.task)) errors.push(`${item.task}: duplicate evidence`);
          evidence.set(item.task, item);
        }
      } catch (error) {
        errors.push(`invalid evidence JSON: ${error.message}`);
      }
    }
    const reports = [];
    for (const found of text.matchAll(/^- \[([ xX])\] (T\d{3,})\b(.+?)[—-] Refs: (.+?) [—-] Depends:/gm)) {
      const complete = found[1].toLowerCase() === "x";
      const id = found[2];
      const taskText = found[3];
      const migration = taskText.includes("[MIGRATION]");
      if (taskFilter && taskFilter !== id) continue;
      if (delivery && migration && !complete) {
        const taskErrors = ["planned migration has not been completed"];
        reports.push({ task: id, errors: taskErrors });
        errors.push(`${id}: ${taskErrors[0]}`);
        continue;
      }
      if (!complete || (!taskText.includes("[CODE]") && !migration && !(attestation && evidence.has(id)))) continue;
      const item = evidence.get(id);
      const taskErrors = [];
      if (!item) {
        taskErrors.push("missing evidence");
      } else {
        if (!Array.isArray(item.refs) || !item.refs.length) {
          taskErrors.push("missing refs");
        } else {
          const invalid = item.refs.filter((ref) => typeof ref !== "string" || !definitions.has(ref));
          if (invalid.length) taskErrors.push(`invalid refs: ${invalid.join(", ")}`);
        }
        if (!Array.isArray(item.files) || !item.files.length) {
          taskErrors.push("missing files");
        } else {
          for (const file of item.files) {
            const candidate = resolve(rootPath, String(file));
            if (typeof file !== "string" || (!candidate.startsWith(`${rootPath}/`) && candidate !== rootPath) || !existsSync(candidate)) {
              taskErrors.push(`non-existent or unsafe file: ${file}`);
            }
          }
        }
        if (!Array.isArray(item.commands) || !item.commands.length || item.commands.some((command) => !command || typeof command.run !== "string" || !command.run || command.exit !== 0)) {
          taskErrors.push("command missing run or exit 0");
        }
        if (migration) {
          const files = Array.isArray(item.files) ? item.files : [];
          const commands = Array.isArray(item.commands) ? item.commands.filter((command) => command?.exit === 0 && typeof command.run === "string").map((command) => command.run) : [];
          const migrationFile = files.some((file) => typeof file === "string" && /(?:^|\/)(?:database\/migrations|migrations|prisma\/migrations|supabase\/migrations)\//i.test(file));
          const applied = commands.some((command) => /(?:artisan\s+migrate\b(?!:status)|prisma\s+migrate\s+(?:deploy|dev)|supabase\s+(?:db\s+push|migration\s+up)|(?:flyway|liquibase)\s+migrate\b)/i.test(command));
          const verified = commands.some((command) => /(?:artisan\s+migrate:status|prisma\s+migrate\s+status|supabase\s+migration\s+list|(?:flyway|liquibase)\s+(?:info|status)\b)/i.test(command));
          if (!migrationFile) taskErrors.push("migration file does not appear in produced files");
          if (!applied) taskErrors.push("migration apply command missing");
          if (!verified) taskErrors.push("migration status check command missing");
        }
      }
      reports.push({ task: id, errors: taskErrors });
      errors.push(...taskErrors.map((message) => `${id}: ${message}`));
    }
    if (attestation) {
      try {
        const statement = JSON.parse(await readFile(attestation, "utf8"));
        if (statement.schema_version !== 2 || statement.result !== "passed") {
          errors.push("attestation requires schema_version 2 with passed result");
        }
        if (!/^[0-9a-f]{64}$/.test(String(statement.policy_digest ?? ""))) {
          errors.push("attestation has invalid policy_digest");
        }
        const current = spawnSync("git", ["rev-parse", "HEAD"], { cwd: rootPath, encoding: "utf8" }).stdout.trim();
        if (statement.commit_sha != null && statement.commit_sha !== current) {
          errors.push(`divergent commit: attested=${statement.commit_sha} current=${current}`);
        }
        const bindings = new Map((statement.evidence_bindings ?? []).filter((binding) => binding?.spec === relative(rootPath, specPath).replaceAll("\\", "/")).map((binding) => [binding.task, binding]));
        for (const report of reports) {
          const binding = bindings.get(report.task);
          const inline = evidence.get(report.task);
          if (!binding) {
            errors.push(`${report.task}: attested binding missing`);
            continue;
          }
          if (JSON.stringify(binding.refs) !== JSON.stringify(inline.refs) || JSON.stringify(binding.commands) !== JSON.stringify(inline.commands)) {
            errors.push(`${report.task}: attested data divergent`);
          }
          for (const file of inline.files ?? []) {
            if (typeof file !== "string") continue;
            const currentHash = createHash("sha256").update(await readFile(resolve(rootPath, file))).digest("hex");
            if (binding.files?.[file] !== currentHash) {
              errors.push(`${report.task}: divergent hash for ${file}`);
            }
          }
        }
      } catch (error) {
        errors.push(`invalid attestation: ${error.message}`);
      }
    }
    payload = { schema_version: 1, result: errors.length ? "failed" : "passed", mode: attestation ? "attested" : "strict", tasks: reports, errors, warnings: [] };
  }
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Evidence: ${payload.result.toUpperCase()} (${payload.mode})`);
    payload.errors.forEach((error) => console.log(`ERROR: ${error}`));
    payload.warnings.forEach((warning) => console.log(`WARNING: ${warning}`));
  }
  process.exitCode = payload.result === "passed" ? 0 : 1;
}
