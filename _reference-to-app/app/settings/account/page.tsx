import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AccountManagement from '@/components/AccountManagement';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';

export default async function AccountSettingsPage() {
  const session = await auth();
  const t = await getTranslations('settings.account');

  if (!session?.user) {
    redirect('/login');
  }

  const [groups, peopleCount] = await Promise.all([
    prisma.group.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    prisma.person.count({
      where: { userId: session.user.id, deletedAt: null },
    }),
  ]);

  return (
    <div className="bg-surface shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">
        {t('title')}
      </h2>
      <p className="text-muted mb-6">
        {t('pageDescription')}
      </p>
      <AccountManagement groups={groups} peopleCount={peopleCount} />
    </div>
  );
}
