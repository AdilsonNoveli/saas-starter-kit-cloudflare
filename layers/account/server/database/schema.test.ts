import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0010 (Fase 3b), AC-042: layers/account gets its own migration history
// (database change policy: one history per layer, adjustments edit the init),
// `Team.slug` becomes unique by editing the teams init, and `User` gains nothing.
const root = join(import.meta.dirname, "../../../..");
const layerRoot = join(root, "layers/account");
const migrationsDir = join(layerRoot, "migrations");
const initPath = join(migrationsDir, "0000_account.sql");
const TABLES = ["UserPreference", "UserSession", "EmailChangeRequest"];
const FORBIDDEN_COLUMN = /(^ip$|ip_?address|client_?ip|latitude|longitude|postal)/iu;
const USER_COLUMNS = ["id", "name", "email", "image", "mfaSecret", "mfaEnabledAt"];

function read(path: string) {
  return readFileSync(path, "utf8");
}

function createTableBlock(sql: string, table: string) {
  return new RegExp(`CREATE TABLE "${table}" \\(([\\s\\S]*?)\\n\\);`, "u").exec(sql)?.[1] ?? "";
}

function columnNames(block: string) {
  return [...block.matchAll(/^\s*"([^"]+)"\s+\w/gmu)].map((match) => match[1] ?? "");
}

function sqlFiles(dir: string) {
  return readdirSync(dir).filter((file) => file.endsWith(".sql"));
}

describe("layers/account migration history", () => {
  // SPECSFY: US-001 US-004 FR-001 FR-012 FR-018 NFR-004 AC-042
  it("creates the three tables in a single init, keyed to User with cascade, indexed, and with no IP or coordinates", () => {
    expect(existsSync(join(layerRoot, "server/database/schema.ts")), "server/database/schema.ts").toBe(true);
    expect(existsSync(initPath), "migrations/0000_account.sql").toBe(true);
    const schema = read(join(layerRoot, "server/database/schema.ts"));
    const sql = read(initPath);

    for (const table of TABLES) {
      expect(schema, `schema declares ${table}`).toMatch(new RegExp(`pgTable\\(\\s*"${table}"`, "u"));
      const block = createTableBlock(sql, table);
      expect(block, `CREATE TABLE "${table}"`).not.toBe("");
      expect(columnNames(block), table).toContain("userId");
      for (const column of columnNames(block)) expect(column, `${table}.${column}`).not.toMatch(FORBIDDEN_COLUMN);
      expect(sql, `${table}.userId references User with cascade`).toMatch(
        new RegExp(
          `ALTER TABLE "${table}" ADD CONSTRAINT "[^"]+" FOREIGN KEY \\("userId"\\) REFERENCES "public"\\."User"\\("id"\\) ON DELETE cascade`,
          "u",
        ),
      );
    }
    // One preference row and one pending e-mail change per person.
    expect(createTableBlock(sql, "UserPreference")).toMatch(/"userId" text PRIMARY KEY/u);
    expect(createTableBlock(sql, "EmailChangeRequest")).toMatch(/"userId" text PRIMARY KEY/u);
    for (const column of ["userId", "expiresAt"]) {
      expect(sql, `index on UserSession.${column}`).toMatch(
        new RegExp(`CREATE INDEX "[^"]+" ON "UserSession"(?: USING \\w+)? \\("${column}"`, "u"),
      );
    }
    expect(schema).not.toMatch(/latitude|longitude|postal|ipAddress|clientIp/iu);
  });

  // SPECSFY: US-001 US-004 FR-001 FR-012 FR-018 NFR-004 AC-042
  it("is wired like every other layer history: drizzle config, package export, schema barrel and the functions dependency", () => {
    expect(existsSync(join(layerRoot, "drizzle.config.ts")), "layers/account/drizzle.config.ts").toBe(true);
    const drizzleConfig = read(join(layerRoot, "drizzle.config.ts"));
    expect(drizzleConfig).toContain("__drizzle_migrations_account");
    expect(drizzleConfig).toMatch(/schema:\s*["']\.\/server\/database\/schema\.ts["']/u);
    expect(drizzleConfig).toMatch(/out:\s*["']\.\/migrations["']/u);

    const layerPackage = JSON.parse(read(join(layerRoot, "package.json"))) as { exports?: Record<string, string> };
    expect(layerPackage.exports?.["./server/database/schema"]).toBe("./server/database/schema.ts");

    const barrel = read(join(root, "apps/functions/src/database/schema.ts"));
    expect(barrel).toMatch(/export \* from "@nuxfire\/layer-account\/server\/database\/schema";/u);
    const functionsPackage = JSON.parse(read(join(root, "apps/functions/package.json"))) as {
      dependencies?: Record<string, string>;
    };
    expect(functionsPackage.dependencies?.["@nuxfire/layer-account"]).toBe("workspace:*");
  });

  // SPECSFY: US-001 US-004 FR-001 FR-012 FR-018 NFR-004 AC-042
  it("has no chained migration, makes Team.slug unique in the teams init and leaves User untouched", () => {
    // The history must exist, or the "single init" checks below pass vacuously.
    expect(existsSync(migrationsDir), "layers/account/migrations").toBe(true);
    expect(sqlFiles(migrationsDir)).toEqual(["0000_account.sql"]);
    // The only ALTER an init may hold is drizzle-kit's own foreign key.
    for (const statement of read(initPath).match(/ALTER TABLE[^;]*;/gu) ?? []) {
      expect(statement).toMatch(/ADD CONSTRAINT "[^"]+" FOREIGN KEY/u);
    }

    const teamsDir = join(root, "layers/teams/migrations");
    expect(sqlFiles(teamsDir)).toEqual(["0000_teams.sql"]);
    const teamsSql = read(join(teamsDir, "0000_teams.sql"));
    const team = createTableBlock(teamsSql, "Team");
    const uniqueInTable = /CONSTRAINT "[^"]+" UNIQUE\("slug"\)/u.test(team) || /"slug" text NOT NULL UNIQUE/u.test(team);
    const uniqueIndex = /CREATE UNIQUE INDEX "[^"]+" ON "Team"(?: USING \w+)? \("slug"/u.test(teamsSql);
    expect(uniqueInTable || uniqueIndex, "UNIQUE on Team.slug in 0000_teams.sql").toBe(true);

    const core = read(join(root, "apps/functions/src/database/core-schema.ts"));
    const userBlock = /export const users = pgTable\("User", \{([\s\S]*?)\n\}\);/u.exec(core)?.[1] ?? "";
    expect([...userBlock.matchAll(/^ {2}(\w+):/gmu)].map((match) => match[1])).toEqual(USER_COLUMNS);
  });
});
