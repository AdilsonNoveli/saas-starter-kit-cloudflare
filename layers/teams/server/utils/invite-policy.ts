// AC-007: an invite belongs to the person whose e-mail it names, whatever the
// case either side was typed in. Invites are stored lower-cased
// (invites.sendInvite), but a User.email may not be, so both sides are folded
// here rather than trusting either one.
export function inviteMatchesUser(
  invite: { email: string },
  user: { email: string },
): boolean {
  return invite.email.toLowerCase() === user.email.toLowerCase();
}
