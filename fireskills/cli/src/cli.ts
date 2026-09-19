/**
 * Public entrypoint for the Fireskills CLI.
 *
 * Workflow engine (state transitions, effort, progress, milestones, and testing).
 */

import { Command, CommanderError, Option } from "commander";
import { clickUpfyHandoff } from "./clickupfy.js";
import { loadConfig, updateConfig } from "./config.js";
import {
  migrateSpecs,
  SPEC_FOLDERS,
  transitionSpec,
  updateSpecEffort,
} from "./lifecycle.js";
import { syncMilestones } from "./milestones.js";
import {
  scanSpecs,
  serializeSpec,
  specsFingerprint,
  summarizeSpecs,
} from "./progress.js";
import { runProjectTests } from "./project-testing.js";
import { VERSION } from "./version.js";
import {
  addLesson,
  getLessonsStatus,
  Lesson,
  loadLessons,
  pruneLessons,
} from "./lessons.js";
import {
  resolveSpecPath,
  validateSpec,
  ValidationResult,
} from "./validator.js";

interface ProjectOptions {
  project: string;
}

/** Builds public parser without executing side effects. */
export function buildProgram(): Command {
  const program = new Command();
  program
    .name("fireskill")
    .description("Fireskills workflow engine: spec states, effort, progress, and milestones.")
    .version(VERSION, "--version")
    .showHelpAfterError();

  program
    .command("transition")
    .description("moves a spec to the next state")
    .argument("<identifier>", "spec ID or directory slug")
    .argument("<status>", "destination state folder")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .action(async (
      identifier: string,
      status: string,
      options: ProjectOptions & { json?: boolean },
    ) => {
      if (!SPEC_FOLDERS.includes(status as (typeof SPEC_FOLDERS)[number])) {
        throw new Error(`invalid folder status: ${status}`);
      }
      const result = await transitionSpec(
        options.project,
        identifier,
        status as (typeof SPEC_FOLDERS)[number],
      );
      await syncMilestones(options.project);
      printTransition(result, await clickUpfyHandoff(options.project, result.path, "transition"), Boolean(options.json));
    });

  program
    .command("migrate")
    .description("migrates specs from previous layouts to current state folders")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .action(async (options: ProjectOptions & { json?: boolean }) => {
      const migrated = await migrateSpecs(options.project);
      if (migrated.length) await syncMilestones(options.project);
      if (options.json) console.log(JSON.stringify({ migrated }));
      else if (migrated.length) {
        for (const item of migrated) {
          printTransition(item, await clickUpfyHandoff(options.project, item.path, "transition"), false);
        }
      }
      else console.log("no legacy specs to migrate");
    });

  program
    .command("effort")
    .description("updates the estimated effort of a spec")
    .argument("<identifier>", "spec ID or directory slug")
    .argument("<score>", "integer from 1 to 10", Number)
    .requiredOption("--reason <text>", "rationale for the effort estimate")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .action(async (
      identifier: string,
      score: number,
      options: ProjectOptions & { reason: string; json?: boolean },
    ) => {
      const result = await updateSpecEffort(
        options.project,
        identifier,
        score,
        options.reason,
      );
      const handoff = await clickUpfyHandoff(options.project, result.path, "effort");
      if (options.json) console.log(JSON.stringify({ ...result, clickupfy: handoff }));
      else {
        console.log(`${result.identifier}\tEffort ${result.effort}/10`);
        printClickUpfyHandoff(handoff);
      }
    });

  program
    .command("progress")
    .description("displays spec progress summary")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .option("--watch", "emits new summary whenever a spec changes")
    .option("--interval <seconds>", "watch interval in seconds", Number)
    .action(
      async (options: ProjectOptions & {
        json?: boolean;
        watch?: boolean;
        interval?: number;
      }) => runProgress(options),
    );

  const milestones = program
    .command("milestones")
    .description("maintains milestones derived from specs and backlog");
  milestones
    .command("sync")
    .description("updates specs.md and milestone progress projections")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .action(async (options: ProjectOptions & { json?: boolean }) => {
      const result = await syncMilestones(options.project);
      if (options.json) console.log(JSON.stringify(result));
      else {
        console.log(`Index\t${result.index_path}`);
        for (const milestone of result.milestones) {
          console.log(
            `${milestone.id}\t${milestone.completed_specs}/${milestone.total_specs} specs\t` +
              `${milestone.backlog_items} backlog\t${milestone.percent}%`,
          );
        }
      }
    });

  program
    .command("test")
    .description("runs project tests (Vitest, via bun run test)")
    .addOption(projectOption())
    .action(async (options: ProjectOptions) => {
      const result = await runProjectTests(options.project);
      process.exitCode = result.exit_code;
    });

  const config = program.command("config").description("manages project configuration");
  config
    .command("show")
    .description("displays effective configuration")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .action(async (options: ProjectOptions & { json?: boolean }) => {
      printConfig(await loadConfig(options.project), Boolean(options.json));
    });
  config
    .command("set")
    .description("updates configuration values")
    .addOption(projectOption())
    .requiredOption("--watch-interval <seconds>", "watch update interval", Number)
    .option("--json", "emit JSON result")
    .action(
      async (
        options: ProjectOptions & { watchInterval: number; json?: boolean },
      ) => {
        printConfig(
          await updateConfig(options.project, options.watchInterval),
          Boolean(options.json),
        );
      },
    );

  program
    .command("validate")
    .description("runs deterministic linter on spec.md")
    .argument("<identifier>", "spec ID, slug, or file path")
    .addOption(projectOption())
    .option("--strict", "treat warnings as errors")
    .option("--json", "emit JSON result")
    .action(async (target: string, options: ProjectOptions & { strict?: boolean; json?: boolean }) => {
      const specPath = await resolveSpecPath(options.project, target);
      if (!specPath) {
        throw new Error(`Spec not found for identifier: ${target}`);
      }
      const result = await validateSpec(
        specPath,
        options.strict ? { strict: true } : {},
      );
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printValidation(result);
      }
      if (!result.valid) {
        process.exitCode = 1;
      }
    });

  const lesson = program.command("lesson").description("manages the lessons learned playbook (.fireskills/LESSONS.md)");

  lesson
    .command("add")
    .description("records a lesson learned")
    .requiredOption("--signal <type>", "source signal (ac_gap, surviving_mutant, spec_precision_gap, spec_deviation, gate_fail)")
    .requiredOption("--summary <text>", "summary of the issue encountered")
    .requiredOption("--rule <text>", "actionable preventive rule")
    .requiredOption("--source <identifier>", "source spec, PR, or context identifier")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .action(async (options: ProjectOptions & { signal: string; summary: string; rule: string; source: string; json?: boolean }) => {
      const res = await addLesson(options.project, {
        signal: options.signal as any,
        summary: options.summary,
        rule: options.rule,
        source: options.source,
      });
      if (options.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(`Lesson recorded successfully (ID: ${res.lesson.id}, status: ${res.lesson.status})${res.promoted ? " [PROMOTED TO CONFIRMED!]" : ""}`);
      }
    });

  lesson
    .command("list")
    .description("lists recorded lessons")
    .addOption(projectOption())
    .option("--all", "include candidate and quarantined lessons")
    .option("--json", "emit JSON result")
    .action(async (options: ProjectOptions & { all?: boolean; json?: boolean }) => {
      const store = await loadLessons(options.project);
      const list = options.all ? store.lessons : store.lessons.filter(l => l.status === "confirmed");
      if (options.json) {
        console.log(JSON.stringify(list, null, 2));
      } else {
        printLessonsList(list);
      }
    });

  lesson
    .command("status")
    .description("displays quantitative summary of lessons")
    .addOption(projectOption())
    .option("--json", "emit JSON result")
    .action(async (options: ProjectOptions & { json?: boolean }) => {
      const status = await getLessonsStatus(options.project);
      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(`Lessons Learned: ${status.confirmed} confirmed, ${status.candidate} candidate, ${status.quarantined} quarantined (Total: ${status.total})`);
      }
    });

  lesson
    .command("prune")
    .description("removes expired candidate lessons")
    .addOption(projectOption())
    .action(async (options: ProjectOptions) => {
      const count = await pruneLessons(options.project);
      console.log(`Expired candidates removed: ${count}`);
    });

  return program;
}

