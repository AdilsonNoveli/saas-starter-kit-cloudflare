/**
 * Amostra do catálogo real, usada para montar os roteiros das personas do
 * laboratório em runtime — a aplicação é agnóstica de segmento (várias
 * instalações, cada uma com seu próprio catálogo), então os roteiros NUNCA
 * podem fixar nome de produto (ex.: "pizza de calabresa"). A fonte de
 * verdade é sempre o banco desta instalação, nunca um nome hardcoded — do
 * contrário o laboratório testa um produto que pode não existir nesta loja
 * (confundido com alucinação real do agente) e quebra em qualquer
 * segmento fora do de pizzaria.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export interface LabCatalogSample {
  readonly principal: string
  readonly secundario: string
  readonly terciario: string
}

/**
 * Três produtos disponíveis reais, em ordem estável (nome ASC) — determinismo
 * entre corridas ajuda a comparação "config real vs. config alterada" (§1 do
 * PRD) a não variar por causa do roteiro, só por causa da mudança testada.
 * `null` quando a loja tem menos de 3 produtos disponíveis (catálogo vazio ou
 * recém-criado) — o chamador decide o fallback genérico.
 */
export async function fetchLabCatalogSample(
  supabase: SupabaseClient<Database>,
): Promise<LabCatalogSample | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('nome')
    .eq('disponivel', true)
    .order('nome', { ascending: true })
    .limit(3)

  if (error || !data || data.length < 3) return null

  return {
    principal: data[0]!.nome,
    secundario: data[1]!.nome,
    terciario: data[2]!.nome,
  }
}
