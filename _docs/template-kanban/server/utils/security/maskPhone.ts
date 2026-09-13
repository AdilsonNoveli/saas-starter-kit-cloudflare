/**
 * Mascara um número de WhatsApp/telefone para uso em logs.
 *
 * Preserva só os 4 últimos dígitos — suficiente para o operador correlacionar
 * eventos de um mesmo atendimento no `wrangler tail` sem gravar o número
 * completo em texto plano num destino (Workers Logs) com retenção/controle de
 * acesso mais amplo do que o desejável para dado pessoal (LGPD).
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return '*'.repeat(digits.length)
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`
}
