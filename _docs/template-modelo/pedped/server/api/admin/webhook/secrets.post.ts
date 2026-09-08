/**
 * POST /api/admin/webhook/secrets — grava um dos segredos do webhook de saída
 * no Supabase Vault (migration 103).
 *
 * Rota dedicada, e não o `supabase.from('loja').update()` que a tela usa para
 * o resto: gravar em `vault.create_secret`/`update_secret` exige service role
 * chamando a função `SECURITY DEFINER`. O valor em claro só existe na memória
 * desta requisição — nunca é logado nem devolvido; a resposta leva a máscara.
 *
 * Sem validação "contra o destino" (a chave OpenAI tem, porque dá para pingar
 * a OpenAI): aqui o único juiz é o sistema que recebe, e testar exigiria
 * disparar um evento real com dado de cliente. O que garante que o segredo
 * certo chegou é o próprio webhook falhando com 401/403 — que desde os P0 é
 * retentável, então corrigir e reenviar funciona.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { USER_MANAGEMENT_ROLES } from '#shared/types/user'
import { requireRole } from '../../../utils/auth/requireRole'
import { maskSecret } from '../../../utils/security/maskSecret'
import { invalidateWebhookCredentialsCache } from '../../../utils/webhook/credentials'

/**
 * 16 caracteres é o piso para um segredo que protege dado de cliente — abaixo
 * disso, força bruta contra o destino deixa de ser teórica. Não há teto: quem
 * quiser colar 64 bytes aleatórios deve poder.
 */
const bodySchema = z.object({
  tipo: z.enum(['token', 'signing']),
  valor: z.string().trim().min(16, 'Use pelo menos 16 caracteres.'),
})

export default defineEventHandler(async (event) => {
  const caller = await requireRole(event, USER_MANAGEMENT_ROLES)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    })
  }

  const { tipo, valor } = parsed.data
  const admin = serverSupabaseServiceRole(event)

  // A loja é lida ANTES da escrita no Vault: sem ela não há onde gravar a
  // máscara, e descobrir isso depois deixaria o segredo persistido com os
  // metadados desalinhados (a mesma armadilha corrigida na chave OpenAI).
  const { data: loja, error: lojaError } = await admin.from('loja').select('id').limit(1).maybeSingle()
  if (lojaError || !loja) {
    logger.error('Falha ao carregar a loja para gravar segredo do webhook', {
      error: lojaError?.message ?? 'nenhuma loja cadastrada',
    })
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar a configuração da loja.' })
  }

  const { error: setError } = await admin.rpc('webhook_secret_set', { p_tipo: tipo, p_valor: valor })
  if (setError) {
    logger.error('Falha ao gravar segredo do webhook no Vault', { tipo, error: setError.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao salvar o segredo.' })
  }

  const mascara = maskSecret(valor)
  const { error: updateError } = await admin
    .from('loja')
    // Payload literal por ramo, não chave computada: com `[coluna]: valor` o
    // tipo colapsa para `Record<string, string>` e o client perde a checagem
    // de coluna — o erro passaria a só aparecer em runtime.
    .update(tipo === 'token'
      ? { webhook_token_mascara: mascara }
      : { webhook_signing_secret_mascara: mascara })
    .eq('id', loja.id)

  if (updateError) {
    logger.error('Segredo do webhook gravado no Vault, mas falha ao atualizar a máscara', {
      tipo,
      error: updateError.message,
    })
    throw createError({ statusCode: 500, statusMessage: 'Segredo salvo, mas falha ao atualizar os metadados.' })
  }

  // Sem isto, a troca só valeria depois do TTL de 60s do cache — e o operador
  // que acabou de corrigir o segredo veria o webhook falhar mais uma vez.
  invalidateWebhookCredentialsCache()

  logger.info('Segredo do webhook atualizado', { userId: caller.id, tipo })

  return { configurado: true, tipo, mascara }
})
