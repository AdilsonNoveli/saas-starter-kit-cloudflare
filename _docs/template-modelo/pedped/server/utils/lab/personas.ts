/**
 * Personas roteiradas do laboratório de avaliação
 * (`_docs/implementar/prd-laboratorio-avaliacao-agente.md` §5.2). Cada
 * persona é um roteiro de falas enviadas SEQUENCIALMENTE ao agente real (sem
 * debounce, §6), uma conversa simulada completa julgada de uma vez ao final
 * pelo mesmo `conversationJudge.ts` da produção.
 *
 * **Agnóstico de segmento, de propósito**: a aplicação atende várias
 * instalações, cada uma com seu próprio catálogo (pizzaria, farmácia,
 * mercado...) — um roteiro nunca pode fixar nome de produto ("pizza de
 * calabresa"). Testar contra um produto que não existe nesta loja produz um
 * falso positivo de "alucinação" (o agente ofereceu uma alternativa real e o
 * juiz não tem como saber, porque não é isso que está sendo avaliado) e
 * quebra em qualquer instalação fora do ramo de pizzaria. `falas` é uma
 * função de `LabCatalogSample` (produtos DISPONÍVEIS reais desta loja,
 * resolvidos em runtime por `fetchLabCatalogSample`) — a fonte de verdade é
 * sempre o banco desta instalação, nunca um nome hardcoded.
 *
 * `key`/`label` vêm de `#shared/types/lab.ts` — fonte única também consumida
 * pela UI (dashboard), para as duas pontas nunca divergirem se uma persona
 * for renomeada.
 */
import { LAB_PERSONA_META } from '#shared/types/lab'
import type { LabCatalogSample } from './labCatalogSample'

export interface LabPersona {
  readonly key: string
  readonly label: string
  /** O que esta persona testa — vira o `contexto` passado ao juiz. */
  readonly proposito: string
  /** `sample` é `null` quando a loja tem menos de 3 produtos disponíveis — cada roteiro decide o fallback genérico. */
  readonly falas: (sample: LabCatalogSample | null) => readonly string[]
}

const GENERICO = 'alguma coisa do catálogo de vocês'

const LAB_PERSONA_SCRIPTS: Record<string, { proposito: string, falas: LabPersona['falas'] }> = {
  comprador_decidido: {
    proposito: 'Fluxo feliz até FinalizarPedido (lab-safe)',
    falas: (sample) => [
      'oi',
      `quero ${sample?.principal.toLowerCase() ?? GENERICO}`,
      'fecha o pedido, e pra retirada',
      'pode confirmar, pago no pix',
    ],
  },
  indeciso_precos: {
    proposito: 'REGRA 1 — nunca inventar preço sem tool',
    falas: (sample) => [
      `oi, quanto ta ${sample?.principal.toLowerCase() ?? GENERICO}?`,
      `e ${sample?.secundario.toLowerCase() ?? 'outra coisa que voces tenham'}, quanto sai?`,
      `e ${sample?.terciario.toLowerCase() ?? 'mais alguma opcao'}?`,
      'hmm deixa eu pensar mais um pouco',
    ],
  },
  endereco_fora_raio: {
    proposito: 'A regra que já quebrou em produção (armadilha 15/§8.13) — recusa correta + oferta de retirada, nunca delivery_mode=entrega',
    falas: (sample) => [
      'quero fazer um pedido pra entregar',
      `quero ${sample?.principal.toLowerCase() ?? GENERICO}`,
      'o endereco e Rua das Acacias, 3000, bairro muito longe da loja, pode ser?',
    ],
  },
  cliente_irritado: {
    proposito: 'Tom + léxico de transbordo (transbordoHeuristic.ts)',
    falas: () => [
      'ja e a terceira vez que eu mando mensagem e ninguem me responde direito',
      'quero cancelar meu pedido AGORA',
      'isso e um absurdo, quero que alguem processe meu cancelamento',
    ],
  },
  pede_humano: {
    proposito: 'Mede a lacuna de escalonamento por modelo (§7.6.5, não implementado ainda) — vira achado deveria_escalar, não é bug se não houver ação automática',
    falas: () => [
      'oi',
      'quero falar com uma pessoa de verdade, nao com robo',
    ],
  },
  girias_erros: {
    proposito: 'Robustez de parsing/tom com português coloquial',
    falas: (sample) => [
      'e ai blz? oq voces tem de bom hoje?',
      `kanto ta ${sample?.principal.toLowerCase() ?? GENERICO}`,
      `blz entao me fecha ${sample?.principal.toLowerCase() ?? GENERICO}`,
    ],
  },
}

export const LAB_PERSONAS: readonly LabPersona[] = LAB_PERSONA_META.map((meta) => ({
  key: meta.key,
  label: meta.label,
  ...LAB_PERSONA_SCRIPTS[meta.key]!,
}))

export function findLabPersona(key: string): LabPersona | undefined {
  return LAB_PERSONAS.find((p) => p.key === key)
}

/** Telefone sintético fixo por persona — DDD 21 reservado, nunca colide com um real (§5.3). */
export function labPersonaPhone(personaIndex: number): string {
  return `5521999990${String(personaIndex).padStart(3, '0')}`
}
