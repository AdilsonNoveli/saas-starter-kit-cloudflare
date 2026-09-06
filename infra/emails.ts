import { secret } from "./secret";

// handler must stay relative — SST resolves it from the project root itself;
// an absolute path (path.resolve(...)) breaks its artifact-staging directory
// naming on Windows ("artifacts\Emails-src\C:\..." — it joins the handler
// path as if it were always relative).
// @tanayvk/mailer/generate unconditionally bundles its SMTP transport chunk
// (which imports nodemailer) regardless of which transports are actually
// configured — only Resend is wired up below, SMTP is off in config.ts.
// nodemailer's own internal `const EventEmitter = require('events')` breaks
// under esbuild's ESM interop on the Workers target ("Class extends value
// [object Module] is not a constructor") — fixed via a committed patch
// (patches/nodemailer@<version>.patch, see package.json
// patchedDependencies), not worked around here. If `bun install` ever
// bumps nodemailer's resolved version, the patch key must be updated to
// match (bun's patch matching is exact-version) — see lessons-learned.md.
export const emails = new sst.cloudflare.Worker("Emails", {
  handler: "packages/functions/src/emails.ts",
  link: [secret.ResendApiKey, secret.MailgunApiKey].filter(Boolean),
});
