/**
 * Entrada pública do CLI do Fireskills.
 *
 * Motor do fluxo (transições de estado, esforço, progresso, milestones e
 * testes). Derivado do CLI do Specsfy (MIT, ver LICENSE); o instalador, o
 * catálogo remoto, o atualizador e a TUI não foram trazidos: o Fireskills vive
 * dentro do repositório e não é distribuído por esse CLI.
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

interface ProjectOptions {
  project: string;
}

/** Constrói o parser público sem executar efeitos. */
export function buildProgram(): Command {
  const program = new Command();
  program
    .name("fireskill")
    .description("Fluxo do Fireskills: estados de spec, esforço, progresso e milestones.")
    .version(VERSION, "--version")
    .showHelpAfterError();

  program
    .command("transition")
    .description("move uma spec para o próximo estado")
    .argument("<identificador>", "ID e slug da spec")
    .argument("<status>", "pasta de destino")
    .addOption(projectOption())
    .option("--json", "emite resultado JSON")
    .action(async (
      identifier: string,
      status: string,
      options: ProjectOptions & { json?: boolean },
    ) => {
      if (!SPEC_FOLDERS.includes(status as (typeof SPEC_FOLDERS)[number])) {
        throw new Error(`status de pasta inválido: ${status}`);
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
    .description("migra specs do layout anterior para pastas de estado")
    .addOption(projectOption())
    .option("--json", "emite resultado JSON")
    .action(async (options: ProjectOptions & { json?: boolean }) => {
      const migrated = await migrateSpecs(options.project);
      if (migrated.length) await syncMilestones(options.project);
      if (options.json) console.log(JSON.stringify({ migrated }));
      else if (migrated.length) {
        for (const item of migrated) {
          printTransition(item, await clickUpfyHandoff(options.project, item.path, "transition"), false);
        }
      }
      else console.log("nenhuma spec legada para migrar");
    });

  program
    .command("effort")
    .description("atualiza o esforço estimado de uma spec")
    .argument("<identificador>", "ID e slug da spec")
    .argument("<pontuacao>", "inteiro de 1 a 10", Number)
    .requiredOption("--reason <texto>", "justificativa da estimativa")
    .addOption(projectOption())
    .option("--json", "emite resultado JSON")
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
    .description("exibe progresso das specs")
    .addOption(projectOption())
    .option("--json", "emite resultado JSON")
    .option("--watch", "emite novo resumo quando uma spec muda")
    .option("--interval <segundos>", "intervalo do watch em segundos", Number)
    .action(
      async (options: ProjectOptions & {
        json?: boolean;
        watch?: boolean;
        interval?: number;
      }) => runProgress(options),
    );

  const milestones = program
    .command("milestones")
    .description("mantém os marcos derivados de specs e backlog");
  milestones
    .command("sync")
    .description("atualiza specs.md e o progresso dos milestones")
    .addOption(projectOption())
    .option("--json", "emite resultado JSON")
    .action(async (options: ProjectOptions & { json?: boolean }) => {
      const result = await syncMilestones(options.project);
      if (options.json) console.log(JSON.stringify(result));
      else {
        console.log(`Índice\t${result.index_path}`);
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
    .description("executa os testes do projeto (Vitest, via bun run test)")
    .addOption(projectOption())
    .action(async (options: ProjectOptions) => {
      const result = await runProjectTests(options.project);
      process.exitCode = result.exit_code;
    });

  const config = program.command("config").description("configura o projeto consumidor");
  config
    .command("show")
    .description("exibe a configuração efetiva")
    .addOption(projectOption())
    .option("--json", "emite resultado JSON")
    .action(async (options: ProjectOptions & { json?: boolean }) => {
      printConfig(await loadConfig(options.project), Boolean(options.json));
    });
  config
    .command("set")
    .description("altera a configuração")
    .addOption(projectOption())
    .requiredOption("--watch-interval <segundos>", "intervalo de atualização", Number)
    .option("--json", "emite resultado JSON")
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
  return program;
}

/** Executa o CLI e converte falhas conhecidas em exit code previsível. */
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
    console.error(`erro: ${message}`);
    return 1;
  }
}

function projectOption(): Option {
  return new Option("--project <caminho>", "raiz do projeto consumidor").default(
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
    throw new Error("interval deve ser maior que zero");
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
    `Resumo\t${summary.total_specs} specs\t` +
      `${summary.completed_tasks}/${summary.total_tasks} tarefas\t` +
      `${summary.completed_items}/${summary.total_items} itens\t` +
      `${summary.percent}%`,
  );
  for (const spec of specs) {
    console.log(
      `${spec.slug}\t${spec.status}\t` +
        `${spec.completed_tasks}/${spec.total_tasks} tarefas\t` +
        `${spec.completed_items}/${spec.total_items} itens\t${spec.percent}%`,
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
    console.log(`ClickUpfy\tencaminhar ${handoff.action} para a tarefa ${handoff.task_id}`);
  }
}
