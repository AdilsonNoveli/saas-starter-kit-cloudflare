import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECOVERY_CODE_COUNT,
  formatRecoveryCode,
  generateRecoveryCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "@nuxfire/crypto";
import { consumeRecoveryCode, countRecoveryCodes, replaceRecoveryCodes } from "./mfa-recovery";

// SPEC-0009 (Fase 3a), AC-013: the cases of apps/app/server/utils/mfa-recovery.test.ts,
// moved with the code. The pure half now comes from @nuxfire/crypto and the half
// that touches the database (`useDB()`, stubbed as before) from this layer (DEC-001).
const KEY = "recovery-test-key-with-enough-length";

describe("recovery code format", () => {
  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("generates 12 unambiguous symbols and never repeats", () => {
    const codes = Array.from({ length: 500 }, generateRecoveryCode);
    for (const code of codes) expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/u);
    expect(new Set(codes).size).toBe(codes.length);
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("shows the code in groups of four", () => {
    expect(formatRecoveryCode("ABCDEFGHJKMN")).toBe("ABCD-EFGH-JKMN");
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("accepts case, dashes and spaces, and folds look-alike letters", () => {
    expect(normalizeRecoveryCode("abcd-efgh-jkmn")).toBe("ABCDEFGHJKMN");
    expect(normalizeRecoveryCode(" ABCD EFGH JKMN ")).toBe("ABCDEFGHJKMN");
    expect(normalizeRecoveryCode("OIL0-1111-1111")).toBe("011011111111");
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("rejects input that cannot be a recovery code", () => {
    expect(normalizeRecoveryCode("")).toBeNull();
    expect(normalizeRecoveryCode("ABCD-EFGH")).toBeNull();
    expect(normalizeRecoveryCode("ABCD-EFGH-JKMNP")).toBeNull();
    expect(normalizeRecoveryCode("ABCD-EFGH-JKMU")).toBeNull();
    expect(normalizeRecoveryCode("123456")).toBeNull();
  });
});

describe("hashRecoveryCode", () => {
  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("is deterministic for the same key, scope, user and code", async () => {
    const a = await hashRecoveryCode(KEY, "user", "u1", "ABCDEFGHJKMN");
    const b = await hashRecoveryCode(KEY, "user", "u1", "ABCDEFGHJKMN");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/u);
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("changes with key, scope, user and code", async () => {
    const base = await hashRecoveryCode(KEY, "user", "u1", "ABCDEFGHJKMN");
    expect(await hashRecoveryCode("another-key-of-enough-length!!", "user", "u1", "ABCDEFGHJKMN")).not.toBe(base);
    expect(await hashRecoveryCode(KEY, "platform", "u1", "ABCDEFGHJKMN")).not.toBe(base);
    expect(await hashRecoveryCode(KEY, "user", "u2", "ABCDEFGHJKMN")).not.toBe(base);
    expect(await hashRecoveryCode(KEY, "user", "u1", "ABCDEFGHJKMP")).not.toBe(base);
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("fails closed without a key", async () => {
    await expect(hashRecoveryCode("", "user", "u1", "ABCDEFGHJKMN")).rejects.toThrow();
  });
});

describe("database operations", () => {
  const returning = vi.fn();
  const updateWhere = vi.fn();
  const set = vi.fn();
  const deleteWhere = vi.fn();
  const values = vi.fn();
  const selectWhere = vi.fn();

  beforeEach(() => {
    returning.mockReset();
    updateWhere.mockReset().mockReturnValue({ returning });
    set.mockReset().mockReturnValue({ where: updateWhere });
    deleteWhere.mockReset().mockResolvedValue(undefined);
    values.mockReset().mockResolvedValue(undefined);
    selectWhere.mockReset();

    const tx = {
      delete: () => ({ where: deleteWhere }),
      insert: () => ({ values }),
    };
    vi.stubGlobal("useDB", () => ({
      update: () => ({ set }),
      select: () => ({ from: () => ({ where: selectWhere }) }),
      transaction: async (run: (t: typeof tx) => Promise<void>) => run(tx),
    }));
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("redeems a matching unused code", async () => {
    returning.mockResolvedValue([{ id: "row_1" }]);
    expect(await consumeRecoveryCode(KEY, "user", "u1", "abcd-efgh-jkmn")).toBe(true);
    expect(set).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("refuses a code that is unknown or already used", async () => {
    returning.mockResolvedValue([]);
    expect(await consumeRecoveryCode(KEY, "user", "u1", "ABCD-EFGH-JKMN")).toBe(false);
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("never touches the database for input that is not a code", async () => {
    expect(await consumeRecoveryCode(KEY, "user", "u1", "123456")).toBe(false);
    expect(updateWhere).not.toHaveBeenCalled();
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("replaces the set: old codes removed, ten new hashed rows stored", async () => {
    const codes = await replaceRecoveryCodes(KEY, "user", "u1");
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(RECOVERY_CODE_COUNT).toBe(10);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    const rows = values.mock.calls[0]?.[0] as Array<{
      userId: string;
      scope: string;
      codeHash: string;
    }>;
    expect(rows).toHaveLength(RECOVERY_CODE_COUNT);
    for (const [index, row] of rows.entries()) {
      expect(row).toMatchObject({ userId: "u1", scope: "user" });
      expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/u);
      expect(JSON.stringify(row)).not.toContain(codes[index]?.replaceAll("-", "") ?? "?");
    }
  });

  // SPECSFY: US-003 FR-004 NFR-001 AC-013
  it("counts only unused codes", async () => {
    selectWhere.mockResolvedValue([{ remaining: 7 }]);
    expect(await countRecoveryCodes("user", "u1")).toBe(7);
    selectWhere.mockResolvedValue([]);
    expect(await countRecoveryCodes("user", "u1")).toBe(0);
  });
});
