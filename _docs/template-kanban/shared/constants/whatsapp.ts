/**
 * Marcações de proveniência gravadas em `whatsapp_conversas.content` —
 * fonte única (G10/G11 de `_docs/CHAT/PRD.md`).
 *
 * Antes desta extração, `HUMAN_REPLY_PREFIX` vivia em
 * `server/utils/agent/systemPrompt.ts` — um arquivo de *prompt engineering*
 * do agente IA que `server/api/admin/chat/[clienteId]/messages.post.ts`
 * (uma rota REST do chat) importava direto (G11). Mudar o texto do prompt
 * por engano mudava o contrato de dado do chat. Aqui não pertence a nenhum
 * dos dois — é lido por quem ESCREVE (`server/utils/media/transcribeAudio.ts`,
 * `server/utils/media/describeImage.ts`, `server/utils/chat/chatService.ts`,
 * `server/utils/whatsapp/handleEchoEvent.ts`) e por quem LÊ
 * (`shared/utils/chatMessage.ts`, `server/utils/agent/systemPrompt.ts`).
 *
 * `AUDIO_TRANSCRIPT_PREFIX`/`IMAGE_DESCRIPTION_PREFIX` marcam CONTEÚDO
 * derivado (transcrição/descrição gerada por IA a partir de mídia).
 * `HUMAN_REPLY_PREFIX` marca AUTORIA (loja respondendo, não o agente) — dois
 * propósitos diferentes que não devem se misturar na mesma coluna (§7.3.2 de
 * `_docs/CHAT/PRD.md`); a partir da migration 115, autoria também é
 * modelada explicitamente em `whatsapp_conversas.ator`, mas o prefixo
 * continua sendo gravado no texto porque é isso que o PROMPT do agente lê
 * (o agente nunca vê a coluna `ator` — só `role`/`content` do histórico).
 */
export const AUDIO_TRANSCRIPT_PREFIX = '[áudio transcrito]'
export const IMAGE_DESCRIPTION_PREFIX = '[imagem:'
export const HUMAN_REPLY_PREFIX = '[loja respondeu manualmente]'
