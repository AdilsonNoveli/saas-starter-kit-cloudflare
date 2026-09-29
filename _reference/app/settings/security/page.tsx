import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PasswordChangeForm from '@/components/PasswordChangeForm';
import { getTranslations } from 'next-intl/server';

export default async function SecuritySettingsPage() {
  const session = await auth();
  const t = await getTranslations('settings.security');

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="bg-surface shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">
        {t('passwordTitle')}
      </h2>
      <p className="text-muted mb-6">
        {t('passwordDescription')}
      </p>
      <PasswordChangeForm userId={session.user.id} />
    </div>
  );
}
