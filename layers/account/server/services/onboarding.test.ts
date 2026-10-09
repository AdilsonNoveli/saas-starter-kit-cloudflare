import { describe, expect, it, vi } from "vitest";

// SPEC-0010 (Fase 3b), AC-002, AC-003, AC-006: the onboarding service
// (DEC-001, DEC-018). The database is a fake in memory whose transaction works
// on a copy and only publishes it when the callback resolves, so a write that
// escapes the transaction, or survives a failure inside it, shows up in the
// committed state.

const NOW = new Date("2026-10-06T12:00:00.000Z");
const IMPORT_TIMEOUT = 30_000;

type Team = { id: string; name: string; slug: string };
type Membership = { teamId: string; userId: string; role: string };
type Invite = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED";
  expiresAt: Date;
  teamId: string;
  team: { name: string; slug: string };
};
type State = {
  users: Record<string, { id: string; email: string; name: string | null }>;
  preferences: Record<string, Record<string, unknown>>;
  teams: Team[];
  memberships: Membership[];
  invites: Invite[];
};

const PREFERENCES = {
  locale: "pt-br",
  timeZone: "America/Sao_Paulo",
  theme: "system",
  dateFormat: "DMY",
  nameOrder: "WESTERN",
} as const;

function fakeDatabase(initial: State) {
  let committed: State = structuredClone(initial);
  const transaction = vi.fn(async <T>(fn: (tx: unknown) => Promise<T>) => {
    const draft: State = structuredClone(committed);
    const tx = {
      draft,
      updateUserName: vi.fn(async (userId: string, name: string) => {
        const user = draft.users[userId];
        if (user) user.name = name;
      }),
      insertPreferences: vi.fn(async (row: Record<string, unknown>) => {
        draft.preferences[row.userId as string] = row;
      }),
    };
    const result = await fn(tx);
    committed = draft;
    return result;
  });

  const createSpace = vi.fn(
    async (
      tx: { draft: State },
      input: { name: string; slug: string; ownerUserId: string },
    ) => {
      if (tx.draft.teams.some((team) => team.slug === input.slug)) {
        throw Object.assign(new Error("slug_taken"), { code: "CONFLICT" });
      }
      const team = { id: `t-${input.slug}`, name: input.name, slug: input.slug };
      tx.draft.teams.push(team);
      tx.draft.memberships.push({ teamId: team.id, userId: input.ownerUserId, role: "Owner" });
      return team;
    },
  );

  const findPendingInvite = vi.fn(async (tx: unknown, emailLower: string) => {
    const source = (tx as { draft?: State } | undefined)?.draft ?? committed;
    return (
      source.invites.find(
        (invite) =>
          invite.email.toLowerCase() === emailLower &&
          invite.status === "PENDING" &&
          invite.expiresAt > NOW,
      ) ?? null
    );
  });

  const acceptInvite = vi.fn(async (tx: { draft: State }, invite: Invite, userId: string) => {
    const stored = tx.draft.invites.find((candidate) => candidate.id === invite.id);
    if (stored) stored.status = "ACCEPTED";
    tx.draft.memberships.push({ teamId: invite.teamId, userId, role: "Member" });
    return { slug: invite.team.slug };
  });

  const deps = {
    repo: { transaction },
    createSpace,
    findPendingInvite,
    acceptInvite,
    now: () => NOW,
  };
  return { deps, state: () => committed };
}

function person(overrides: Partial<State> = {}): State {
  return {
    users: { u1: { id: "u1", email: "ana@exemplo.com", name: "Nome Antigo" } },
    preferences: {},
    teams: [],
    memberships: [],
    invites: [],
    ...overrides,
  };
}

const user = { id: "u1", email: "ana@exemplo.com", name: "Nome Antigo" };

