import type { userPreferences } from "../database/schema";
import type { Preferences } from "../../shared/utils/preferences";
import { parsePreferences } from "../utils/preferences";
import type { Clock } from "./ports";

// SPEC-0010, FR-002, FR-007 to FR-009: reading and editing the person's own
// `UserPreference` row (DEC-018). The header switches send one field, the
// Account pages several; whatever comes is merged into the stored row and the
// whole result goes through `parsePreferences` before anything is written.

export type PreferencesRow = typeof userPreferences.$inferSelect;

export interface PreferencesRepo {
  find(userId: string): Promise<PreferencesRow | null>;
  upsert(row: PreferencesRow): Promise<PreferencesRow>;
}

export interface PreferencesDeps {
  repo: PreferencesRepo;
  now: Clock;
}

/** Raw text from the client: `parsePreferences` decides what is valid. */
export type PreferencesEdit = Partial<Record<keyof Preferences, string>>;

export function getPreferences(deps: Pick<PreferencesDeps, "repo">, userId: string) {
  return deps.repo.find(userId);
}

/**
 * The saved row, `{ error }` with the stable code of the first refused field
 * (nothing written), or `null` when the person has no row yet: the row is
 * born in the onboarding, never here.
 */
export async function updatePreferences(deps: PreferencesDeps, userId: string, edit: PreferencesEdit) {
  const current = await deps.repo.find(userId);
  if (!current) return null;

  const parsed = parsePreferences({
    locale: edit.locale ?? current.locale,
    timeZone: edit.timeZone ?? current.timeZone,
    theme: edit.theme ?? current.theme,
    dateFormat: edit.dateFormat ?? current.dateFormat,
    nameOrder: edit.nameOrder ?? current.nameOrder,
  });
  if (!parsed.ok) return { error: parsed.error };

  // `onboardedAt` and `createdAt` come from the stored row, untouched.
  return deps.repo.upsert({ ...current, ...parsed.value, userId, updatedAt: deps.now() });
}
