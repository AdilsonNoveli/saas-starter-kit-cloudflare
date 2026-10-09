import { defineLayerManifest } from "@nuxfire/manifest";

export default defineLayerManifest({
  name: "account",
  displayName: "Account",
  description:
    "The person's own account: profile, profile picture, appearance, sessions, account deletion and the user MFA enrolment, challenge and recovery codes",
  version: "1.0.0",

  // The onboarding creates the Space and accepts the invite through
  // `@nuxfire/layer-teams` (`createTeamWithOwner`, the invite policy), SPEC-0010
  // AC-047. `deleteAccount` still reaches the teams and notifications tables
  // through the `@nuxfire/functions/schema` barrel.
  requires: ["teams"],

  // `navigation` is deliberately absent: `/account-settings` is reached from the
  // account dropdown, never from a sidebar item.

  // Every procedure acts on the caller's own account (`protectedProcedure`), so
  // there is no tenant permission to declare.
  permissions: [],
});
