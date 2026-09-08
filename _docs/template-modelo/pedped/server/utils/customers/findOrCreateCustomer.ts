/**
 * Find-or-create de cliente por identificador de WhatsApp — caminho ÚNICO (DRY).
 *
 * Consolidação da lógica antes triplicada em `session/create-direct`,
 * `integration/v1/orders` e no fluxo agentivo. Suporta o identificador
 * clássico (telefone) e o novo `@lid` da API do WhatsApp (privacidade):
 *
 *  1. Lookup por `whatsapp_lid` (quando fornecido) — identificador estável.
 *  2. Fallback: lookup por `telefone_whatsapp` normalizado.
 *  3. Backfill bidirecional: achado por telefone com lid novo → grava o lid;
 *     achado por lid sem telefone e telefone fornecido → grava o telefone.
 *  4. Criação aceita lid-only (migration 032): o agente detecta
 *     `telefoneWhatsapp === null` e pede o número na própria conversa —
 *     a próxima chamada de contexto com whatsapp+lid completa o cadastro.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { Database } from '~/types/database.types'
import { sanitizeContactName } from './sanitizeContactName'

export interface FindOrCreateCustomerInput {
  /** Telefone (com ou sem 55/DDD — será normalizado). */
  readonly whatsapp?: string
  /** Identificador `@lid` da nova API do WhatsApp. */
  readonly lid?: string
  /** Nome para novos cadastros. Default: 'Cliente WhatsApp'. */
  readonly nome?: string
  /** Marca visitante em novos cadastros. Default: false (veio de conversa real). */
  readonly isVisitante?: boolean
  /**
   * Marca cliente sintético do laboratório de avaliação (migration 105) em
   * novos cadastros. Default: false. Nunca reaproveita `isVisitante` —
   * propósito distinto (`_docs/implementar/prd-laboratorio-avaliacao-agente.md` §5.3).
   */
  readonly isTesteLaboratorio?: boolean
}

export interface FindOrCreateCustomerResult {
  readonly id: string
  readonly nome: string
  /** `null` = cadastro lid-only; o agente deve solicitar o número na conversa. */
  readonly telefoneWhatsapp: string | null
  readonly whatsappLid: string | null
  readonly isNew: boolean
}

/** Nomes genéricos criados sem o nome real do WhatsApp — sobrescrevíveis no backfill. */
const PLACEHOLDER_NAMES = new Set(['cliente', 'cliente whatsapp', 'visitante web', 'visitante'])

/** Decide se o nome armazenado deve ceder lugar ao nome real vindo do request. */
function shouldBackfillName(stored: string | null, incoming: string | undefined): incoming is string {
  const novo = incoming?.trim()
  if (!novo) return false
  const atual = (stored || '').trim()
  return atual === '' || atual.toLowerCase() !== novo.toLowerCase() && PLACEHOLDER_NAMES.has(atual.toLowerCase())
}

/** Remove não-dígitos e aplica regra BR: DDD+número sem código do país ganha 55. */
export function normalizeWhatsapp(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`
  }
  return digits
}

export async function findOrCreateCustomer(
  supabase: SupabaseClient<Database>,
  input: FindOrCreateCustomerInput,
): Promise<FindOrCreateCustomerResult> {
  const lid = input.lid?.trim() || null
  const phone = input.whatsapp ? normalizeWhatsapp(input.whatsapp) : null
  // Único ponto de sanitização de `clientes.nome` (DRY — ver `sanitizeContactName.ts`):
  // nenhum outro caminho deste módulo usa `input.nome` cru.
  const nome = sanitizeContactName(input.nome)

  if (!lid && !phone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe whatsapp ou lid para identificar o cliente.',
    })
  }
  if (phone && (phone.length < 12 || phone.length > 15)) {
    throw createError({ statusCode: 400, statusMessage: 'Número de WhatsApp inválido.' })
  }

  // 1. Lookup por lid (identificador estável da nova API).
  if (lid) {
    const { data: byLid } = await supabase
      .from('clientes')
      .select('id, nome, telefone_whatsapp, whatsapp_lid')
      .eq('whatsapp_lid', lid)
      .maybeSingle()

    if (byLid) {
      // 3. Backfill do nome: o WhatsApp mandou o nome real sobre um placeholder.
      let nomeAtual = byLid.nome
      if (shouldBackfillName(byLid.nome, nome)) {
        await supabase.from('clientes').update({ nome }).eq('id', byLid.id)
        nomeAtual = nome
      }
      // 3. Backfill do telefone: cliente lid-only informou o número na conversa.
      if (phone && !byLid.telefone_whatsapp) {
        const { error: backfillErr } = await supabase
          .from('clientes')
          .update({ telefone_whatsapp: phone })
          .eq('id', byLid.id)
        // Conflito (telefone já usado por outro cadastro) não bloqueia o fluxo:
        // o cliente segue identificado pelo lid.
        if (!backfillErr) {
          return { id: byLid.id, nome: nomeAtual, telefoneWhatsapp: phone, whatsappLid: byLid.whatsapp_lid, isNew: false }
        }
      }
      return { id: byLid.id, nome: nomeAtual, telefoneWhatsapp: byLid.telefone_whatsapp, whatsappLid: byLid.whatsapp_lid, isNew: false }
    }
  }

  // 2. Lookup por telefone normalizado.
  if (phone) {
    const { data: byPhone, error: phoneErr } = await supabase
      .from('clientes')
      .select('id, nome, telefone_whatsapp, whatsapp_lid')
      .eq('telefone_whatsapp', phone)
      .maybeSingle()

    if (phoneErr) {
      throw createError({ statusCode: 500, statusMessage: 'Erro ao consultar cliente.' })
    }

    if (byPhone) {
      // 3. Backfill do nome: o WhatsApp mandou o nome real sobre um placeholder.
      let nomeAtual = byPhone.nome
      if (shouldBackfillName(byPhone.nome, nome)) {
        await supabase.from('clientes').update({ nome }).eq('id', byPhone.id)
        nomeAtual = nome
      }
      // 3. Backfill do lid: primeiro contato deste cliente pela nova API.
      if (lid && !byPhone.whatsapp_lid) {
        await supabase.from('clientes').update({ whatsapp_lid: lid }).eq('id', byPhone.id)
      }
      return {
        id: byPhone.id,
        nome: nomeAtual,
        telefoneWhatsapp: byPhone.telefone_whatsapp,
        whatsappLid: lid ?? byPhone.whatsapp_lid,
        isNew: false,
      }
    }
  }

  // 4. Criação — telefone OU lid (constraint chk_clientes_identificador).
  const { data: created, error: insertErr } = await supabase
    .from('clientes')
    .insert({
      telefone_whatsapp: phone,
      whatsapp_lid: lid,
      nome: nome || 'Cliente WhatsApp',
      is_visitante: input.isVisitante ?? false,
      e_teste_laboratorio: input.isTesteLaboratorio ?? false,
    })
    .select('id, nome, telefone_whatsapp, whatsapp_lid')
    .single()

  if (insertErr || !created) {
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível cadastrar o cliente.' })
  }

  return {
    id: created.id,
    nome: created.nome,
    telefoneWhatsapp: created.telefone_whatsapp,
    whatsappLid: created.whatsapp_lid,
    isNew: true,
  }
}