describe("AC-002 completeOnboarding writes everything at once", () => {
  // SPECSFY: US-001 FR-001 FR-002 FR-004 FR-006 NFR-008 AC-002
  it(
    "writes the name, the preferences with onboardedAt and the Space with its Owner in one transaction and returns the slug",
    async () => {
      const { completeOnboarding } = await import("./onboarding");
      const db = fakeDatabase(person());

      const result = await completeOnboarding(db.deps, {
        user,
        name: "Ana Souza",
        preferences: PREFERENCES,
        space: { name: "Acme", slug: "acme" },
      });

      expect(result).toEqual({ slug: "acme" });
      expect(db.deps.repo.transaction).toHaveBeenCalledTimes(1);
      const state = db.state();
      expect(state.users.u1?.name).toBe("Ana Souza");
      expect(state.preferences.u1).toMatchObject({
        userId: "u1",
        ...PREFERENCES,
        onboardedAt: NOW,
      });
      expect(state.teams).toEqual([{ id: "t-acme", name: "Acme", slug: "acme" }]);
      expect(state.memberships).toEqual([{ teamId: "t-acme", userId: "u1", role: "Owner" }]);
      // The Space is created inside the same transaction, not by a second call.
      expect(db.deps.createSpace).toHaveBeenCalledTimes(1);
      expect(db.deps.createSpace).toHaveBeenCalledWith(
        expect.objectContaining({ draft: expect.anything() }),
        expect.objectContaining({ name: "Acme", slug: "acme", ownerUserId: "u1" }),
      );
      expect(db.deps.acceptInvite).not.toHaveBeenCalled();
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-003 a failure creating the Space undoes the rest", () => {
  // SPECSFY: US-001 FR-004 FR-006 NFR-008 AC-003
  it(
    "keeps the old name, writes no preferences and propagates slug_taken",
    async () => {
      const { completeOnboarding } = await import("./onboarding");
      const db = fakeDatabase(
        person({ teams: [{ id: "t-other", name: "Acme", slug: "acme" }] }),
      );

      await expect(
        completeOnboarding(db.deps, {
          user,
          name: "Ana Souza",
          preferences: PREFERENCES,
          space: { name: "Acme", slug: "acme" },
        }),
      ).rejects.toThrow("slug_taken");

      expect(db.deps.repo.transaction).toHaveBeenCalledTimes(1);
      expect(db.deps.createSpace).toHaveBeenCalledTimes(1);
      const state = db.state();
      expect(state.users.u1?.name).toBe("Nome Antigo");
      expect(state.preferences).toEqual({});
      expect(state.teams).toEqual([{ id: "t-other", name: "Acme", slug: "acme" }]);
      expect(state.memberships).toEqual([]);
    },
    IMPORT_TIMEOUT,
  );
});

describe("AC-006 a pending invite replaces the personal Space", () => {
  // SPECSFY: US-001 FR-004 FR-005 FR-015 AC-006
  it(
    "offers the invite sent to a differently cased address and accepts it without creating a Space",
    async () => {
      const { completeOnboarding, getOnboardingState } = await import("./onboarding");
      const invite: Invite = {
        id: "inv-1",
        email: "Ana@Exemplo.com",
        status: "PENDING",
        expiresAt: new Date("2026-10-10T00:00:00.000Z"),
        teamId: "t-time",
        team: { name: "Time da Bia", slug: "time-da-bia" },
      };
      const db = fakeDatabase(
        person({ teams: [{ id: "t-time", name: "Time da Bia", slug: "time-da-bia" }], invites: [invite] }),
      );

      const onboarding = await getOnboardingState(db.deps, user);

      expect(db.deps.findPendingInvite).toHaveBeenCalledWith(expect.anything(), "ana@exemplo.com");
      expect(onboarding).toMatchObject({ invite: expect.objectContaining({ id: "inv-1" }) });

      const result = await completeOnboarding(db.deps, {
        user,
        name: "Ana Souza",
        preferences: PREFERENCES,
        inviteId: "inv-1",
      });

      expect(result).toEqual({ slug: "time-da-bia" });
      expect(db.deps.createSpace).not.toHaveBeenCalled();
      expect(db.deps.acceptInvite).toHaveBeenCalledTimes(1);
      expect(db.deps.acceptInvite).toHaveBeenCalledWith(
        expect.objectContaining({ draft: expect.anything() }),
        expect.objectContaining({ id: "inv-1" }),
        "u1",
      );
      const state = db.state();
      expect(state.teams).toHaveLength(1);
      expect(state.memberships).toEqual([{ teamId: "t-time", userId: "u1", role: "Member" }]);
      expect(state.invites[0]?.status).toBe("ACCEPTED");
      expect(state.users.u1?.name).toBe("Ana Souza");
      expect(state.preferences.u1).toMatchObject({ userId: "u1", onboardedAt: NOW });
    },
    IMPORT_TIMEOUT,
  );
});
