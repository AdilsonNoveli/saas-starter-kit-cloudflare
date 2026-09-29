import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTranslationsForLocale, getEmailTranslations, interpolate } from '@/lib/i18n-utils';
import { getUserLocale } from '@/lib/locale';

// Mock locale utilities
vi.mock('@/lib/locale', () => ({
  getUserLocale: vi.fn(),
}));

describe('i18n Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTranslationsForLocale', () => {
    it('should return English translations', async () => {
      const t = await getTranslationsForLocale('en', 'common');

      expect(t('save')).toBe('Save');
      expect(t('cancel')).toBe('Cancel');
      expect(t('delete')).toBe('Delete');
    });

    it('should return Spanish translations', async () => {
      const t = await getTranslationsForLocale('es-ES', 'common');

      expect(t('save')).toBe('Guardar');
      expect(t('cancel')).toBe('Cancelar');
      expect(t('delete')).toBe('Eliminar');
    });

    it('should interpolate values in translations', async () => {
      const t = await getTranslationsForLocale('en', 'people');

      const result = t('daysAgo', { days: 5 });

      expect(result).toBe('5 days ago');
    });

    it('should handle nested keys', async () => {
      const t = await getTranslationsForLocale('en', 'settings');

      expect(t('appearance.title')).toBe('Appearance');
      expect(t('profile.title')).toBe('Profile');
    });

    it('should return key if translation not found', async () => {
      const t = await getTranslationsForLocale('en', 'common');

      expect(t('nonexistentKey')).toBe('nonexistentKey');
    });

    it('should work without namespace', async () => {
      const t = await getTranslationsForLocale('en');

      expect(t('common.save')).toBe('Save');
    });
  });

  describe('getEmailTranslations', () => {
    it('should get translations for user locale', async () => {
      vi.mocked(getUserLocale).mockResolvedValue('es-ES');

      const t = await getEmailTranslations('user1', 'emails');

      expect(getUserLocale).toHaveBeenCalledWith('user1');
      expect(t('verification.subject')).toContain('Verifica');
    });

    it('should default to English if no userId', async () => {
      const t = await getEmailTranslations(undefined, 'emails');

      expect(t('verification.subject')).toContain('Verify');
    });

    it('should use emails namespace by default', async () => {
      vi.mocked(getUserLocale).mockResolvedValue('en');

      const t = await getEmailTranslations('user1');

      expect(t('verification.subject')).toContain('Verify');
    });
  });

  describe('interpolate', () => {
    it('should replace single placeholder', () => {
      const result = interpolate('Hello {name}', { name: 'John' });

      expect(result).toBe('Hello John');
    });

    it('should replace multiple placeholders', () => {
      const result = interpolate('Hello {firstName} {lastName}', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toBe('Hello John Doe');
    });

    it('should handle numeric values', () => {
      const result = interpolate('You have {count} messages', { count: 5 });

      expect(result).toBe('You have 5 messages');
    });

    it('should leave unknown placeholders unchanged', () => {
      const result = interpolate('Hello {name}, you have {count} messages', {
        name: 'John',
      });

      expect(result).toBe('Hello John, you have {count} messages');
    });

    it('should handle templates with no placeholders', () => {
      const result = interpolate('Hello world', { name: 'John' });

      expect(result).toBe('Hello world');
    });
  });
});
