/**
 * Nitro Scheduled Task: agent:evaluate
 *
 * LLM-as-a-Judge unificado (`_docs/implementar/prd-laboratorio-avaliacao-agente.md`
 * §4) — gatilho de amostragem CONTÍNUA de produção do avaliador unificado.
 * MESMO nome de task, MESMA cadência de cron (armadilha 5 de
 * `_docs/em-andamento.md`: cron publicado ≠ task rodando, divergir não falha).
 *
 * O corpo do ciclo (buscar turnos pendentes, julgar, gravar) mora em
 * `server/utils/agent/evaluateCycle.ts` — compartilhado com o endpoint sob
 * demanda `POST /api/admin/ai-quality/evaluate-now` (fase C2/C3 do PRD de
 * achados recorrentes, §4.3). Este arquivo só resolve config + client e
 * chama o ciclo — mesma responsabilidade de antes, sem duplicar a lógica.
 *
 * Acionada pelo Cloudflare Cron Trigger (a cada 15 min), preset cloudflare-durable.
 * Também disponível sob demanda via POST /_nitro/tasks/run?task=agent:evaluate
 * (com autenticação adequada) para teste manual.
 *
 * Docs: https://nitro.build/guide/tasks
 */
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/core/services/logger.service'
import type { Database } from '~/types/database.types'
import { resolveEvaluatorConfig, runEvaluationCycle } from '../../utils/agent/evaluateCycle'

export default defineTask({
  meta: {
    name: 'agent:evaluate',
    description: 'LLM-as-a-Judge: avalia amostra de turnos pendentes (máx. 20/ciclo).',
  },
  async run(): Promise<{ result: string; avaliados: number; erros: number }> {
    // Lido direto de `process.env`, não via `useRuntimeConfig()`: a mesma
    // fonte de verdade (o módulo `@nuxtjs/supabase` popula
    // `runtimeConfig.public.supabase` a partir desta env var no boot), mas
    // sem depender do auto-import de `useRuntimeConfig` — que exige uma
    // instância de app Nuxt viva (`useNuxtApp()`) e não é mockável via
    // `vi.stubGlobal` em teste (confirmado: o auto-import resolve para o
    // binding real de `nuxt/dist/app/nuxt.js`, imune a stub de global).
    // `NUXT_SUPABASE_SECRET_KEY` já era lido assim — consistência.
    const url = process.env.NUXT_PUBLIC_SUPABASE_URL ?? ''
    const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY ?? ''

    if (!url || !serviceKey) {
      logger.warn('[agent:evaluate] NUXT_PUBLIC_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY ausentes, pulando.')
      return { result: 'skipped', avaliados: 0, erros: 0 }
    }

    const supabase = createClient<Database>(url, serviceKey, { auth: { persistSession: false } })

    const evaluatorConfig = await resolveEvaluatorConfig(supabase)
    if (!evaluatorConfig) return { result: 'skipped', avaliados: 0, erros: 0 }

    const openai = new OpenAI({ apiKey: evaluatorConfig.apiKey })
    const { avaliados, erros, total } = await runEvaluationCycle(supabase, openai, evaluatorConfig)

    logger.info('[agent:evaluate] ciclo concluído', { avaliados, erros, total })
    return { result: 'ok', avaliados, erros }
  },
})
