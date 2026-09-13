/**
 * Resolução e gravação da pendência de arte/personalização de um carrinho
 * (grupos `upload_arquivo`/`texto_livre`, migration 114/127).
 * Extraído de `whatsapp/attachPendingArt.ts` para isolar o que é gravação
 * pura (resolver a pendência FIFO e gravar a URL/recusa em
 * `cart_item_options`) do que é específico da mídia do WhatsApp
 * (identidade por telefone, validação de bytes crus).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { getCartState } from './state'
import { loadUploadArquivoRequirements, type UploadArquivoRequirement } from '../products/uploadArquivoRequirements'
import { loadTextoLivreRequirements, type TextoLivreRequirement } from '../products/textoLivreRequirements'

export interface PendingArtRequirement {
  readonly cartItemId: string
  readonly opcaoItemId: string
  readonly nomeCongelado: string
  readonly precoDeltaCongelado: number
  readonly arquivoTiposAceitos: readonly string[]
  readonly arquivoTamanhoMaximoMb: number
  /** Nome do produto dono do item — só para rótulo de UI (ex.: "Arte para Camiseta Personalizada"). */
  readonly produtoNome: string
}

export interface PendingTextRequirement {
  readonly cartItemId: string
  readonly opcaoItemId: string
  readonly nomeCongelado: string
  readonly precoDeltaCongelado: number
  readonly textoMaxCaracteres: number | null
  readonly textoPlaceholder: string | null
  /** Nome do produto dono do item — só para rótulo de UI. */
  readonly produtoNome: string
}

function toPendingArt(cartItemId: string, produtoNome: string, req: UploadArquivoRequirement): PendingArtRequirement {
  return {
    cartItemId,
    opcaoItemId: req.opcaoItemId,
    nomeCongelado: req.grupoNome,
    precoDeltaCongelado: req.precoDelta,
    arquivoTiposAceitos: req.arquivoTiposAceitos,
    arquivoTamanhoMaximoMb: req.arquivoTamanhoMaximoMb,
    produtoNome,
  }
}

function toPendingText(cartItemId: string, produtoNome: string, req: TextoLivreRequirement): PendingTextRequirement {
  return {
    cartItemId,
    opcaoItemId: req.opcaoItemId,
    nomeCongelado: req.grupoNome,
    precoDeltaCongelado: req.precoDelta,
    textoMaxCaracteres: req.textoMaxCaracteres,
    textoPlaceholder: req.textoPlaceholder,
    produtoNome,
  }
}

/**
 * FIFO: item mais antigo do carrinho com pendência de arte vence quando há
 * mais de um. Correlacionar corretamente múltiplas mídias/uploads na mesma
 * janela exigiria o cliente legendar cada um — raro na prática — então um
 * cliente com 2+ pendências recebe uma de cada vez, por desenho, não bug.
 *
 * Toda âncora upload_arquivo do produto entra aqui — SEMPRE pelo TIPO do
 * grupo (migration 127), nunca pelo flag `required`: nenhum produto depende
 * de configuração correta pra isso funcionar (ver docblock do arquivo).
 *
 * `deferred===true` (migration 127 — cliente já escolheu "Enviar depois")
 * conta como satisfeito: para de pedir a arte no carrinho: uma imagem
 * enviada depois disso não auto-anexa mais aqui — o fallback pós-pedido é
 * `server/utils/orders/pendingOrderArt.ts`, depois que o pedido for criado.
 */
export async function findPendingArtRequirement(
  supabase: SupabaseClient<Database>,
  sessaoId: string,
): Promise<PendingArtRequirement | null> {
  const cart = await getCartState(supabase, sessaoId)
  if (cart.itens.length === 0) return null

  const requirementsByProduto = await loadUploadArquivoRequirements(
    supabase,
    cart.itens.map((i) => i.produto_id),
  )

  for (const item of cart.itens) {
    for (const req of requirementsByProduto.get(item.produto_id) ?? []) {
      const opcao = item.opcoes.find((o) => o.opcao_item_id === req.opcaoItemId)
      const satisfeito = !!opcao?.arquivo_url || opcao?.deferred === true
      if (!satisfeito) return toPendingArt(item.id, item.nome, req)
    }
  }
  return null
}

