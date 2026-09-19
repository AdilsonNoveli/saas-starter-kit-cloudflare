#!/usr/bin/env node
/** Audits whether each AC has recorded QA results in the traceability matrix. */

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

function parse(argv) {
  const values = { json: false, positional: [] };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--json") { values.json = true; continue; }
    if (argv[index]?.startsWith("--")) { values[argv[index].slice(2)] = argv[index + 1]; index += 1; continue; }
    values.positional.push(argv[index]);
  }
  if (values.positional.length !== 2) throw new Error("specify spec and root");
  return values;
}
function traceSection(text) {
  const start = /^###\s+12\.\s+(?:Testing and Traceability Plan|Plano de testes e rastreabilidade)\s*$\n/mu.exec(text);
  if (!start || start.index === undefined) return "";
  const bodyStart = start.index + start[0].length;
  const next = /^###\s+13\./mu.exec(text.slice(bodyStart));
  return text.slice(bodyStart, next?.index === undefined ? text.length : bodyStart + next.index);
}
async function analyze(text, attestationPath) {
  const criteria = [...new Set([...text.matchAll(/^####\s+(AC-\d{3,})\b/gmu)].map((match) => match[1]))].sort();
  const rows = {};
  for (const line of traceSection(text).split(/\r?\n/u)) {
    if (!line.trimStart().startsWith("|") || /^\s*\|\s*-/u.test(line)) continue;
    const cells = line.trim().replace(/^\||\|$/gu, "").split("|").map((cell) => cell.trim());
    if (cells.length < 5 || /^(?:requirement|requisito)$/i.test(cells[0])) continue;
    for (const criterion of cells[1].match(/\bAC-\d{3,}\b/gu) ?? []) rows[criterion] ??= { level: cells[2], command: cells[3], evidence: cells[4] };
  }
  const missing = criteria.filter((criterion) => !rows[criterion] || !/\bPassed\b/iu.test(rows[criterion].evidence));
  const errors = [];
  let attested = false;
  if (attestationPath) {
    attested = true;
    let attestation = {};
    try { attestation = JSON.parse(await readFile(attestationPath, "utf8")); } catch (error) { errors.push(`invalid attestation: ${error instanceof Error ? error.message : String(error)}`); }
    const slug = /^\|\s*Slug\s*\|\s*(\S+)\s*\|\s*$/imu.exec(text)?.[1] ?? "";
    const name = `acceptance:${slug}`;
    if (attestation.schema_version !== 2) errors.push("attestation requires schema_version 2");
    if (attestation.result !== "passed") errors.push("attestation result is not passed");
    const matches = Array.isArray(attestation.checks) ? attestation.checks.filter((check) => check && typeof check === "object" && check.name === name) : [];
    if (matches.length !== 1) errors.push(`${name}: missing or duplicate attested check`);
    else {
      const check = matches[0];
      if (check.status !== "passed" || check.code !== 0) errors.push(`${name}: attested check did not pass`);
      let detail = {};
      try { detail = JSON.parse(String(check.detail ?? "")); } catch { errors.push(`${name}: detail does not contain valid JSON`); }
      if (detail.result !== "passed" || detail.missing || !Array.isArray(detail.criteria) || [...detail.criteria].sort().join(",") !== criteria.join(",")) errors.push(`${name}: attested AC coverage diverges`);
    }
  }
  return { schema_version: 1, result: !missing.length && !errors.length ? "passed" : "failed", criteria, results: rows, missing: [...new Set(errors.length && !missing.length ? criteria : missing)].sort(), attested, errors };
}
try {
  const args = parse(process.argv.slice(2));
  const spec = resolve(args.positional[0]); const root = resolve(args.positional[1]);
  if (!(await stat(spec)).isFile() || !(await stat(root)).isDirectory()) throw new Error("non-existent spec or root.");
  const payload = await analyze(await readFile(spec, "utf8"), args.attestation ? resolve(args.attestation) : undefined);
  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else { console.log(`QA: ${payload.result.toUpperCase()}`); if (payload.missing.length) console.log(`AC WITHOUT RESULT: ${payload.missing.join(", ")}`); payload.errors.forEach((error) => console.log(`ERROR: ${error}`)); }
  process.exitCode = payload.result === "passed" ? 0 : 1;
} catch (error) { console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 2; }
