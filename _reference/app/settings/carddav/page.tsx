import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CardDavSettings from './CardDavSettings';

export default async function CardDavSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch existing CardDAV connection if it exists
  // Exclude encrypted password — it must never reach client components
  const connection = await prisma.cardDavConnection.findUnique({
    where: {
      userId: session.user.id,
    },
    omit: {
      password: true,
    },
  });

  // Get pending imports count
  const pendingImportsCount = connection
    ? await prisma.cardDavPendingImport.count({
        where: {
          connectionId: connection.id,
        },
      })
    : 0;

  // Get synced contacts count (includes pending updates)
  const syncedContactsCount = connection
    ? await prisma.cardDavMapping.count({
        where: {
          connectionId: connection.id,
          syncStatus: { in: ['synced', 'pending'] },
        },
      })
    : 0;

  // Get pending uploads count
  const pendingUploadsCount = connection
    ? await prisma.cardDavMapping.count({
        where: {
          connectionId: connection.id,
          syncStatus: 'pending',
        },
      })
    : 0;

  return (
    <CardDavSettings
      connection={connection}
      pendingImportsCount={pendingImportsCount}
      syncedContactsCount={syncedContactsCount}
      pendingUploadsCount={pendingUploadsCount}
    />
  );
}
