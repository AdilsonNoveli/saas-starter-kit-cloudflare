// Suggestions for the onboarding steps (SPEC-0010, AC-004): password and code
// sign-ins arrive with no name, so step 1 offers one from the e-mail local part
// and step 3 a Space name from it. Both stay editable; nothing here is saved.

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  return localPart
    .split(/[._+-]+/u)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function onboardingDefaults(input: { name: string | null; email: string }) {
  const name = input.name?.trim() || nameFromEmail(input.email);
  // The name itself, not a sentence around it: this value is the person's
  // own content, so it carries no text of the interface in any language.
  return { name, spaceName: name };
}
