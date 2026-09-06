import { auditLogs } from "@movimenta-bairro/functions/schema";

export interface AuditLogEntry {
  actorUserId: string;
  /** What happened, e.g. the tRPC procedure path: "admin.teams.suspendTeam". */
  action: string;
  /** What kind of thing it happened to: "team" | "plan" | "job" | "user". */
  targetType: string;
  targetId?: string | null;
  metadata?: unknown;
  ip?: string | null;
}

/**
 * The single writer for the platform audit trail. Every platform-admin
 * mutation goes through here — never a direct insert into `auditLogs` from a
 * router — so the shape of a log line is defined in exactly one place.
 *
 * A failure to log is reported, not thrown: this is called *after* the
 * mutation has already committed, and turning a logging problem into a
 * client-visible error would report a write that actually succeeded as
 * failed. A line appearing here is a real incident to chase (an audit gap),
 * not expected behaviour.
 */
export async function recordAuditLog(entry: AuditLogEntry) {
  try {
    await useDB()
      .insert(auditLogs)
      .values({
        actorUserId: entry.actorUserId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? null,
        ip: entry.ip ?? null,
      });
  } catch (error) {
    console.error("audit log write failed", {
      action: entry.action,
      actorUserId: entry.actorUserId,
      error,
    });
  }
}
