/**
 * Anexação automática de arte recebida pelo WhatsApp (documento/anexo OU
 * imagem) a um item do carrinho com grupo `upload_arquivo` pendente
 * (migration 114).
 *
 * Desenho: o modelo NUNCA relaya a URL do arquivo (`DefinirItemCarrinho` nem
 * aceita `arquivo_url` como parâmetro — ver `agent/tools/cart.ts`) — LLM
 * copiando um S3 key por tool call é risco real de corrupção. Em vez disso,
 * quando uma mídia chega e o cliente tem uma pendência real de arte no
 * carrinho (`missing_fields`, campo `arquivo_arte`), este módulo resolve a
 * sessão, sobe o arquivo pro S3 (mesmo `uploadFile()`/prefixo `artes-clientes/`
 * do catálogo web) e grava direto em `cart_items_opcoes` — sem o modelo tocar
 * na URL em nenhum momento. `processInboundMedia.ts` chama isto ANTES de
 * `describeImage`/para qualquer `document`; se não houver pendência, cai no
 * fluxo antigo inalterado (imagem) ou é recusado (documento — nunca teve
 * outro uso possível).
 *
 * Documento vs. foto NÃO são intercambiáveis: o WhatsApp recomprime fotos
 * (perde resolução — inaceitável pra arte de produção gráfica), então cada
 * grupo `upload_arquivo` declara os MIME types que aceita
 * (`arquivo_tipos_aceitos`) e o meio de envio errado é recusado com uma
 * mensagem que diz ao cliente qual é o certo (documento/anexo vs. foto),
 * nunca só "formato inválido".
 *
 * A resolução da pendência (FIFO) e a gravação em `cart_item_options` vivem
 * em `../cart/pendingArt.ts`. Este arquivo fica só com o que é específico do
 * WhatsApp: identidade por telefone e validação de bytes crus recebidos por
 * mídia.
 *
 * Fallback pós-pedido (migration 127): quando o carrinho ATIVO não tem
 * nenhuma pendência (caso comum — carrinho vazio, ou o cliente já resolveu
 * tudo), tenta achar um PEDIDO já criado com arte "Enviar depois" pendente
 * (`../orders/pendingOrderArt.ts`) antes de desistir — é exatamente o cenário
 * que sustenta o botão "Enviar depois": pedido fechado sem a arte, foto chega
 * minutos/dias depois.
 */
import { logger } from '~/core/services/logger.service'
import { maskPhone } from '../security/maskPhone'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { findOrCreateCustomer } from '../customers/findOrCreateCustomer'
import { getOrCreateActiveSession } from '../sessions/createCatalogSession'
import { findPendingArtRequirement, attachArt } from '../cart/pendingArt'
import { findPendingOrderArtRequirement, attachArtToOrder } from '../orders/pendingOrderArt'
import { uploadFile } from '../s3/upload'
import { ALLOWED_CUSTOMER_ART_TYPES, MAX_CUSTOMER_ART_SIZE, getBucketName } from '../s3/constants'

const DOCUMENT_MIME_TYPES = new Set(['application/pdf'])

export type AttachArtOutcome =
  | { attached: true, grupoNome: string }
  | { attached: false, motivo: 'sem_pendencia' }
  /** Tipo de mídia (foto vs. documento) errado PARA ESTE grupo — o arquivo em si pode até ser válido em outro contexto. */
  | { attached: false, motivo: 'precisa_documento' | 'precisa_foto' }
  | { attached: false, motivo: 'tipo_invalido' | 'tamanho' | 'falha' }

/**
 * Tenta anexar a mídia recebida (imagem OU documento) como arte de um grupo
 * `upload_arquivo` pendente. `attached: false, motivo: 'sem_pendencia'` é o
 * caso comum de IMAGEM (foto comum, sem nada esperando arte) — quem chama
 * cai de volta no fluxo de `describeImage` inalterado. Documento sem
 * pendência não tem fluxo alternativo (nunca teve) — quem chama recusa.
 */
