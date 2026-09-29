export const PREDEFINED_DATE_TYPES = ['birthday', 'anniversary', 'nameday', 'memorial'] as const;

export type PredefinedDateType = (typeof PREDEFINED_DATE_TYPES)[number];

export function isPredefinedType(type: string): type is PredefinedDateType {
  return (PREDEFINED_DATE_TYPES as readonly string[]).includes(type);
}

export const VCARD_TYPE_MAP: Partial<Record<PredefinedDateType, string>> = {
  birthday: 'BDAY',
  anniversary: 'ANNIVERSARY',
};

/**
 * Resolve the display title for an important date.
 * Uses i18n for predefined types, falls back to the title field for custom types.
 *
 * @param date - Object with optional `type` and `title` fields
 * @param t - Translation function scoped to `people.form.importantDates`
 */
export function getDateDisplayTitle(
  date: { type?: string | null; title: string },
  t: (key: string) => string
): string {
  if (date.type && isPredefinedType(date.type)) {
    return t(`types.${date.type}`);
  }
  return date.title;
}
