import { Emails, emailBrand } from "@nuxfire/emails";
import type { EmailBrand, EmailProps } from "@nuxfire/emails/props";
import { Resource } from "sst/resource";
import { flags } from "#nuxfire/config";
import { generateMailer } from "@nuxfire/emails/mailer";
import { render } from "@react-email/render";
import { WorkerEntrypoint } from "cloudflare:workers";
import type { EmailsWorker as EmailsWorkerContract } from "./emails-types";

// TODO: import and set up email providers that you want to use
import { ResendTransport } from "@nuxfire/emails/mailer/transports/resend";
// import { MailgunTransport } from "@nuxfire/emails/mailer/transports/mailgun";
// import { SESTransport } from "@nuxfire/emails/mailer/transports/ses";
// import { SparkPostTransport } from "@nuxfire/emails/mailer/transports/sparkpost";
// import { SMTPTransport } from "@nuxfire/emails/mailer/transports/smtp";

let mailer: Awaited<ReturnType<typeof generateMailer>>;

const config: Parameters<typeof generateMailer>[0] = {
  // TODO: set default email provider
  default: "resend",
  // NOTE: you can optionally configure default from/reply to addresses
  // from: {
  //   address: "example@domain.com",
  //   name: "Your Name",
  // },
  // replyTo: {
  //   address: "example@domain.com",
  //   name: "Your Name",
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
    //       domain: "<your Mailgun sending domain>",
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

// One entry per template, each taking exactly its own props (plus the brand) — the mapped
// type is what lets `renderTemplate` call `templates[template]` without a cast.
const templates: {
  [Type in keyof EmailProps]: (
    props: EmailProps[Type],
    brand: EmailBrand,
  ) => ReturnType<typeof Emails.Welcome>;
} = {
  Welcome: Emails.Welcome,
  VerificationCode: Emails.VerificationCode,
  Invitation: Emails.Invitation,
  PurchaseClaim: Emails.PurchaseClaim,
};

export type { SendEmailType, EmailsWorker } from "./emails-types";

// Set by infra/emails.ts from the deployed branding (scripts/branding.ts).
interface Env {
  BRAND_NAME: string;
  BRAND_DOMAIN: string;
  BRAND_EMAIL: string;
}

const renderTemplate = <Type extends keyof EmailProps>(
  template: Type,
  props: EmailProps[Type],
  brand: EmailBrand,
) => templates[template](props, brand);

export default class Worker
  extends WorkerEntrypoint<Env>
  implements EmailsWorkerContract
{
  async fetch() {
    return new Response(null);
  }
  // The sender is not an argument on purpose: identity is the installation's
  // (BRAND_EMAIL / BRAND_NAME), and this is the only place that applies it.
  async sendEmail<Type extends keyof EmailProps>(
    to: string,
    template: Type,
    props: EmailProps[Type],
  ) {
    const { body, subject } = renderTemplate(
      template,
      props,
      emailBrand(this.env),
    );
    try {
      const mailer = await getMailer();
      await mailer.send(async (message) => {
        message
          .from(this.env.BRAND_EMAIL, this.env.BRAND_NAME)
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
