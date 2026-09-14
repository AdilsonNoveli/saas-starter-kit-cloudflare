import { secret } from "./secret";

// handler must stay relative — SST resolves it from the project root itself;
// an absolute path (path.resolve(...)) breaks its artifact-staging directory
// naming on Windows ("artifacts\Emails-src\C:\..." — it joins the handler
// path as if it were always relative).
// @nuxfire/emails/mailer (a vendored fork of @adonisjs/mail, see
// packages/emails/mailer and _docs/MAILER_FORK_PLAN.md) sends every
// transport — including HTTP-API ones like Resend — through nodemailer's
// own createTransport()/sendMail() for MIME composition. nodemailer's entry
// point unconditionally `require()`s ALL of its built-in transports
// (smtp-transport, smtp-pool, ses-transport, ...), so their code is present
// in this Worker's bundle regardless of which provider is actually
// configured below — verified empirically (grepped the esbuild proxy
// output), not eliminable by only importing the active transport's own
// wrapper file. This is harmless: that code is never instantiated unless a
// transport that needs it actually runs. What IS load-bearing is
// nodemailer's own internal `const EventEmitter = require('events')`,
// which breaks under esbuild's ESM interop on the Workers target ("Class
// extends value [object Module] is not a constructor") — fixed via a
// committed patch (patches/nodemailer@<version>.patch, see package.json
// patchedDependencies), not worked around here. If `bun install` ever
// bumps nodemailer's resolved version, the patch key must be updated to
// match (bun's patch matching is exact-version) — see lessons-learned.md.
export const emails = new sst.cloudflare.Worker("Emails", {
  handler: "apps/functions/src/emails.ts",
  link: [secret.ResendApiKey, secret.MailgunApiKey].filter(Boolean),
});
