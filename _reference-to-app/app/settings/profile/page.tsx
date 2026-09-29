import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';
import { getTranslations } from 'next-intl/server';

export default async function ProfileSettingsPage() {
  const session = await auth();
  const t = await getTranslations('settings.profile');

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="bg-surface shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">
        {t('title')}
      </h2>
      <p className="text-muted mb-6">
        {t('pageDescription')}
      </p>
      <ProfileForm
        userId={session.user.id}
        currentName={session.user.name || ''}
        currentSurname={session.user.surname || ''}
        currentNickname={session.user.nickname || ''}
        currentEmail={session.user.email || ''}
        currentPhoto={session.user.photo || null}
      />
    </div>
  );
}
