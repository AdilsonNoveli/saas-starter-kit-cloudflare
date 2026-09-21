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
import type { EmailBrand, InviteEmailProps } from "../props";
import { previewBrand } from "../brand";

export const InviteEmail = ({
  teamName = "My Team",
  invitedBy = "Team Admin",
  username = "User",
  inviteLink = "https://app.example.com/invite",
  brand,
}: InviteEmailProps & { brand: EmailBrand }) => {
  const previewText = "You've been invited to join a team";

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
              Team Invitation
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hi <b>{username}</b>,
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              <b>{invitedBy}</b> has invited you to join the <b>{teamName}</b>{" "}
              team.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                href={inviteLink}
                className="bg-indigo-500 rounded text-white text-[12px] font-semibold no-underline text-center"
                style={{ padding: "10px 20px" }}
              >
                Accept Invitation
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              If the button doesn't work, copy and paste this link:{" "}
              <Link href={inviteLink} className="text-indigo-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              If you didn't expect this invitation, you can safely ignore this
              email.
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
  { teamName, invitedBy, username, inviteLink }: InviteEmailProps,
  brand: EmailBrand,
) => ({
  subject: `You've been invited to join ${teamName}`,
  body: (
    <InviteEmail
      teamName={teamName}
      invitedBy={invitedBy}
      username={username}
      inviteLink={inviteLink}
      brand={brand}
    />
  ),
});
