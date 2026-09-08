import { serverSupabaseClient } from '#supabase/server'
import { calculateStoreStatus } from '../../utils/store/calculateStoreStatus'
import type { OperationStatus, StoreScheduleConfig, StoreFechadaConfig } from '#shared/types/store'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data: loja, error } = await supabase
    .from('loja')
    .select(`
      status_operacao,
      status_override_data,
      config_horarios,
      config_loja_fechada,
      config_layout,
      whatsapp_atendimento,
      nome_fantasia,
      logomarca,
      logomarca_dark,
      endereco_rua,
      endereco_numero,
      endereco_bairro,
      endereco_cidade,
      endereco_uf
    `)
    .limit(1)
    .single()

  if (error || !loja) {
    return {
      isOpen: false,
      mostrar_pagina_fechada: true,
      statusOperacao: 'fechada' as OperationStatus,
      mensagem: 'Loja não encontrada',
      whatsapp_atendimento: '',
      nome_fantasia: '',
      logomarca: null,
      config_horarios: null,
      config_loja_fechada: null,
      config_layout: null,
      endereco: null,
    }
  }

  const { isOpen, mensagem } = calculateStoreStatus(
    loja.status_operacao as OperationStatus,
    loja.config_horarios as StoreScheduleConfig | null,
    loja.status_override_data as string | null,
  )

  const cfg = loja.config_loja_fechada as StoreFechadaConfig | null
  const mostrar_pagina_fechada = cfg?.mostrar_pagina_fechada ?? true
  const mostrar_faixa_fechada = cfg?.mostrar_faixa_fechada ?? true
  const mensagem_custom = cfg?.mensagem_custom ?? ''

  const endereco = [
    loja.endereco_rua && loja.endereco_numero
      ? `${loja.endereco_rua}, ${loja.endereco_numero}`
      : loja.endereco_rua,
    loja.endereco_bairro,
    loja.endereco_cidade && loja.endereco_uf
      ? `${loja.endereco_cidade} - ${loja.endereco_uf}`
      : loja.endereco_cidade,
  ]
    .filter(Boolean)
    .join(' • ') || null

  return {
    isOpen,
    mostrar_pagina_fechada,
    mostrar_faixa_fechada,
    mensagem_custom,
    statusOperacao: loja.status_operacao as OperationStatus,
    mensagem,
    whatsapp_atendimento: loja.whatsapp_atendimento ?? '',
    nome_fantasia: loja.nome_fantasia ?? '',
    logomarca: loja.logomarca ?? null,
    logomarca_dark: loja.logomarca_dark ?? null,
    config_horarios: loja.config_horarios as StoreScheduleConfig | null,
    config_loja_fechada: cfg,
    config_layout: loja.config_layout ?? null,
    endereco,
  }
})
