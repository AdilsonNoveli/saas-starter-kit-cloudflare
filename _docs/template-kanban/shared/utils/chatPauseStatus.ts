/**
 * Deriva o `ChatPauseStatus` de exibição a partir de `pausado_ate`/`pausado_motivo`
 * (`clientes`, migration 104). Único lugar que faz essa conta — antes copiada
 * em `conversations.get.ts`, `messages.get.ts`/`useChatRealtime.ts` e
 * `status.put.ts`, cada um com sua própria checagem de `pausado_ate > now()`.
 *
 * `pausado_ate` é sempre um PRAZO, nunca uma flag (`server/utils/whatsapp/pauseState.ts`):
 * a expiração é preguiçosa (só limpa quando a próxima mensagem do cliente
 * chega), então esta função pode ver um `pausado_motivo` "tecnicamente
 * expirado" no banco por um tempo — nesse caso já devolve `'agent'`, mesmo
 * sem o UPDATE de limpeza ter rodado ainda.
 */
import type { ChatPauseStatus } from '#shared/types/chat'

export function deriveChatPauseStatus(row: {
  readonly pausadoAte: string | null
  readonly pausadoMotivo: string | null
}): ChatPauseStatus {
  const ativo = Boolean(row.pausadoAte) && new Date(row.pausadoAte as string).getTime() > Date.now()
  if (!ativo) return 'agent'

  if (row.pausadoMotivo === 'manual') return 'human_manual'
  if (row.pausadoMotivo === 'resposta_humana') return 'human_echo'
  if (row.pausadoMotivo === 'transbordo') return 'transbordo'
  return 'agent'
}
