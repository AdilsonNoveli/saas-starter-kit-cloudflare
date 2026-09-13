import { PERMISSIONS } from "./permissions";

// NAMING CONVENTION — read before adding anything here.
//
// Every other layer prefixes its ability names with the layer name
// (`kanbanListBoards`, never `listBoards`): `nuxt-authorization` piggybacks on
// Nuxt's cross-layer auto-import of `shared/utils/`, which is one flat
// namespace keyed by export name, so two layers exporting the same bare name
// collide silently with no build error. See _docs/AGENTS.md, "Nuxt Layers
// architecture", and §5 of _docs/REFATORE_ARCHITETURE.md.
//
// The names below are deliberately NOT prefixed, and that is a conscious
// exception, not an oversight: this file predates the convention (it was the
// app's only abilities file), and renaming `listTeams` -> `teamsListTeams` here
// would have to land in the same commit as every call site — the still-unmoved
// frontend (packages/app/app/**, Fase 3 passo 1b), plus any future router that
// reads them. That is exactly the repo-wide blast radius this extraction is
// meant to avoid mid-flight. Nothing else in the repo defines team abilities,
// so there is no name to collide with today.
//
// Anything ADDED here from now on takes the `teams*` prefix; the retrofit of
// these existing names belongs with the frontend move.

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

export const listTeams = defineAbility(() => true);

export const getTeamDetails = defineAbility(
  (user: User, teamId: string) => !!(teamId && user?.teams?.includes(teamId)),
);

export const updateTeamDetails = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.UPDATE),
);

export const deleteTeam = defineAbility((user: User | null, teamId: string) =>
  hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.DELETE),
);

export const listMembersAndInvites = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.MEMBERS.LIST),
);

export const sendInvite = defineAbility((user: User | null, teamId: string) =>
  hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.INVITE.CREATE),
);

export const updateMemberRole = defineAbility(
  (user: User | null, teamId: string, memberId?: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.MEMBERS.UPDATE) &&
    (!memberId || memberId !== user?.id),
);

export const removeMember = defineAbility(
  (user: User | null, teamId: string, memberId?: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.MEMBERS.REMOVE) &&
    (!memberId || memberId !== user?.id),
);

export const updateInvite = defineAbility((user: User | null, teamId: string) =>
  hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.INVITE.UPDATE),
);

export const deleteInvite = defineAbility((user: User | null, teamId: string) =>
  hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.INVITE.DELETE),
);

export const getBillingInfo = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.BILLING.VIEW),
);
