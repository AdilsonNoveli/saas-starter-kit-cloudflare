/**
 * Normalize a string for search comparison.
 * Strips diacritical marks (accents) and lowercases.
 *
 * Note: ligatures (æ, œ) and digraph characters (ß) are not decomposed.
 * "strasse" will NOT match "Straße". This is an acceptable trade-off for
 * a pure-JS, dependency-free implementation.
 */
export function normalizeForSearch(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Check if `text` contains `query`, accent- and case-insensitive.
 */
export function matchesSearch(text: string, query: string): boolean {
  if (!text) return false;
  if (!query) return true;
  return normalizeForSearch(text).includes(normalizeForSearch(query));
}

/**
 * Filter a list of people by a search query across the specified fields.
 * Accent- and case-insensitive. Also matches queries that span multiple
 * fields (e.g. "John Doe" matching name="John" + surname="Doe").
 */
export function filterPeople<T>(
  people: T[],
  query: string,
  fields: (keyof T & string)[]
): T[] {
  if (!query) return people;
  const normalizedQuery = normalizeForSearch(query);
  return people.filter((person) => {
    // Check individual fields
    const matchesSingleField = fields.some((field) => {
      const value = person[field];
      if (typeof value !== 'string') return false;
      return normalizeForSearch(value).includes(normalizedQuery);
    });
    if (matchesSingleField) return true;

    // Check concatenated fields (for queries like "John Doe" spanning name + surname)
    const parts: string[] = [];
    for (const field of fields) {
      const value = person[field];
      if (typeof value === 'string' && value.length > 0) {
        parts.push(normalizeForSearch(value));
      }
    }
    return parts.join(' ').includes(normalizedQuery);
  });
}
