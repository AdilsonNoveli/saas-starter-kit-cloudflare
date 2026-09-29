import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomBytes } from 'crypto';

// Mock dependencies
const mocks = vi.hoisted(() => ({
  unsubscribeTokenFindFirst: vi.fn(),
  unsubscribeTokenCreate: vi.fn(),
  unsubscribeTokenFindUnique: vi.fn(),
  unsubscribeTokenUpdate: vi.fn(),
  importantDateUpdate: vi.fn(),
  personUpdate: vi.fn(),
  importantDateFindUnique: vi.fn(),
  importantDateFindFirst: vi.fn(),
  personFindUnique: vi.fn(),
  personFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  formatFullName: vi.fn(),
}));

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    unsubscribeToken: {
      findFirst: mocks.unsubscribeTokenFindFirst,
      create: mocks.unsubscribeTokenCreate,
      findUnique: mocks.unsubscribeTokenFindUnique,
      update: mocks.unsubscribeTokenUpdate,
    },
    importantDate: {
      update: mocks.importantDateUpdate,
      findUnique: mocks.importantDateFindUnique,
      findFirst: mocks.importantDateFindFirst,
    },
    person: {
      update: mocks.personUpdate,
      findUnique: mocks.personFindUnique,
      findFirst: mocks.personFindFirst,
    },
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}));

// Mock nameUtils
vi.mock('../../lib/nameUtils', () => ({
  formatFullName: mocks.formatFullName,
}));

// Import after mocking
import {
  createUnsubscribeToken,
  consumeUnsubscribeToken,
  getUnsubscribeDetails,
} from '../../lib/unsubscribe-tokens';

