import { describe, expect, it } from "vitest";

// SPEC-0007 (Fase 0): `bun run db:reset` is a separate, guarded command — never part of
// `bun run deploy`. The logic is pure and takes its side effects as parameters, so it is tested
// here without any database, KV or terminal.
const target = { host: "db.example.test", port: 5432, database: "serelius_dev", user: "app_user", password: "s3cr3t-pass" };

const core = () => import("./reset-database-core");

const recorder = () => {
  const calls: string[] = [];
  return {
    calls,
    purgeKv: async () => void calls.push("kv"),
    executeSql: async (statement: string) => void calls.push(statement),
  };
};

describe("db:reset", () => {
  // SPECSFY: US-006 FR-011 NFR-001 AC-023
  it("requires a stage and, with --dry-run, prints the plan without touching anything", async () => {
    const { parseArgs, planReset, runReset } = await core();
    expect(() => planReset(parseArgs([]), target)).toThrow(/stage/i);
    const io = recorder();
    const result = await runReset({
      plan: planReset(parseArgs(["--stage", "dev", "--dry-run"]), target),
      confirmation: undefined,
      purgeKv: io.purgeKv,
      executeSql: io.executeSql,
    });
    expect(io.calls).toEqual([]);
    expect(result.executed).toBe(false);

    const production = recorder();
    const dryProduction = await runReset({
      plan: planReset(parseArgs(["--stage", "production", "--confirm-production", "--dry-run"]), target),
      confirmation: undefined,
      purgeKv: production.purgeKv,
      executeSql: production.executeSql,
    });
    expect(production.calls).toEqual([]);
    expect(dryProduction.executed).toBe(false);
  });

  // SPECSFY: US-006 FR-011 NFR-003 AC-024
  it("shows host, database, user and the schemas to remove, but never the password", async () => {
    const { describeTarget, parseArgs, planReset } = await core();
    const summary = describeTarget(planReset(parseArgs(["--stage", "dev"]), target));
    for (const part of [target.host, target.database, target.user, "public", "drizzle"]) expect(summary).toContain(part);
    expect(summary).not.toContain(target.password);
  });

  // SPECSFY: US-006 FR-011 NFR-002 AC-025
  it("refuses production without its extra confirmation and a mistyped database name", async () => {
    const { parseArgs, planReset, runReset } = await core();
    expect(() => planReset(parseArgs(["--stage", "production"]), target)).toThrow(/production/i);
    expect(() => planReset(parseArgs(["--stage", "production", "--confirm-production"]), target)).not.toThrow();

    const io = recorder();
    await expect(
      runReset({
        plan: planReset(parseArgs(["--stage", "dev"]), target),
        confirmation: "wrong-name",
        purgeKv: io.purgeKv,
        executeSql: io.executeSql,
      }),
    ).rejects.toThrow(/confirmation/i);
    expect(io.calls).toEqual([]);
  });

  // SPECSFY: US-006 FR-011 NFR-001 AC-028
  it("purges the KV keys first, then resets the schemas, then points to the deploy; a KV failure leaves the database untouched", async () => {
    const { parseArgs, planReset, runReset } = await core();
    const io = recorder();
    const result = await runReset({
      plan: planReset(parseArgs(["--stage", "dev"]), target),
      confirmation: target.database,
      purgeKv: io.purgeKv,
      executeSql: io.executeSql,
    });
    expect(io.calls).toEqual(["kv", 'DROP SCHEMA IF EXISTS "public" CASCADE', 'DROP SCHEMA IF EXISTS "drizzle" CASCADE', 'CREATE SCHEMA "public"']);
    expect(result.executed).toBe(true);
    expect(result.nextStep).toContain("bun run deploy -- --stage dev");

    const sql: string[] = [];
    await expect(
      runReset({
        plan: planReset(parseArgs(["--stage", "dev"]), target),
        confirmation: target.database,
        purgeKv: async () => {
          throw new Error("kv unavailable");
        },
        executeSql: async (statement) => void sql.push(statement),
      }),
    ).rejects.toThrow(/kv unavailable/);
    expect(sql).toEqual([]);
  });
});
