'use client';

import { useTranslations } from 'next-intl';
import GroupsSelector from '../GroupsSelector';
import type { FormData } from '../../hooks/usePersonForm';

interface AvailablePerson {
  id: string;
  name: string;
  surname: string | null;
  groups: Array<{ groupId: string }>;
}

interface Group {
  id: string;
  name: string;
  color: string | null;
}

interface GroupsSectionProps {
  mode: 'create' | 'edit';
  groups: Group[];
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
  knownThroughId: string;
  selectedBasePerson: AvailablePerson | null;
  inheritGroups: boolean;
  onInheritGroupsChange: (checked: boolean) => void;
}

export default function GroupsSection({
  mode,
  groups,
  formData,
  onFormDataChange,
  knownThroughId,
  selectedBasePerson,
  inheritGroups,
  onInheritGroupsChange,
}: GroupsSectionProps) {
  const t = useTranslations('people.form');

  return (
    <>
      {mode === 'create' &&
        knownThroughId !== 'user' &&
        selectedBasePerson &&
        selectedBasePerson.groups.length > 0 && (
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="inheritGroups"
              checked={inheritGroups}
              onChange={(e) => onInheritGroupsChange(e.target.checked)}
              className="w-4 h-4 text-primary bg-surface-elevated border-border rounded focus:ring-primary"
            />
            <label htmlFor="inheritGroups" className="ml-2 text-sm text-muted">
              {t('inheritGroups', {
                name: `${selectedBasePerson.name}${selectedBasePerson.surname ? ' ' + selectedBasePerson.surname : ''}`,
              })}
            </label>
          </div>
        )}
      <GroupsSelector
        availableGroups={groups}
        selectedGroupIds={formData.groupIds}
        onChange={(groupIds) => onFormDataChange({ groupIds })}
      />
    </>
  );
}
