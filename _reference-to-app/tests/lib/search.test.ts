import { describe, it, expect } from 'vitest';
import { normalizeForSearch, matchesSearch, filterPeople } from '@/lib/search';

describe('search', () => {
  describe('normalizeForSearch', () => {
    it('should lowercase text', () => {
      expect(normalizeForSearch('María')).not.toContain('M');
    });

    it('should strip accents from common characters', () => {
      expect(normalizeForSearch('María')).toBe('maria');
      expect(normalizeForSearch('García')).toBe('garcia');
      expect(normalizeForSearch('José')).toBe('jose');
      expect(normalizeForSearch('François')).toBe('francois');
      expect(normalizeForSearch('Müller')).toBe('muller');
      expect(normalizeForSearch('Ñoño')).toBe('nono');
    });

    it('should handle text without accents', () => {
      expect(normalizeForSearch('John Smith')).toBe('john smith');
    });

    it('should handle empty string', () => {
      expect(normalizeForSearch('')).toBe('');
    });

    it('should handle Japanese/CJK characters (no transformation)', () => {
      expect(normalizeForSearch('田中')).toBe('田中');
    });
  });

  describe('matchesSearch', () => {
    it('should match accent-insensitive', () => {
      expect(matchesSearch('María', 'maria')).toBe(true);
      expect(matchesSearch('Maria', 'maría')).toBe(true);
    });

    it('should match case-insensitive', () => {
      expect(matchesSearch('John', 'john')).toBe(true);
    });

    it('should match partial strings', () => {
      expect(matchesSearch('María García', 'gar')).toBe(true);
    });

    it('should return false for non-matching strings', () => {
      expect(matchesSearch('John', 'maria')).toBe(false);
    });

    it('should handle null/undefined text gracefully', () => {
      expect(matchesSearch(null as unknown as string, 'test')).toBe(false);
      expect(matchesSearch(undefined as unknown as string, 'test')).toBe(false);
    });

    it('should return true for empty query', () => {
      expect(matchesSearch('anything', '')).toBe(true);
    });

    it('should return false for empty text with non-empty query', () => {
      expect(matchesSearch('', 'query')).toBe(false);
    });
  });

  describe('filterPeople', () => {
    const people = [
      { id: '1', name: 'María', surname: 'García', nickname: null },
      { id: '2', name: 'John', surname: 'Smith', nickname: 'Johnny' },
      { id: '3', name: 'François', surname: null, nickname: 'Frank' },
    ];

    it('should find people by accented name using unaccented query', () => {
      const result = filterPeople(people, 'maria', ['name', 'surname', 'nickname']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should find people by unaccented name using accented query', () => {
      const result = filterPeople(people, 'garcía', ['name', 'surname', 'nickname']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should search across multiple fields', () => {
      const result = filterPeople(people, 'frank', ['name', 'surname', 'nickname']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should return all people for empty query', () => {
      const result = filterPeople(people, '', ['name']);
      expect(result).toHaveLength(3);
    });

    it('should match query spanning multiple fields (e.g. "name surname")', () => {
      const result = filterPeople(people, 'John Smith', ['name', 'surname', 'nickname']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should match partial multi-word query spanning fields', () => {
      const result = filterPeople(people, 'John S', ['name', 'surname', 'nickname']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should match multi-word query with accents spanning fields', () => {
      const result = filterPeople(people, 'María Gar', ['name', 'surname', 'nickname']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should match query with trailing space', () => {
      const result = filterPeople(people, 'John ', ['name', 'surname', 'nickname']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });
});
