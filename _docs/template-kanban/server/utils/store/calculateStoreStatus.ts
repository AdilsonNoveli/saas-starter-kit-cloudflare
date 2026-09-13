import type { OperationStatus, StoreScheduleConfig } from '#shared/types/store'
import { getSaoPauloDateString } from '#shared/utils/datetime'

export interface StoreStatusResult {
  isOpen: boolean
  statusEfetivo: OperationStatus
  mensagem: string
}

/**
 * Calcula se a loja está aceitando pedidos AGORA.
 *
 * Lógica (espelha exatamente o evaluateManualOverride + evaluateSchedule do cart store):
 *  - 'aberta' / 'fechada' / 'pausada' → override manual (expira se statusOverrideData ≠ hoje)
 *  - 'automatico' ou override expirado → avalia config_horarios
 *
 * Nunca lança exceção — retorna { isOpen: false } em caso de dados inválidos.
 */
export function calculateStoreStatus(
  statusOperacao: OperationStatus,
  configHorarios: StoreScheduleConfig | null | undefined,
  statusOverrideData?: string | null,
): StoreStatusResult {
  // Todos os cálculos de data/hora usam horário de Brasília (America/Sao_Paulo).
  // O servidor roda em UTC — sem esta conversão, os horários de funcionamento estariam
  // sempre 3h adiantados e a loja apareceria aberta/fechada na hora errada.
  const TZ = 'America/Sao_Paulo'
  const nowUtc = new Date()
  // toLocaleString converte para o fuso correto; new Date() do resultado dá
  // um objeto cujos getHours/getDay retornam hora local de Brasília no servidor UTC.
  const now = new Date(nowUtc.toLocaleString('en-US', { timeZone: TZ }))
  const todayStr = getSaoPauloDateString(nowUtc) // YYYY-MM-DD em BRT

  // Verifica se o override manual ainda vale hoje
  const overrideAtivo =
    statusOperacao !== 'automatico' &&
    (statusOverrideData === null || statusOverrideData === undefined || statusOverrideData === todayStr)

  if (overrideAtivo) {
    if (statusOperacao === 'aberta') {
      return { isOpen: true, statusEfetivo: 'aberta', mensagem: 'Loja aberta' }
    }
    if (statusOperacao === 'fechada') {
      return { isOpen: false, statusEfetivo: 'fechada', mensagem: 'Loja fechada' }
    }
    if (statusOperacao === 'pausada') {
      return { isOpen: false, statusEfetivo: 'pausada', mensagem: 'Loja pausada' }
    }
  }

  // Modo automático (ou override expirado) — avalia a grade semanal
  if (!configHorarios) {
    return { isOpen: false, statusEfetivo: 'automatico', mensagem: 'Horários não configurados' }
  }

  const dayKey = String(now.getDay()) as keyof StoreScheduleConfig
  const dia = configHorarios[dayKey]

  if (!dia?.aberto) {
    return { isOpen: false, statusEfetivo: 'automatico', mensagem: 'Fechado hoje' }
  }

  const hhmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  if (hhmm < (dia.inicio ?? '00:00')) {
    return { isOpen: false, statusEfetivo: 'automatico', mensagem: `Abre às ${dia.inicio}` }
  }
  if (hhmm > (dia.fim ?? '23:59')) {
    return { isOpen: false, statusEfetivo: 'automatico', mensagem: `Fechou às ${dia.fim}` }
  }

  return { isOpen: true, statusEfetivo: 'automatico', mensagem: `Aberto até ${dia.fim}` }
}
