import { template as WelcomeEmail } from "./emails/Welcome";
import { template as VerificationCodeEmail } from "./emails/VerificationCode";
import { template as InvitationEmail } from "./emails/Invitation";

export namespace Emails {
  export const Welcome = WelcomeEmail;
  export const VerificationCode = VerificationCodeEmail;
  export const Invitation = InvitationEmail;
}
