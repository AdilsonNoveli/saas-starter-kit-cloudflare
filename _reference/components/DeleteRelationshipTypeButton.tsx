'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from './ui/Button';

interface DeleteRelationshipTypeButtonProps {
  relationshipTypeId: string;
  relationshipTypeName: string;
  usageCount: number;
}

export default function DeleteRelationshipTypeButton({
  relationshipTypeId,
  relationshipTypeName,
  usageCount,
}: DeleteRelationshipTypeButtonProps) {
  const t = useTranslations('relationshipTypes.delete');
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/relationship-types/${relationshipTypeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('errorDelete'));
        setIsDeleting(false);
        return;
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch {
      setError(t('errorDelete'));
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    const usedText = usageCount > 0
      ? ` (${usageCount === 1 ? t('usedCount', { count: usageCount }) : t('usedCount_plural', { count: usageCount })})`
      : '';

    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">
          {t('confirmPrompt')} <span className="font-medium">{relationshipTypeName}</span>
          {usedText}?
        </span>
        <Button
          size="sm"
          variant="danger"
          onClick={handleDelete}
          disabled={isDeleting}
          title={t('confirmTitle')}
        >
          {isDeleting ? t('deleting') : t('confirmButton')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setShowConfirm(false);
            setError('');
          }}
          disabled={isDeleting}
          title={t('cancelTitle')}
        >
          {t('cancel')}
        </Button>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
      title={t('button')}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  );
}
