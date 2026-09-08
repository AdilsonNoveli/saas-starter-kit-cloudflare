export interface CategoryColorOption {
  value: string
  label: string
  hex: string
  textClass: string
  bgClass: string
  borderClass: string
}

export const CATEGORY_COLORS: CategoryColorOption[] = [
  {
    value: 'brand-green',
    label: 'Verde (Padrão)',
    hex: '#22b573',
    textClass: 'text-brand-green',
    bgClass: 'bg-brand-green',
    borderClass: 'border-brand-green',
  },
  {
    value: 'orange',
    label: 'Laranja (Combos/Promoções)',
    hex: '#ea580c',
    textClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-500',
    borderClass: 'border-orange-500',
  },
  {
    value: 'amber',
    label: 'Âmbar (Destaques)',
    hex: '#d97706',
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-500',
  },
  {
    value: 'rose',
    label: 'Rosa (Doces)',
    hex: '#e11d48',
    textClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-500',
  },
  {
    value: 'sky',
    label: 'Azul (Frios/Bebidas)',
    hex: '#0284c7',
    textClass: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-500',
    borderClass: 'border-sky-500',
  },
  {
    value: 'violet',
    label: 'Violeta (Especiais)',
    hex: '#7c3aed',
    textClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-500',
    borderClass: 'border-violet-500',
  },
  {
    value: 'indigo',
    label: 'Índigo (Premium)',
    hex: '#4f46e5',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-500',
    borderClass: 'border-indigo-500',
  },
  {
    value: 'slate',
    label: 'Cinza (Neutro)',
    hex: '#475569',
    textClass: 'text-slate-600 dark:text-slate-400',
    bgClass: 'bg-slate-500',
    borderClass: 'border-slate-500',
  },
]

export function getCategoryColor(colorValue: string | null | undefined): CategoryColorOption {
  if (!colorValue) return CATEGORY_COLORS[0]!
  const match = CATEGORY_COLORS.find(c => c.value === colorValue)
  return match || CATEGORY_COLORS[0]!
}
