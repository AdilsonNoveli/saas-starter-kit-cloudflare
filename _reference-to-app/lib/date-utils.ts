/**
 * Check if a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the number of days in a given month.
 * Month is 1-indexed (1=January, 12=December).
 * If year is undefined (year-unknown mode), February returns 29 to be permissive.
 */
export function getDaysInMonth(
  month: number,
  year: number | undefined
): number {
  if (month === 2) {
    if (year === undefined) return 29;
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/**
 * Clamp a day value to the valid range for the given month/year.
 */
export function clampDay(
  day: number,
  month: number,
  year: number | undefined
): number {
  const max = getDaysInMonth(month, year);
  return Math.min(day, max);
}
