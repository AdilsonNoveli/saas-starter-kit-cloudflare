/**
 * Metadados das personas do laboratório de avaliação, compartilhados entre
 * servidor (`server/utils/lab/personas.ts`, fonte dos roteiros) e a UI
 * (rótulo de exibição) — única fonte da lista de chaves/rótulos, para as duas
 * pontas nunca divergirem se uma persona for renomeada.
 */
export interface LabPersonaMeta {
  readonly key: string
  readonly label: string
}

export const LAB_PERSONA_META: readonly LabPersonaMeta[] = [
  { key: 'comprador_decidido', label: 'Comprador decidido' },
  { key: 'indeciso_precos', label: 'Indeciso com preços' },
  { key: 'endereco_fora_raio', label: 'Endereço fora do raio' },
  { key: 'cliente_irritado', label: 'Cliente irritado' },
  { key: 'pede_humano', label: 'Pede atendimento humano' },
  { key: 'girias_erros', label: 'Gírias e erros de digitação' },
] as const

export function labPersonaLabel(key: string | null): string {
  return LAB_PERSONA_META.find((p) => p.key === key)?.label ?? key ?? 'Persona desconhecida'
}

export const JUDGE_FINDING_TYPE_LABELS: Record<string, string> = {
  alucinacao: 'Alucinação',
  fora_do_briefing: 'Fora do briefing',
  deveria_escalar: 'Deveria escalar',
  tom: 'Tom',
  formato: 'Formato',
}
