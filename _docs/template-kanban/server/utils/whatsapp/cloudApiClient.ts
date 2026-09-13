/**
 * Cliente do contrato oficial da WhatsApp Cloud API (Meta) — seção 3/6 da
 * arquitetura do agente WhatsApp. O transporte de hoje é um provedor de
 * WhatsApp homologado pela Meta (espelho 1:1 da Cloud API — payload/endpoints
 * idênticos, confirmado campo a campo contra
 * `_docs/implementar/api-1.yaml`/`_docs/implementar/Pedped whatsapp v3.json`),
 * mas é infraestrutura temporária: o App próprio do projeto ainda não foi
 * aprovado como Provedor de Tecnologia pela Meta. Nomear este arquivo pelo
 * contrato (não pelo provedor de hoje) mantém a troca futura restrita ao
 * endpoint/token aqui dentro — `agent/*` e o resto de `whatsapp/*` nunca
 * sabem quem está por trás.
 *
 * Auth confirmada contra `_docs/implementar/api-1.yaml`: sempre `Authorization: Bearer
 * sk_live_xxx` no header — o provedor não aceita `?access_token=` na URL como a
 * Meta. Endpoints/bodies portados campo a campo dos nodes `httpRequest` do
 * n8n (`_docs/implementar/Pedped whatsapp v3.json`):
 *   • `send/typing` com `{message_id}` marca a mensagem como lida E mostra o
 *     indicador "digitando" — um único endpoint para as duas coisas.
 *   • `send/text` com `{to, text}` — a única coisa que o cliente realmente vê.
 *   • `send/cta` com `{to, body, button_label, button_url}` — botão do
 *     catálogo digital.
 *   • `send/buttons` com `{to, body, buttons: [{id, title}]}` — até 3 botões
 *     de resposta rápida; o toque volta no webhook como
 *     `interactive.button_reply.id` (feature nova, `sendChoiceButtons`).
 */
import { z } from 'zod'
import { logger } from '~/core/services/logger.service'

/*
 * NÃO existe URL base padrão. Havia uma constante aqui com o endereço de um
 * fornecedor específico, usada como fallback e como DEFAULT da coluna
 * `loja.whatsapp_api_base_url` — o que fazia toda instalação nova nascer
 * acoplada a esse fornecedor sem ninguém escolher. A aplicação é agnóstica: a
 * URL do provedor é configuração obrigatória de quem instala (migration 103).
 */

export interface CloudApiClientConfig {
  apiToken: string
  /** URL base do provedor, sem barra final (ex.: `https://cloud.exemplo.com.br`). */
  baseUrl: string
}

/**
 * Único ponto que monta a credencial do provedor em header (§9 — nunca em
 * query string). `cloudApiMedia.ts` reusa daqui em vez de repetir o formato.
 */
