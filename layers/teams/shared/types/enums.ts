// Teams-domain enums, relocated from `packages/app/types/enums.ts` in Fase 3
// passo 2a as a fix-forward: `InviteStatus` describes `TeamInvite.status`,
// whose table moved here in passo 1a, and it should have come along then.
// Moved verbatim — same `namespace $Enums` shape, same members, same order.
//
// `TeamInvite.status` is a plain text column with a `"PENDING"` default (see
// server/database/schema.ts), not a pgEnum, so this list is a write-side
// convention rather than a database constraint. Changing a member's spelling
// here would silently stop matching rows already stored; adding one is free.

namespace $Enums {
  export const InviteStatus: {
    PENDING: "PENDING";
    ACCEPTED: "ACCEPTED";
    DECLINED: "DECLINED";
    EXPIRED: "EXPIRED";
  } = {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    DECLINED: "DECLINED",
    EXPIRED: "EXPIRED",
  };

  export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];
}

export type InviteStatus = $Enums.InviteStatus;

export const InviteStatus: typeof $Enums.InviteStatus = $Enums.InviteStatus;
