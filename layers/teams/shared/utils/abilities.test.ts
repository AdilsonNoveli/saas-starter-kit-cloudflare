import { allows } from "nuxt-authorization/utils";
import { describe, expect, it } from "vitest";
import {
  teamsDeleteInvite,
  teamsDeleteTeam,
  teamsGetBillingInfo,
  teamsGetTeamDetails,
  teamsListMembersAndInvites,
  teamsListTeams,
  teamsRemoveMember,
  teamsSendInvite,
  teamsUpdateInvite,
  teamsUpdateMemberRole,
  teamsUpdateTeamDetails,
} from "./abilities";
import { PERMISSIONS } from "./permissions";

// These abilities are the tenant RBAC gate for every team-scoped tRPC
// procedure and every `<Can>` block in the UI. This suite is the net that
// proved the move into `layers/teams/` (Fase 3 passo 1a) didn't change
// behaviour, and then the `teams*` prefixing of every export (passo 1b): both
// times the assertions were left untouched on purpose — only the identifiers
// under test changed, so a still-green run is the proof.

const TEAM = "team_a";
const OTHER_TEAM = "team_b";
const USER_ID = "user_1";

/** A user who belongs to `TEAM` holding exactly `permissions` there. */
function member(permissions: string[], teamId = TEAM) {
  return {
    id: USER_ID,
    teams: [teamId],
    permissions: { [teamId]: permissions },
  };
}

/** A signed-in user with no team membership at all. */
const outsider = { id: USER_ID, teams: [], permissions: {} };

// Every ability that is a plain `hasTeamPermission` check, paired with the
// exact permission string it gates on.
const permissionGated = [
  ["teamsUpdateTeamDetails", teamsUpdateTeamDetails, PERMISSIONS.TEAMS.UPDATE],
  ["teamsDeleteTeam", teamsDeleteTeam, PERMISSIONS.TEAMS.DELETE],
  [
    "teamsListMembersAndInvites",
    teamsListMembersAndInvites,
    PERMISSIONS.TEAMS.MEMBERS.LIST,
  ],
  ["teamsSendInvite", teamsSendInvite, PERMISSIONS.TEAMS.INVITE.CREATE],
  [
    "teamsUpdateMemberRole",
    teamsUpdateMemberRole,
    PERMISSIONS.TEAMS.MEMBERS.UPDATE,
  ],
  ["teamsRemoveMember", teamsRemoveMember, PERMISSIONS.TEAMS.MEMBERS.REMOVE],
  ["teamsUpdateInvite", teamsUpdateInvite, PERMISSIONS.TEAMS.INVITE.UPDATE],
  ["teamsDeleteInvite", teamsDeleteInvite, PERMISSIONS.TEAMS.INVITE.DELETE],
  ["teamsGetBillingInfo", teamsGetBillingInfo, PERMISSIONS.TEAMS.BILLING.VIEW],
] as const;

describe.each(permissionGated)(
  "%s (permission-gated)",
  (_name, ability, permission) => {
    it("denies a guest", async () => {
      expect(await allows(ability, null, TEAM)).toBe(false);
    });

    it("denies a user with no membership", async () => {
      expect(await allows(ability, outsider, TEAM)).toBe(false);
    });

    it("denies a member of a different team holding the permission there", async () => {
      // The permission is present, but scoped to OTHER_TEAM — leaking it
      // across tenants is the failure this check exists to prevent.
      expect(
        await allows(ability, member([permission], OTHER_TEAM), TEAM),
      ).toBe(false);
    });

    it("denies a member of the team without the permission", async () => {
      expect(await allows(ability, member([]), TEAM)).toBe(false);
    });

    it("denies when the user holds some other permission on the team", async () => {
      expect(
        await allows(ability, member(["teams:something:else"]), TEAM),
      ).toBe(false);
    });

    it("allows a member holding the exact permission on that team", async () => {
      expect(await allows(ability, member([permission]), TEAM)).toBe(true);
    });
  },
);

describe("teamsListTeams", () => {
  it("allows any signed-in user", async () => {
    expect(await allows(teamsListTeams, outsider)).toBe(true);
  });

  it("denies a guest", async () => {
    // `defineAbility` short-circuits a null user because `allowGuest` is
    // false, so the `() => true` authorizer never runs.
    expect(await allows(teamsListTeams, null)).toBe(false);
  });
});

describe("teamsGetTeamDetails", () => {
  it("allows any member, with no permission required", async () => {
    expect(await allows(teamsGetTeamDetails, member([]), TEAM)).toBe(true);
  });

  it("denies a member of a different team", async () => {
    expect(
      await allows(teamsGetTeamDetails, member([], OTHER_TEAM), TEAM),
    ).toBe(false);
  });

  it("denies an empty teamId even for a user whose teams list contains it", async () => {
    expect(await allows(teamsGetTeamDetails, member([], ""), "")).toBe(false);
  });

  it("denies a guest", async () => {
    expect(await allows(teamsGetTeamDetails, null, TEAM)).toBe(false);
  });
});

describe("teamsUpdateMemberRole (self-target guard)", () => {
  const admin = member([PERMISSIONS.TEAMS.MEMBERS.UPDATE]);

  it("refuses to let a user change their own role", async () => {
    // Guards against an owner demoting themselves and locking the team out of
    // its own administration.
    expect(await allows(teamsUpdateMemberRole, admin, TEAM, USER_ID)).toBe(
      false,
    );
  });

  it("allows changing another member's role", async () => {
    expect(await allows(teamsUpdateMemberRole, admin, TEAM, "user_2")).toBe(
      true,
    );
  });

  it("allows the call with no member targeted", async () => {
    expect(await allows(teamsUpdateMemberRole, admin, TEAM)).toBe(true);
  });
});

describe("teamsRemoveMember (self-target guard)", () => {
  const admin = member([PERMISSIONS.TEAMS.MEMBERS.REMOVE]);

  it("refuses to let a user remove themselves", async () => {
    expect(await allows(teamsRemoveMember, admin, TEAM, USER_ID)).toBe(false);
  });

  it("allows removing another member", async () => {
    expect(await allows(teamsRemoveMember, admin, TEAM, "user_2")).toBe(true);
  });

  it("allows the call with no member targeted", async () => {
    expect(await allows(teamsRemoveMember, admin, TEAM)).toBe(true);
  });
});