/** Mesma resolução FIFO de `findPendingArtRequirement` (SEMPRE pelo TIPO do grupo, migration 127), para o grupo `texto_livre` (botão "Sem nome"). */
export async function findPendingTextRequirement(
  supabase: SupabaseClient<Database>,
  sessaoId: string,
): Promise<PendingTextRequirement | null> {
  const cart = await getCartState(supabase, sessaoId)
  if (cart.itens.length === 0) return null

  const requirementsByProduto = await loadTextoLivreRequirements(
    supabase,
    cart.itens.map((i) => i.produto_id),
  )

  for (const item of cart.itens) {
    for (const req of requirementsByProduto.get(item.produto_id) ?? []) {
      const satisfeito = item.opcoes.some((o) => o.opcao_item_id === req.opcaoItemId && !!o.valor_texto)
      if (!satisfeito) return toPendingText(item.id, item.nome, req)
    }
  }
  return null
}

/** Delete+insert (mesmo padrão de `replaceCartItemOptions`) — idempotente contra reentrega/retentativa. */
export async function attachArt(
  supabase: SupabaseClient<Database>,
  pending: PendingArtRequirement,
  arquivo: { url: string, nomeOriginal: string },
): Promise<void> {
  await supabase
    .from('cart_item_options')
    .delete()
    .eq('cart_item_id', pending.cartItemId)
    .eq('option_item_id', pending.opcaoItemId)

  const { error } = await supabase.from('cart_item_options').insert({
    cart_item_id: pending.cartItemId,
    option_item_id: pending.opcaoItemId,
    frozen_name: pending.nomeCongelado,
    frozen_price_delta: pending.precoDeltaCongelado,
    file_url: arquivo.url,
    original_file_name: arquivo.nomeOriginal,
  })

  if (error) {
    throw new Error(`Falha ao anexar arte ao carrinho: ${error.message}`)
  }
}

/**
 * Grava a recusa explícita de personalização ("Sem nome") — mesmo
 * delete+insert de `attachArt`. Texto literal (não vazio) em vez de um flag
 * booleano: fica visível pro staff no pedido (`OrderReceipt.vue`) exatamente
 * como um nome real ficaria, sem precisar de UI especial pra esse caso.
 */
export async function declineText(
  supabase: SupabaseClient<Database>,
  pending: Pick<PendingTextRequirement, 'cartItemId' | 'opcaoItemId' | 'nomeCongelado' | 'precoDeltaCongelado'>,
  texto = 'Sem nome',
): Promise<void> {
  await supabase
    .from('cart_item_options')
    .delete()
    .eq('cart_item_id', pending.cartItemId)
    .eq('option_item_id', pending.opcaoItemId)

  const { error } = await supabase.from('cart_item_options').insert({
    cart_item_id: pending.cartItemId,
    option_item_id: pending.opcaoItemId,
    frozen_name: pending.nomeCongelado,
    frozen_price_delta: pending.precoDeltaCongelado,
    text_value: texto,
  })

  if (error) {
    throw new Error(`Falha ao gravar recusa de personalização: ${error.message}`)
  }
}

/**
 * Grava a recusa explícita de arte agora ("Enviar depois") — `deferred:true`,
 * sem `file_url`. Usado pelo `diferir:true` do `DefinirItemCarrinho` no
 * WhatsApp (`cart/setCartItem.ts`) — mesmo delete+insert de `attachArt`,
 * nunca duas implementações divergindo.
 */
export async function deferArt(
  supabase: SupabaseClient<Database>,
  pending: Pick<PendingArtRequirement, 'cartItemId' | 'opcaoItemId' | 'nomeCongelado' | 'precoDeltaCongelado'>,
): Promise<void> {
  await supabase
    .from('cart_item_options')
    .delete()
    .eq('cart_item_id', pending.cartItemId)
    .eq('option_item_id', pending.opcaoItemId)

  const { error } = await supabase.from('cart_item_options').insert({
    cart_item_id: pending.cartItemId,
    option_item_id: pending.opcaoItemId,
    frozen_name: pending.nomeCongelado,
    frozen_price_delta: pending.precoDeltaCongelado,
    deferred: true,
  })

  if (error) {
    throw new Error(`Falha ao adiar arte: ${error.message}`)
  }
}
