import { z } from 'zod'

/**
 * Parser do payload inbound do webhook do WhatsApp (Meta Cloud API via o
 * provedor configurado) — seção 3 da arquitetura do agente WhatsApp. Campos confirmados
 * campo a campo contra captura real de produção (mensagem de texto, mensagem
 * de áudio e evento de status): `entry[0].changes[0].value.{messaging_product,
 * metadata.{display_phone_number,phone_number_id}, contacts[0].{profile.name,
 * wa_id,user_id}, messages[0].{from,from_user_id,id,timestamp,text.body,
 * audio.{id,mime_type,url},image.{id,mime_type,caption},type}}`.
 *
 * `midia` é populada para `audio` e `image` (§1.3 de
 * `_docs/implementar/arquitetura-midia-e-provedor-whatsapp.md`). O `url` inline
 * é **opcional em todos os tipos** de propósito: a captura real de áudio traz o
 * campo, mas o shape de `image` vem do contrato Meta e não de captura desta
 * instalação — o caminho primário de download (`GET /media/{id}`, §1.3) não
 * depende dele, e ele fica só como fallback.
 *
 * Tipo que não é `text`, `audio` nem `image` (vídeo, documento, sticker,
 * localização, contato) devolve a mensagem mesmo assim, com `texto` e `midia`
 * nulos: quem recusa educadamente é o produtor (§7.4), e devolver `null` aqui
 * repetiria o descarte silencioso da §1.1.
 *
 * Payloads sem `messages` (ex.: evento de status — entrega/leitura) não são
 * uma mensagem do cliente para o agente processar: `parseInboundPayload`
 * devolve `null` e o produtor apenas responde `200 OK` sem enfileirar nada.
 *
 * `value.message_echoes` (campo do envelope: `smb_message_echoes`, com
 * prefixo — o array interno é que se chama `message_echoes`) é o eco de uma
 * mensagem ENVIADA PELA LOJA, capturado apenas quando ela sai do app do
 * celular (nunca quando sai pela API — `_docs/em-andamento.md` §0.5.1). Não é
 * mensagem do cliente e `parseInboundPayload` continua devolvendo `null` para
 * ele. `parseEchoEvent` é a função dedicada — **discrimina por qual array
 * veio em `value`, nunca por `changes[].field`**: status e mensagem de
 * verdade usam o mesmo `field: "messages"`, confirmado em produção (§5,
 * armadilha 11 e §0.5.2 item c). No echo o cliente está em `to`
 * (`to_user_id` para o identificador estável); `from` é a própria loja.
 */
const inboundMediaSchema = z.object({
  id: z.string(),
  mime_type: z.string().optional(),
  /** Válido ~5 min (§1.3) e exige `Authorization` do provedor — fallback, nunca o caminho primário. */
  url: z.string().optional(),
  /** Texto que o cliente digitou junto da mídia; não pode ser perdido (§7.2). */
  caption: z.string().optional(),
  /**
   * Só `document` traz isto no contrato Meta Cloud API (`document.filename`).
   * NÃO confirmado contra captura real desta instalação (documento sempre
   * caiu no descarte de tipo não suportado até a migration 114) — shape
   * padrão da Cloud API, mesma reserva já registrada para `image` acima.
   */
  filename: z.string().optional(),
})

const inboundMessageSchema = z.object({
  from: z.string(),
  /**
   * Identificador estável do remetente, presente em todas as 4 capturas reais de
   * `payloads-waba.md`. Preferido a `contacts[].user_id` por ser da própria
   * mensagem: `contacts[]` é uma lista paralela, e casá-la por posição com
   * `messages[]` é suposição — este campo não precisa dela.
   */
  from_user_id: z.string().optional(),
  id: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  audio: inboundMediaSchema.optional(),
  image: inboundMediaSchema.optional(),
  /** Arte de produto (grupo upload_arquivo, migration 114) enviada como anexo/documento. */
  document: inboundMediaSchema.optional(),
  /**
   * Toque num botão de resposta rápida (`send/buttons`, sem migration de schema) — só
   * `button_reply` é usado hoje; `list_reply` (mensagem de lista) chega no
   * mesmo `type: "interactive"` mas ainda não tem tratamento, cai no
   * descarte de tipo não suportado como qualquer outro subtipo desconhecido.
   */
  interactive: z.object({
    type: z.string(),
    button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
  }).optional(),
})

