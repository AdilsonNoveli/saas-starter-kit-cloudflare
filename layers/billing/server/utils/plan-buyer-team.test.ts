import { describe, expect, it } from "vitest";
import { PlanBuyerTeamMode } from "../../shared/types/enums";
import { mergeBuyerTeam, resolveBuyerTeam } from "./plan-buyer-team";

// BDD source: specs/inbox/2026-09-25-200250-plan-setting-what-happens-to-the-buyer-s-team.md
// A plan says where a buyer lands after paying: a team of their own, or an
// existing team the platform owner picked.

describe("resolveBuyerTeam", () => {
  // SPECSFY: plan-buyer-team
  it("a plan that gives the buyer a new team holds no target team", () => {
    expect(
      resolveBuyerTeam({ mode: PlanBuyerTeamMode.NEW_TEAM, teamId: null }),
    ).toEqual({
      ok: true,
      value: { buyerTeamMode: "NEW_TEAM", buyerTeamId: null },
    });
  });

  // SPECSFY: plan-buyer-team
  it("drops a stale target team when the plan goes back to a new team per buyer", () => {
    // The admin picked a team, then switched the plan to "new team": the
    // leftover id must not survive, or the row would say two things at once.
    expect(
      resolveBuyerTeam({ mode: PlanBuyerTeamMode.NEW_TEAM, teamId: "team_1" }),
    ).toEqual({
      ok: true,
      value: { buyerTeamMode: "NEW_TEAM", buyerTeamId: null },
    });
  });

  // SPECSFY: plan-buyer-team
  it("keeps the chosen team when the plan adds the buyer to an existing team", () => {
    expect(
      resolveBuyerTeam({
        mode: PlanBuyerTeamMode.EXISTING_TEAM,
        teamId: "team_1",
      }),
    ).toEqual({
      ok: true,
      value: { buyerTeamMode: "EXISTING_TEAM", buyerTeamId: "team_1" },
    });
  });

  // SPECSFY: plan-buyer-team
  it("refuses an existing-team plan that names no team", () => {
    for (const teamId of [null, "", "   "]) {
      const outcome = resolveBuyerTeam({
        mode: PlanBuyerTeamMode.EXISTING_TEAM,
        teamId,
      });
      expect(outcome.ok).toBe(false);
    }
  });
});

describe("mergeBuyerTeam", () => {
  const existing = { buyerTeamMode: "NEW_TEAM", buyerTeamId: null } as const;

  // SPECSFY: plan-buyer-team
  it("keeps what the plan already holds when the edit does not touch the setting", () => {
    expect(mergeBuyerTeam(existing, {})).toEqual({
      mode: "NEW_TEAM",
      teamId: null,
    });
  });

  // SPECSFY: plan-buyer-team
  it("reads an explicit null team as a change, not as a missing field", () => {
    expect(
      mergeBuyerTeam(
        { buyerTeamMode: "EXISTING_TEAM", buyerTeamId: "team_1" },
        { buyerTeamId: null },
      ),
    ).toEqual({ mode: "EXISTING_TEAM", teamId: null });
  });

  // SPECSFY: plan-buyer-team
  it("does not read a field left out of the edit (an undefined key) as clearing the team", () => {
    expect(
      mergeBuyerTeam(
        { buyerTeamMode: "EXISTING_TEAM", buyerTeamId: "team_1" },
        { buyerTeamMode: "EXISTING_TEAM", buyerTeamId: undefined },
      ),
    ).toEqual({ mode: "EXISTING_TEAM", teamId: "team_1" });
  });

  // SPECSFY: plan-buyer-team
  it("reads an unrecognised stored mode as a new team per buyer", () => {
    expect(
      mergeBuyerTeam({ buyerTeamMode: "legacy", buyerTeamId: null }, {}),
    ).toEqual({ mode: "NEW_TEAM", teamId: null });
  });

  // SPECSFY: plan-buyer-team
  it("combines a new mode from the edit with the team the plan already holds", () => {
    expect(
      mergeBuyerTeam(
        { buyerTeamMode: "EXISTING_TEAM", buyerTeamId: "team_1" },
        { buyerTeamMode: "NEW_TEAM" },
      ),
    ).toEqual({ mode: "NEW_TEAM", teamId: "team_1" });
  });
});
