// SPEC-0010, FR-012, AC-025 (DEC-018): the rows of the person in the three
// tables of this layer, removed by `account.deleteAccount` after the identity
// and before the `User` row. Each table points only at `User`, never at one
// another, so their order among themselves is free; the cascade on `userId`
// would also remove them with `User`, but the erasure stays explicit, like
// every other step of deleteAccount.

export interface AccountDeletionRepo {
  deletePreferences(userId: string): Promise<void>;
  deleteSessions(userId: string): Promise<void>;
  deleteEmailChangeRequest(userId: string): Promise<void>;
}

export async function deleteAccountRows(deps: { repo: AccountDeletionRepo }, userId: string) {
  await deps.repo.deleteEmailChangeRequest(userId);
  await deps.repo.deleteSessions(userId);
  await deps.repo.deletePreferences(userId);
}
