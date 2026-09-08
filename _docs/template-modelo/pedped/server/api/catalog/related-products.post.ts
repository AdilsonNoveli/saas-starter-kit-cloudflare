import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import { loadQuantidadeDisponivelPorProduto } from '../../utils/products/stockAvailability'

const bodySchema = z.object({
  produtoIds: z.array(z.string().uuid()).min(1).max(50),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, message: 'produtoIds inválido' })

  const { produtoIds } = parsed.data
  // Service role: testado ao vivo (migration 111) — o client sob RLS
  // (`serverSupabaseClient`) devolvia produtos vazio/estoque null pra
  // cliente anônimo mesmo com a policy "Public read available products"
  // existindo; mesma armadilha documentada em movements.post.ts. Dado 100%
  // público (nome/preço/estoque de produto disponível), sem risco em expor.
  const supabase = serverSupabaseServiceRole(event)

  const { data: rels } = await supabase
    .from('produto_relacionados')
    .select('produto_relacionado_id')
    .in('produto_id', produtoIds)
    .order('ordem', { ascending: true })

  if (!rels || rels.length === 0) return { produtos: [] }

  const cartSet = new Set(produtoIds)
  const relIds = [...new Set(rels.map((r) => r.produto_relacionado_id))]
    .filter((id) => !cartSet.has(id))
    .slice(0, 3)

  if (relIds.length === 0) return { produtos: [] }

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, descricao, foto_url, preco_venda')
    .in('id', relIds)
    .eq('disponivel', true)

  // Gestão de Estoque (migration 111): mesmo helper do agente e do restante
  // do catálogo — sem isso o "Você também pode gostar" oferecia item sem
  // estoque sem aviso nenhum, igual ao bug do card principal.
  const quantidadeDisponivelPorId = await loadQuantidadeDisponivelPorProduto(supabase, relIds)

  // Preserva a ordem original do ranking
  const byId = new Map((produtos ?? []).map((p) => [p.id, p]))
  return {
    produtos: relIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((p) => ({ ...p, quantidade_disponivel: quantidadeDisponivelPorId.get(p.id) ?? null })),
  }
})