const inboundContactSchema = z.object({
  /**
   * Ausente no echo e no status reais capturados (`payloads-waba.md`) — só a
   * mensagem do cliente traz `profile`. Opcional de propósito: exigi-lo aqui
   * derrubava echo e status inteiros na validação do envelope, antes mesmo de
   * chegar ao `if (!value.messages)`.
   */
  profile: z.object({ name: z.string() }).optional(),
  wa_id: z.string(),
  user_id: z.string().optional(),
})

/**
 * Item de `value.message_echoes` — mensagem enviada pela loja pelo app do
 * celular, ecoada pelo provedor. Campos confirmados contra a captura real de
 * 2026-07-29 (`payloads-waba.md`): `from` é a loja (igual a
 * `metadata.display_phone_number`), `to`/`to_user_id` são o CLIENTE.
 */
const inboundEchoMessageSchema = z.object({
  from: z.string(),
  to: z.string(),
  id: z.string(),
  to_user_id: z.string().optional(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
})

const inboundValueSchema = z.object({
  messaging_product: z.string(),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  contacts: z.array(inboundContactSchema).optional(),
  messages: z.array(inboundMessageSchema).optional(),
  message_echoes: z.array(inboundEchoMessageSchema).optional(),
})

const webhookPayloadSchema = z.object({
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: inboundValueSchema,
    })),
  })),
})

export interface ParsedInboundMedia {
  /** `audio.id`/`image.id`/`document.id` — o que `GET /media/{id}` recebe (§1.3). */
  mediaId: string
  /** `audio/ogg; codecs=opus` na captura real; ausente em payload sem o campo. */
  mimeType: string | null
  /** URL inline do payload — fallback de download, expira em ~5 min (§1.3). */
  url: string | null
  /** Legenda digitada pelo cliente (só `image` na prática). */
  caption: string | null
  /** Nome original do arquivo — só `document` traz isto (migration 114). */
  filename: string | null
}

export interface ParsedInboundMessage {
  /** Telefone de origem (`messages[0].from`), formato E.164 sem `+`. */
  telefone: string
  /** Id único da mensagem na Meta Cloud API — chave de dedup. */
  wamid: string
  /** Unix epoch (segundos) como string, conforme enviado pela Meta. */
  timestamp: string
  /** Tipo da mensagem (`text`, `audio`, `image`, ...). */
  tipo: string
  /** Corpo do texto — só populado quando `tipo === 'text'`. */
  texto: string | null
  /** Mídia — só populada para `audio` e `image`; `null` nos demais tipos. */
  midia: ParsedInboundMedia | null
  nomeContato: string | null
  waId: string | null
  /**
   * `lid` do WhatsApp — identificador **estável** do cliente, ao contrário do
   * telefone: sobrevive a troca de número na mesma conta. `null` quando o
   * payload não o trouxe. Propagado até `findOrCreateCustomer` pelo buffer de
   * rajada (FASE 0.4 de `_docs/em-andamento.md`).
   */
  userId: string | null
  phoneNumberId: string
  /**
   * `interactive.button_reply.id` — só populado quando `tipo === 'interactive'`
   * e o cliente tocou um botão de `send/buttons` (feature nova, ver
   * `handleButtonReply.ts`). `null` em qualquer outro tipo, e também quando o
   * `interactive` é de um subtipo ainda não tratado (ex.: `list_reply`).
   */
  botaoRespondidoId: string | null
}

