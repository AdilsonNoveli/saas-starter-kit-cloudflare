import { PERMISSIONS } from "./permissions";

// NAMING CONVENTION — read before adding anything here.
//
// Every ability name is prefixed with the layer name (`teamsDeleteTeam`, never
// `deleteTeam`), exactly like `layers/kanban`'s `kanbanListBoards`:
// `nuxt-authorization` piggybacks on Nuxt's cross-layer auto-import of
// `shared/utils/`, which is one flat namespace keyed by export name, so two
// layers exporting the same bare name collide silently with no build error.
// See nuxfire-layers.md.
//
// These names were the one documented exception until Fase 3 passo 1b: they
// predate the convention, and the retrofit had to land in the same commit as
// every call site. Passo 1b moves the whole teams frontend into this layer, so
// every call site was already being touched — that is when the rename landed,
// at no extra cost, and the exception is gone.

interface User {
  id: string;
  teams?: string[];
  permissions?: Record<string, string[]>;
}

const hasTeamPermission = (
  user: User | null,
  teamId: string,
  permission: string,
): boolean => {
  return (
    !!user?.teams?.includes(teamId) &&
    (user?.permissions?.[teamId] || []).includes(permission)
  );
};

export const teamsListTeams = defineAbility(() => true);

export const teamsGetTeamDetails = defineAbility(
  (user: User, teamId: string) => !!(teamId && user?.teams?.includes(teamId)),
);

export const teamsUpdateTeamDetails = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.UPDATE),
);

export const teamsDeleteTeam = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.DELETE),
);

export const teamsListMembersAndInvites = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.MEMBERS.LIST),
);

export const teamsSendInvite = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.INVITE.CREATE),
);

export const teamsUpdateMemberRole = defineAbility(
  (user: User | null, teamId: string, memberId?: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.MEMBERS.UPDATE) &&
    (!memberId || memberId !== user?.id),
);

export const teamsRemoveMember = defineAbility(
  (user: User | null, teamId: string, memberId?: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.MEMBERS.REMOVE) &&
    (!memberId || memberId !== user?.id),
);

export const teamsUpdateInvite = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.INVITE.UPDATE),
);

export const teamsDeleteInvite = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.INVITE.DELETE),
);

// `teamsGetBillingInfo` used to sit here, gating `PERMISSIONS.TEAMS.BILLING.VIEW`.
// Fase 3 passo 1b flagged it as a billing ability that merely happened to live
// in this file; passo 2a moved it to
// `layers/billing/shared/utils/abilities.ts` as `billingGetBillingInfo`. The
// permission string itself stays here — it is teams-owned, declared by this
// layer's manifest and already written into live `Permission` rows.

/**
 * Generic, permission-string-parameterised ability (SPEC-0005). What lets
 * `useTeamSettingsLinks` show a feature layer's contributed settings tab
 * (`LayerManifest.teamSettingsTabs`, e.g. billing's) without importing that
 * layer: the tab carries its own permission string, and this one ability —
 * already teams-owned, since `hasTeamPermission` is private to this file —
 * checks it generically. A layer-specific ability wrapper (like the old
 * `teamsGetBillingInfo`/`billingGetBillingInfo`) is unnecessary for this case
 * and would need one new export per feature that wants a tab.
 */
export const teamsHasPermission = defineAbility(
  (user: User | null, teamId: string, permission: string) =>
    hasTeamPermission(user, teamId, permission),
);
