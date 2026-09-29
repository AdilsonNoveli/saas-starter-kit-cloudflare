import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  personFindUnique: vi.fn(),
  personFindMany: vi.fn(),
  personCount: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    person: {
      findUnique: mocks.personFindUnique,
      findMany: mocks.personFindMany,
      count: mocks.personCount,
    },
  },
}));

import {
  personWhere,
  personDetailsInclude,
  personRelationshipsInclude,
  personGraphInclude,
  personUpdateInclude,
  findPersonById,
  findPersonWithDetails,
  findPersonWithRelationships,
  findPersonForGraph,
  findPeopleByUser,
  countPeopleByUser,
} from '../../lib/prisma-queries';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('personWhere', () => {
  it('returns an ownership-scoped where clause', () => {
    expect(personWhere('person-1', 'user-1')).toEqual({
      id: 'person-1',
      userId: 'user-1',
    });
  });

  it('does NOT include deletedAt (handled by extension)', () => {
    const where = personWhere('p', 'u');
    expect(where).not.toHaveProperty('deletedAt');
  });
});

// ---------------------------------------------------------------------------
// Include builder: personDetailsInclude
// ---------------------------------------------------------------------------

describe('personDetailsInclude', () => {
  const inc = personDetailsInclude();

  it('includes all multi-value contact fields as true', () => {
    expect(inc.phoneNumbers).toBe(true);
    expect(inc.emails).toBe(true);
    expect(inc.addresses).toBe(true);
    expect(inc.urls).toBe(true);
    expect(inc.imHandles).toBe(true);
    expect(inc.locations).toBe(true);
    expect(inc.customFields).toBe(true);
  });

  it('includes relationshipToUser as true (simple include)', () => {
    expect(inc.relationshipToUser).toBe(true);
  });

  it('includes groups with soft-delete filter on group', () => {
    expect(inc.groups).toEqual({
      where: { group: { deletedAt: null } },
      include: { group: true },
    });
  });

  it('includes importantDates with soft-delete filter and ordering', () => {
    expect(inc.importantDates).toEqual({
      where: { deletedAt: null },
      orderBy: { date: 'asc' },
    });
  });

  it('includes relationshipsFrom with soft-delete filter and relatedPerson', () => {
    expect(inc.relationshipsFrom).toEqual({
      where: { deletedAt: null },
      include: { relatedPerson: true },
    });
  });

  it('includes relationshipsTo with soft-delete filter, select id only', () => {
    expect(inc.relationshipsTo).toEqual({
      where: { deletedAt: null },
      select: { id: true },
    });
  });
});

// ---------------------------------------------------------------------------
// Include builder: personRelationshipsInclude
// ---------------------------------------------------------------------------

describe('personRelationshipsInclude', () => {
  const inc = personRelationshipsInclude();

  it('filters relationshipsFrom by deletedAt and relatedPerson.deletedAt', () => {
    expect(inc.relationshipsFrom.where).toEqual({
      deletedAt: null,
      relatedPerson: { deletedAt: null },
    });
  });

  it('includes relatedPerson with relationshipToUser and groups', () => {
    const rp = inc.relationshipsFrom.include.relatedPerson;
    expect(rp).toHaveProperty('include');

    const rpInc = rp.include;

    // relationshipToUser with inverse, both soft-delete filtered
    expect(rpInc.relationshipToUser).toEqual({
      include: { inverse: { where: { deletedAt: null } } },
      where: { deletedAt: null },
    });

    // groups with soft-delete filter on group
    expect(rpInc.groups).toEqual({
      where: { group: { deletedAt: null } },
      include: { group: true },
    });
  });

  it('includes relationshipType with inverse, both soft-delete filtered', () => {
    expect(inc.relationshipsFrom.include.relationshipType).toEqual({
      where: { deletedAt: null },
      include: { inverse: { where: { deletedAt: null } } },
    });
  });
});

// ---------------------------------------------------------------------------
// Include builder: personGraphInclude
// ---------------------------------------------------------------------------

describe('personGraphInclude', () => {
  const inc = personGraphInclude();

  it('includes top-level relationshipToUser with soft-delete filters', () => {
    expect(inc.relationshipToUser).toEqual({
      include: { inverse: { where: { deletedAt: null } } },
      where: { deletedAt: null },
    });
  });

  it('includes top-level groups with soft-delete filter on group', () => {
    expect(inc.groups).toEqual({
      where: { group: { deletedAt: null } },
      include: { group: true },
    });
  });

  it('filters top-level relationshipsFrom by deletedAt and relatedPerson', () => {
    expect(inc.relationshipsFrom.where).toEqual({
      deletedAt: null,
      relatedPerson: { deletedAt: null },
    });
  });

  it('includes relatedPerson with nested relationshipToUser, groups, and relationshipsFrom', () => {
    const rp = inc.relationshipsFrom.include.relatedPerson.include;

    // Nested relationshipToUser
    expect(rp.relationshipToUser).toEqual({
      include: { inverse: { where: { deletedAt: null } } },
      where: { deletedAt: null },
    });

    // Nested groups
    expect(rp.groups).toEqual({
      where: { group: { deletedAt: null } },
      include: { group: true },
    });

    // Nested relationshipsFrom (for inter-person edges)
    expect(rp.relationshipsFrom.where).toEqual({
      deletedAt: null,
      relatedPerson: { deletedAt: null },
    });
    expect(rp.relationshipsFrom.include.relationshipType).toEqual({
      where: { deletedAt: null },
      include: { inverse: { where: { deletedAt: null } } },
    });
  });

  it('includes top-level relationshipType with inverse', () => {
    expect(inc.relationshipsFrom.include.relationshipType).toEqual({
      where: { deletedAt: null },
      include: { inverse: { where: { deletedAt: null } } },
    });
  });
});

