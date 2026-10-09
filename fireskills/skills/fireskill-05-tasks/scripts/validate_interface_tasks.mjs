#!/usr/bin/env node
/** Validates the interface phase required for specs with human-facing screens. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const input = process.argv.slice(2).find((argument) => !argument.startsWith("--"));

if (!input || !existsSync(input)) {
  console.error(`ERROR: File not found: ${input ?? ""}`);
  process.exitCode = 1;
} else {
  const text = await readFile(input, "utf8");
  const hasInterface = /^\|\s*(?:Human Interface|Interface para pessoas)\s*\|\s*(?:Yes|Sim)\b/im.test(text);
  const errors = [];

  if (hasInterface) {
    const taskStart = text.search(/^###\s+14\.\s+(?:Tasks|Tarefas)[ \t]*$/im);
    const taskTail = taskStart < 0 ? "" : text.slice(taskStart);
    const taskEnd = taskTail.search(/^###\s+15\.\s+/im);
    const tasks = taskTail.slice(0, taskEnd < 0 ? undefined : taskEnd);
    const screens = text.match(/^####\s+(?:Screens and Responsibilities|Telas e responsabilidades)[ \t]*$([\s\S]*?)(?=^####|^###)/im)?.[1] ?? "";
    const blocks = text.match(/^####\s+(?:Selected Vue and @nuxt\/ui Components|Componentes Vue e @nuxt\/ui selecionados)[ \t]*$([\s\S]*?)(?=^####|^###)/im)?.[1] ?? "";
    const screenCount = [...screens.matchAll(/^\s*-\s+.+$/gm)].length;
    const phase = tasks.match(/^####\s+(?:Interface Phase|Fase de interface)[ \t]*$([\s\S]*?)(?=^####|^###|(?![\s\S]))/im)?.[1];
    const taskCount = phase ? [...phase.matchAll(/^\s*-\s+\[[ xX]\]\s+T\d{3,}\b/gm)].length : 0;

    if (!phase) errors.push("Human Interface requires 'Interface Phase' subsection in section 14.");
    if (!taskCount) errors.push("Interface Phase requires at least one task covering screen, form, or interaction.");
    if (!blocks.trim()) errors.push("Human Interface requires the list of selected Vue and @nuxt/ui components in section 10.");
    if (phase && !phase.includes("INTERFACE.md")) errors.push("Interface Phase must update INTERFACE.md with components and blocks used.");
    if (screenCount && taskCount < screenCount) {
      errors.push(`Interface Phase has ${taskCount} task(s) for ${screenCount} registered screen(s).`);
    }
  }

  errors.forEach((error) => console.error(`ERROR: ${error}`));
  if (!errors.length) console.log("Interface tasks: OK");
  process.exitCode = errors.length ? 1 : 0;
}
