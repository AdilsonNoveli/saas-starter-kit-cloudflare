import type { EmailProps } from "@nuxfire/emails/props";

// Split out of emails.ts on purpose: that file imports `cloudflare:workers`
// and `#nuxfire/config`, both only resolvable from this package's
// own build context (its own tsconfig extends the root one for the path
// mapping, and declares @cloudflare/workers-types). apps/app only ever
// needs this shape — not the Worker implementation — to type
// `sender()`/`ctx.sendEmail` (server/trpc/context.ts), so giving it its own
// dependency-free file keeps that import from also pulling in Worker-only
// module resolution that apps/app's TypeScript program can't (and
// shouldn't have to) resolve.
// No `from`: the Emails Worker owns the sender identity (BRAND_EMAIL / BRAND_NAME).
export type SendEmailType = <Type extends keyof EmailProps>(
  to: string,
  template: Type,
  props: EmailProps[Type],
) => Promise<boolean>;

export interface EmailsWorker {
  sendEmail: SendEmailType;
}
