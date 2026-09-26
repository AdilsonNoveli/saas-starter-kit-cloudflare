// Plain .ts, deliberately free of JSX/React imports. Consumers that only
// need to know an email template's expected props (apps/functions/src/
// emails.ts, and transitively apps/app) import from here instead of
// from the .tsx template files — pulling in a .tsx file forces whatever
// TypeScript program does the importing to type-check its JSX under its
// own `jsx`/`jsxImportSource` setting, which breaks for a Vue app
// (apps/app) checking React email templates. This file is the single
// source of truth for each template's prop shape; the .tsx files import
// their own interface from here rather than redeclaring it.

// Identity shown in every e-mail. Built once by the Emails Worker from the deployed
// branding (see brand.ts) and passed to each template — callers of `sendEmail` never
// supply it.
export interface EmailBrand {
  name: string;
  logoUrl: string;
}

export interface WelcomeProps {
  username: string;
}

export interface VerificationEmailProps {
  code: string;
  username?: string;
}

export interface InviteEmailProps {
  teamName: string;
  invitedBy: string;
  username?: string;
  inviteLink: string;
}

export interface PurchaseClaimEmailProps {
  planName: string;
  /** "a new team of your own" or the destination team's name, already worded for display. */
  destinationSummary: string;
  claimLink: string;
}

export interface EmailProps {
  Welcome: WelcomeProps;
  VerificationCode: VerificationEmailProps;
  Invitation: InviteEmailProps;
  PurchaseClaim: PurchaseClaimEmailProps;
}
