/**
 * Conversão de datas de calendário (`YYYY-MM-DD`, o que um `<input type="date">`
 * devolve) para instantes absolutos no fuso da operação.
 *
 * O erro clássico é `new Date('2026-07-15').toISOString()`: a string sem hora é
 * interpretada como meia-noite UTC, que em São Paulo é 21:00 do dia ANTERIOR.
 * Num filtro de período isso arrasta três horas do dia errado para dentro do
 * intervalo e, no limite superior, corta quase todo o último dia selecionado.
 *
 * O Brasil aboliu o horário de verão em 2019, então São Paulo é UTC-3 o ano
 * inteiro e o deslocamento fixo é correto — e bem mais previsível que aritmética
 * de fuso feita à mão.
 */

const SP_UTC_OFFSET = '-03:00'
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Converte uma data de calendário para instante em SP no horário informado.
 * Valida o formato antes de construir o `Date`: sem isso, uma entrada malformada
 * produziria um `RangeError` críptico ("Invalid time value") lá no `toISOString`.
 */
function spInstantISO(isoDate: string, time: string): string {
  if (!CALENDAR_DATE.test(isoDate)) {
    throw new TypeError(`Data de calendário inválida (esperado YYYY-MM-DD): "${isoDate}"`)
  }
  return new Date(`${isoDate}T${time}${SP_UTC_OFFSET}`).toISOString()
}

/** Início do dia (00:00:00) em São Paulo, como ISO absoluto. */
export function spDayStartISO(isoDate: string): string {
  return spInstantISO(isoDate, '00:00:00.000')
}

/** Fim do dia (23:59:59.999) em São Paulo, como ISO absoluto. */
export function spDayEndISO(isoDate: string): string {
  return spInstantISO(isoDate, '23:59:59.999')
}

/** Data atual de calendário (`YYYY-MM-DD`) no fuso de São Paulo (America/Sao_Paulo). */
export function getSaoPauloDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
