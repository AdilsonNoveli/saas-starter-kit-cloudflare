import { describe, expect, it, vi } from "vitest";

// SPEC-0010 (Fase 3b), AC-009 and AC-010: the header switches save the locale
// and the theme through the preferences service (DEC-018), which validates with
// parsePreferences, writes the person's own row and leaves onboardedAt alone.

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

function row(userId: string, overrides: Partial<Row> = {}): Row {
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
    ...overrides,
  };
}

function fakeRepo(rows: Row[]) {
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

describe("AC-009 the locale chosen in the header is saved", () => {
  // SPECSFY: US-002 FR-007 FR-008 AC-009
  it(
    "switches pt-br to es, stores and returns the person's row and keeps onboardedAt",
    async () => {
      const { getPreferences, updatePreferences } = await import("./preferences");
      const { deps, table } = fakeRepo([row("u1"), row("u2", { locale: "en" })]);

      const saved = await updatePreferences(deps, "u1", { locale: "es" });

      expect(saved).toMatchObject({
        userId: "u1",
        locale: "es",
        timeZone: "America/Sao_Paulo",
        theme: "system",
        dateFormat: "DMY",
        nameOrder: "WESTERN",
        onboardedAt: ONBOARDED_AT,
      });
      expect(table.get("u1")).toMatchObject({ locale: "es", onboardedAt: ONBOARDED_AT });
      expect(table.get("u2")).toEqual(row("u2", { locale: "en" }));
      for (const [written] of deps.repo.upsert.mock.calls) expect(written.userId).toBe("u1");
      expect(await getPreferences(deps, "u1")).toMatchObject({ userId: "u1", locale: "es" });

      // Validated by parsePreferences: an unsupported locale is refused and nothing changes.
      deps.repo.upsert.mockClear();
      expect(await updatePreferences(deps, "u1", { locale: "fr" })).toEqual({ error: "invalid_locale" });
      expect(deps.repo.upsert).not.toHaveBeenCalled();
      expect(table.get("u1")?.locale).toBe("es");
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-010 the theme chosen in the header is saved", () => {
  // SPECSFY: US-002 FR-007 FR-008 AC-010
  it(
    "switches system to dark, stores and returns the person's row and keeps onboardedAt",
    async () => {
      const { getPreferences, updatePreferences } = await import("./preferences");
      const { deps, table } = fakeRepo([row("u1"), row("u2", { theme: "light" })]);

      const saved = await updatePreferences(deps, "u1", { theme: "dark" });

      expect(saved).toMatchObject({ userId: "u1", theme: "dark", locale: "pt-br", onboardedAt: ONBOARDED_AT });
      expect(table.get("u1")).toMatchObject({ theme: "dark", onboardedAt: ONBOARDED_AT });
      expect(table.get("u2")).toEqual(row("u2", { theme: "light" }));
      for (const [written] of deps.repo.upsert.mock.calls) expect(written.userId).toBe("u1");
      expect(await getPreferences(deps, "u1")).toMatchObject({ userId: "u1", theme: "dark" });

      deps.repo.upsert.mockClear();
      expect(await updatePreferences(deps, "u1", { theme: "neon" })).toEqual({ error: "invalid_theme" });
      expect(deps.repo.upsert).not.toHaveBeenCalled();
      expect(table.get("u1")?.theme).toBe("dark");
    },
    IMPORT_TIMEOUT,
  );
});
