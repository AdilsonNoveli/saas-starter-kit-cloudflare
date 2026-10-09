#!/usr/bin/env node
/** Estimates context per section or ingests explicit usage metrics. */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function parse(argv) {
  const values = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--json") { values.json = true; continue; }
    if (item?.startsWith("--")) { values[item.slice(2)] = argv[index + 1]; index += 1; continue; }
    if (!values.spec) values.spec = item; else throw new Error(`invalid argument: ${item}`);
  }
  if (!values.spec) throw new Error("specify the spec");
  return values;
}

function estimated(text) {
  const headings = [...text.matchAll(/^(#{1,6})\s+(.+)$/gmu)];
  const sections = headings.map((match, index) => {
    const end = headings[index + 1]?.index ?? text.length;
    const body = text.slice(match.index, end);
    return { name: match[2].trim(), source: "estimated", unit: "tokens", value: Math.ceil(body.length / 4), characters: body.length };
  });
  return { schema_version: 1, result: "passed", source: "estimated", method: "ceiling of UTF-8 characters / 4; approximation, not tokenizer output", total: { source: "estimated", unit: "tokens", value: Math.ceil(text.length / 4) }, sections, errors: [] };
}

async function measured(path) {
  let payload;
  try { payload = JSON.parse(await readFile(path, "utf8")); } catch (error) { throw new Error(`invalid usage-json: ${error instanceof Error ? error.message : String(error)}`); }
  const input = payload.input_tokens;
  const output = payload.output_tokens;
  if (!Number.isInteger(input) || input < 0 || !Number.isInteger(output) || output < 0) throw new Error("usage-json requires non-negative integer input_tokens/output_tokens");
  return { schema_version: 1, result: "passed", source: "measured", method: "explicit usage-json", total: { source: "measured", unit: "tokens", value: input + output }, input: { source: "measured", unit: "tokens", value: input }, output: { source: "measured", unit: "tokens", value: output }, sections: [], errors: [] };
}

try {
  const args = parse(process.argv.slice(2));
  const spec = resolve(args.spec);
  const payload = args["usage-json"] ? await measured(resolve(args["usage-json"])) : estimated(await readFile(spec, "utf8"));
  if (args.compare) {
    const other = args["usage-json"] ? await measured(resolve(args.compare)) : estimated(await readFile(resolve(args.compare), "utf8"));
    payload.comparison = { source: payload.source, unit: "tokens", delta: payload.total.value - other.total.value, current: payload.total.value, baseline: other.total.value };
  }
  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else console.log(`Context: ${payload.total.value} tokens (${payload.source}; ${payload.method})`);
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
