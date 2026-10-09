/** @jsxImportSource react */
// This file is reachable from apps/app's TS program (via
// apps/functions/src/sender.ts's type-only import of EmailsWorker),
// whose own tsconfig sets `jsxImportSource: "vue"` — without this pragma,
// every element below gets checked against Vue's JSX namespace instead of
// React's.
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import React from "react";
import type { EmailBrand, EmailLocale, InviteEmailProps } from "../props";
import { previewBrand } from "../brand";
import { emailColors, emailTailwind } from "@nuxfire/tokens";

// The text of the invitation in each language (DEC-016): the inviter's
// language, English when they have no preferences. A Space is "Space",
// "Espaço" or "Espacio"; whole sentences per language, never fragments.
const copy: Record<
  EmailLocale,
  {
    subject: (teamName: string) => string;
    preview: string;
    heading: string;
    greeting: (username: React.ReactNode) => React.ReactNode;
    body: (invitedBy: React.ReactNode, teamName: React.ReactNode) => React.ReactNode;
    accept: string;
    fallback: string;
    footer: string;
  }
> = {
  en: {
    subject: (teamName) => `You're invited to the ${teamName} Space`,
    preview: "You're invited to join a Space",
    heading: "Space invitation",
    greeting: (username) => <>Hi {username},</>,
    body: (invitedBy, teamName) => <>{invitedBy} invited you to join the {teamName} Space.</>,
    accept: "Accept invitation",
    fallback: "If the button doesn't work, copy and paste this link:",
    footer: "If you didn't expect this invitation, you can ignore this email.",
  },
  "pt-br": {
    subject: (teamName) => `Convidaram você para o Espaço ${teamName}`,
    preview: "Você recebeu um convite para um Espaço",
    heading: "Convite para um Espaço",
    greeting: (username) => <>Olá, {username},</>,
    body: (invitedBy, teamName) => <>{invitedBy} convidou você para entrar no Espaço {teamName}.</>,
    accept: "Aceitar convite",
    fallback: "Se o botão não funcionar, copie e cole este link:",
    footer: "Se você não esperava este convite, pode ignorar este e-mail.",
  },
  es: {
    subject: (teamName) => `Invitación al Espacio ${teamName}`,
    preview: "Recibiste una invitación a un Espacio",
    heading: "Invitación a un Espacio",
    greeting: (username) => <>Hola, {username}:</>,
    body: (invitedBy, teamName) => <>{invitedBy} te invitó a unirte al Espacio {teamName}.</>,
    accept: "Aceptar invitación",
    fallback: "Si el botón no funciona, copia y pega este enlace:",
    footer: "Si no esperabas esta invitación, puedes ignorar este correo.",
  },
};

export const InviteEmail = ({
  teamName = "My Space",
  invitedBy = "Space owner",
  username = "User",
  inviteLink = "https://app.example.com/invite",
  locale = "en",
  brand,
}: InviteEmailProps & { brand: EmailBrand }) => {
  const text = copy[locale];

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{text.preview}</Preview>
      <Tailwind config={emailTailwind}>
        <Body className="bg-canvas my-auto mx-auto font-sans">
          <Container className="p-4 border border-solid border-line rounded my-[40px] mx-auto max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={brand.logoUrl}
                alt={brand.name}
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-ink text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {text.heading}
            </Heading>
            <Text className="text-ink text-[14px] leading-[24px]">
              {text.greeting(<b>{username}</b>)}
            </Text>
            <Text className="text-ink text-[14px] leading-[24px]">
              {text.body(<b>{invitedBy}</b>, <b>{teamName}</b>)}
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                href={inviteLink}
                className="bg-action rounded text-onAction text-[12px] font-semibold no-underline text-center"
                style={{ padding: "10px 20px" }}
              >
                {text.accept}
              </Button>
            </Section>
            <Text className="text-ink text-[14px] leading-[24px]">
              {text.fallback}{" "}
              <Link href={inviteLink} className="text-ink underline">
                {inviteLink}
              </Link>
            </Text>
            <Hr className="my-[26px] mx-0 w-full" style={{ borderTop: `1px solid ${emailColors.line}` }} />
            <Text className="text-muted text-[12px] leading-[24px]">
              {text.footer}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

InviteEmail.PreviewProps = { brand: previewBrand };

export default InviteEmail;

export const template = (
  { teamName, invitedBy, username, inviteLink, locale = "en" }: InviteEmailProps,
  brand: EmailBrand,
) => ({
  subject: copy[locale].subject(teamName),
  body: (
    <InviteEmail
      teamName={teamName}
      invitedBy={invitedBy}
      username={username}
      inviteLink={inviteLink}
      locale={locale}
      brand={brand}
    />
  ),
});
