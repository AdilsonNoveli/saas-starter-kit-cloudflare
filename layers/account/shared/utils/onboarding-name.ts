// Length bounds of a person's name and of a Space name in the onboarding forms
// (SPEC-0010, FR-004): the same 2 to 50 that `account.onboarding.complete`
// checks on the server, so the form never accepts what the server refuses.
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;
