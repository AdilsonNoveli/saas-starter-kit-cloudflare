/**
 * Descrição de imagem recebida pelo WhatsApp (§7.2 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`).
 *
 * Puro por desenho, como `transcribeAudio`: bytes já baixados + client OpenAI
 * já montado pelo chamador. Não conhece fila, `wamid`, Supabase nem WhatsApp
 * (§2).
 */
import type OpenAI from 'openai'
import { exceedsMediaSizeLimit, type MediaResult, type MediaTokenUsage } from './mediaProcessing'

type ChatCompletionContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart

/** Mime de fallback quando o payload não trouxer `image.mime_type` (§1.3 — shape não confirmado). */
const DEFAULT_IMAGE_MIME = 'image/jpeg'

/** Teto de saída: a descrição tem 3 frases por contrato do prompt; o resto é gasto sem retorno. */
const MAX_DESCRIPTION_TOKENS = 400

/**
 * Prompt de extração orientado ao domínio (§7.2) — não é "descreva a imagem"
 * genérico. O consumidor da descrição é um atendente de pedidos, então o que
 * importa é produto, quantidade e dado de comprovante, nessa ordem.
 */
export const IMAGE_EXTRACTION_PROMPT = [
  'Você recebe a foto que um cliente enviou para uma loja pelo WhatsApp.',
  'Escreva em português, em no máximo 3 frases, só o que um atendente de pedidos precisa saber:',
  '- se houver produto, diga qual é (nome, marca, sabor, tamanho ou peso) e a quantidade visível;',
  '- se houver texto, etiqueta ou comprovante, transcreva os dados relevantes (valores, datas, nomes, códigos);',
  '- se for endereço, documento ou print de conversa, resuma a informação útil.',
  'Não opine, não sugira resposta ao cliente e não invente o que não está visível.',
  'Se a imagem estiver ilegível ou não tiver nada de útil para um pedido, diga isso em uma frase.',
].join('\n')

export interface DescribeImageInput {
  /** Client já construído com a chave resolvida pelo chamador (§9 — nunca lida aqui). */
  openai: OpenAI
  /** `loja.agente_modelo_visao` (default `gpt-4o-mini`). */
  model: string
  bytes: Uint8Array
  mimeType?: string | null
  /** `image.caption` — texto que o cliente digitou; não pode ser perdido (§7.2). */
  caption?: string | null
}

/**
 * `btoa` só aceita string binária, e `String.fromCharCode(...bytes)` estoura a
 * pilha bem antes dos 5 MB do limite da §7.5 — daí o fatiamento.
 */
const BASE64_CHUNK_SIZE = 0x8000

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE))
  }
  return btoa(binary)
}

function usageOf(usage: OpenAI.CompletionUsage | undefined): MediaTokenUsage | null {
  if (!usage) return null
  return { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens }
}

/**
 * Devolve `[imagem: <descrição>]` pronto para o buffer de rajada, com a legenda
 * do cliente preservada numa segunda linha quando existir. A descrição vem
 * achatada em uma linha de propósito: a marcação de proveniência tem que ficar
 * legível para o modelo do agente, que lê tudo como texto corrido.
 */
export async function describeImage(input: DescribeImageInput): Promise<MediaResult> {
  const startedAt = Date.now()
  const tamanhoBytes = input.bytes.byteLength
  const caption = input.caption?.trim() ?? ''
  const telemetry = (): { modelo: string, duracaoMs: number, tamanhoBytes: number } => ({
    modelo: input.model,
    duracaoMs: Date.now() - startedAt,
    tamanhoBytes,
  })

  // Segunda linha de defesa da §7.5 — ver `transcribeAudio`.
  if (exceedsMediaSizeLimit('image', tamanhoBytes)) {
    return { ok: false, motivo: 'tamanho', ...telemetry() }
  }

  // Data URL base64, nunca link: a URL da mídia exige `Authorization` do
  // provedor e a OpenAI não tem como enviar esse header (§7.2).
  const dataUrl = `data:${input.mimeType ?? DEFAULT_IMAGE_MIME};base64,${toBase64(input.bytes)}`

  // A legenda também vai como contexto antes da imagem: "quantos desses?" muda
  // o que interessa extrair da foto.
  const content: ChatCompletionContentPart[] = []
  if (caption) content.push({ type: 'text', text: `Legenda escrita pelo cliente: ${caption}` })
  content.push({ type: 'image_url', image_url: { url: dataUrl } })

  const completion = await input.openai.chat.completions.create({
    model: input.model,
    max_completion_tokens: MAX_DESCRIPTION_TOKENS,
    messages: [
      { role: 'system', content: IMAGE_EXTRACTION_PROMPT },
      { role: 'user', content },
    ],
  })

  const descricao = (completion.choices[0]?.message.content ?? '').replace(/\s+/g, ' ').trim()
  const usage = usageOf(completion.usage)

  if (!descricao) {
    // Sem descrição E sem legenda não há nada para o agente ler. Com legenda,
    // o turno segue com o texto do cliente: ele digitou aquilo e a §7.2 diz
    // explicitamente que não pode ser perdido.
    if (!caption) return { ok: false, motivo: 'vazio', ...telemetry() }
    return { ok: true, texto: caption, usage, ...telemetry() }
  }

  const texto = caption ? `[imagem: ${descricao}]\n${caption}` : `[imagem: ${descricao}]`
  return { ok: true, texto, usage, ...telemetry() }
}
