import { template as WelcomeEmail } from "./templates/Welcome";
import { template as VerificationCodeEmail } from "./templates/VerificationCode";
import { template as InvitationEmail } from "./templates/Invitation";

export namespace Emails {
  export const Welcome = WelcomeEmail;
  export const VerificationCode = VerificationCodeEmail;
  export const Invitation = InvitationEmail;
}