// ---------------------------------------------------------------------------
// Include builder: personUpdateInclude
// ---------------------------------------------------------------------------

describe('personUpdateInclude', () => {
  const inc = personUpdateInclude();

  it('includes groups with soft-delete filter', () => {
    expect(inc.groups).toEqual({
      where: { group: { deletedAt: null } },
      include: { group: true },
    });
  });

  it('includes all multi-value fields', () => {
    expect(inc.phoneNumbers).toBe(true);
    expect(inc.emails).toBe(true);
    expect(inc.addresses).toBe(true);
    expect(inc.urls).toBe(true);
    expect(inc.imHandles).toBe(true);
    expect(inc.locations).toBe(true);
    expect(inc.customFields).toBe(true);
  });

  it('includes importantDates with soft-delete filter and ordering', () => {
    expect(inc.importantDates).toEqual({
      where: { deletedAt: null },
      orderBy: { date: 'asc' },
    });
  });
});

// ---------------------------------------------------------------------------
// Finder functions
// ---------------------------------------------------------------------------

describe('findPersonById', () => {
  it('calls findUnique with personWhere', async () => {
    mocks.personFindUnique.mockResolvedValue({ id: 'p1' });
    const result = await findPersonById('p1', 'u1');
    expect(result).toEqual({ id: 'p1' });
    expect(mocks.personFindUnique).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
    });
  });
});

describe('findPersonWithDetails', () => {
  it('calls findUnique with personWhere and personDetailsInclude', async () => {
    mocks.personFindUnique.mockResolvedValue({ id: 'p1' });
    await findPersonWithDetails('p1', 'u1');
    const call = mocks.personFindUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'p1', userId: 'u1' });
    expect(call.include).toEqual(personDetailsInclude());
  });
});

describe('findPersonWithRelationships', () => {
  it('calls findUnique with merged details + relationships include', async () => {
    mocks.personFindUnique.mockResolvedValue({ id: 'p1' });
    await findPersonWithRelationships('p1', 'u1');
    const call = mocks.personFindUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'p1', userId: 'u1' });
    // Should have keys from both includes
    expect(call.include).toHaveProperty('phoneNumbers');
    expect(call.include).toHaveProperty('relationshipsTo');
    // relationshipsFrom should come from personRelationshipsInclude (deeper nesting)
    expect(call.include.relationshipsFrom.where).toEqual({
      deletedAt: null,
      relatedPerson: { deletedAt: null },
    });
  });
});

describe('findPersonForGraph', () => {
  it('calls findUnique with personWhere and personGraphInclude', async () => {
    mocks.personFindUnique.mockResolvedValue({ id: 'p1' });
    await findPersonForGraph('p1', 'u1');
    const call = mocks.personFindUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'p1', userId: 'u1' });
    expect(call.include).toEqual(personGraphInclude());
  });
});

describe('findPeopleByUser', () => {
  it('calls findMany with userId in where', async () => {
    mocks.personFindMany.mockResolvedValue([]);
    await findPeopleByUser('u1');
    expect(mocks.personFindMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      include: undefined,
      orderBy: undefined,
    });
  });

  it('merges extra where clauses', async () => {
    mocks.personFindMany.mockResolvedValue([]);
    await findPeopleByUser('u1', { where: { name: 'Alice' } });
    const call = mocks.personFindMany.mock.calls[0][0];
    expect(call.where).toEqual({ userId: 'u1', name: 'Alice' });
  });

  it('passes include and orderBy options', async () => {
    mocks.personFindMany.mockResolvedValue([]);
    const inc = personDetailsInclude();
    await findPeopleByUser('u1', {
      include: inc,
      orderBy: { createdAt: 'desc' },
    });
    const call = mocks.personFindMany.mock.calls[0][0];
    expect(call.include).toEqual(inc);
    expect(call.orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('countPeopleByUser', () => {
  it('calls count with userId', async () => {
    mocks.personCount.mockResolvedValue(42);
    const result = await countPeopleByUser('u1');
    expect(result).toBe(42);
    expect(mocks.personCount).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
  });
});
