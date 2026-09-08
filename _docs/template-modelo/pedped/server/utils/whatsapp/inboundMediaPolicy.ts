/**
 * Tabela de degradação da §7.4 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`, como decisão
 * pura: dado o tipo da mensagem e as flags da loja, o que responder ao cliente.
 *
 * Existe separada do produtor por causa da regra nova da §2 — *nenhum caminho
 * de código pode terminar sem resposta ao cliente*. Uma tabela de decisão
 * exaustiva e testável é o que impede o `return` precoce silencioso da §1.1 de
 * voltar por descuido; o produtor só executa o que ela decide.
 *
 * As mensagens ficam aqui porque as duas pontas as usam: o produtor manda as
 * recusas síncronas, o consumer manda a de tamanho e a de falha (§7.4).
 */
import type { MediaKind } from '../media/mediaProcessing'
import type { ParsedInboundMedia } from './parseInboundPayload'

export const MEDIA_DISABLED_TEXT: Readonly<Record<MediaKind, string>> = {
  audio: 'Ainda não consigo ouvir áudios. Pode me escrever, por favor?',
  image: 'Ainda não consigo ver imagens. Pode me descrever por escrito?',
}

export const UNSUPPORTED_TYPE_TEXT = 'Consigo ler texto, ouvir áudios e ver imagens. Pode mandar de uma dessas formas?'

export const MEDIA_TOO_LARGE_TEXT = 'Esse arquivo é grande demais pra mim. Pode mandar um menor ou escrever?'

export const MEDIA_FAILED_TEXT = 'Não consegui abrir o que você mandou. Pode tentar de novo ou escrever?'

/** `null` para vídeo, documento, sticker, localização e contato — fora de escopo (§0). */
export function mediaKindOf(tipo: string): MediaKind | null {
  if (tipo === 'audio') return 'audio'
  if (tipo === 'image') return 'image'
  return null
}

export interface InboundMediaFlags {
  audioHabilitado: boolean
  imagemHabilitado: boolean
}

export interface InboundMediaDecisionInput {
  tipo: string
  texto: string | null
  midia: ParsedInboundMedia | null
  flags: InboundMediaFlags
}

export type InboundMediaDecision =
  /** Mensagem de texto normal — segue direto para o buffer de rajada. */
  | { acao: 'texto', texto: string }
  /** Áudio/imagem com o recurso ligado — vira linha `pendente` e entra na fila de mídia. */
  | { acao: 'processar', kind: MediaKind, midia: ParsedInboundMedia }
  /**
   * Recusa síncrona: o produtor responde e nada é enfileirado. `kind`/`midia`
   * vêm junto no caso do recurso desligado porque aí a mídia é identificável e
   * a §7.4 pede o registro `recusado` em `whatsapp_midia`; no tipo não
   * suportado não há `media_id` (coluna NOT NULL), então só resta a resposta.
   */
  | { acao: 'recusar', motivo: 'recurso_desligado', kind: MediaKind, midia: ParsedInboundMedia, mensagem: string }
  | { acao: 'recusar', motivo: 'tipo_nao_suportado', mensagem: string }

export function decideInboundMedia(input: InboundMediaDecisionInput): InboundMediaDecision {
  const texto = input.texto?.trim()
  if (texto) return { acao: 'texto', texto }

  const kind = mediaKindOf(input.tipo)
  // Sem `midia` não há `media_id`, e sem ele não existe download nem linha em
  // `whatsapp_midia` (`media_id` é NOT NULL). Cai na recusa de tipo, que é a
  // única resposta honesta: não sabemos o que o cliente mandou.
  if (!kind || !input.midia) return { acao: 'recusar', motivo: 'tipo_nao_suportado', mensagem: UNSUPPORTED_TYPE_TEXT }

  const habilitado = kind === 'audio' ? input.flags.audioHabilitado : input.flags.imagemHabilitado
  if (!habilitado) {
    return {
      acao: 'recusar',
      motivo: 'recurso_desligado',
      kind,
      midia: input.midia,
      mensagem: MEDIA_DISABLED_TEXT[kind],
    }
  }

  return { acao: 'processar', kind, midia: input.midia }
}
