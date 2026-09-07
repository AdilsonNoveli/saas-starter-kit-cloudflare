import { flags } from "#nuxfire/config";
import { appUrl, appDomain, authUrl, websocketsUrl } from "./dns";
import { secret } from "./secret";
import { deployWorker } from "./utils/nuxt";
import { adminSecret, auth, clientID } from "./auth";
import { wsTicketSecret } from "./websockets";

await deployWorker("App", {
  root: "packages/app",
  domain: appDomain,
  app: true,
  // A plain fetch() from this Worker to Auth's own public Custom Domain
  // (observed directly: 400-700ms when called from outside, 6s+ /
  // indefinite hangs when called from inside another Worker) is exactly
  // the anti-pattern Cloudflare's own docs warn against — see "Use service
  // bindings for Worker-to-Worker communication" in
  // developers.cloudflare.com/workers/best-practices/workers-best-practices.
  // Linking the Worker resource itself (same pattern as `emails` below)
  // sets up a zero-network-hop service binding (env.Auth), which
  // packages/app/server/utils/auth.ts's getClient() uses instead of the
  // global fetch() for calls to the OpenAuth issuer.
  link: [auth],
  vars: {
    NUXT_PUBLIC_AUTH_CLIENT_ID: clientID.result,
    NUXT_PUBLIC_AUTH_URL: authUrl.properties.value,
    // Server-side only — deliberately not under NUXT_PUBLIC_, so it never
    // reaches the browser bundle. Authorises account deletion against the
    // auth Worker (infra/auth.ts).
    NUXT_AUTH_ADMIN_SECRET: adminSecret.result,
    ...(flags.websockets
      ? {
          NUXT_PUBLIC_WEBSOCKETS_ENDPOINT: websocketsUrl.properties.value,
          NUXT_WS_TICKET_SECRET: wsTicketSecret!.result,
        }
      : {}),
    // Server-side only, like NUXT_AUTH_ADMIN_SECRET above: one seals the
    // 30-minute platform-admin MFA cookie, the other encrypts TOTP seeds at
    // rest. Neither ever reaches the browser bundle.
    NUXT_PLATFORM_MFA_SESSION_SECRET: secret.PlatformMfaSessionSecret?.value,
    NUXT_PLATFORM_ADMIN_ENCRYPTION_KEY:
      secret.PlatformAdminEncryptionKey?.value,
    // Same pair, same reasoning, for regular-user self-service 2FA — kept on
    // separate secrets from the platform-admin ones (see infra/secret.ts).
    NUXT_USER_MFA_SESSION_SECRET: secret.UserMfaSessionSecret?.value,
    NUXT_USER_MFA_ENCRYPTION_KEY: secret.UserMfaEncryptionKey?.value,
    NUXT_STRIPE_WEBHOOK_SECRET_KEY: secret.StripeWebhookSecretKey?.value,
    NUXT_STRIPE_SECRET_KEY: secret.StripeSecretKey?.value,
    NUXT_PADDLE_API_KEY: secret.PaddleApiKey?.value,
    NUXT_PADDLE_WEBHOOK_SECRET: secret.PaddleWebhookSecret?.value,
    // avoid ever accidentally shipping sandbox mode to production
    NUXT_PADDLE_SANDBOX: $app.stage === "production" ? "false" : "true",
    // Browser-side Paddle.js config. The client token is public by design
    // (it only authorises client-side checkout), which is why it is under
    // NUXT_PUBLIC_ unlike the API key above; it is still a per-stage secret
    // rather than a literal, so a stage without it configured resolves to
    // an empty string and use-payments.ts refuses to initialise.
    NUXT_PUBLIC_PADDLE_CLIENT_TOKEN: secret.PaddleClientToken?.value,
    NUXT_PUBLIC_PADDLE_ENVIRONMENT:
      $app.stage === "production" ? "production" : "sandbox",
  },
});

export const outputs = {
  App: appUrl.properties.value,
};
