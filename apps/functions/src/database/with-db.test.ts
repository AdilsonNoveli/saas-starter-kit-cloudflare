import { describe, expect, it, vi } from "vitest";

// SPEC-0007 (Fase 0): withDb opens the Hyperdrive connection, runs the callback and always
// closes the connection with a 5 s timeout, rethrowing whatever the callback threw.
const end = vi.fn(async () => undefined);
vi.mock("postgres", () => ({
  default: vi.fn(() => Object.assign(() => undefined, { end })),
}));
vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => ({ marker: "db" })),
}));
vi.mock("./schema", () => ({}));

const env = {
  AppDB: { connectionString: "postgres://user:pass@host:5432/db" },
};
const loadHelper = async () => (await import("./with-db")).withDb;

describe("withDb", () => {
  // SPECSFY: US-004 FR-008 NFR-002 AC-017
  it("returns the callback result and closes the connection once", async () => {
    end.mockClear();
    const withDb = await loadHelper();
    const result = await withDb(env, async () => "done");
    expect(result).toBe("done");
    expect(end).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledWith({ timeout: 5 });
  });

  // SPECSFY: US-004 FR-008 NFR-002 AC-018
  it("closes the connection and rethrows when the callback fails", async () => {
    end.mockClear();
    const withDb = await loadHelper();
    await expect(
      withDb(env, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(end).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledWith({ timeout: 5 });
  });
});
