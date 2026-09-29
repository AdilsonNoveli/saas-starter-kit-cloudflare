import { describe, it, expect } from 'vitest';
import { getDaysInMonth, isLeapYear, clampDay } from '@/lib/date-utils';

describe('isLeapYear', () => {
  it('returns true for years divisible by 4', () => {
    expect(isLeapYear(2024)).toBe(true);
  });

  it('returns false for century years not divisible by 400', () => {
    expect(isLeapYear(1900)).toBe(false);
  });

  it('returns true for century years divisible by 400', () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it('returns false for non-leap years', () => {
    expect(isLeapYear(2023)).toBe(false);
  });
});

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(1, 2024)).toBe(31);
  });

  it('returns 28 for February in non-leap year', () => {
    expect(getDaysInMonth(2, 2023)).toBe(28);
  });

  it('returns 29 for February in leap year', () => {
    expect(getDaysInMonth(2, 2024)).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(getDaysInMonth(4, 2024)).toBe(30);
  });

  it('returns 29 for February when year is undefined (no year mode)', () => {
    expect(getDaysInMonth(2, undefined)).toBe(29);
  });
});

describe('clampDay', () => {
  it('returns day unchanged when within range', () => {
    expect(clampDay(15, 1, 2024)).toBe(15);
  });

  it('clamps day to max for month', () => {
    expect(clampDay(31, 2, 2023)).toBe(28);
  });

  it('clamps to 29 for Feb in leap year', () => {
    expect(clampDay(31, 2, 2024)).toBe(29);
  });
});
