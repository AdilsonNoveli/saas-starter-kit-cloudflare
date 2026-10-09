import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { teamMemberships, teams } from "../database/schema";

// `ensureSystemRoles()` reaches for the Nitro `useDB()` global; the function
// under test receives its transaction as an argument, so the roles helper is
// replaced by a spy and only the injected `tx` touches "the database".
vi.mock("./roles", () => ({ ensureSystemRoles: vi.fn(async () => undefined) }));

const repoRoot = join(import.meta.dirname, "..", "..", "..", "..");
const readRepo = (relative: string) =>
  readFileSync(join(repoRoot, relative), "utf8");

const OWNER_ROLE = { id: "role_owner", name: "Owner", isSystemRole: true };

/** The Postgres unique-violation as drizzle surfaces it (code on the error and on its cause). */
function uniqueViolation() {
  const cause = Object.assign(new Error('duplicate key value violates unique constraint "Team_slug_unique"'), {
    code: "23505",
    constraint: "Team_slug_unique",
  });
  return Object.assign(new Error("Failed query: insert into \"Team\""), {
    code: "23505",
    constraint: "Team_slug_unique",
    cause,
  });
}

interface Row {
  [key: string]: unknown;
}

/**
 * One shared in-memory "database" with the unique index on `Team.slug`, and a
 * `tx` per caller. Inserts yield to the event loop first, so two creations
 * started together both pass any read-before-write check and then race on the
 * index — the only thing that can decide the winner.
 */
function makeDatabase() {
  const state = { teams: [] as Row[], memberships: [] as Row[] };
  let nextId = 1;

  function makeTx() {
    const insertedTeams: Row[] = [];
    const chain = (run: () => Promise<Row[]>) => {
      const promise = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return run();
      })();
      return {
        returning: () => promise,
        onConflictDoNothing: () => ({ returning: () => promise, then: promise.then.bind(promise) }),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
      };
    };
    const selectChain = (rows: Row[]) => {
      const node: Record<string, unknown> = {};
      for (const method of ["from", "where", "limit", "innerJoin", "leftJoin"]) {
        node[method] = () => node;
      }
      node.then = (resolve: (value: Row[]) => unknown) => Promise.resolve(rows).then(resolve);
      return node;
    };

    const tx = {
      insert: vi.fn((table: unknown) => ({
        values: (values: Row) =>
          chain(async () => {
            if (table === teams) {
              if (state.teams.some((team) => team.slug === values.slug)) {
                throw uniqueViolation();
              }
              const row = { id: `team_${nextId++}`, status: "ACTIVE", ...values };
              state.teams.push(row);
              insertedTeams.push(row);
              return [row];
            }
            if (table === teamMemberships) {
              const row = { ...values };
              state.memberships.push(row);
              return [row];
            }
            return [{ ...values }];
          }),
      })),
      select: vi.fn(() => selectChain([OWNER_ROLE])),
      query: {
        roles: { findFirst: vi.fn(async () => OWNER_ROLE) },
        // A read-before-write slug check sees nothing for either racer.
        teams: { findFirst: vi.fn(async () => undefined) },
      },
      transaction: vi.fn(async (fn: (inner: unknown) => unknown) => fn(tx)),
      insertedTeams,
    };
    return tx;
  }

  return { state, makeTx };
}

