/**
 * Único lugar que decodifica o conteúdo de `whatsapp_conversas` — prefixo de
 * mídia derivada e autoria de exibição. Antes desta extração, o mesmo bloco
 * (com pequenas variações de regex) estava copiado em
 * `conversations.get.ts`, `messages.get.ts` e `useChatRealtime.ts` (G10 de
 * `_docs/CHAT/PRD.md`).
 */
import { AUDIO_TRANSCRIPT_PREFIX, IMAGE_DESCRIPTION_PREFIX, HUMAN_REPLY_PREFIX } from '#shared/constants/whatsapp'
import type { ChatMessageActor, ChatMessagePrefixType } from '#shared/types/chat'

export interface ParsedChatContent {
  readonly displayText: string
  readonly prefixType: ChatMessagePrefixType
}

/**
 * Decodifica só o CONTEÚDO (não a autoria — ver `deriveChatMessageAuthorship`).
 *
 * A extração da marcação de imagem remove o primeiro `]` que aparece depois
 * do prefixo, não `/\]$/` (fim da string) como o código duplicado original
 * fazia: esse ancoramento nunca batia quando havia legenda numa segunda
 * linha (`describeImage.ts` grava `[imagem: ...]\n<legenda>`), deixando um
 * `]` solto no texto exibido para o staff.
 */
export function parseChatMessageContent(content: string): ParsedChatContent {
  if (content.startsWith(AUDIO_TRANSCRIPT_PREFIX)) {
    return {
      prefixType: 'audio_transcript',
      displayText: content.slice(AUDIO_TRANSCRIPT_PREFIX.length).trim(),
    }
  }

  if (content.startsWith(IMAGE_DESCRIPTION_PREFIX)) {
    const afterOpen = content.slice(IMAGE_DESCRIPTION_PREFIX.length).replace(/^\s*/, '')
    const closeIdx = afterOpen.indexOf(']')
    const displayText = closeIdx === -1
      ? afterOpen.trim()
      : (afterOpen.slice(0, closeIdx) + afterOpen.slice(closeIdx + 1)).trim()
    return { prefixType: 'image_description', displayText }
  }

  if (content.startsWith(HUMAN_REPLY_PREFIX)) {
    return {
      prefixType: 'human_reply',
      displayText: content.slice(HUMAN_REPLY_PREFIX.length).trim(),
    }
  }

  return { prefixType: 'text', displayText: content }
}

export interface ChatMessageAuthorship {
  readonly isFromStaff: boolean
  readonly isFromAgent: boolean
}

/**
 * Autoria de exibição (bolha à direita/esquerda, ícone). Fonte primária é
 * `ator` (`whatsapp_conversas.ator`, migration 115) — só cai na heurística
 * por prefixo para linhas gravadas antes dela existir (`ator` ausente/nulo).
 * Nunca para linhas novas: todo escritor a partir da Fase 2 do PRD grava
 * `ator` explicitamente (§7.3.5 de `_docs/CHAT/PRD.md`).
 */
export function deriveChatMessageAuthorship(row: {
  readonly role: 'user' | 'assistant'
  readonly actor?: ChatMessageActor | null
  readonly prefixType: ChatMessagePrefixType
}): ChatMessageAuthorship {
  switch (row.actor) {
    case 'humano_painel':
    case 'humano_celular':
      return { isFromStaff: true, isFromAgent: false }
    case 'agente_ia':
      return { isFromStaff: false, isFromAgent: true }
    case 'cliente':
    case 'sistema':
      return { isFromStaff: false, isFromAgent: false }
    default: {
      // ator ausente — linha legada (anterior à migration 115): heurística
      // por prefixo, único jeito de saber quem escreveu antes de existir.
      if (row.prefixType === 'human_reply') return { isFromStaff: true, isFromAgent: false }
      if (row.role === 'assistant') return { isFromStaff: false, isFromAgent: true }
      return { isFromStaff: false, isFromAgent: false }
    }
  }
}

export interface ChatMessageRow {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly actor?: ChatMessageActor | null
}

export interface ParsedChatMessage extends ParsedChatContent, ChatMessageAuthorship {}

/** Combina as duas decodificações — atalho para quem precisa das duas (mensagens da thread). */
export function parseChatMessage(row: ChatMessageRow): ParsedChatMessage {
  const content = parseChatMessageContent(row.content)
  const authorship = deriveChatMessageAuthorship({ role: row.role, actor: row.actor, prefixType: content.prefixType })
  return { ...content, ...authorship }
}
