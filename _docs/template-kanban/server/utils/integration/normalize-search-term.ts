/**
 * normalize-search-term.ts
 *
 * Pipeline de normalização do input de busca recebido da LLM (n8n / gpt-4o-mini).
 *
 * ## Contexto
 * O agente envia o parâmetro `q` usando `$fromAI('q', 'termo de busca do produto...')`.
 * Com `temperature: 0.3`, o modelo produz strings razoáveis mas ainda pode:
 *   - incluir artigos/preposições ("uma pizza de calabresa")
 *   - usar sinônimos coloquiais ("refri", "esfirra")
 *   - variar caixa e acento (o banco já lida com isso via unaccent/lower na RPC,
 *     mas normalizar antes reduz o número de trigramas irrelevantes)
 *
 * ## Design
 * Função pura (sem side effects, sem I/O, sem estado global).
 * Testável unitariamente sem banco de dados.
 * Importada apenas por `products.get.ts` — não é exposta ao cliente.
 *
 * ## Pipeline (ordem importa)
 * 1. trim + colapso de espaços múltiplos
 * 2. lowercase (antes de stop words e aliases — comparação case-insensitive)
 * 3. remoção de stop words PT-BR (artigos, preposições, conjunções comuns)
 * 4. expansão de aliases (sinônimos coloquiais → termos canônicos do cardápio)
 * 5. sanitização de caracteres especiais (segurança — remove chars fora de [a-z0-9 àáâãéêíóôõúüç])
 * 6. colapso final de espaços
 * 7. retorna undefined se string vazia após pipeline (fallback gracioso no endpoint)
 *
 * ## Nota sobre acentos na normalização
 * O módulo NÃO remove acentos aqui propositalmente. A remoção acontece no banco
 * via `extensions.unaccent()` na função `search_products`. Remover acentos aqui
 * e no banco causaria dupla normalização sem ganho. Aliases já usam a forma
 * canônica com acento (ex: 'esfiha' em vez de 'esfiha') para consistência.
 */

// ─── Stop Words PT-BR ──────────────────────────────────────────────────────────
// Conjunto mínimo e seguro: apenas palavras que NUNCA são nome de produto.
// Deliberadamente excluídos para evitar over-removing:
//   - "de" em isolado: "de" pode compor nome de produto em alguns contextos (raro)
//     mas em frases como "uma pizza de calabresa" o "de" é preposição irrelevante.
//     Incluído porque o risco de remover "de" de um nome composto é negligenciável
//     vs. o ganho de limpar frases descritivas.
//   - "sem": intencional — "pizza sem glúten" precisa do "sem" para sentido.
//     NÃO está na lista.
//   - "com": idem — "frango com requeijão" precisa do "com". NÃO está.
export const PT_STOP_WORDS: ReadonlySet<string> = new Set([
  // artigos definidos
  'o', 'a', 'os', 'as',
  // artigos indefinidos
  'um', 'uma', 'uns', 'umas',
  // preposições simples (sem "com" e "sem" — ver nota acima)
  'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas',
  'por', 'pelo', 'pela', 'pelos', 'pelas',
  'para', 'pro', 'pra',
  // conjunção (quando usada como conectivo, ex: "frango e batata")
  // NÃO removemos "e" para preservar "pão e queijo" → só uma palavra depois
  // Na prática, a LLM raramente envia "e" em termos de busca — custo-benefício ruim.
  // Deixamos fora da lista.
])

