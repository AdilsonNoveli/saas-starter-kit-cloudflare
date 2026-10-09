import { allows } from "nuxt-authorization/utils";
import { describe, expect, it } from "vitest";
import { billingGetBillingInfo } from "./abilities";
import { PERMISSIONS } from "@nuxfire/layer-teams/shared/utils/permissions";

// Split out of `layers/teams/shared/utils/abilities.test.ts` in Fase 3 passo
// 2a, together with the ability itself (`teamsGetBillingInfo` ->
// `billingGetBillingInfo`). The six cases below are the exact six that file's
// table-driven `describe.each` generated for this ability, reproduced verbatim
// against the renamed export — unchanged assertions are what make a
// still-green run proof that the move changed nothing, and the repo-wide test
// count is unchanged by the split. The helpers (`member`, `outsider`, the
// TEAM/OTHER_TEAM/USER_ID constants) are copied from that file for the same
// reason a layer duplicates `vitest.setup.ts`: a layer's suite has to run on
// its own, without reaching into another layer.

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

describe("billingGetBillingInfo (permission-gated)", () => {
  const ability = billingGetBillingInfo;
  const permission = PERMISSIONS.TEAMS.BILLING.VIEW;

  it("denies a guest", async () => {
    expect(await allows(ability, null, TEAM)).toBe(false);
  });

  it("denies a user with no membership", async () => {
    expect(await allows(ability, outsider, TEAM)).toBe(false);
  });

  it("denies a member of a different team holding the permission there", async () => {
    // The permission is present, but scoped to OTHER_TEAM — leaking it
    // across tenants is the failure this check exists to prevent.
    expect(await allows(ability, member([permission], OTHER_TEAM), TEAM)).toBe(
      false,
    );
  });

  it("denies a member of the team without the permission", async () => {
    expect(await allows(ability, member([]), TEAM)).toBe(false);
  });

  it("denies when the user holds some other permission on the team", async () => {
    expect(await allows(ability, member(["teams:something:else"]), TEAM)).toBe(
      false,
    );
  });

  it("allows a member holding the exact permission on that team", async () => {
    expect(await allows(ability, member([permission]), TEAM)).toBe(true);
  });
});
