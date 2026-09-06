export const PERMISSIONS = {
  TEAMS: {
    UPDATE: "teams:update",
    DELETE: "teams:delete",
    MEMBERS: {
      LIST: "teams:members:list",
      UPDATE: "teams:members:update",
      REMOVE: "teams:members:remove",
    },
    INVITE: {
      CREATE: "teams:invite:create",
      UPDATE: "teams:invite:update",
      DELETE: "teams:invite:delete",
    },
    BILLING: {
      VIEW: "teams:billing:view",
    },
  },
};