export function cloudApiAuthHeader(config: CloudApiClientConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiToken}` }
}

/**
 * **Identidade do cliente** na camada de envio — item (d) da FASE 0.4 de
 * `_docs/em-andamento.md`. Este arquivo é o último lugar do fluxo que ainda
 * traduz identidade em telefone; todos os outros (buffer de rajada,
 * `whatsapp_midia`, `findOrCreateCustomer`) já são chaveados por identidade
 * desde as migrations 100/101.
 *
 * O `lid` viaja até aqui **de propósito, sem ser endereçável hoje**: o contrato
 * do provedor (`api-1.yaml:689`) só aceita `to` = telefone com DDI, não existe
 * `to_user_id` no envio (§5, armadilha 14). O que este tipo compra é que o dia
 * em que ele existir seja mudança de **um** lugar — `resolveRecipientAddress` —
 * e não de cada `sendText` espalhado pelo produtor, pelo consumer de turno e
 * pelo consumer de mídia.
 *
 * `telefone` é `string` (não `string | null`) de propósito: quem não tem
 * caminho de resposta precisa decidir isso **antes**, com registro no log
 * (`podeResponder` no consumer de turno, `finishMedia` no de mídia). Afrouxar
 * para nulo aqui transformaria essas duas saídas registradas em falha silenciosa.
 */
export interface WhatsappRecipient {
  /** Telefone E.164 sem `+` — o único endereçamento que o provedor aceita hoje. */
  telefone: string
  /** `@lid` do WhatsApp: identidade estável, sobrevive a troca de número. */
  lid?: string | null
}

/**
 * O ponto único de tradução identidade → endereçamento do provedor. Quando o
 * `user_id` for aceito no envio, é **só esta função** que muda.
 *
 * O `throw` não é defensivo por gosto: o tipo garante `string`, não garante
 * string **não vazia**, e `to: ""` seria um 400 que `sendText` ainda tentaria
 * três vezes antes de virar mensagem de falha para o cliente. Falhar aqui, com
 * o `lid` no texto, diz qual cliente ficou sem caminho de resposta.
 */
function resolveRecipientAddress(recipient: WhatsappRecipient): string {
  if (!recipient.telefone) {
    throw new Error(
      `Destinatário sem telefone (lid: ${recipient.lid ?? 'ausente'}) — o provedor não aceita user_id no envio (api-1.yaml:689).`,
    )
  }
  return recipient.telefone
}

/**
 * `SendResponse` do contrato (`api-1.yaml:51`): a Meta **aceitou** a mensagem e
 * devolve o `wamid` dela em `messages[0].id`. Nenhuma propriedade é `required`
 * no contrato, então tudo é opcional aqui — envio bem-sucedido cujo corpo não
 * traga o wamid **não pode** virar erro: a mensagem chegou ao cliente, e
 * transformar isso em exceção produziria uma segunda mensagem de fallback.
 */
const sendResponseSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).optional(),
})

async function cloudApiPost(config: CloudApiClientConfig, path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...cloudApiAuthHeader(config),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`WhatsApp Cloud API ${path} respondeu ${res.status}: ${detail.slice(0, 500)}`)
  }

  // Corpo vazio ou não-JSON é possível e não é falha de envio: devolve `null` e
  // quem chama decide. Antes do passo 1 da §0.5.1 este corpo era descartado, e
  // com ele o `wamid` da mensagem que nós mesmos mandamos.
  return await res.json().catch(() => null)
}

/**
 * Extrai o `wamid` da mensagem enviada — passo 1 da §0.5.1 de
 * `_docs/em-andamento.md`. **Só captura**: comparar echo com saída exige extrair
 * o GUID do wamid (o endereçamento varia entre echo e status — §5, armadilha
 * 12) e é item próprio, com spec própria alimentada pelos dois wamids reais.
 *
 * O `warn` na ausência é o que transforma o próprio deploy na captura que a
 * §0.5.1 pede: o contrato documenta `messages[0].id`, mas o provedor é um
 * espelho e este projeto não constrói sobre shape não verificado (§0.5.0b).
 */
function extractSentWamid(responseBody: unknown, path: string): string | null {
  const parsed = sendResponseSchema.safeParse(responseBody)
  const wamid = parsed.success ? (parsed.data.messages?.[0]?.id ?? null) : null

  if (!wamid) {
    logger.warn('[whatsapp] envio aceito sem wamid no corpo da resposta', { path })
  }
  return wamid
}

/**
 * Refresca "digitando" (e marca a última mensagem do lote como lida). Nunca
 * bloqueia o fluxo se falhar (`onError: continueRegularOutput` no n8n
 * original) — indicador de UX, não a resposta em si.
 */
export async function markReadAndTyping(config: CloudApiClientConfig, messageId: string): Promise<void> {
  try {
    await cloudApiPost(config, '/messages/send/typing', { message_id: messageId })
  } catch (err) {
    logger.warn('[whatsapp] falha ao marcar lida/digitando (ignorado)', { error: (err as Error).message })
  }
}

/**
 * Envia o texto final ao cliente — a única coisa que ele realmente vê.
 * Retry 3x/1s (mesma política do node "Responder (texto)" do n8n): quem
 * chama decide o que fazer se todas as tentativas falharem (a última rede de
 * segurança do consumer, seção 4).
 *
 * Devolve o `wamid` da mensagem enviada (`null` quando o provedor não o trouxe
 * no corpo) — §0.5.1, passo 2. Sem isso não há como o agente reconhecer o
 * **próprio echo** e ele se pausaria depois de cada resposta, em silêncio.
 *
 * O endereçamento é resolvido **antes** do laço: destinatário inválido é erro
 * de programação, não falha de rede, e não deve custar três tentativas e dois
 * segundos de espera até aparecer.
 */
export async function sendText(config: CloudApiClientConfig, recipient: WhatsappRecipient, text: string): Promise<string | null> {
  const to = resolveRecipientAddress(recipient)
  const MAX_TRIES = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      return extractSentWamid(await cloudApiPost(config, '/messages/send/text', { to, text }), '/messages/send/text')
    } catch (err) {
      lastError = err
      if (attempt < MAX_TRIES) await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Falha ao enviar mensagem via WhatsApp.')
}

export interface SendCtaButtonParams {
  recipient: WhatsappRecipient
  body: string
  buttonUrl: string
}

/**
 * Envio de baixo nível de UM botão `cta_url` — `sendCatalogButton` e
 * `sendExpressCheckoutButton` são as duas variantes de rótulo/destino (DRY:
 * mesma chamada HTTP, mesmo tratamento de erro). Nunca bloqueia o turno se
 * falhar (mesmo `onError: continueRegularOutput` do n8n) — a tool
 * `EnviarBotaoCatalogo` sempre devolve `{success:true}` ao modelo
 * independente do resultado real do envio. Por isso a resolução do
 * destinatário fica **dentro** do try: aqui nenhuma falha pode escapar, nem a
 * de programação.
 *
 * Devolve o `wamid` pelo mesmo motivo do `sendText`: o botão também volta
 * como echo.
 */
async function sendCtaButton(
  config: CloudApiClientConfig,
  params: SendCtaButtonParams,
  buttonLabel: string,
  logLabel: string,
): Promise<string | null> {
  try {
    const response = await cloudApiPost(config, '/messages/send/cta', {
      to: resolveRecipientAddress(params.recipient),
      body: params.body,
      button_label: buttonLabel,
      button_url: params.buttonUrl,
    })
    return extractSentWamid(response, '/messages/send/cta')
  } catch (err) {
    logger.warn(`[whatsapp] falha ao enviar ${logLabel} (ignorado)`, {
      error: (err as Error).message,
      lid: params.recipient.lid ?? null,
    })
    return null
  }
}

/** Envia o botão do catálogo digital (navegar a lista completa de itens). */
export async function sendCatalogButton(config: CloudApiClientConfig, params: SendCtaButtonParams): Promise<string | null> {
  // Agnóstico de segmento: nem toda loja chama isso de "catálogo" (menu,
  // portfólio, loja...) — "itens" funciona pra qualquer negócio.
  return sendCtaButton(config, params, 'Ver todos os itens', 'botão do catálogo')
}

/**
 * Envia o botão da Compra Expressa — abre o chat do site NA MESMA sessão
 * (`buttonUrl` carrega `&chat=1`, ver `whatsapp-queue.ts`), pra quem preferir
 * fechar o pedido conversando com o agente em vez de navegar a lista.
 * Sempre enviado JUNTO do botão do catálogo (`EnviarBotaoCatalogo`,
 * tools/catalog.ts) — as duas opções ficam lado a lado, uma não substitui a
 * outra.
 */
export async function sendExpressCheckoutButton(config: CloudApiClientConfig, params: SendCtaButtonParams): Promise<string | null> {
  return sendCtaButton(config, params, 'Compra Expressa', 'botão da compra expressa')
}

/**
 * Ids dos botões de `sendChoiceButtons` — estáveis por contrato: quem envia
 * (aqui) e quem interpreta o toque de volta (`handleButtonReply.ts`, via
 * `interactive.button_reply.id` no webhook) precisam concordar no literal.
 */
export const CHOICE_BUTTON_CATALOG_ID = 'ver_itens'
export const CHOICE_BUTTON_EXPRESS_ID = 'compra_rapida'

export interface SendChoiceButtonsParams {
  recipient: WhatsappRecipient
  body: string
}

/**
 * Envia OS DOIS convites (catálogo + Compra Expressa) numa mensagem só, com
 * botões de resposta rápida (`send/buttons`, sem migration de schema) — substitui as
 * duas mensagens `cta_url` separadas de antes. A Cloud API não aceita 2
 * botões de LINK na mesma mensagem (limite confirmado da Meta, não escolha
 * de código), então aqui o toque não abre nada direto: `handleButtonReply.ts`
 * recebe o `button_reply.id` no webhook e dispara, na hora e sem passar pelo
 * agente/IA, o único `cta_url` correspondente (`sendCatalogButton` ou
 * `sendExpressCheckoutButton`) — para o cliente, um toque = uma ação.
 */
export async function sendChoiceButtons(config: CloudApiClientConfig, params: SendChoiceButtonsParams): Promise<string | null> {
  try {
    const response = await cloudApiPost(config, '/messages/send/buttons', {
      to: resolveRecipientAddress(params.recipient),
      body: params.body,
      buttons: [
        { id: CHOICE_BUTTON_CATALOG_ID, title: 'Ver os Itens' },
        { id: CHOICE_BUTTON_EXPRESS_ID, title: 'Compra Rápida' },
      ],
    })
    return extractSentWamid(response, '/messages/send/buttons')
  } catch (err) {
    logger.warn('[whatsapp] falha ao enviar botões de escolha (ignorado)', {
      error: (err as Error).message,
      lid: params.recipient.lid ?? null,
    })
    return null
  }
}