// ─── Aliases ───────────────────────────────────────────────────────────────────
// Mapa de variações coloquiais → termos canônicos.
//
// Regras de construção:
//   • Chave: sempre lowercase, sem acento (como a string chega após step 2)
//   • Valor: forma canônica do catálogo, com acento se necessário
//   • Substituição é de PALAVRA INTEIRA (word boundary implícito via split/join)
//     — "refri" em "refri gelado" vira "refrigerante gelado"; não vira
//       "refrigerantegelado" em "refrigulado" (que não existe, mas é a garantia).
//
// Categorias de aliases:
//   A) Erros fonéticos comuns PT-BR
//   B) Abreviações coloquiais
//   C) Sinônimos regionais
//   D) Variações ortográficas
export const PRODUCT_ALIASES: ReadonlyMap<string, string> = new Map([
  // A) Erros fonéticos
  ['esfirra', 'esfiha'],
  ['esfihra', 'esfiha'],
  ['esfira',  'esfiha'],

  // B) Abreviações coloquiais
  ['refri',      'refrigerante'],
  ['refrig',     'refrigerante'],
  ['choco',      'chocolate'],
  ['chop',       'chope'],          // chop (abreviação) → chope
  ['lanche',     'sanduíche'],      // em muitos cardápios, "lanche" = "sanduíche"
  ['nat',        'natural'],
  ['int',        'integral'],

  // C) Sinônimos regionais / termos coloquiais
  ['fritas',     'batata frita'],
  ['batatinha',  'batata frita'],
  ['x-burguer',  'x-burguer'],      // mantido (já é a grafia comum)
  ['xburguer',   'x-burguer'],
  ['x burguer',  'x-burguer'],
  ['hamburguer', 'hambúrguer'],     // grafia sem acento → com acento
  ['hamburguer', 'hambúrguer'],
  ['suco',       'suco'],           // mantido (sem alias, mas entrada consistente)
  ['sumo',       'suco'],           // "sumo" (Portugal/alguns estados) → "suco"
  ['vitamina',   'vitamina'],       // manter (vitaminas são produtos específicos)
  ['misto',      'misto quente'],   // "misto" isolado geralmente refere ao sanduíche

  // D) Variações ortográficas comuns
  ['açai',       'açaí'],
  ['acai',       'açaí'],
  ['cafe',       'café'],           // sem acento → com acento (embora o banco faça unaccent)
  ['pao',        'pão'],
  ['limao',      'limão'],
  ['maracuja',   'maracujá'],
  ['goiaba',     'goiaba'],         // já correto, alias defensivo
  ['abacaxi',    'abacaxi'],        // idem
])

// ─── Pipeline principal ────────────────────────────────────────────────────────

/**
 * Normaliza o termo de busca recebido da LLM antes de enviá-lo ao banco.
 *
 * @param raw - String bruta recebida em `req.query.q`
 * @returns String normalizada ou `undefined` se vazia após processamento
 */
export function normalizeSearchTerm(raw: string | undefined): string | undefined {
  if (!raw) return undefined

  // Step 1: trim + colapso inicial de espaços
  let term = raw.trim().replace(/\s+/g, ' ')
  if (!term) return undefined

  // Step 2: lowercase (todas as comparações subsequentes são case-insensitive)
  term = term.toLowerCase()

  // Step 3: remoção de stop words
  // Split por espaço, filtra palavras que estão no conjunto, rejunta.
  // Preserva ordem das palavras restantes.
  const words = term.split(' ').filter(w => w.length > 0 && !PT_STOP_WORDS.has(w))
  if (words.length === 0) return undefined

  // Step 4: expansão de aliases (palavra por palavra)
  // Primeiro tenta match de bigrama (ex: "x burguer"), depois unigrama.
  // Abordagem: sliding window de tamanho 2, depois 1.
  const expanded: string[] = []
  let i = 0
  while (i < words.length) {
    // Extrai palavra atual — necessário porque noUncheckedIndexedAccess
    // torna words[i] do tipo `string | undefined` mesmo dentro do while.
    const currentWord = words[i] as string

    // Tenta bigrama (janela de 2 palavras)
    if (i + 1 < words.length) {
      const nextWord = words[i + 1] as string
      const bigram = `${currentWord} ${nextWord}`
      const bigramAlias = PRODUCT_ALIASES.get(bigram)
      if (bigramAlias) {
        expanded.push(bigramAlias)
        i += 2
        continue
      }
    }
    // Unigrama
    const unigramAlias = PRODUCT_ALIASES.get(currentWord)
    expanded.push(unigramAlias ?? currentWord)
    i++
  }

  // Step 5: sanitização — mantém apenas letras (incluindo acentuadas), dígitos e espaço.
  // Remove caracteres que poderiam causar problemas em logs ou codificações inesperadas.
  // NÃO é proteção contra SQL injection — parâmetros são passados como bind params
  // via supabase.rpc(). Esta etapa é apenas higiene de input.
  term = expanded.join(' ').replace(/[^\p{L}\p{N} ]/gu, '')

  // Step 6: colapso final de espaços (aliases podem gerar espaços duplos)
  term = term.replace(/\s+/g, ' ').trim()

  return term.length > 0 ? term : undefined
}