/**
 * Evento próprio: mensagem da LOJA ecoada pelo provedor (§0.5.2 item c de
 * `_docs/em-andamento.md`) — nunca uma mensagem do cliente. Quem consome isto
 * para decidir o estado de atendimento é o item 2 da §7.6, ainda não
 * implementado; aqui só a extração e a discriminação.
 */
export interface ParsedInboundEcho {
  /** O CLIENTE — `message_echoes[].to`, nunca `.from` (armadilha nova, ver topo do arquivo). */
  telefone: string
  /** Id da mensagem ecoada. Mesmo GUID do wamid que o envio original devolveu (§0.5.1); comparação por GUID é responsabilidade de quem consumir isto. */
  wamid: string
  timestamp: string
  tipo: string
  /** `to_user_id` — identificador estável do cliente, equivalente ao `from_user_id` de `messages`. */
  userId: string | null
  phoneNumberId: string
  /**
   * Corpo do texto — só populado quando `tipo === 'text'` (mesma regra de
   * `ParsedInboundMessage.texto`). Consumido pelo item 2 da §7.6 de
   * `_docs/em-andamento.md` para gravar a fala do humano no histórico
   * (§0.5.2 item f) — `null` para os demais tipos de mensagem ecoada.
   */
  texto: string | null
}

type InboundMessage = z.infer<typeof inboundMessageSchema>

function extractMedia(message: InboundMessage): ParsedInboundMedia | null {
  const raw = message.type === 'audio'
    ? message.audio
    : message.type === 'image'
      ? message.image
      : message.type === 'document'
        ? message.document
        : undefined
  if (!raw) return null

  return {
    mediaId: raw.id,
    mimeType: raw.mime_type ?? null,
    url: raw.url ?? null,
    caption: raw.caption ?? null,
    filename: raw.filename ?? null,
  }
}

export function parseInboundPayload(rawBody: unknown): ParsedInboundMessage | null {
  const parsed = webhookPayloadSchema.safeParse(rawBody)
  if (!parsed.success) return null

  const value = parsed.data.entry[0]?.changes[0]?.value
  const message = value?.messages?.[0]
  if (!value || !message) return null

  const contact = value.contacts?.[0]

  return {
    telefone: message.from,
    wamid: message.id,
    timestamp: message.timestamp,
    tipo: message.type,
    texto: message.type === 'text' ? (message.text?.body ?? null) : null,
    midia: extractMedia(message),
    nomeContato: contact?.profile?.name ?? null,
    waId: contact?.wa_id ?? null,
    userId: message.from_user_id ?? contact?.user_id ?? null,
    phoneNumberId: value.metadata.phone_number_id,
    botaoRespondidoId: message.type === 'interactive' ? (message.interactive?.button_reply?.id ?? null) : null,
  }
}

/**
 * Reconhece `value.message_echoes` como evento próprio — nunca como mensagem
 * do cliente. Discrimina **por qual array veio** (`message_echoes`), nunca
 * por `changes[].field`: o campo do echo real é `smb_message_echoes`, mas o
 * de status é `messages`, igual ao de mensagem de verdade (§5, armadilha 11).
 *
 * `null` tanto para payload sem `message_echoes` quanto para payload que
 * falha na validação — o chamador não precisa (nem deve) distinguir os dois:
 * as duas situações significam "não é um echo".
 */
export function parseEchoEvent(rawBody: unknown): ParsedInboundEcho | null {
  const parsed = webhookPayloadSchema.safeParse(rawBody)
  if (!parsed.success) return null

  const value = parsed.data.entry[0]?.changes[0]?.value
  const echo = value?.message_echoes?.[0]
  if (!value || !echo) return null

  return {
    telefone: echo.to,
    wamid: echo.id,
    timestamp: echo.timestamp,
    tipo: echo.type,
    userId: echo.to_user_id ?? null,
    phoneNumberId: value.metadata.phone_number_id,
    texto: echo.type === 'text' ? (echo.text?.body ?? null) : null,
  }
}
