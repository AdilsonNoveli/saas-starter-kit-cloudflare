import { getTableName, type SQL, type Table } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

// SPEC-0010 (Fase 3b), US-004: the hourly routine of apps/functions/src/cron.ts
// removes UserSession rows ninety days after they expired, and keeps writing
// its Log line. The Gherkin of AC-024 (section 6 of the spec) is the reference
// contract. The database is a fake that records each statement and answers the
// delete by applying its WHERE clause to rows held in memory.

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-06T12:00:00Z");

type SessionRow = { id: string; expiresAt: Date };

function fakeDb(rows: SessionRow[]) {
  const sessions = [...rows];
  const deletes: string[] = [];
  const inserts: Array<{ table: string; values: unknown }> = [];
  const dialect = new PgDialect();

  /** Applies `"expiresAt" < $1` (or `<=`) compiled from the drizzle condition. */
  function applyWhere(condition: SQL) {
    const query = dialect.sqlToQuery(condition);
    const match = /"expiresAt"\s*(<=?)\s*\$1/.exec(query.sql);
    if (!match) throw new Error(`unexpected purge condition: ${query.sql}`);
    const raw = query.params[0];
    const cutoff = raw instanceof Date ? raw : new Date(String(raw));
    const inclusive = match[1] === "<=";
    for (let i = sessions.length - 1; i >= 0; i--) {
      const at = sessions[i]!.expiresAt.getTime();
      if (inclusive ? at <= cutoff.getTime() : at < cutoff.getTime()) {
        sessions.splice(i, 1);
      }
    }
  }

  const db = {
    delete(table: Table) {
      const name = getTableName(table);
      deletes.push(name);
      // Lazy like drizzle: the statement runs when awaited or executed.
      const statement = (condition?: SQL) => {
        const run = async () => {
          if (name !== "UserSession") return [];
          if (condition) applyWhere(condition);
          else sessions.length = 0;
          return [];
        };
        return {
          execute: run,
          then<T>(resolve: (value: never[]) => T, reject?: (error: unknown) => T) {
            return run().then(resolve, reject);
          },
        };
      };
      return {
        ...statement(),
        where: (condition: SQL) => statement(condition),
      };
    },
    insert(table: Table) {
      return {
        values(values: unknown) {
          inserts.push({ table: getTableName(table), values });
          const done = Promise.resolve([]);
          return Object.assign(done, { execute: () => done });
        },
      };
    },
  };
  return { db, sessions, deletes, inserts };
}

function rowsAtTheBoundary(): SessionRow[] {
  return [
    { id: "expired-89-days", expiresAt: new Date(NOW.getTime() - 89 * DAY) },
    { id: "expired-91-days", expiresAt: new Date(NOW.getTime() - 91 * DAY) },
    { id: "still-valid", expiresAt: new Date(NOW.getTime() + 10 * DAY) },
  ];
}

const fake = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("./database/with-db", () => ({
  withDb: async (_env: unknown, fn: (db: unknown) => Promise<unknown>) =>
    fn(fake.db),
}));

describe("AC-024 session rows go ninety days after they expire", () => {
  // SPECSFY: US-004 FR-012 NFR-002 AC-024
  it("purgeExpiredSessions removes the row expired 91 days ago and keeps the 89-day one and the valid one", async () => {
    const cron = await import("./cron");
    const { purgeExpiredSessions } = cron as unknown as {
      purgeExpiredSessions?: (db: unknown, now: Date) => Promise<unknown>;
    };
    expect(typeof purgeExpiredSessions).toBe("function");
    const store = fakeDb(rowsAtTheBoundary());

    await purgeExpiredSessions!(store.db, NOW);

    expect(store.deletes).toEqual(["UserSession"]);
    expect(store.sessions.map((row) => row.id).sort()).toEqual([
      "expired-89-days",
      "still-valid",
    ]);
    // Idempotent: running again removes nothing more.
    await purgeExpiredSessions!(store.db, NOW);
    expect(store.sessions).toHaveLength(2);
  });

  // SPECSFY: US-004 FR-012 NFR-002 AC-024
  it("the hourly scheduled run purges the expired sessions and still writes its Log line", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    try {
      const store = fakeDb(rowsAtTheBoundary());
      fake.db = store.db;
      const { default: cron } = await import("./cron");

      await cron.scheduled(
        {} as Parameters<typeof cron.scheduled>[0],
        { AppDB: { connectionString: "postgres://fake" } } as unknown as Parameters<
          typeof cron.scheduled
        >[1],
        {} as Parameters<typeof cron.scheduled>[2],
      );

      expect(store.deletes).toContain("UserSession");
      expect(store.sessions.map((row) => row.id).sort()).toEqual([
        "expired-89-days",
        "still-valid",
      ]);
      expect(store.inserts).toEqual([
        { table: "Log", values: { message: "scheduled task executed" } },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
