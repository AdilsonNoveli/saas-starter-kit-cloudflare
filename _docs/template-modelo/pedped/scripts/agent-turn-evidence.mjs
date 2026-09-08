#!/usr/bin/env node
/**
 * Evidência dos últimos turnos do agente — a leitura que fecha a validação da
 * FASE 0.6 (guardrails) descrita na §7.2 de `_docs/em-andamento.md`.
 *
 * Por que existe: a garantia da camada 1 é "turno bloqueado NÃO chega à
 * OpenAI", e isso não se vê no que o cliente recebe — se vê na AUSÊNCIA de uma
 * linha em `agente_uso_tokens`. O `wrangler tail` mostra o log; só a tabela
 * prova que ninguém pagou token. As duas leituras juntas é que fecham a
 * conferência.
 *
 * Mesma razão de ser do `whatsapp-lid-coverage.mjs`: versionado para que a
 * conferência de hoje e a de daqui a três meses usem exatamente a mesma
 * consulta. Consulta digitada de novo no dashboard não serve de comparação.
 *
 * Uso: `node scripts/agent-turn-evidence.mjs [quantidade]` (padrão 10, lê o
 * `.env` da raiz). Somente leitura.
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

const limite = Number.parseInt(process.argv[2] ?? '10', 10)
if (!Number.isFinite(limite) || limite < 1) {
  console.error('Quantidade inválida — use um inteiro positivo.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

async function buscar(tabela, colunas, ordem) {
  const { data, error } = await supabase.from(tabela).select(colunas).order(ordem, { ascending: false }).limit(limite)
  if (error) {
    console.error(`Falha ao ler "${tabela}": ${error.message}`)
    process.exit(1)
  }
  return data ?? []
}

/** Horário local, que é como o lojista lê o `wrangler tail` do lado dele. */
function hora(iso) {
  return new Date(iso).toLocaleString('pt-BR')
}

function corte(texto, max) {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo
}

const conversas = await buscar('whatsapp_conversas', 'criado_em, role, content, cliente_id', 'criado_em')
const tokens = await buscar('agente_uso_tokens', 'criado_em, modelo, prompt_tokens, completion_tokens, rounds, cliente_id', 'criado_em')

console.log(`\nÚltimas ${limite} falas registradas (whatsapp_conversas)`)
console.log('  Toda fala aparece aqui, INCLUSIVE a de turno bloqueado — o bloqueio')
console.log('  é auditado, não silenciado.\n')
for (const linha of conversas.reverse()) {
  console.log(`  ${hora(linha.criado_em)}  ${linha.role.padEnd(9)} ${corte(linha.content, 70)}`)
}

console.log(`\nÚltimos ${limite} turnos que PAGARAM a OpenAI (agente_uso_tokens)`)
console.log('  A camada 1 (injeção) e a 3 (teto) barram ANTES do modelo: o turno')
console.log('  barrado tem fala acima e NENHUMA linha aqui. É essa ausência que')
console.log('  prova a garantia dura — o log do tail sozinho não prova.\n')
for (const linha of tokens.reverse()) {
  const rounds = linha.rounds === null ? '?' : String(linha.rounds)
  console.log(
    `  ${hora(linha.criado_em)}  ${linha.modelo.padEnd(14)} `
    + `in=${String(linha.prompt_tokens).padStart(5)} out=${String(linha.completion_tokens).padStart(4)} rounds=${rounds}`,
  )
}
console.log('')
