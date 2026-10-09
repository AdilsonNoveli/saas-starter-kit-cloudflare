/**
 * Ports the account services receive instead of reaching for Nitro globals
 * (SPEC-0010, DEC-018). The thin tRPC files build the real implementations
 * (`useDB()`, the `Auth` service binding, `ctx.sendEmail`); the tests pass fakes.
 */
export type Clock = () => Date;

export type AuditEvent = {
  action: string;
  actorUserId: string;
  targetId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export interface Audit {
  record(event: AuditEvent): Promise<void>;
}

/** What the auth Worker answers on its three internal endpoints. */
export interface IssuerClient {
  identityState(input: {
    userId: string;
    email: string;
  }): Promise<{ providers: string[]; hasPassword: boolean; sids: string[] }>;
  revokeSessions(input: {
    userId: string;
    onlySid?: string;
    exceptSid?: string;
  }): Promise<{ revoked: number }>;
  changeEmail(input: {
    userId: string;
    oldEmail: string;
    newEmail: string;
    currentSid: string;
  }): Promise<{ ok: true } | { ok: false; error: "email_taken" | "email_managed_by_provider" }>;
}
