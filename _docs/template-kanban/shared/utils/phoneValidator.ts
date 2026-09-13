/**
 * Validador robusto e livre de gambiarras para números de WhatsApp do Brasil.
 */

const VALID_BR_DDDS = new Set<number>([
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24,                         // RJ
  27, 28,                             // ES
  31, 32, 33, 34, 35, 37, 38,         // MG
  41, 42, 43, 44, 45, 46,             // PR
  47, 48, 49,                         // SC
  51, 53, 54, 55,                     // RS
  61, 62, 63, 64, 65, 66, 67,         // DF/GO/TO/MT/MS
  68, 69,                             // AC/RO
  71, 73, 74, 75, 77, 79,             // BA/SE
  81, 82, 83, 84, 85, 86, 87, 88, 89, // PE/AL/PB/RN/CE/PI
  91, 92, 93, 94, 95, 96, 97, 98, 99, // PA/AM/RR/AP/MA
])

export interface PhoneValidationResult {
  readonly isValid: boolean
  readonly reason?: string
}

/**
 * Valida se a string fornecida corresponde a um número de WhatsApp brasileiro válido.
 *
 * Validações efetuadas:
 * 1. Comprimento: 11 dígitos numéricos com DDD (ou 13 dígitos com DDI 55).
 * 2. DDD válido segundo a tabela oficial da ANATEL.
 * 3. 9º dígito obrigatório ('9' após o DDD em celulares/WhatsApp BR).
 * 4. Bloqueia números com todos os dígitos idênticos (ex: 11111111111, 99999999999).
 * 5. Bloqueia repetições do corpo numérico (ex: 999999999, 900000000).
 * 6. Bloqueia sequências numéricas crescentes ou decrescentes (ex: 123456789, 987654321, 912345678).
 * 7. Bloqueia padrões repetitivos de 2 ou 3 dígitos no corpo (ex: 912121212, 909090909).
 */
export function validateWhatsapp(rawPhone: string | null | undefined): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  let clean = rawPhone.replace(/\D/g, '')

  // Remove o código de país DDI 55 se presente
  if (clean.length === 13 && clean.startsWith('55')) {
    clean = clean.slice(2)
  }

  // Celular BR com DDD deve ter exatamente 11 dígitos
  if (clean.length !== 11) {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  const ddd = parseInt(clean.slice(0, 2), 10)
  if (!VALID_BR_DDDS.has(ddd)) {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  // Todo celular com WhatsApp no Brasil deve começar com 9 após o DDD
  const ninthDigit = clean[2]
  if (ninthDigit !== '9') {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  // Bloqueia se todos os dígitos forem idênticos (ex: 11111111111, 99999999999)
  if (/^(\d)\1{10}$/.test(clean)) {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  const body = clean.slice(2) // 9 dígitos do número (ex: 987654321)

  // Bloqueia se os 9 dígitos do corpo forem todos iguais (ex: 999999999, 900000000)
  if (/^(\d)\1{8}$/.test(body)) {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  // Bloqueia sequências numéricas diretas (ex: 123456789, 987654321, 912345678)
  const isAscendingSeq = '0123456789'.includes(body) || '123456789'.includes(body) || '912345678'.includes(body)
  const isDescendingSeq = '9876543210'.includes(body) || '987654321'.includes(body)
  if (isAscendingSeq || isDescendingSeq) {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  // Bloqueia padrões repetitivos de 2 dígitos no corpo (ex: 912121212, 909090909, 919191919)
  const bodyAfterNinth = body.slice(1) // 8 dígitos após o 9
  if (/^(\d{2})\1{3}$/.test(bodyAfterNinth)) {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  // Bloqueia padrões repetitivos de 3 dígitos no corpo (ex: 912312312)
  if (/^(\d{3})\1{2}$/.test(body)) {
    return { isValid: false, reason: 'Digite um número de Whatsapp válido!' }
  }

  return { isValid: true }
}
