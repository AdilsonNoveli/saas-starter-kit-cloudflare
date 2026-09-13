import { allows } from "nuxt-authorization/utils";
import { describe, expect, it } from "vitest";
import {
  deleteInvite,
  deleteTeam,
  getBillingInfo,
  getTeamDetails,
  listMembersAndInvites,
  listTeams,
  removeMember,
  sendInvite,
  updateInvite,
  updateMemberRole,
  updateTeamDetails,
} from "./abilities";
import { PERMISSIONS } from "./permissions";

// These abilities are the tenant RBAC gate for every team-scoped tRPC
// procedure and every `<Can>` block in the UI, and they're the first thing
// slated to move into `layers/teams/` — this suite is the net that proves the
// move didn't change behaviour.

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
  ["updateTeamDetails", updateTeamDetails, PERMISSIONS.TEAMS.UPDATE],
  ["deleteTeam", deleteTeam, PERMISSIONS.TEAMS.DELETE],
  [
    "listMembersAndInvites",
    listMembersAndInvites,
    PERMISSIONS.TEAMS.MEMBERS.LIST,
  ],
  ["sendInvite", sendInvite, PERMISSIONS.TEAMS.INVITE.CREATE],
  ["updateMemberRole", updateMemberRole, PERMISSIONS.TEAMS.MEMBERS.UPDATE],
  ["removeMember", removeMember, PERMISSIONS.TEAMS.MEMBERS.REMOVE],
  ["updateInvite", updateInvite, PERMISSIONS.TEAMS.INVITE.UPDATE],
  ["deleteInvite", deleteInvite, PERMISSIONS.TEAMS.INVITE.DELETE],
  ["getBillingInfo", getBillingInfo, PERMISSIONS.TEAMS.BILLING.VIEW],
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

describe("listTeams", () => {
  it("allows any signed-in user", async () => {
    expect(await allows(listTeams, outsider)).toBe(true);
  });

  it("denies a guest", async () => {
    // `defineAbility` short-circuits a null user because `allowGuest` is
    // false, so the `() => true` authorizer never runs.
    expect(await allows(listTeams, null)).toBe(false);
  });
});

describe("getTeamDetails", () => {
  it("allows any member, with no permission required", async () => {
    expect(await allows(getTeamDetails, member([]), TEAM)).toBe(true);
  });

  it("denies a member of a different team", async () => {
    expect(await allows(getTeamDetails, member([], OTHER_TEAM), TEAM)).toBe(
      false,
    );
  });

  it("denies an empty teamId even for a user whose teams list contains it", async () => {
    expect(await allows(getTeamDetails, member([], ""), "")).toBe(false);
  });

  it("denies a guest", async () => {
    expect(await allows(getTeamDetails, null, TEAM)).toBe(false);
  });
});

describe("updateMemberRole (self-target guard)", () => {
  const admin = member([PERMISSIONS.TEAMS.MEMBERS.UPDATE]);

  it("refuses to let a user change their own role", async () => {
    // Guards against an owner demoting themselves and locking the team out of
    // its own administration.
    expect(await allows(updateMemberRole, admin, TEAM, USER_ID)).toBe(false);
  });

  it("allows changing another member's role", async () => {
    expect(await allows(updateMemberRole, admin, TEAM, "user_2")).toBe(true);
  });

  it("allows the call with no member targeted", async () => {
    expect(await allows(updateMemberRole, admin, TEAM)).toBe(true);
  });
});

describe("removeMember (self-target guard)", () => {
  const admin = member([PERMISSIONS.TEAMS.MEMBERS.REMOVE]);

  it("refuses to let a user remove themselves", async () => {
    expect(await allows(removeMember, admin, TEAM, USER_ID)).toBe(false);
  });

  it("allows removing another member", async () => {
    expect(await allows(removeMember, admin, TEAM, "user_2")).toBe(true);
  });

  it("allows the call with no member targeted", async () => {
    expect(await allows(removeMember, admin, TEAM)).toBe(true);
  });
});
