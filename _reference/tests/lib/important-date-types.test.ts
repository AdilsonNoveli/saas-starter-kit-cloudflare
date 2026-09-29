import { describe, it, expect, vi } from 'vitest';
import {
  PREDEFINED_DATE_TYPES,
  isPredefinedType,
  VCARD_TYPE_MAP,
  getDateDisplayTitle,
} from '../../lib/important-date-types';

describe('important-date-types', () => {
  describe('PREDEFINED_DATE_TYPES', () => {
    it('should contain exactly the four predefined types', () => {
      expect(PREDEFINED_DATE_TYPES).toEqual(['birthday', 'anniversary', 'nameday', 'memorial']);
    });
  });

  describe('isPredefinedType', () => {
    it('should return true for predefined types', () => {
      expect(isPredefinedType('birthday')).toBe(true);
      expect(isPredefinedType('anniversary')).toBe(true);
      expect(isPredefinedType('nameday')).toBe(true);
      expect(isPredefinedType('memorial')).toBe(true);
    });

    it('should return false for non-predefined types', () => {
      expect(isPredefinedType('other')).toBe(false);
      expect(isPredefinedType('custom')).toBe(false);
      expect(isPredefinedType('')).toBe(false);
    });
  });

  describe('VCARD_TYPE_MAP', () => {
    it('should map birthday to BDAY and anniversary to ANNIVERSARY', () => {
      expect(VCARD_TYPE_MAP).toEqual({
        birthday: 'BDAY',
        anniversary: 'ANNIVERSARY',
      });
    });
  });

  describe('getDateDisplayTitle', () => {
    it('should return translated text for predefined types', () => {
      const t = vi.fn((key: string) => `translated_${key}`);
      const date = { type: 'birthday', title: '' };
      expect(getDateDisplayTitle(date, t)).toBe('translated_types.birthday');
      expect(t).toHaveBeenCalledWith('types.birthday');
    });

    it('should return title for custom types', () => {
      const t = vi.fn();
      const date = { type: null, title: 'First met' };
      expect(getDateDisplayTitle(date, t)).toBe('First met');
      expect(t).not.toHaveBeenCalled();
    });

    it('should return title when type is undefined', () => {
      const t = vi.fn();
      const date = { title: 'Graduation' };
      expect(getDateDisplayTitle(date, t)).toBe('Graduation');
    });
  });
});