/** Validação de mime/tamanho compartilhada pelos dois destinos (carrinho e pedido) — mesma whitelist, nunca duas regras divergindo. */
function validateIncomingArt(
  arquivo: { bytes: Uint8Array, mimeType: string | null },
  tiposAceitos: readonly string[],
  tamanhoMaximoMb: number,
): { ok: true, resolvedMime: string } | { ok: false, motivo: 'tipo_invalido' | 'precisa_documento' | 'precisa_foto' | 'tamanho' } {
  // WhatsApp normaliza fotos pra JPEG antes de entregar — o mime real chega
  // aqui, mas a whitelist é a MESMA do upload do catálogo web (nunca mais
  // ampla): imagem/documento que não bater é recusado, nunca aceito "porque
  // veio do WhatsApp".
  const resolvedMime = arquivo.mimeType ?? 'application/octet-stream'
  if (!ALLOWED_CUSTOMER_ART_TYPES.includes(resolvedMime as (typeof ALLOWED_CUSTOMER_ART_TYPES)[number])) {
    return { ok: false, motivo: 'tipo_invalido' }
  }

  // O grupo deste produto pode exigir só documento (PDF — arte pronta pra
  // produção) ou aceitar foto também (ex.: grupo "contratar criação de
  // arte", configurado com arquivo_tipos_aceitos incluindo image/*). O meio
  // de envio errado é recusado com a orientação certa, não um "recusado"
  // genérico — WhatsApp comprime foto, então documento pedido não pode virar
  // foto silenciosamente aceita.
  if (!tiposAceitos.includes(resolvedMime)) {
    const grupoQuerDocumento = tiposAceitos.every((t) => DOCUMENT_MIME_TYPES.has(t))
    return { ok: false, motivo: grupoQuerDocumento ? 'precisa_documento' : 'precisa_foto' }
  }

  const maxBytes = Math.min(tamanhoMaximoMb * 1024 * 1024, MAX_CUSTOMER_ART_SIZE)
  if (arquivo.bytes.byteLength > maxBytes) {
    return { ok: false, motivo: 'tamanho' }
  }

  return { ok: true, resolvedMime }
}

export async function tryAttachIncomingFileAsArt(
  supabase: SupabaseClient<Database>,
  identidade: { telefone: string | null, lid: string | null },
  arquivo: { bytes: Uint8Array, mimeType: string | null, filename: string | null },
): Promise<AttachArtOutcome> {
  if (!identidade.telefone) return { attached: false, motivo: 'sem_pendencia' }

  const customer = await findOrCreateCustomer(supabase, {
    whatsapp: identidade.telefone,
    ...(identidade.lid ? { lid: identidade.lid } : {}),
  })
  const session = await getOrCreateActiveSession(supabase, customer.id)

  const pendingCart = await findPendingArtRequirement(supabase, session.sessaoId)
  // Sem pendência no carrinho ATIVO (caso comum): tenta um pedido já criado
  // com "Enviar depois" pendente antes de desistir (migration 127).
  const pendingOrder = pendingCart ? null : await findPendingOrderArtRequirement(supabase, customer.id)
  if (!pendingCart && !pendingOrder) return { attached: false, motivo: 'sem_pendencia' }

  const tiposAceitos = pendingCart?.arquivoTiposAceitos ?? pendingOrder!.arquivoTiposAceitos
  const tamanhoMaximoMb = pendingCart?.arquivoTamanhoMaximoMb ?? pendingOrder!.arquivoTamanhoMaximoMb
  const nomeCongelado = pendingCart?.nomeCongelado ?? pendingOrder!.nomeCongelado

  const validacao = validateIncomingArt(arquivo, tiposAceitos, tamanhoMaximoMb)
  if (!validacao.ok) return { attached: false, motivo: validacao.motivo }

  try {
    const extensao = validacao.resolvedMime === 'application/pdf' ? 'pdf' : 'jpg'
    const uploadResult = await uploadFile(Buffer.from(arquivo.bytes), {
      fileName: arquivo.filename ?? `whatsapp-${Date.now()}.${extensao}`,
      fileSize: arquivo.bytes.byteLength,
      mimeType: validacao.resolvedMime,
      bucket: getBucketName('attachments'),
      uploadedBy: identidade.telefone,
      keyPrefix: 'artes-clientes',
    })
    const arquivoGravado = { url: uploadResult.url, nomeOriginal: arquivo.filename ?? `arte-whatsapp.${extensao}` }

    if (pendingCart) {
      await attachArt(supabase, pendingCart, arquivoGravado)
    } else {
      await attachArtToOrder(supabase, pendingOrder!, arquivoGravado)
    }

    return { attached: true, grupoNome: nomeCongelado }
  } catch (err: unknown) {
    logger.error('[whatsapp-media] falha ao anexar arte recebida', {
      telefone: maskPhone(identidade.telefone),
      error: err instanceof Error ? err.message : String(err),
    })
    return { attached: false, motivo: 'falha' }
  }
}
