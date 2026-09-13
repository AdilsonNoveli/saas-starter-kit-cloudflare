/**
 * POST /api/admin/products/:id/duplicate
 *
 * Duplica um produto com todas as configurações vinculadas: dados base,
 * grupos/itens de Opções e Variações (migration 114 — inclusive texto_livre/
 * upload_arquivo), produtos relacionados e receita de insumos (Gestão de
 * Estoque). Mesmas imagens (URLs do S3 reaproveitadas — não recomprime nada;
 * `admin/upload.delete.ts` já protege URL referenciada por mais de um
 * produto antes de apagar do bucket, então compartilhar é seguro).
 *
 * A cópia nasce `available: false` e `current_stock: 0` de propósito — o
 * estoque físico pertence ao produto original, e um duplicado com nome
 * ainda igual ("Produto (cópia)") não deveria ficar visível no catálogo
 * antes do lojista revisar/ajustar.
 *
 * Sem transação real (Supabase JS não suporta multi-statement) — mesmo
 * padrão non-atomic de `admin/products/[id].delete.ts`: se uma etapa depois
 * do produto já criado falhar, o produto parcial é removido (compensação)
 * em vez de deixar uma cópia quebrada.
 */
import { createError } from 'h3'
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'
import { requireServiceRole } from '../../../../utils/auth/requireRole'
import { STAFF_ROLES } from '#shared/types/user'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const { supabase } = await requireServiceRole(event, STAFF_ROLES)

  const parsed = paramsSchema.safeParse(event.context.params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'ID de produto inválido.' })
  }
  const sourceId = parsed.data.id

  const { data: origem, error: origemErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle()

  if (origemErr || !origem) {
    throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado.' })
  }

  // 1. Produto base — copia tudo exceto id/created_at/random_rank (defaults
  // novos do banco), current_stock/available (ver docblock acima) e number
  // (migration 128): copiar o número duplicaria a tag do catálogo até o
  // lojista revisar e reatribuir manualmente.
  const { data: copia, error: insertErr } = await supabase
    .from('products')
    .insert({
      category_id: origem.category_id,
      name: `${origem.name} (cópia)`,
      description: origem.description,
      photo_url: origem.photo_url,
      images: origem.images,
      cost_price: origem.cost_price,
      profit_margin: origem.profit_margin,
      sale_price: origem.sale_price,
      promo_price: origem.promo_price,
      unit: origem.unit,
      allows_fractional_sale: origem.allows_fractional_sale,
      available: false,
      synonyms: origem.synonyms,
      product_type: origem.product_type,
      preorder_config: origem.preorder_config,
      requirements: origem.requirements,
      stock_control: origem.stock_control,
      minimum_stock: origem.minimum_stock,
      daily_production_limit: origem.daily_production_limit,
      current_stock: 0,
    })
    .select('id')
    .single()

  if (insertErr || !copia) {
    logger.error('[products/duplicate] falha ao criar produto base', { sourceId, error: insertErr?.message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao duplicar produto.' })
  }

  const newId = copia.id

  try {
    // 2. Opções/Variações (migration 008/114) — grupo por grupo, pra saber o
    // novo group_id antes de inserir os itens dele.
    const { data: grupos, error: gruposErr } = await supabase
      .from('product_option_group')
      .select('*, product_option_item(*)')
      .eq('product_id', sourceId)
      .order('sort_order', { ascending: true })

    if (gruposErr) throw new Error(`Falha ao ler grupos de opções: ${gruposErr.message}`)

    for (const grupo of grupos ?? []) {
      const { data: novoGrupo, error: novoGrupoErr } = await supabase
        .from('product_option_group')
        .insert({
          product_id: newId,
          name: grupo.name,
          type: grupo.type,
          required: grupo.required,
          min_selections: grupo.min_selections,
          max_selections: grupo.max_selections,
          sort_order: grupo.sort_order,
          max_text_length: grupo.max_text_length,
          text_placeholder: grupo.text_placeholder,
          accepted_file_types: grupo.accepted_file_types,
          max_file_size_mb: grupo.max_file_size_mb,
        })
        .select('id')
        .single()

      if (novoGrupoErr || !novoGrupo) throw new Error(`Falha ao duplicar grupo "${grupo.name}": ${novoGrupoErr?.message}`)

      const itens = (grupo.product_option_item ?? []) as Array<{
        name: string
        price_delta: number
        default_selected: boolean
        active: boolean
        sort_order: number
        photo_url: string | null
      }>

      if (itens.length > 0) {
        const { error: itensErr } = await supabase.from('product_option_item').insert(
          itens.map((item) => ({
            group_id: novoGrupo.id,
            name: item.name,
            price_delta: item.price_delta,
            default_selected: item.default_selected,
            active: item.active,
            sort_order: item.sort_order,
            photo_url: item.photo_url,
          })),
        )
        if (itensErr) throw new Error(`Falha ao duplicar itens do grupo "${grupo.name}": ${itensErr.message}`)
      }
    }

    // 3. Produtos relacionados (venda casada).
    const { data: relacionados, error: relErr } = await supabase
      .from('related_products')
      .select('related_product_id, sort_order')
      .eq('product_id', sourceId)

    if (relErr) throw new Error(`Falha ao ler produtos relacionados: ${relErr.message}`)

    if (relacionados && relacionados.length > 0) {
      const { error: relInsertErr } = await supabase.from('related_products').insert(
        relacionados.map((r) => ({
          product_id: newId,
          related_product_id: r.related_product_id,
          sort_order: r.sort_order,
        })),
      )
      if (relInsertErr) throw new Error(`Falha ao duplicar produtos relacionados: ${relInsertErr.message}`)
    }

    // 4. Receita/BOM de insumos (Gestão de Estoque, migration 111).
    const { data: insumos, error: insumosErr } = await supabase
      .from('product_ingredients')
      .select('ingredient_id, quantity_per_unit')
      .eq('product_id', sourceId)

    if (insumosErr) throw new Error(`Falha ao ler receita de insumos: ${insumosErr.message}`)

    if (insumos && insumos.length > 0) {
      const { error: insumosInsertErr } = await supabase.from('product_ingredients').insert(
        insumos.map((i) => ({
          product_id: newId,
          ingredient_id: i.ingredient_id,
          quantity_per_unit: i.quantity_per_unit,
        })),
      )
      if (insumosInsertErr) throw new Error(`Falha ao duplicar receita de insumos: ${insumosInsertErr.message}`)
    }
  } catch (err: unknown) {
    // Compensação: sem isto o produto base fica órfão de configuração —
    // pior que não ter criado nada (mesmo espírito de reserve_preorders
    // falhando em orders/create.post.ts).
    await supabase.from('products').delete().eq('id', newId)
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[products/duplicate] falha na cópia vinculada — produto parcial removido', { sourceId, newId, error: message })
    throw createError({ statusCode: 500, statusMessage: 'Falha ao duplicar as configurações do produto.' })
  }

  logger.info('[products/duplicate] ok', { sourceId, newId })
  return { success: true, id: newId }
})
