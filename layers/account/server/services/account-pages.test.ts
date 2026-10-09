import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// SPEC-0010 (Fase 3b), AC-014 and AC-025: what the Account pages edit is
// validated, saved and read back (preferences service, DEC-018), and deleting
// the account also removes the rows of the three new tables
// (account-deletion service, called by account.deleteAccount).

const root = join(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const ONBOARDED_AT = new Date("2026-09-01T10:00:00.000Z");
const NOW = new Date("2026-10-06T12:00:00.000Z");
const IMPORT_TIMEOUT = 30_000;

type Row = {
  userId: string;
  locale: string;
  timeZone: string;
  theme: string;
  dateFormat: string;
  nameOrder: string;
  onboardedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function preferencesRow(userId: string): Row {
  return {
    userId,
    locale: "pt-br",
    timeZone: "America/Sao_Paulo",
    theme: "system",
    dateFormat: "DMY",
    nameOrder: "WESTERN",
    onboardedAt: ONBOARDED_AT,
    createdAt: ONBOARDED_AT,
    updatedAt: ONBOARDED_AT,
  };
}

function fakePreferencesRepo(rows: Row[]) {
  const table = new Map(rows.map((r) => [r.userId, structuredClone(r)]));
  const repo = {
    find: vi.fn(async (userId: string) => structuredClone(table.get(userId)) ?? null),
    upsert: vi.fn(async (next: Row) => {
      table.set(next.userId, structuredClone(next));
      return structuredClone(next);
    }),
  };
  return { deps: { repo, now: () => NOW }, table };
}

describe("AC-014 the Account pages edit and persist what they show", () => {
  // SPECSFY: US-003 FR-002 FR-009 AC-014
  it(
    "validates, saves and reads back time zone, locale, date format and name order, and keeps the name edit",
    async () => {
      const { getPreferences, updatePreferences } = await import("./preferences");
      const { deps, table } = fakePreferencesRepo([preferencesRow("u1")]);

      const edit = { timeZone: "Europe/Lisbon", locale: "en", dateFormat: "YMD", nameOrder: "EASTERN" };
      const saved = await updatePreferences(deps, "u1", edit);

      expect(saved).toMatchObject({ userId: "u1", ...edit, theme: "system", onboardedAt: ONBOARDED_AT });
      expect(table.get("u1")).toMatchObject(edit);
      // Reopening the page reads the saved row back.
      expect(await getPreferences(deps, "u1")).toMatchObject({ userId: "u1", ...edit });

      // Each field is validated; a refused field changes nothing.
      for (const [input, error] of [
        [{ timeZone: "Mars/Base" }, "invalid_time_zone"],
        [{ locale: "fr" }, "invalid_locale"],
        [{ dateFormat: "DDMMYY" }, "invalid_date_format"],
        [{ nameOrder: "MIDDLE" }, "invalid_name_order"],
      ] as const) {
        expect(await updatePreferences(deps, "u1", input)).toEqual({ error });
      }
      expect(table.get("u1")).toMatchObject(edit);

      // The name lives on the Profile page and keeps its existing procedure
      // (account.updateProfile): validated length, written to User.name.
      const account = read("layers/account/server/trpc/account.ts");
      expect(account).toMatch(/updateProfile:\s*protectedProcedure[\s\S]*?\.min\(2,[\s\S]*?\.max\(50,/u);
      expect(account).toMatch(/updateProfile:[\s\S]*?\.update\(users\)[\s\S]*?\.set\(/u);
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-025 deleting the account removes the rows of the three new tables", () => {
  // SPECSFY: US-003 FR-001 FR-012 NFR-002 AC-025
  it(
    "deletes the person's preferences, sessions and e-mail change request and nobody else's",
    async () => {
      const { deleteAccountRows } = await import("./account-deletion");
      const calls: string[] = [];
      const tables = {
        preferences: new Set(["u1", "u2"]),
        sessions: new Map([
          ["sid-1", "u1"],
          ["sid-2", "u1"],
          ["sid-3", "u2"],
        ]),
        emailChangeRequests: new Set(["u1"]),
      };
      const repo = {
        deletePreferences: vi.fn(async (userId: string) => {
          calls.push("preferences");
          tables.preferences.delete(userId);
        }),
        deleteSessions: vi.fn(async (userId: string) => {
          calls.push("sessions");
          for (const [sid, owner] of tables.sessions) if (owner === userId) tables.sessions.delete(sid);
        }),
        deleteEmailChangeRequest: vi.fn(async (userId: string) => {
          calls.push("emailChangeRequest");
          tables.emailChangeRequests.delete(userId);
        }),
      };

      await deleteAccountRows({ repo }, "u1");

      expect([...calls].sort()).toEqual(["emailChangeRequest", "preferences", "sessions"]);
      expect(repo.deletePreferences).toHaveBeenCalledWith("u1");
      expect(repo.deleteSessions).toHaveBeenCalledWith("u1");
      expect(repo.deleteEmailChangeRequest).toHaveBeenCalledWith("u1");
      expect([...tables.preferences]).toEqual(["u2"]);
      expect([...tables.sessions.keys()]).toEqual(["sid-3"]);
      expect(tables.emailChangeRequests.size).toBe(0);
    },
    IMPORT_TIMEOUT,
  );

  // SPECSFY: US-003 FR-001 FR-012 NFR-002 AC-025
  it("deleteAccount calls the service after the identity erasure and before the User row", () => {
    const account = read("layers/account/server/trpc/account.ts");
    expect(account).toMatch(/from\s+["']\.\.\/services\/account-deletion["']/u);
    const start = account.indexOf("deleteAccount: protectedProcedure");
    const body = account.slice(start, account.indexOf("disableMfa:", start));
    const identity = body.indexOf("identityDeletePath");
    const rows = body.indexOf("deleteAccountRows(");
    const userRow = body.indexOf(".delete(users)");
    expect(identity).toBeGreaterThan(-1);
    expect(rows).toBeGreaterThan(identity);
    expect(userRow).toBeGreaterThan(rows);
  });
});
