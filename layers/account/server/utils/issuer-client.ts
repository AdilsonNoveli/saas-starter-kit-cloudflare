import { TRPCError } from "@trpc/server";
import type { H3Event } from "h3";
import type { IssuerClient } from "../services/ports";
// Relative, not `#nuxfire/config`: Nitro does not resolve that tsconfig alias.
import { emailChangePath, identityStatePath, sessionsRevokePath } from "../../../../config";

// The only implementation of the issuer port (SPEC-0010, DEC-009). AuthKV is
// bound to the auth Worker alone, so every call goes over the `Auth` service
// binding (infra/app.ts's `link: [auth]`) with the constant-time
// `x-admin-secret` the internal endpoints demand.

type AuthBinding = { fetch: typeof fetch };

export function createIssuerClient(
  event: H3Event,
  config: { authUrl: string; adminSecret: string },
): IssuerClient {
  async function post<T>(path: string, body: Record<string, string | undefined>): Promise<T> {
    const binding = (event.context as { cloudflare?: { env?: { Auth?: AuthBinding } } })
      ?.cloudflare?.env?.Auth;
    if (!binding) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Auth service binding is unavailable.",
      });
    }
    const response = await binding.fetch(`${config.authUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": config.adminSecret,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error("issuer internal call failed", {
        path,
        userId: body.userId,
        status: response.status,
        body: await response.text().catch(() => ""),
      });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Issuer call failed." });
    }
    return (await response.json()) as T;
  }

  return {
    identityState: (input) => post(identityStatePath, input),
    revokeSessions: (input) => post(sessionsRevokePath, input),
    // A refusal (`email_taken`, `email_managed_by_provider`) comes back as 200
    // with `{ ok: false, error }` in the body.
    changeEmail: (input) => post(emailChangePath, input),
  };
}