/** Runs CLI and converts known errors into predictable exit codes. */
export async function runCli(argv = process.argv): Promise<number> {
  const program = buildProgram();
  program.exitOverride();
  try {
    await program.parseAsync(argv);
    return Number(process.exitCode ?? 0);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (
        error.code === "commander.helpDisplayed" ||
        error.code === "commander.version"
      ) {
        return 0;
      }
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    return 1;
  }
}

function projectOption(): Option {
  return new Option("--project <path>", "consumer project root directory").default(
    process.cwd(),
  );
}

async function runProgress(options: ProjectOptions & {
  json?: boolean;
  watch?: boolean;
  interval?: number;
}): Promise<void> {
  const configured = await loadConfig(options.project);
  const interval = options.interval ?? configured.watch_interval;
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new Error("interval must be greater than zero");
  }
  let previous = "";
  while (true) {
    const fingerprint = await specsFingerprint(options.project);
    if (fingerprint !== previous) {
      const specs = await scanSpecs(options.project);
      printProgress(specs, Boolean(options.json));
      previous = fingerprint;
      if (!options.watch) {
        if (!specs.length) process.exitCode = 2;
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}

function printProgress(
  specs: Awaited<ReturnType<typeof scanSpecs>>,
  json: boolean,
): void {
  const summary = summarizeSpecs(specs);
  if (json) {
    console.log(
      JSON.stringify({
        summary,
        specs: specs.map(serializeSpec),
      }),
    );
    return;
  }
  console.log(
    `Summary\t${summary.total_specs} specs\t` +
      `${summary.completed_tasks}/${summary.total_tasks} tasks\t` +
      `${summary.completed_items}/${summary.total_items} items\t` +
      `${summary.percent}%`,
  );
  for (const spec of specs) {
    console.log(
      `${spec.slug}\t${spec.status}\t` +
        `${spec.completed_tasks}/${spec.total_tasks} tasks\t` +
        `${spec.completed_items}/${spec.total_items} items\t${spec.percent}%`,
    );
  }
}

function printConfig(
  config: Awaited<ReturnType<typeof loadConfig>>,
  json: boolean,
): void {
  if (json) console.log(JSON.stringify(config));
  else {
    console.log(`project\t${config.project}`);
    console.log(`watch_interval\t${config.watch_interval}`);
  }
}

function printTransition(
  transition: Awaited<ReturnType<typeof transitionSpec>>,
  handoff: Awaited<ReturnType<typeof clickUpfyHandoff>>,
  json: boolean,
): void {
  if (json) console.log(JSON.stringify({ ...transition, clickupfy: handoff }));
  else {
    console.log(
      `${transition.identifier}\t${transition.from} → ${transition.to}\t${transition.status}`,
    );
    printClickUpfyHandoff(handoff);
  }
}

function printClickUpfyHandoff(handoff: Awaited<ReturnType<typeof clickUpfyHandoff>>): void {
  if (handoff.available && handoff.task_id) {
    console.log(`ClickUpfy\tforward ${handoff.action} to task ${handoff.task_id}`);
  }
}

function printValidation(result: ValidationResult): void {
  console.log(`Validation: ${result.path}`);
  if (result.valid) {
    console.log("Status: VALID (Passed spec linter)");
  } else {
    console.log("Status: INVALID (Fix errors before advancing the gate)");
  }
  console.log(`Errors: ${result.summary.errors} | Warnings: ${result.summary.warnings}`);
  if (result.issues.length > 0) {
    console.log("--- Details ---");
    for (const issue of result.issues) {
      const prefix = issue.level === "error" ? "❌ [ERROR]" : "⚠️ [WARN]";
      const line = issue.line ? ` (Line ${issue.line})` : "";
      console.log(`${prefix}${line}: ${issue.message}`);
    }
  }
}

function printLessonsList(lessons: Lesson[]): void {
  if (lessons.length === 0) {
    console.log("No lessons found.");
    return;
  }
  for (const l of lessons) {
    const tag =
      l.status === "confirmed"
        ? "🛡️ [CONFIRMED]"
        : l.status === "candidate"
          ? "🧪 [CANDIDATE]"
          : "⚠️ [QUARANTINE]";
    console.log(`${tag} L-${String(l.id).padStart(3, "0")}: ${l.summary}`);
    console.log(`   Rule: ${l.rule}`);
    console.log(
      `   Signal: ${l.signal} | Occurrences: ${l.occurrences} | Sources: ${l.sources.join(", ")}`,
    );
  }
}