describe("createTeamWithOwner (AC-035)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // SPECSFY: US-006 FR-006 NFR-007 AC-035
  it("inserts the Space and its Owner membership in the given transaction, with optional billing fields", async () => {
    const { createTeamWithOwner } = await import("./team-creation");
    const { ensureSystemRoles } = await import("./roles");
    const db = makeDatabase();

    const tx = db.makeTx();
    const team = await createTeamWithOwner(tx as never, {
      name: "Clínica Aurora",
      slug: "clinica-aurora",
      description: "Atendimento",
      ownerUserId: "user_1",
    });

    expect(team).toMatchObject({ name: "Clínica Aurora", slug: "clinica-aurora" });
    expect(ensureSystemRoles).toHaveBeenCalled();
    expect(db.state.teams).toHaveLength(1);
    expect(db.state.memberships).toEqual([
      expect.objectContaining({ teamId: team.id, userId: "user_1", roleId: OWNER_ROLE.id }),
    ]);

    // Billing's path passes the plan fields; they land on the same row.
    const billingTx = db.makeTx();
    const paid = await createTeamWithOwner(billingTx as never, {
      name: "Loja Norte",
      slug: "loja-norte",
      ownerUserId: "user_2",
      planId: "plan_pro",
      maxSeats: 5,
      stripeCustomerId: "cus_123",
    });
    expect(db.state.teams.find((row) => row.id === paid.id)).toMatchObject({
      planId: "plan_pro",
      maxSeats: 5,
      stripeCustomerId: "cus_123",
    });
    expect(db.state.memberships).toContainEqual(
      expect.objectContaining({ teamId: paid.id, userId: "user_2", roleId: OWNER_ROLE.id }),
    );
  });

  // SPECSFY: US-006 FR-006 NFR-007 AC-035
  it("is the only code that inserts into teams, and every creation path calls it", () => {
    // `git grep` over tracked files (exit 1 = no match).
    const trackedMatching = (pattern: string, ...paths: string[]) => {
      try {
        return execFileSync("git", ["grep", "-lE", pattern, "--", ...paths], {
          cwd: repoRoot,
          encoding: "utf8",
        })
          .split("\n")
          .filter((file) => /\.(ts|tsx|vue)$/.test(file) && !/\.test\.ts$/.test(file));
      } catch {
        return [];
      }
    };

    // `(schema\.)?` also catches a namespace import, as the demo seed
    // (apps/functions/src/database/seed/demo-accounts.ts) used to insert.
    const inserters = trackedMatching("\\.insert\\([[:space:]]*(schema\\.)?teams[[:space:]]*\\)", "layers", "apps");
    expect(inserters).toEqual(["layers/teams/server/utils/team-creation.ts"]);

    const teamsRouter = readRepo("layers/teams/server/trpc/teams.ts");
    expect(teamsRouter).toMatch(/\bcreateTeamWithOwner\s*\(/);
    expect(teamsRouter).toMatch(/\.transaction\s*\(/);

    const provisioning = readRepo("layers/billing/server/utils/billing/buyer-provisioning.ts");
    expect(provisioning).toMatch(/\bcreateTeamWithOwner\s*\(/);

    // The onboarding path (layers/account) wires `createSpace` to the same function.
    expect(
      trackedMatching("createTeamWithOwner", "layers/account/server"),
      "the onboarding creates its Space through createTeamWithOwner",
    ).not.toEqual([]);
  });
});

describe("createTeamWithOwner under a slug race (AC-036)", () => {
  // SPECSFY: US-006 FR-006 NFR-004 NFR-008 AC-036
  it("lets one of two simultaneous creations win and answers the other with slug_taken", async () => {
    const { createTeamWithOwner } = await import("./team-creation");
    const db = makeDatabase();

    const results = await Promise.allSettled([
      createTeamWithOwner(db.makeTx() as never, { name: "Aurora", slug: "aurora", ownerUserId: "user_a" }),
      createTeamWithOwner(db.makeTx() as never, { name: "Aurora", slug: "aurora", ownerUserId: "user_b" }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({
      name: "TRPCError",
      code: "CONFLICT",
      message: "slug_taken",
    });

    expect(db.state.teams.filter((team) => team.slug === "aurora")).toHaveLength(1);
    // No Space is left without an Owner.
    for (const team of db.state.teams) {
      expect(db.state.memberships).toContainEqual(
        expect.objectContaining({ teamId: team.id, roleId: OWNER_ROLE.id }),
      );
    }
  });

  // SPECSFY: US-006 FR-006 NFR-004 NFR-008 AC-036
  it("backs the race with a unique index on Team.slug in the schema and the init migration", () => {
    const sql = readRepo("layers/teams/migrations/0000_teams.sql");
    const teamTable = sql.match(/CREATE TABLE "Team" \(([\s\S]*?)\n\);/)?.[1] ?? "";
    const uniqueInTable = /UNIQUE\s*\(\s*"slug"\s*\)/.test(teamTable);
    const uniqueIndex = /CREATE UNIQUE INDEX[^;]*ON "Team"[^;]*\(\s*"slug"/.test(sql);
    expect(uniqueInTable || uniqueIndex, "0000_teams.sql declares UNIQUE on Team.slug").toBe(true);

    const schema = readRepo("layers/teams/server/database/schema.ts");
    expect(schema).toMatch(
      /slug:\s*text\("slug"\)[^,\n]*\.unique\(|unique(?:Index)?\([^)]*\)\s*\.on\(\s*table\.slug\s*\)/,
    );
  });
});
