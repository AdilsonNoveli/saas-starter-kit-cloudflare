import { flags } from "#nuxfire/config";

const secretList: Record<string, sst.Secret> = {};

// Database (PostgreSQL, connected via Cloudflare Hyperdrive)
secretList.DatabaseHost = new sst.Secret("DATABASE_HOST", "");
secretList.DatabasePort = new sst.Secret("DATABASE_PORT", "5432");
secretList.DatabaseName = new sst.Secret("DATABASE_NAME", "");
secretList.DatabaseUser = new sst.Secret("DATABASE_USER", "");
secretList.DatabasePassword = new sst.Secret("DATABASE_PASSWORD", "");

// Email provider secrets
if (flags.resend) {
  secretList.ResendApiKey = new sst.Secret("RESEND_API_KEY", "");
}

if (flags.mailgun) {
  secretList.MailgunApiKey = new sst.Secret("MAILGUN_API_KEY", "");
}

// TODO: set up IAM role for AWS SES using IaC
if (flags.ses) {
  secretList.AwsAccessKeyId = new sst.Secret("AWS_ACCESS_KEY_ID", "");
  secretList.AwsSecretAccessKey = new sst.Secret("AWS_SECRET_ACCESS_KEY", "");
}

if (flags.sparkPost) {
  secretList.SparkPostApiKey = new sst.Secret("SPARKPOST_API_KEY", "");
}

if (flags.smtp) {
  secretList.SmtpHost = new sst.Secret("SMTP_HOST", "");
  secretList.SmtpPort = new sst.Secret("SMTP_PORT", "");
  secretList.SmtpUsername = new sst.Secret("SMTP_USERNAME", "");
  secretList.SmtpPassword = new sst.Secret("SMTP_PASSWORD", "");
}

// Auth provider secrets
if (flags.githubAuth) {
  secretList.GithubClientID = new sst.Secret("GITHUB_CLIENT_ID", "");
  secretList.GithubClientSecret = new sst.Secret("GITHUB_CLIENT_SECRET", "");
}
if (flags.googleAuth) {
  secretList.GoogleClientID = new sst.Secret("GOOGLE_CLIENT_ID", "");
  secretList.GoogleClientSecret = new sst.Secret("GOOGLE_CLIENT_SECRET", "");
}

// Payment provider secrets
if (flags.stripe) {
  secretList.StripeWebhookSecretKey = new sst.Secret(
    "STRIPE_WEBHOOK_SECRET_KEY",
    "",
  );
  secretList.StripeSecretKey = new sst.Secret("STRIPE_SECRET_KEY", "");
}

if (flags.paddle) {
  secretList.PaddleApiKey = new sst.Secret("PADDLE_API_KEY", "");
  secretList.PaddleWebhookSecret = new sst.Secret("PADDLE_WEBHOOK_SECRET", "");
  // Client-side token for Paddle.js — public by design (see the
  // NUXT_PUBLIC_ var in infra/app.ts), but still per-stage, so it lives
  // alongside the other Paddle values instead of being hardcoded.
  secretList.PaddleClientToken = new sst.Secret("PADDLE_CLIENT_TOKEN", "");
}

// Platform admin console (apps/app/server/utils/platform-*.ts). Both are
// operator-managed rather than generated per stage, because they outlive any
// single deploy: the encryption key in particular guards TOTP seeds already
// written to the database, and losing it would force every platform admin to
// re-enrol. They default to "" so a stage that has not loaded them still
// deploys — the platform-admin routes simply fail closed until it does.
secretList.PlatformMfaSessionSecret = new sst.Secret(
  "PLATFORM_MFA_SESSION_SECRET",
  "",
);
secretList.PlatformAdminEncryptionKey = new sst.Secret(
  "PLATFORM_ADMIN_ENCRYPTION_KEY",
  "",
);

// Self-service two-factor authentication for regular users
// (apps/app/server/utils/user-mfa-session.ts, .../mfa-crypto.ts).
// Deliberately separate secrets from the platform-admin pair above, even
// though the mechanism is the same: rotating one must never invalidate MFA
// (or force a re-challenge) for the other population, and a deploy that only
// cares about end-user 2FA shouldn't need to provision an unrelated
// admin-console secret to make it work. Same fail-closed default as above.
secretList.UserMfaSessionSecret = new sst.Secret("USER_MFA_SESSION_SECRET", "");
secretList.UserMfaEncryptionKey = new sst.Secret("USER_MFA_ENCRYPTION_KEY", "");

export const secret = secretList;
export const allSecrets = Object.values(secret);
