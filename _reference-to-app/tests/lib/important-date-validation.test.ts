import { describe, it, expect } from 'vitest';
import { createImportantDateSchema } from '../../lib/validations';

describe('createImportantDateSchema with type field', () => {
  it('should accept a predefined type with empty title', () => {
    const result = createImportantDateSchema.safeParse({
      type: 'birthday',
      title: '',
      date: '2025-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('should accept null type with non-empty title', () => {
    const result = createImportantDateSchema.safeParse({
      type: null,
      title: 'First met',
      date: '2025-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('should reject null type with empty title', () => {
    const result = createImportantDateSchema.safeParse({
      type: null,
      title: '',
      date: '2025-06-15',
    });
    expect(result.success).toBe(false);
  });

  it('should reject unknown type values', () => {
    const result = createImportantDateSchema.safeParse({
      type: 'unknown-type',
      title: '',
      date: '2025-06-15',
    });
    expect(result.success).toBe(false);
  });

  it('should accept omitted type (backwards compatibility)', () => {
    const result = createImportantDateSchema.safeParse({
      title: 'Birthday',
      date: '2025-06-15',
    });
    expect(result.success).toBe(true);
  });
});