describe('unsubscribe-tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue({ nameOrder: 'WESTERN' });
  });

  describe('createUnsubscribeToken', () => {
    it('should generate a 64-character hex token', async () => {
      mocks.unsubscribeTokenFindFirst.mockResolvedValue(null);
      mocks.unsubscribeTokenCreate.mockResolvedValue({
        id: 'token-id',
        token: 'a'.repeat(64),
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
        expiresAt: new Date(),
        createdAt: new Date(),
        used: false,
        usedAt: null,
      });

      const token = await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
      });

      expect(token).toHaveLength(64);
      expect(mocks.unsubscribeTokenCreate).toHaveBeenCalled();
    });

    it('should create token with correct userId, reminderType, and entityId', async () => {
      mocks.unsubscribeTokenFindFirst.mockResolvedValue(null);
      mocks.unsubscribeTokenCreate.mockImplementation((data) =>
        Promise.resolve({
          id: 'token-id',
          token: randomBytes(32).toString('hex'),
          ...data.data,
          createdAt: new Date(),
          used: false,
          usedAt: null,
        })
      );

      await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'CONTACT',
        entityId: 'person-1',
      });

      expect(mocks.unsubscribeTokenCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          reminderType: 'CONTACT',
          entityId: 'person-1',
        }),
      });
    });

    it('should set expiry 90 days in the future', async () => {
      mocks.unsubscribeTokenFindFirst.mockResolvedValue(null);

      const now = new Date();
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 90);

      mocks.unsubscribeTokenCreate.mockImplementation((data) =>
        Promise.resolve({
          id: 'token-id',
          token: randomBytes(32).toString('hex'),
          ...data.data,
          createdAt: now,
          used: false,
          usedAt: null,
        })
      );

      await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
      });

      const call = mocks.unsubscribeTokenCreate.mock.calls[0][0];
      const expiresAt = call.data.expiresAt;
      const daysDiff = Math.round(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBe(90);
    });

    it('should reuse existing valid token for same reminder', async () => {
      const existingToken = {
        id: 'existing-token-id',
        token: 'existing-token-hex',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
        createdAt: new Date(),
        usedAt: null,
      };

      mocks.unsubscribeTokenFindFirst.mockResolvedValue(existingToken);

      const token = await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
      });

      expect(token).toBe('existing-token-hex');
      expect(mocks.unsubscribeTokenCreate).not.toHaveBeenCalled();
    });

    it('should create new token if existing one is expired', async () => {
      mocks.unsubscribeTokenFindFirst.mockResolvedValue(null); // Expired tokens won't be found by the query
      mocks.unsubscribeTokenCreate.mockResolvedValue({
        id: 'new-token-id',
        token: 'new-token-hex',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        createdAt: new Date(),
        used: false,
        usedAt: null,
      });

      const token = await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
      });

      expect(token).toBe('new-token-hex');
      expect(mocks.unsubscribeTokenCreate).toHaveBeenCalled();
    });

    it('should create new token if existing one is used', async () => {
      mocks.unsubscribeTokenFindFirst.mockResolvedValue(null); // Used tokens won't be found by the query
      mocks.unsubscribeTokenCreate.mockResolvedValue({
        id: 'new-token-id',
        token: 'new-token-hex',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        createdAt: new Date(),
        used: false,
        usedAt: null,
      });

      const token = await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'entity-1',
      });

      expect(token).toBe('new-token-hex');
      expect(mocks.unsubscribeTokenCreate).toHaveBeenCalled();
    });

    it('should work for IMPORTANT_DATE reminder type', async () => {
      mocks.unsubscribeTokenFindFirst.mockResolvedValue(null);
      mocks.unsubscribeTokenCreate.mockResolvedValue({
        id: 'token-id',
        token: 'token-hex',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'date-1',
        expiresAt: new Date(),
        createdAt: new Date(),
        used: false,
        usedAt: null,
      });

      const token = await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE',
        entityId: 'date-1',
      });

      expect(token).toBeTruthy();
      expect(mocks.unsubscribeTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reminderType: 'IMPORTANT_DATE',
          }),
        })
      );
    });

    it('should work for CONTACT reminder type', async () => {
      mocks.unsubscribeTokenFindFirst.mockResolvedValue(null);
      mocks.unsubscribeTokenCreate.mockResolvedValue({
        id: 'token-id',
        token: 'token-hex',
        userId: 'user-1',
        reminderType: 'CONTACT',
        entityId: 'person-1',
        expiresAt: new Date(),
        createdAt: new Date(),
        used: false,
        usedAt: null,
      });

      const token = await createUnsubscribeToken({
        userId: 'user-1',
        reminderType: 'CONTACT',
        entityId: 'person-1',
      });

      expect(token).toBeTruthy();
      expect(mocks.unsubscribeTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reminderType: 'CONTACT',
          }),
        })
      );
    });
  });

  describe('consumeUnsubscribeToken', () => {
    it('should successfully consume valid token', async () => {
      const validToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE' as const,
        entityId: 'date-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
        createdAt: new Date(),
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          language: 'en',
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(validToken);
      mocks.unsubscribeTokenUpdate.mockResolvedValue({ ...validToken, used: true });
      mocks.importantDateUpdate.mockResolvedValue({});

      const result = await consumeUnsubscribeToken('valid-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe('user-1');
        expect(result.reminderType).toBe('IMPORTANT_DATE');
      }
    });

    it('should disable important date reminder when consumed', async () => {
      const validToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE' as const,
        entityId: 'date-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          language: 'en',
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(validToken);
      mocks.unsubscribeTokenUpdate.mockResolvedValue({ ...validToken, used: true });
      mocks.importantDateUpdate.mockResolvedValue({});

      await consumeUnsubscribeToken('valid-token');

      expect(mocks.importantDateUpdate).toHaveBeenCalledWith({
        where: { id: 'date-1' },
        data: { reminderEnabled: false },
      });
    });

    it('should disable contact reminder when consumed', async () => {
      const validToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-1',
        reminderType: 'CONTACT' as const,
        entityId: 'person-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          language: 'en',
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(validToken);
      mocks.unsubscribeTokenUpdate.mockResolvedValue({ ...validToken, used: true });
      mocks.personUpdate.mockResolvedValue({});

      await consumeUnsubscribeToken('valid-token');

      expect(mocks.personUpdate).toHaveBeenCalledWith({
        where: { id: 'person-1' },
        data: { contactReminderEnabled: false },
      });
    });

    it('should mark token as used with usedAt timestamp', async () => {
      const validToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE' as const,
        entityId: 'date-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          language: 'en',
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(validToken);
      mocks.unsubscribeTokenUpdate.mockResolvedValue({ ...validToken, used: true });
      mocks.importantDateUpdate.mockResolvedValue({});

      await consumeUnsubscribeToken('valid-token');

      expect(mocks.unsubscribeTokenUpdate).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: {
          used: true,
          usedAt: expect.any(Date),
        },
      });
    });

    it('should return error for invalid token', async () => {
      mocks.unsubscribeTokenFindUnique.mockResolvedValue(null);

      const result = await consumeUnsubscribeToken('invalid-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_TOKEN');
      }
    });

    it('should return error for already used token', async () => {
      const usedToken = {
        id: 'token-id',
        token: 'used-token',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE' as const,
        entityId: 'date-1',
        used: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: new Date(),
        user: {
          id: 'user-1',
          email: 'user@example.com',
          language: 'en',
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(usedToken);

      const result = await consumeUnsubscribeToken('used-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('ALREADY_USED');
      }
    });

    it('should return error for expired token', async () => {
      const expiredToken = {
        id: 'token-id',
        token: 'expired-token',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE' as const,
        entityId: 'date-1',
        used: false,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // Expired 1 hour ago
        createdAt: new Date(),
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          language: 'en',
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(expiredToken);

      const result = await consumeUnsubscribeToken('expired-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('EXPIRED');
      }
    });

    it('should include user information in success response', async () => {
      const validToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE' as const,
        entityId: 'date-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          language: 'es-ES',
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(validToken);
      mocks.unsubscribeTokenUpdate.mockResolvedValue({ ...validToken, used: true });
      mocks.importantDateUpdate.mockResolvedValue({});

      const result = await consumeUnsubscribeToken('valid-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.email).toBe('test@example.com');
        expect(result.user.language).toBe('es-ES');
      }
    });
  });

  describe('getUnsubscribeDetails', () => {
    it('should return entity name for important date', async () => {
      const token = {
        id: 'token-id',
        token: 'test-token',
        userId: 'user-1',
        reminderType: 'IMPORTANT_DATE' as const,
        entityId: 'date-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null,
      };

      const importantDate = {
        id: 'date-1',
        title: 'Birthday',
        person: {
          name: 'John',
          surname: 'Doe',
          middleName: null,
          secondLastName: null,
          nickname: null,
        },
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(token);
      mocks.importantDateFindFirst.mockResolvedValue(importantDate);
      mocks.formatFullName.mockReturnValue('John Doe');

      const result = await getUnsubscribeDetails('test-token');

      expect(result).not.toBeNull();
      expect(result?.entityName).toBe("John Doe's Birthday");
    });

    it('should return entity name for contact reminder', async () => {
      const token = {
        id: 'token-id',
        token: 'test-token',
        userId: 'user-1',
        reminderType: 'CONTACT' as const,
        entityId: 'person-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null,
      };

      const person = {
        id: 'person-1',
        name: 'Jane',
        surname: 'Smith',
        middleName: null,
        secondLastName: null,
        nickname: null,
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(token);
      mocks.personFindFirst.mockResolvedValue(person);
      mocks.formatFullName.mockReturnValue('Jane Smith');

      const result = await getUnsubscribeDetails('test-token');

      expect(result).not.toBeNull();
      expect(result?.entityName).toBe('Jane Smith');
    });

    it('should return null for invalid token', async () => {
      mocks.unsubscribeTokenFindUnique.mockResolvedValue(null);

      const result = await getUnsubscribeDetails('invalid-token');

      expect(result).toBeNull();
    });

    it('should indicate if token is used', async () => {
      const usedToken = {
        id: 'token-id',
        token: 'test-token',
        userId: 'user-1',
        reminderType: 'CONTACT' as const,
        entityId: 'person-1',
        used: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: new Date(),
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(usedToken);
      mocks.personFindFirst.mockResolvedValue({
        name: 'Test',
        surname: 'User',
        middleName: null,
        secondLastName: null,
        nickname: null,
      });
      mocks.formatFullName.mockReturnValue('Test User');

      const result = await getUnsubscribeDetails('test-token');

      expect(result).not.toBeNull();
      expect(result?.used).toBe(true);
    });

    it('should indicate if token is expired', async () => {
      const expiredToken = {
        id: 'token-id',
        token: 'test-token',
        userId: 'user-1',
        reminderType: 'CONTACT' as const,
        entityId: 'person-1',
        used: false,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // Expired 1 hour ago
        createdAt: new Date(),
        usedAt: null,
      };

      mocks.unsubscribeTokenFindUnique.mockResolvedValue(expiredToken);
      mocks.personFindFirst.mockResolvedValue({
        name: 'Test',
        surname: 'User',
        middleName: null,
        secondLastName: null,
        nickname: null,
      });
      mocks.formatFullName.mockReturnValue('Test User');

      const result = await getUnsubscribeDetails('test-token');

      expect(result).not.toBeNull();
      expect(result?.expired).toBe(true);
    });
  });
});
