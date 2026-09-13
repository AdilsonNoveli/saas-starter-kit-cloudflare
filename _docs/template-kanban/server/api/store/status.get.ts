import { serverSupabaseClient } from '#supabase/server'
import { calculateStoreStatus } from '../../utils/store/calculateStoreStatus'
import type { OperationStatus, StoreScheduleConfig, StoreFechadaConfig } from '#shared/types/store'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data: loja, error } = await supabase
    .from('store')
    .select(`
      operation_status,
      status_override_date,
      hours_config,
      closed_store_config,
      layout_config,
      support_whatsapp_number,
      trade_name,
      logo_url,
      logo_url_dark,
      address_street,
      address_number,
      address_neighborhood,
      address_city,
      address_state
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
    loja.operation_status as OperationStatus,
    loja.hours_config as StoreScheduleConfig | null,
    loja.status_override_date as string | null,
  )

  const cfg = loja.closed_store_config as StoreFechadaConfig | null
  const mostrar_pagina_fechada = cfg?.mostrar_pagina_fechada ?? true
  const mostrar_faixa_fechada = cfg?.mostrar_faixa_fechada ?? true
  const mensagem_custom = cfg?.mensagem_custom ?? ''

  const endereco = [
    loja.address_street && loja.address_number
      ? `${loja.address_street}, ${loja.address_number}`
      : loja.address_street,
    loja.address_neighborhood,
    loja.address_city && loja.address_state
      ? `${loja.address_city} - ${loja.address_state}`
      : loja.address_city,
  ]
    .filter(Boolean)
    .join(' • ') || null

  return {
    isOpen,
    mostrar_pagina_fechada,
    mostrar_faixa_fechada,
    mensagem_custom,
    statusOperacao: loja.operation_status as OperationStatus,
    mensagem,
    whatsapp_atendimento: loja.support_whatsapp_number ?? '',
    nome_fantasia: loja.trade_name ?? '',
    logomarca: loja.logo_url ?? null,
    logomarca_dark: loja.logo_url_dark ?? null,
    config_horarios: loja.hours_config as StoreScheduleConfig | null,
    config_loja_fechada: cfg,
    config_layout: loja.layout_config ?? null,
    endereco,
  }
})
