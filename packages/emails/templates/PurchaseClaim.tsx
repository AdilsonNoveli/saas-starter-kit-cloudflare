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
import type { EmailBrand, PurchaseClaimEmailProps } from "../props";
import { previewBrand } from "../brand";

export const PurchaseClaimEmail = ({
  planName = "Pro",
  destinationSummary = "a new team of your own",
  claimLink = "https://app.example.com/claim/example",
  brand,
}: PurchaseClaimEmailProps & { brand: EmailBrand }) => {
  const previewText = `Your payment for ${planName} is confirmed`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="p-4 border border-solid border-[#eaeaea] rounded my-[40px] mx-auto max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={brand.logoUrl}
                alt={brand.name}
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Your payment is confirmed
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Thanks for purchasing <b>{planName}</b>.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              Create an account or log in with this e-mail address to finish
              setting up your access. You'll land in <b>{destinationSummary}</b>.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                href={claimLink}
                className="bg-indigo-500 rounded text-white text-[12px] font-semibold no-underline text-center"
                style={{ padding: "10px 20px" }}
              >
                Finish setting up my access
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              If the button doesn't work, copy and paste this link:{" "}
              <Link href={claimLink} className="text-indigo-600 no-underline">
                {claimLink}
              </Link>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This link works only with this e-mail address, and it expires
              after 30 days.
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
  { planName, destinationSummary, claimLink }: PurchaseClaimEmailProps,
  brand: EmailBrand,
) => ({
  subject: `Your payment for ${planName} is confirmed`,
  body: (
    <PurchaseClaimEmail
      planName={planName}
      destinationSummary={destinationSummary}
      claimLink={claimLink}
      brand={brand}
    />
  ),
});
