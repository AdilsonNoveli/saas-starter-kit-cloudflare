import { PlanBuyerTeamMode } from "../../shared/types/enums";

export interface BuyerTeamSetting {
  mode: PlanBuyerTeamMode;
  teamId: string | null;
}

export type BuyerTeamResolution =
  | {
      ok: true;
      value: { buyerTeamMode: PlanBuyerTeamMode; buyerTeamId: string | null };
    }
  | { ok: false; reason: string };

/**
 * The two columns a plan keeps for "where does the buyer land", made
 * consistent: the mode and the team can never disagree. A plan that gives the
 * buyer a team of their own holds no target (a leftover id from an earlier
 * choice is dropped, not kept beside a mode that ignores it), and a plan that
 * adds the buyer to an existing team must name it.
 *
 * Whether that team exists is a database question, so it is asked by the
 * router, not here.
 */
export function resolveBuyerTeam(setting: BuyerTeamSetting): BuyerTeamResolution {
  if (setting.mode === PlanBuyerTeamMode.NEW_TEAM) {
    return {
      ok: true,
      value: { buyerTeamMode: PlanBuyerTeamMode.NEW_TEAM, buyerTeamId: null },
    };
  }

  const teamId = setting.teamId?.trim();
  if (!teamId) {
    return { ok: false, reason: "Choose the team the buyer will join" };
  }

  return {
    ok: true,
    value: { buyerTeamMode: PlanBuyerTeamMode.EXISTING_TEAM, buyerTeamId: teamId },
  };
}

/**
 * The setting a partial edit leads to: the existing row overlaid with whatever
 * the request actually sent. `undefined` means "not sent" (a destructured
 * optional field arrives as an `undefined` key, so testing for the key would
 * misread it), while an explicit `null` team is a real change.
 */
export function mergeBuyerTeam(
  existing: { buyerTeamMode: string; buyerTeamId: string | null },
  changes: { buyerTeamMode?: PlanBuyerTeamMode; buyerTeamId?: string | null },
): BuyerTeamSetting {
  return {
    mode: changes.buyerTeamMode ?? toMode(existing.buyerTeamMode),
    teamId:
      changes.buyerTeamId !== undefined
        ? changes.buyerTeamId
        : existing.buyerTeamId,
  };
}

// The column is free text, so a value written by hand or by an older build
// reads as the safe default instead of an option the form does not offer.
function toMode(value: string): PlanBuyerTeamMode {
  return value === PlanBuyerTeamMode.EXISTING_TEAM
    ? PlanBuyerTeamMode.EXISTING_TEAM
    : PlanBuyerTeamMode.NEW_TEAM;
}
