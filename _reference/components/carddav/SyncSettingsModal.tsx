'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { CardDavConnectionResponse } from '@/lib/carddav/types';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CardDavConnectionResponse | null;
}

export default function SyncSettingsModal({
  isOpen,
  onClose,
  currentSettings,
}: SyncSettingsModalProps) {
  const t = useTranslations('settings.carddav');
  const router = useRouter();

  const [syncEnabled, setSyncEnabled] = useState(currentSettings?.syncEnabled ?? true);
  const [autoExportNew, setAutoExportNew] = useState(currentSettings?.autoExportNew ?? true);
  const [importMode, setImportMode] = useState(currentSettings?.importMode || 'manual');
  const [cardDavNameFormat, setCardDavNameFormat] = useState(
    currentSettings?.cardDavNameFormat || 'FULL'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');


  // Reset form when modal opens or settings change
  useEffect(() => {
    if (isOpen && currentSettings) {
      setSyncEnabled(currentSettings.syncEnabled);
      setAutoExportNew(currentSettings.autoExportNew);
      setImportMode(currentSettings.importMode);
      setCardDavNameFormat(currentSettings.cardDavNameFormat || 'FULL');
      setError('');
    }
  }, [isOpen, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/carddav/connection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncEnabled,
          autoExportNew,
          importMode,
          cardDavNameFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('saveFailed'));
      } else {
        router.refresh();
        onClose();
      }
    } catch (_err) {
      setError(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('settingsModalTitle')}
        size="md"
      >
        <div className="space-y-6">
          <p className="text-sm text-muted">
            {t('settingsModalDescription')}
          </p>

          {/* Sync Enabled */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="syncEnabled"
                checked={syncEnabled}
                onChange={(e) => setSyncEnabled(e.target.checked)}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="syncEnabled" className="text-sm font-medium text-foreground">
                {t('syncEnabledLabel')}
              </label>
              <p className="mt-1 text-xs text-muted">
                {t('syncEnabledHelp')}
              </p>
            </div>
          </div>

          {/* Auto Export New */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="autoExportNew"
                checked={autoExportNew}
                onChange={(e) => setAutoExportNew(e.target.checked)}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="autoExportNew" className="text-sm font-medium text-foreground">
                {t('autoExportNewLabel')}
              </label>
              <p className="mt-1 text-xs text-muted">
                {t('autoExportNewHelp')}
              </p>
            </div>
          </div>

          {/* Import Mode */}
          <div>
            <label htmlFor="importMode" className="block text-sm font-medium text-foreground mb-2">
              {t('importModeLabel')}
            </label>
            <select
              id="importMode"
              value={importMode}
              onChange={(e) => setImportMode(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="manual">{t('importModeManual')}</option>
              <option value="notify">{t('importModeNotify')}</option>
              <option value="auto">{t('importModeAuto')}</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              {t('importModeHelp')}
            </p>
          </div>

          {/* CardDAV Name Format */}
          <div>
            <span className="block text-sm font-medium text-foreground mb-2">
              {t('cardDavNameFormatLabel')}
            </span>
            <div className="space-y-2">
              {(['FULL', 'FIRST_LAST', 'NICKNAME_PREFERRED', 'SHORT'] as const).map((value) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    cardDavNameFormat === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="cardDavNameFormat"
                    value={value}
                    checked={cardDavNameFormat === value}
                    onChange={(e) => setCardDavNameFormat(e.target.value)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {t(`cardDavNameFormat_${value}`)}
                    </span>
                    <p className="text-xs text-muted mt-0.5">
                      {t(`cardDavNameFormatDesc_${value}`)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {t('cardDavNameFormatHelp')}
            </p>
            <div className="mt-2 px-3 py-2 rounded-md bg-surface-elevated text-xs text-muted">
              {t('cardDavNameFormatExample')}{' '}
              <span className="font-medium text-foreground">
                {t(`cardDavNameFormatExampleValue_${cardDavNameFormat}`)}
              </span>
            </div>
            {cardDavNameFormat !== 'FULL' && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {t('cardDavNameFormatWarning')}
                </p>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? t('saving') : t('saveSettings')}
            </Button>

            <Button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              variant="secondary"
            >
              {t('cancel')}
            </Button>
          </div>

        </div>
      </Modal>
  );
}
