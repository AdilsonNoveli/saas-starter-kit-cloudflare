/** @jsxImportSource react */
// This file is reachable from packages/app's TS program (via
// packages/functions/src/sender.ts's type-only import of EmailsWorker),
// whose own tsconfig sets `jsxImportSource: "vue"` — without this pragma,
// every element below gets checked against Vue's JSX namespace instead of
// React's.
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { EmailBrand, WelcomeProps } from "../props";
import { previewBrand } from "../brand";

export const WelcomeEmail = ({
  username,
  brand,
}: WelcomeProps & { brand: EmailBrand }) => {
  const previewText = `Welcome aboard, ${username}!`;
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
              Welcome
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hi {username},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              Welcome aboard! We're excited to have you join us.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              If you have any questions, please don't hesitate to reach out.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

WelcomeEmail.PreviewProps = { username: "Ana", brand: previewBrand };

export default WelcomeEmail;

export const template = (props: WelcomeProps, brand: EmailBrand) => ({
  subject: `Welcome to ${brand.name} ${props.username}!`,
  body: <WelcomeEmail {...props} brand={brand} />,
});
