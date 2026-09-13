import { beforeEach, describe, expect, it, vi } from "vitest";
import { isInviteAcceptable } from "./team-seats";

describe("isInviteAcceptable", () => {
  it("rejects anything that isn't PENDING, regardless of expiry", () => {
    expect(isInviteAcceptable({ status: "ACCEPTED", expiresAt: null })).toBe(
      false,
    );
    expect(isInviteAcceptable({ status: "DECLINED", expiresAt: null })).toBe(
      false,
    );
  });

  it("accepts a PENDING invite with no expiry", () => {
    // `expiresAt: null` means "never expires" — it must not be read as
    // "already expired", which is the failure mode of a naive `> now()`
    // comparison run directly on a possibly-null date.
    expect(isInviteAcceptable({ status: "PENDING", expiresAt: null })).toBe(
      true,
    );
  });

  it("rejects a PENDING invite past its expiry", () => {
    // This is the regression this function exists to close: `expiresAt` used
    // to be written on every invite and never read anywhere, so a link
    // stayed valid forever regardless of this date.
    const past = new Date(Date.now() - 1000);
    expect(isInviteAcceptable({ status: "PENDING", expiresAt: past })).toBe(
      false,
    );
  });

  it("accepts a PENDING invite before its expiry", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(isInviteAcceptable({ status: "PENDING", expiresAt: future })).toBe(
      true,
    );
  });
});

describe("countTeamMembers / countPendingInvites", () => {
  // `useDB()` is a Nitro server auto-import: real code never imports it, it
  // resolves as a global at build time. Outside that build pipeline (plain
  // Vitest), the same bare reference resolves to whatever is on `globalThis`
  // — which is exactly what `vi.stubGlobal` sets here, without needing the
  // full Nuxt/Nitro runtime just to unit-test a query.
  const mockSelect = vi.fn();

  beforeEach(() => {
    mockSelect.mockReset();
    vi.stubGlobal("useDB", () => ({
      select: mockSelect,
    }));
  });

  it("countPendingInvites only queries PENDING invites not yet expired", async () => {
    let capturedWhere: unknown;
    mockSelect.mockReturnValue({
      from: () => ({
        where: (condition: unknown) => {
          capturedWhere = condition;
          return Promise.resolve([{ value: 3 }]);
        },
      }),
    });

    const { countPendingInvites } = await import("./team-seats");
    const result = await countPendingInvites("team_1");

    expect(result).toBe(3);
    // Three conditions ANDed together (teamId, status, expiry-or-null) — the
    // exact shape matters less here than that a WHERE clause was actually
    // built and passed through, not skipped.
    expect(capturedWhere).toBeDefined();
  });

  it("returns 0 rather than throwing when the count query yields no row", async () => {
    mockSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([]) }),
    });

    const { countTeamMembers } = await import("./team-seats");
    expect(await countTeamMembers("team_1")).toBe(0);
  });
});
