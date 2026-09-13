/**
 * Atalho determinístico para saudação pura — mesma filosofia de
 * `detectPromptInjection` (`guardrails.ts`): roda ANTES de `getCustomerContext`,
 * custo zero, decide sem chamar o modelo.
 *
 * Por que existe: `getCustomerContext`
 * (`server/utils/integration/getCustomerContext.ts`) paga vários round-trips
 * sequenciais ao Supabase (cliente, limpeza de sessão, perfil+endereços+
 * pedidos+sessão+contagem em paralelo, carrinho) para montar um BRIEFING que
 * uma saudação pura nunca usa — o prompt já instrui "SAUDACAO PURA NAO E
 * GATILHO" (`systemPrompt.ts`) e o modelo nunca chama tool nesse caso. Somado
 * a isso, o turno ainda paga uma chamada à OpenAI com o system prompt inteiro
 * (regras fixas + 6 notas + skill + briefing) e as tools todas anexadas — para
 * uma decisão de resposta que já está tomada antes de qualquer I/O. O
 * comentário em `whatsapp-queue.ts` sobre `replyWithoutModel` já reconhece
 * esse custo para os guardrails; este arquivo estende o mesmo raciocínio para
 * a saudação.
 *
 * Escopo estrito de propósito (mesma regra de `INJECTION_PATTERNS`): só
 * dispara quando a fala INTEIRA é composta de saudação — "oi, quero uma
 * pizza" não é saudação pura e precisa ir ao modelo normalmente. Falso
 * positivo aqui custa uma venda.
 *
 * Resposta genérica, sem o nome do agente/saudação customizada da loja
 * (`agente_nome`/`agente_saudacao`, migration 108) — personalizar exigiria
 * saber se é o primeiro contato do cliente, o que devolveria parte do custo
 * que este atalho existe para evitar. Cliente recorrente que manda só "oi"
 * também recebe esta resposta genérica; decisão de produto, não suposição
 * técnica.
 */
import { deaccent } from './guardrails'

/** Cada token tolera repetição de letra final ("oii", "boaa tarde", "olaaa"). */
const GREETING_TOKEN = '(?:oi+|ol[a]+|opa+|eae+|e\\s*ai|al[o0]+|salve+|bom\\s*dia|boa\\s*tarde|boa\\s*noite|tudo\\s*be?m|tudo\\s*bo?m|td\\s*bem|td\\s*bom|blz|beleza|suave|firmeza|de\\s*boa)'

/**
 * Ancorada do início ao fim da fala (após normalização): a mensagem inteira
 * precisa ser uma sequência de tokens de saudação separados por pontuação
 * leve/espaço — não basta CONTER um deles. É essa âncora que separa "oi tudo
 * bem" (saudação pura) de "oi, tudo bem? queria saber se tem pizza" (não é).
 */
const GREETING_PATTERN = new RegExp(
  `^[\\s,!.?~]*${GREETING_TOKEN}(?:[\\s,!.?~]+${GREETING_TOKEN})*[\\s,!.?~]*$`,
  'i',
)

/** REGRA 5 do prompt: curta, sem markdown, sem listar assuntos que a loja atende. */
export const GREETING_REPLY = 'Oi! Como posso te ajudar?'

/**
 * `true` só quando a fala inteira — já com as mensagens da rajada juntadas
 * (mesmo texto que `detectPromptInjection` recebe) — é composta só de
 * saudação, sem nenhum outro conteúdo.
 */
export function isPureGreeting(texto: string): boolean {
  const normalizado = deaccent(texto).trim()
  if (!normalizado) return false
  return GREETING_PATTERN.test(normalizado)
}
