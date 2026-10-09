/** @jsxImportSource react */
// See the note in Invitation.tsx: this pragma is required because the
// consuming TS program (apps/app, via EmailsWorker) sets jsxImportSource to
// "vue", not React.
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
import type {
  EmailBrand,
  EmailLocale,
  PurchaseClaimDestination,
  PurchaseClaimEmailProps,
} from "../props";
import { previewBrand } from "../brand";
import { emailColors, emailTailwind } from "@nuxfire/tokens";

// The text of the claim e-mail in each language. The buyer may have no account
// yet, so the sender passes no `locale` and it goes out in English; the
// destination is a shape (layers/billing describeBuyerDestination) worded here
// as a whole sentence per kind.
const copy: Record<
  EmailLocale,
  {
    confirmed: (planName: string) => string;
    heading: string;
    thanks: (planName: React.ReactNode) => React.ReactNode;
    setup: string;
    destination: (destination: PurchaseClaimDestination) => React.ReactNode;
    action: string;
    fallback: string;
    footer: string;
  }
> = {
  en: {
    confirmed: (planName) => `Your payment for ${planName} is confirmed`,
    heading: "Your payment is confirmed",
    thanks: (planName) => <>Thanks for purchasing {planName}.</>,
    setup: "Create an account or sign in with this email address to finish setting up your access.",
    destination: (destination) =>
      destination.kind === "new_space" ? (
        <>You'll land in a new Space of your own.</>
      ) : destination.kind === "existing_space" ? (
        <>You'll join the <b>{destination.name}</b> Space.</>
      ) : (
        <>The Space of this purchase no longer exists. Contact support for help.</>
      ),
    action: "Finish setting up my access",
    fallback: "If the button doesn't work, copy and paste this link:",
    footer: "This link works only with this email address, and it expires after 30 days.",
  },
  "pt-br": {
    confirmed: (planName) => `O pagamento de ${planName} foi confirmado`,
    heading: "Pagamento confirmado",
    thanks: (planName) => <>Obrigado por comprar {planName}.</>,
    setup: "Crie uma conta ou entre com este e-mail para concluir a configuração do seu acesso.",
    destination: (destination) =>
      destination.kind === "new_space" ? (
        <>Você vai entrar em um Espaço novo, só seu.</>
      ) : destination.kind === "existing_space" ? (
        <>Você vai entrar no Espaço <b>{destination.name}</b>.</>
      ) : (
        <>O Espaço desta compra não existe mais. Fale com o suporte para receber ajuda.</>
      ),
    action: "Concluir meu acesso",
    fallback: "Se o botão não funcionar, copie e cole este link:",
    footer: "Este link funciona apenas com este e-mail e expira em 30 dias.",
  },
  es: {
    confirmed: (planName) => `El pago de ${planName} está confirmado`,
    heading: "Pago confirmado",
    thanks: (planName) => <>Gracias por comprar {planName}.</>,
    setup: "Crea una cuenta o inicia sesión con este correo para terminar de configurar tu acceso.",
    destination: (destination) =>
      destination.kind === "new_space" ? (
        <>Entrarás en un Espacio nuevo, solo tuyo.</>
      ) : destination.kind === "existing_space" ? (
        <>Te unirás al Espacio <b>{destination.name}</b>.</>
      ) : (
        <>El Espacio de esta compra ya no existe. Contacta con soporte para recibir ayuda.</>
      ),
    action: "Terminar de configurar mi acceso",
    fallback: "Si el botón no funciona, copia y pega este enlace:",
    footer: "Este enlace solo funciona con este correo y vence a los 30 días.",
  },
};

export const PurchaseClaimEmail = ({
  planName = "Pro",
  destination = { kind: "new_space" },
  claimLink = "https://app.example.com/claim/example",
  locale = "en",
  brand,
}: PurchaseClaimEmailProps & { brand: EmailBrand }) => {
  const text = copy[locale];

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{text.confirmed(planName)}</Preview>
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
              {text.thanks(<b>{planName}</b>)}
            </Text>
            <Text className="text-ink text-[14px] leading-[24px]">
              {text.setup} {text.destination(destination)}
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                href={claimLink}
                className="bg-action rounded text-onAction text-[12px] font-semibold no-underline text-center"
                style={{ padding: "10px 20px" }}
              >
                {text.action}
              </Button>
            </Section>
            <Text className="text-ink text-[14px] leading-[24px]">
              {text.fallback}{" "}
              <Link href={claimLink} className="text-ink underline">
                {claimLink}
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

PurchaseClaimEmail.PreviewProps = { brand: previewBrand };

export default PurchaseClaimEmail;

export const template = (
  { planName, destination, claimLink, locale = "en" }: PurchaseClaimEmailProps,
  brand: EmailBrand,
) => ({
  subject: copy[locale].confirmed(planName),
  body: (
    <PurchaseClaimEmail
      planName={planName}
      destination={destination}
      claimLink={claimLink}
      locale={locale}
      brand={brand}
    />
  ),
});
