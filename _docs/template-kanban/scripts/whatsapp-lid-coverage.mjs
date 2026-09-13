#!/usr/bin/env node
/**
 * Métrica da FASE 0.4 (a) de `_docs/em-andamento.md`: proporção de `clientes`
 * com identificador estável do WhatsApp (`whatsapp_lid`) gravado.
 *
 * A definição de pronto do item (a) é uma métrica que SOBE — "o lid passa a ser
 * gravado no primeiro turno de cada cliente". Isso não é observável num teste:
 * depende de conversas reais chegando ao produtor. Este script é a leitura,
 * versionada para que a medição de antes e a de depois usem exatamente a mesma
 * consulta (a comparação é o valor; uma consulta digitada de novo não serve).
 *
 * Baseline registrado em 2026-07-29, antes da propagação: 4 de 64 (6,3%),
 * 0 lid-only, 0 telefone duplicado.
 *
 * Uso: `node scripts/whatsapp-lid-coverage.mjs` (lê `.env` da raiz).
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const url = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!url || !serviceKey) {
  console.error('Faltam NUXT_PUBLIC_SUPABASE_URL / NUXT_SUPABASE_SECRET_KEY no ambiente.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

/** `head: true` + `count: exact`: conta no servidor, sem trafegar linha nenhuma. */
async function contar(rotulo, aplicarFiltros) {
  const query = aplicarFiltros(supabase.from('clientes').select('id', { count: 'exact', head: true }))
  const { count, error } = await query
  if (error) {
    console.error(`Falha ao contar "${rotulo}": ${error.message}`)
    process.exit(1)
  }
  return count ?? 0
}

const total = await contar('total', (q) => q)
const comLid = await contar('com lid', (q) => q.not('whatsapp_lid', 'is', null))
const lidOnly = await contar('lid-only', (q) => q.not('whatsapp_lid', 'is', null).is('telefone_whatsapp', null))
const comTelefone = await contar('com telefone', (q) => q.not('telefone_whatsapp', 'is', null))

const pct = total > 0 ? ((comLid / total) * 100).toFixed(1) : '0.0'

console.log('Cobertura de identificador estável do WhatsApp (clientes.whatsapp_lid)')
console.log(`  clientes ................. ${total}`)
console.log(`  com whatsapp_lid ......... ${comLid} (${pct}%)`)
console.log(`  lid-only (sem telefone) .. ${lidOnly}`)
console.log(`  com telefone ............. ${comTelefone}`)
