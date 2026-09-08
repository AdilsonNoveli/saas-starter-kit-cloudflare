const _fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function useFormatters() {
  const formatCurrency = (val: number | null | undefined): string =>
    _fmt.format(Number(val) || 0)

  return { formatCurrency }
}
