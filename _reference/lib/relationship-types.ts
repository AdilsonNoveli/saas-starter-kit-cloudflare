import { prisma as prismaClient } from './prisma';

// Type that accepts the extended prisma client
type PrismaClientLike = typeof prismaClient;

/**
 * Pre-loaded relationship types that are created for every new user.
 * Each user gets their own copy of these types that they can modify or delete.
 */
export const PRELOADED_RELATIONSHIP_TYPES = [
  { name: 'PARENT', label: 'Parent', color: '#F59E0B', inverseName: 'CHILD' },
  { name: 'CHILD', label: 'Child', color: '#F59E0B', inverseName: 'PARENT' },
  { name: 'SIBLING', label: 'Sibling', color: '#8B5CF6', symmetric: true },
  { name: 'SPOUSE', label: 'Spouse', color: '#EC4899', symmetric: true },
  { name: 'PARTNER', label: 'Partner', color: '#EC4899', symmetric: true },
  { name: 'FRIEND', label: 'Friend', color: '#3B82F6', symmetric: true },
  { name: 'COLLEAGUE', label: 'Colleague', color: '#10B981', symmetric: true },
  { name: 'ACQUAINTANCE', label: 'Acquaintance', color: '#14B8A6', symmetric: true },
  { name: 'RELATIVE', label: 'Relative', color: '#6366F1', symmetric: true },
  { name: 'OTHER', label: 'Other', color: '#6B7280', symmetric: true },
] as const;

/**
 * Creates the pre-loaded relationship types for a user.
 * This should be called when a new user is created.
 */
export async function createPreloadedRelationshipTypes(
  prisma: PrismaClientLike,
  userId: string
): Promise<void> {
  // Create a map to store created type IDs
  const typeIdMap = new Map<string, string>();

  // First pass: create all types without inverse relationships
  for (const typeConfig of PRELOADED_RELATIONSHIP_TYPES) {
    const createdType = await prisma.relationshipType.create({
      data: {
        userId,
        name: typeConfig.name,
        label: typeConfig.label,
        color: typeConfig.color,
      },
    });
    typeIdMap.set(typeConfig.name, createdType.id);
  }

  // Second pass: set up inverse relationships
  for (const typeConfig of PRELOADED_RELATIONSHIP_TYPES) {
    const typeId = typeIdMap.get(typeConfig.name);
    if (!typeId) continue;

    let inverseId: string | undefined;

    if ('symmetric' in typeConfig && typeConfig.symmetric) {
      // Symmetric types point to themselves
      inverseId = typeId;
    } else if ('inverseName' in typeConfig && typeConfig.inverseName) {
      // Asymmetric types point to their inverse
      inverseId = typeIdMap.get(typeConfig.inverseName);
    }

    if (inverseId) {
      await prisma.relationshipType.update({
        where: { id: typeId },
        data: { inverseId },
      });
    }
  }
}
