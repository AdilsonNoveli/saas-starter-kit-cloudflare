import { getRequestIP, type H3Event } from "h3";
import { recordAuditLog } from "~~/server/utils/audit-log";
import type { Audit } from "../services/ports";

/**
 * The audit port over `recordAuditLog`, for the account services (SPEC-0010,
 * FR-017). The services never put an e-mail in `metadata`; the caller's IP is
 * added here, as every other audited action of the account does.
 */
export function createAuditPort(event: H3Event, targetType: "user" | "session"): Audit {
  return {
    record: (entry) =>
      recordAuditLog({
        ...entry,
        targetType,
        ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
      }),
  };
}
