import type { EmailsWorker, SendEmailType } from "./emails-types";

export type { EmailsWorker };

export const sender = (Emails: EmailsWorker) => {
  // Intentionally swallows failures — callers fire-and-forget these (magic
  // links, invites, notifications) and a transient email-provider outage
  // shouldn't fail the request that triggered it. Logged with enough
  // context (to whom, which template) to be traceable in Workers Logs, and
  // callers that need to know can check the returned boolean.
  const sendEmail: SendEmailType = async (...args) => {
    try {
      return await Emails.sendEmail(...args);
    } catch (error) {
      const [, to, template] = args;
      // Error instances serialize to `{}` in Workers structured logs
      // (message/stack are non-enumerable) — pull them out explicitly so
      // wrangler tail shows the real failure instead of an empty object.
      const err = error as { message?: string; name?: string; stack?: string };
      console.error("failed to send email", {
        to,
        template,
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      });
      return false;
    }
  };
  return sendEmail;
};
