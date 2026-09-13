/**
 * Contratos de eventos de observabilidade interna.
 *
 * Substitui o GA. Persistido em `evento_rastreamento` (migration 011).
 * Ingestão por POST /api/track (3.4); leitura via RPCs do dashboard.
 */

import { z } from 'zod'

/**
 * Tipos de evento conhecidos. Pode-se passar qualquer string para `tipo`,
 * mas estes são os reservados/agregados pelas RPCs (`get_top_paginas`,
 * `get_top_cliques`, `get_funil_conversao`).
 */
export const KNOWN_EVENT_TYPES = [
  'page_view',
  'click',
  'add_to_cart',
  'checkout_iniciado',
] as const
export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number]

/**
 * Schema de um evento individual.
 * - `tipo`: snake_case, sem espaços, máx. 64 chars.
 * - `metadata`: JSON livre, com cap de tamanho para evitar payloads abusivos.
 *   O cap é validado server-side em bytes serializados.
 * - `sessao_id`: opcional. Se ausente, o evento é registrado sem vínculo de
 *   sessão (visitante anônimo).
 */
export const trackEventSchema = z.object({
  tipo: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'Use snake_case (a-z, 0-9, _).'),
  entidade: z.string().min(1).max(64).optional(),
  entidade_id: z.uuid().optional(),
  sessao_id: z.uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type TrackEvent = z.infer<typeof trackEventSchema>

/**
 * Schema do body do endpoint. Lote pequeno (1–50) para amortizar requisições
 * sem virar vetor de DoS. O composable `useTracking` agrega no client.
 */
export const trackPayloadSchema = z.object({
  events: z.array(trackEventSchema).min(1).max(50),
})

export type TrackPayload = z.infer<typeof trackPayloadSchema>
