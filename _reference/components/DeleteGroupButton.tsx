'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import ConfirmationModal from './ui/ConfirmationModal';
import { Button } from './ui/Button';

interface DeleteGroupButtonProps {
  groupId: string;
  groupName: string;
}

export default function DeleteGroupButton({
  groupId,
  groupName,
}: DeleteGroupButtonProps) {
  const t = useTranslations('groups.delete');
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePeople, setDeletePeople] = useState(false);
  const [confirmDeletion, setConfirmDeletion] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const url = new URL(`/api/groups/${groupId}`, window.location.origin);
      if (deletePeople) {
        url.searchParams.append('deletePeople', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/groups');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || t('errorGeneric'));
        setIsDeleting(false);
      }
    } catch {
      setError(t('errorConnection'));
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setShowConfirm(false);
    setDeletePeople(false);
    setConfirmDeletion(false);
    setError(null);
  };

  // Determine if the delete button should be disabled
  const isDeleteDisabled = deletePeople && !confirmDeletion;

  return (
    <>
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        {t('button')}
      </Button>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={handleModalClose}
        onConfirm={handleDelete}
        title={t('title')}
        confirmText={t('confirmButton')}
        isLoading={isDeleting}
        loadingText={t('deleting')}
        error={error}
        variant="danger"
        confirmDisabled={isDeleteDisabled}
      >
        <p className="text-muted mb-1">
          {t('confirmMessage')} <strong className="text-foreground">{groupName}</strong>?
        </p>
        <p className="text-muted mb-4">
          {t('onlyGroupDeleted')}
        </p>

        <div className="space-y-3 pt-4 border-t border-border">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deletePeople}
              onChange={(e) => {
                setDeletePeople(e.target.checked);
                if (!e.target.checked) {
                  setConfirmDeletion(false);
                }
              }}
              className="mt-1 w-4 h-4 text-red-600 border-border rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800"
            />
            <span className="text-sm text-muted">
              {t('deletePeopleToo')}
            </span>
          </label>

          {deletePeople && (
            <label className="flex items-start gap-3 cursor-pointer ml-7">
              <input
                type="checkbox"
                checked={confirmDeletion}
                onChange={(e) => setConfirmDeletion(e.target.checked)}
                className="mt-1 w-4 h-4 text-red-600 border-border rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800"
              />
              <span className="text-sm font-medium text-red-600 dark:text-red-500">
                {t('confirmDeletionPeople')}
              </span>
            </label>
          )}
        </div>
      </ConfirmationModal>
    </>
  );
}
