import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to create mocks before hoisting
const mocks = vi.hoisted(() => ({
  groupFindUnique: vi.fn(),
  groupUpdate: vi.fn(),
  personUpdateMany: vi.fn(),
}));

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    group: {
      findUnique: mocks.groupFindUnique,
      update: mocks.groupUpdate,
    },
    person: {
      updateMany: mocks.personUpdateMany,
    },
  },
}));

// Mock auth
vi.mock('../../lib/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
    })
  ),
}));

// Import after mocking
import { DELETE } from '../../app/api/groups/[id]/route';

describe('Groups DELETE API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DELETE /api/groups/[id]', () => {
    it('should return 404 when group not found', async () => {
      mocks.groupFindUnique.mockResolvedValue(null);

      const request = new Request('http://localhost/api/groups/group-1');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      const response = await DELETE(request, context);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Group not found');
    });

    it('should soft delete group without deleting people (default behavior)', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Friends',
        people: [
          { personId: 'person-1' },
          { personId: 'person-2' },
        ],
      });

      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      const response = await DELETE(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Group deleted successfully');

      // Should soft delete the group
      expect(mocks.groupUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'group-1' },
          data: { deletedAt: expect.any(Date) },
        })
      );

      // Should NOT delete people
      expect(mocks.personUpdateMany).not.toHaveBeenCalled();
    });

    it('should soft delete group without deleting people when deletePeople=false', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Friends',
        people: [
          { personId: 'person-1' },
          { personId: 'person-2' },
        ],
      });

      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1?deletePeople=false');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      const response = await DELETE(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Group deleted successfully');

      // Should NOT delete people
      expect(mocks.personUpdateMany).not.toHaveBeenCalled();
    });

    it('should soft delete group AND people when deletePeople=true', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Friends',
        people: [
          { personId: 'person-1' },
          { personId: 'person-2' },
          { personId: 'person-3' },
        ],
      });

      mocks.personUpdateMany.mockResolvedValue({ count: 3 });
      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1?deletePeople=true');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      const response = await DELETE(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Group deleted successfully');

      // Should soft delete all people in the group
      expect(mocks.personUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['person-1', 'person-2', 'person-3'] },
          userId: 'user-123', // Safety check
        },
        data: {
          deletedAt: expect.any(Date),
        },
      });

      // Should soft delete the group
      expect(mocks.groupUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'group-1' },
          data: { deletedAt: expect.any(Date) },
        })
      );
    });

    it('should handle deletePeople=true with empty group', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Empty Group',
        people: [], // No people
      });

      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1?deletePeople=true');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      const response = await DELETE(request, context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Group deleted successfully');

      // Should NOT attempt to delete people (group is empty)
      expect(mocks.personUpdateMany).not.toHaveBeenCalled();

      // Should still delete the group
      expect(mocks.groupUpdate).toHaveBeenCalled();
    });

    it('should only delete people belonging to the current user', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Friends',
        people: [
          { personId: 'person-1' },
          { personId: 'person-2' },
        ],
      });

      mocks.personUpdateMany.mockResolvedValue({ count: 2 });
      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1?deletePeople=true');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      await DELETE(request, context);

      // Verify userId safety check is present
      expect(mocks.personUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123', // Must include user ID for safety
          }),
        })
      );
    });

    it('should verify group belongs to current user before deletion', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Friends',
        people: [],
      });

      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      await DELETE(request, context);

      // Verify the findUnique query includes userId check and soft-delete filter
      expect(mocks.groupFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'group-1',
            userId: 'user-123',
            deletedAt: null,
          },
        })
      );
    });

    it('should include people data when checking group existence', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Friends',
        people: [{ personId: 'person-1' }],
      });

      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      await DELETE(request, context);

      // Verify the query includes people
      expect(mocks.groupFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            people: {
              select: {
                personId: true,
              },
            },
          },
        })
      );
    });

    it('should handle single person in group when deletePeople=true', async () => {
      mocks.groupFindUnique.mockResolvedValue({
        id: 'group-1',
        userId: 'user-123',
        name: 'Solo',
        people: [{ personId: 'person-1' }],
      });

      mocks.personUpdateMany.mockResolvedValue({ count: 1 });
      mocks.groupUpdate.mockResolvedValue({
        id: 'group-1',
        deletedAt: new Date(),
      });

      const request = new Request('http://localhost/api/groups/group-1?deletePeople=true');
      const context = { params: Promise.resolve({ id: 'group-1' }) };
      const response = await DELETE(request, context);

      expect(response.status).toBe(200);

      // Should delete the single person
      expect(mocks.personUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['person-1'] },
          userId: 'user-123',
        },
        data: {
          deletedAt: expect.any(Date),
        },
      });
    });
  });
});
