import { PERMISSIONS } from "./permissions";

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
