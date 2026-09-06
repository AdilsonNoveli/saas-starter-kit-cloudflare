import { Emails } from "@movimenta-bairro/emails";
import type { EmailProps } from "@movimenta-bairro/emails/props";
import { Resource } from "sst/resource";
import { flags } from "#movimenta-bairro/config";
import { generateMailer } from "@tanayvk/mailer/generate";
import { render } from "@react-email/render";
import { WorkerEntrypoint } from "cloudflare:workers";
import type { EmailsWorker as EmailsWorkerContract } from "./emails-types";

// TODO: import and set up email providers that you want to use
import { ResendTransport } from "@tanayvk/mailer/transports/resend";
// import { MailgunTransport } from "@tanayvk/mailer/transports/mailgun";
// import { SESTransport } from "@tanayvk/mailer/transports/ses";
// import { SparkPostTransport } from "@tanayvk/mailer/transports/sparkpost";
// import { SMTPTransport } from "@tanayvk/mailer/transports/smtp";

let mailer: Awaited<ReturnType<typeof generateMailer>>;

const config: Parameters<typeof generateMailer>[0] = {
  // TODO: set default email provider
  default: "resend",
  // NOTE: you can optionally configure default from/reply to addresses
  // from: {
  //   address: "example@domain.com",
  //   name: "Tanay Karnik",
  // },
  // replyTo: {
  //   address: "example@domain.com",
  //   name: "Tanay Karnik",
  // },
  mailers: {
    ...(flags.resend && {
      resend: () =>
        new ResendTransport({
          key: Resource.RESEND_API_KEY.value || "",
          baseUrl: "https://api.resend.com",
        }),
    }),
    // ...(flags.mailgun && {
    //   mailgun: () =>
    //     new MailgunTransport({
    //       key: Resource.MAILGUN_API_KEY.value || "",
    //       domain: authEmailDomain,
    //       baseUrl: "https://api.mailgun.net/v3",
    //     }),
    // }),
    // ...(flags.ses && {
    //   ses: () =>
    //     new SESTransport({
    //       credentials: {
    //         accessKeyId: Resource.AWS_ACCESS_KEY_ID.value || "",
    //         secretAccessKey: Resource.AWS_SECRET_ACCESS_KEY.value || "",
    //       },
    //       region: "us-east-1",
    //     }),
    // }),
    // ...(flags.sparkPost && {
    //   sparkpost: () =>
    //     new SparkPostTransport({
    //       key: Resource.SPARKPOST_API_KEY.value || "",
    //       baseUrl: "https://api.sparkpost.com/api/v1",
    //     }),
    // }),
    // ...(flags.smtp && {
    //   smtp: () =>
    //     new SMTPTransport({
    //       host: Resource.SMTP_HOST.value || "",
    //       port: Number(Resource.SMTP_PORT.value) || 587,
    //       auth: {
    //         user: Resource.SMTP_USERNAME.value || "",
    //         pass: Resource.SMTP_PASSWORD.value || "",
    //       },
    //     }),
    // }),
  },
};

export const getMailer = async () => {
  if (mailer) return mailer;
  mailer = await generateMailer(config);
  return mailer;
};

const templates = {
  Welcome: Emails.Welcome,
  VerificationCode: Emails.VerificationCode,
  Invitation: Emails.Invitation,
};

export type { SendEmailType, EmailsWorker } from "./emails-types";

export default class Worker
  extends WorkerEntrypoint
  implements EmailsWorkerContract
{
  async fetch() {
    return new Response(null);
  }
  async sendEmail<Type extends keyof EmailProps>(
    from: string | { address: string; name: string },
    to: string,
    template: Type,
    props: EmailProps[Type],
  ) {
    const { body, subject } = templates[template](props as any);
    try {
      const mailer = await getMailer();
      await mailer.send(async (message) => {
        message
          .from(
            typeof from === "string" ? from : from.address,
            typeof from === "string" ? undefined : from.name,
          )
          .to(to)
          .subject(subject)
          .html(await render(body));
      });
      return true;
    } catch (error) {
      // Error instances serialize to `{}` in Workers structured logs
      // (message/stack/name are non-enumerable) — pull them out explicitly
      // so wrangler tail actually shows the real failure reason instead of
      // an empty object. Also surface anything a transport SDK attaches
      // (e.g. an HTTP error body from Resend) via `cause`/`response`/`data`.
      const err = error as {
        message?: string;
        name?: string;
        stack?: string;
        cause?: unknown;
        response?: unknown;
        data?: unknown;
      };
      console.error("Failed to send email:", {
        to,
        template,
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        cause: err?.cause,
        response: err?.response,
        data: err?.data,
      });
      return false;
    }
  }
}
