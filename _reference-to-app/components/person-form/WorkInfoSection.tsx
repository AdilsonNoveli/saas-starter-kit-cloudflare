'use client';

import { useTranslations } from 'next-intl';
import type { FormData } from '../../hooks/usePersonForm';

interface WorkInfoSectionProps {
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export default function WorkInfoSection({
  formData,
  onFormDataChange,
}: WorkInfoSectionProps) {
  const t = useTranslations('people.form');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="organization"
            className="block text-sm font-medium text-muted mb-1"
          >
            {t('companyLabel')}
          </label>
          <input
            type="text"
            id="organization"
            value={formData.organization}
            onChange={(e) => onFormDataChange({ organization: e.target.value })}
            placeholder={t('companyPlaceholder')}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="jobTitle"
            className="block text-sm font-medium text-muted mb-1"
          >
            {t('jobTitleLabel')}
          </label>
          <input
            type="text"
            id="jobTitle"
            value={formData.jobTitle}
            onChange={(e) => onFormDataChange({ jobTitle: e.target.value })}
            placeholder={t('jobTitlePlaceholder')}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
