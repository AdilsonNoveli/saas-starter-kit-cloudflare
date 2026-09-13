import { describe, expect, it } from 'vitest'
import {
  AGENT_JUDGE_RULES,
  CATALOG_PRIORITY_NOTE,
  CONVERSATION_STATE_NOTE,
  FIXED_RULES,
  PRODUCT_OPTIONS_NOTE,
  QUANTITY_LIMITS_NOTE,
  SALES_FLOW_NOTE,
  TECHNICAL_ERROR_NOTE,
  buildAgentIdentityNote,
  buildSystemPrompt,
} from './systemPrompt'

describe('TECHNICAL_ERROR_NOTE / CATALOG_PRIORITY_NOTE — detalham REGRA 4/REGRA 2 sem alterá-las', () => {
  it('entram no system prompt', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING' })
    expect(prompt).toContain(TECHNICAL_ERROR_NOTE)
    expect(prompt).toContain(CATALOG_PRIORITY_NOTE)
  })

  it('NÃO contaminam FIXED_RULES — mesmo guard byte-a-byte da armadilha nº 7', () => {
    expect(FIXED_RULES).not.toContain('PROIBIDO em erro tecnico')
    expect(FIXED_RULES).not.toContain('PRIORIDADE DA LISTA COMPLETA')
  })

  it('banem explicitamente as frases que expuseram a falha técnica em produção (05/08)', () => {
    expect(TECHNICAL_ERROR_NOTE).toContain('tive um problema')
    expect(TECHNICAL_ERROR_NOTE).toContain('nao consegui adicionar')
  })

  it('CATALOG_PRIORITY_NOTE nunca impõe a palavra "catalogo" ao cliente — agnóstico de segmento', () => {
    expect(CATALOG_PRIORITY_NOTE).toContain('NUNCA a palavra "catalogo"')
  })

  it('CATALOG_PRIORITY_NOTE trata saudação pura como conversa social — nunca gatilho de tool (regressão 05/08)', () => {
    // Transcrição real: "Olá boa tarde" → agente respondeu empurrando o
    // catálogo direto ("Quer dar uma olhada no que a gente tem?"). REGRA 2 já
    // isenta "conversa social pura", mas a nota de catálogo não deixava
    // explícito que uma saudação sozinha se enquadra nisso.
    expect(CATALOG_PRIORITY_NOTE).toContain('SAUDACAO PURA NAO E GATILHO')
    expect(CATALOG_PRIORITY_NOTE).toContain('SEM chamar EnviarBotaoCatalogo nem BuscarProdutos')
  })

  it('entram também nas regras do juiz de qualidade (produção + laboratório)', () => {
    expect(AGENT_JUDGE_RULES).toContain(TECHNICAL_ERROR_NOTE)
    expect(AGENT_JUDGE_RULES).toContain(CATALOG_PRIORITY_NOTE)
  })
})

describe('AGENT_IDENTITY_NOTE — nome/saudação do agente (migration 108)', () => {
  it('sem agenteNome configurado, o prompt fica igual ao de antes (sem a nota)', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING' })
    expect(prompt).not.toContain('IDENTIDADE (detalha a REGRA 5)')
  })

  it('primeiro contato (isFirstContact=true): a nota entra com instrução de se apresentar', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING', agenteNome: 'Marcos', isFirstContact: true })
    expect(prompt).toContain('IDENTIDADE (detalha a REGRA 5)')
    expect(prompt).toContain('Seu nome e Marcos.')
    expect(prompt).toContain('PRIMEIRA mensagem')
  })

  it('sem isFirstContact informado (default false): NÃO instrui a se apresentar — mais seguro que reintroduzir à toa', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING', agenteNome: 'Marcos' })
    expect(prompt).toContain('IDENTIDADE (detalha a REGRA 5)')
    expect(prompt).not.toContain('PRIMEIRA mensagem')
    expect(prompt).toContain('NAO se apresente')
  })

  it('a decisão de apresentar-se é do CÓDIGO (isFirstContact), nunca de o modelo ler uma flag no briefing (regressão 05/08)', () => {
    // Bug real: a v1 pedia pro modelo checar "customer_profile.is_new_customer"
    // no texto do briefing — mas buildCustomerBriefing() nunca renderizava
    // esse campo em lugar nenhum, então a apresentação nunca acontecia.
    // A correção elimina de vez essa leitura condicional de dado por texto.
    const nota = buildAgentIdentityNote('Marcos', null, true)
    expect(nota).not.toContain('is_new_customer')
    expect(nota).not.toContain('customer_profile')
  })

  it('usa saudação custom quando informada, senão monta uma padrão a partir do nome', () => {
    const comCustom = buildAgentIdentityNote('Marcos', 'Bem-vindo à Pizzaria do Zé!', true)
    expect(comCustom).toContain('Bem-vindo à Pizzaria do Zé!')

    const semCustom = buildAgentIdentityNote('Marcos', null, true)
    expect(semCustom).toContain('Aqui e o Marcos')
  })

  it('conversa já iniciada (isFirstContact=false): instrui a NÃO se apresentar nem repetir o nome', () => {
    const nota = buildAgentIdentityNote('Marcos', null, false)
    expect(nota).toContain('NAO se apresente')
    expect(nota).not.toContain('PRIMEIRA mensagem')
  })

  it('proíbe explicitamente recitar a lista de assuntos ou empurrar o catálogo na saudação (falha real de produção 05/08)', () => {
    const nota = buildAgentIdentityNote('Marcos', null, true)
    expect(nota.toLowerCase()).toContain('lista de assuntos')
    expect(nota.toLowerCase()).toContain('nunca empurra o catalogo')
  })

  it('NÃO contamina FIXED_RULES — mesmo guard byte-a-byte da armadilha nº 7', () => {
    expect(FIXED_RULES).not.toContain('IDENTIDADE (detalha a REGRA 5)')
  })
})

describe('SALES_FLOW_NOTE — parar de repetir preço + usar sinais de venda que já existem (itens 3a/4a)', () => {
  it('entra no system prompt e nas regras do juiz', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING' })
    expect(prompt).toContain(SALES_FLOW_NOTE)
    expect(AGENT_JUDGE_RULES).toContain(SALES_FLOW_NOTE)
  })

  it('NÃO contamina FIXED_RULES — mesmo guard byte-a-byte da armadilha nº 7', () => {
    expect(FIXED_RULES).not.toContain('FLUXO DE VENDA')
  })

  it('proíbe recitar preço de item já confirmado — causa raiz medida em produção 05/08', () => {
    expect(SALES_FLOW_NOTE).toContain('NUNCA repita de novo o preco UNITARIO')
  })

  it('instrui a comemorar em_promocao e oferecer o INCENTIVO antes do checkout', () => {
    expect(SALES_FLOW_NOTE).toContain('em_promocao=true')
    expect(SALES_FLOW_NOTE).toContain('INCENTIVO')
  })

  it('reforça a oferta de produtos relacionados (venda casada)', () => {
    expect(SALES_FLOW_NOTE).toContain('relacionados')
  })

  it('instrui a tratar pergunta de pós-venda como pedido de status atualizado, não memória da conversa', () => {
    expect(SALES_FLOW_NOTE).toContain('como esta meu pedido')
    expect(SALES_FLOW_NOTE).toContain('status ATUALIZADO')
  })

  it('exige o valor exato do desconto na confirmação — proíbe "você economiza" sem número (regressão 05/08, 2ª rodada)', () => {
    // Transcrição real: "10 pizzas Cinco Queijos adicionadas, você economiza
    // no total" — sem valor nenhum. A v1 desta nota tratava o número do
    // desconto como "detalhe de preço" a suprimir, no mesmo parágrafo que
    // instruía a não repetir preço.
    expect(SALES_FLOW_NOTE).toContain('NUNCA diga so "voce economiza"')
    expect(SALES_FLOW_NOTE).toContain('SEMPRE diga o valor exato')
  })

  it('distingue preço unitário repetido (suprimir) de desconto novo (sempre informar)', () => {
    expect(SALES_FLOW_NOTE).toContain('preco UNITARIO')
    expect(SALES_FLOW_NOTE).toContain('Desconto e diferente')
  })
})

describe('QUANTITY_LIMITS_NOTE — proíbe inventar limite de quantidade (regressão 05/08, 2ª rodada)', () => {
  it('entra no system prompt e nas regras do juiz', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING' })
    expect(prompt).toContain(QUANTITY_LIMITS_NOTE)
    expect(AGENT_JUDGE_RULES).toContain(QUANTITY_LIMITS_NOTE)
  })

  it('NÃO contamina FIXED_RULES — mesmo guard byte-a-byte da armadilha nº 7', () => {
    expect(FIXED_RULES).not.toContain('LIMITE DE QUANTIDADE (detalha a REGRA 3)')
  })

  it('deixa explícito que min/max_quantity só existem dentro de "preorder" — só para produto de encomenda', () => {
    // Caso real: "aumente para 20 pizzas" (pronta entrega, sem campo
    // "preorder" no retorno) recebeu "o máximo é 10 unidades" — um limite
    // inventado pelo modelo, sem gestão de estoque nenhuma no sistema.
    expect(QUANTITY_LIMITS_NOTE).toContain('dentro do campo "preorder"')
    expect(QUANTITY_LIMITS_NOTE).toContain('so existe pra produto de encomenda')
  })

  it('proíbe explicitamente "o máximo é X" sem um dos dois campos preenchido', () => {
    expect(QUANTITY_LIMITS_NOTE).toContain('Nunca diga "o maximo e X"')
  })

  it('cobre a segunda fonte de limite (Gestão de Estoque, migration 111): quantidade_disponivel', () => {
    // Migration 111 deu ao sistema um dado real de estoque — esta nota foi
    // REESCRITA (não só complementada) para o modelo parar de tratar "sem
    // gestão de estoque" como fato permanente.
    expect(QUANTITY_LIMITS_NOTE).not.toContain('o sistema nao tem gestao de estoque')
    expect(QUANTITY_LIMITS_NOTE).toContain('quantidade_disponivel')
    expect(QUANTITY_LIMITS_NOTE).toContain('quando vier null')
  })

  it('nunca inventa limite quando quantidade_disponivel vier null e não houver preorder', () => {
    expect(QUANTITY_LIMITS_NOTE).toContain('NAO TEM limite nenhum')
    expect(QUANTITY_LIMITS_NOTE).toContain('aceita qualquer quantidade grande normalmente')
  })

  it('instrui a informar o número exato de quantidade_disponivel como limite, nunca arredondar', () => {
    expect(QUANTITY_LIMITS_NOTE).toContain('informe exatamente esse numero')
    expect(QUANTITY_LIMITS_NOTE).toContain('nunca arredonde')
  })
})

describe('PRODUCT_OPTIONS_NOTE — opções/variações de produto (migration 110)', () => {
  it('entra no system prompt e nas regras do juiz', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING' })
    expect(prompt).toContain(PRODUCT_OPTIONS_NOTE)
    expect(AGENT_JUDGE_RULES).toContain(PRODUCT_OPTIONS_NOTE)
  })

  it('NÃO contamina FIXED_RULES — mesmo guard byte-a-byte da armadilha nº 7', () => {
    expect(FIXED_RULES).not.toContain('OPCOES E VARIACOES DE PRODUTO')
  })

  it('instrui a consultar ConsultarOpcoesProduto antes de DefinirItemCarrinho quando tem_opcoes=true', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('tem_opcoes=true')
    expect(PRODUCT_OPTIONS_NOTE).toContain('ConsultarOpcoesProduto ANTES de chamar DefinirItemCarrinho')
  })

  it('proíbe adivinhar grupo obrigatório', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('nunca adivinhe')
  })

  it('instrui a usar cart_item_id para reduzir/remover item com opções, sem recompor de memória', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('cart_item_id')
    expect(PRODUCT_OPTIONS_NOTE).toContain('pode nao lembrar exatamente quais eram')
  })

  it('instrui a seguir "orientacao.modo" sem calcular sozinho — correção do bug de produção 17/08 (grupo TIPO)', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('orientacao')
    expect(PRODUCT_OPTIONS_NOTE).toContain('nunca calcula sozinho')
  })

  it('modo "automatic": não pergunta nem inclui no parametro opcoes', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('modo "automatic"')
    expect(PRODUCT_OPTIONS_NOTE).toContain('NAO pergunte nada sobre ele ao cliente e NAO inclua no parametro opcoes')
  })

  it('modo "ask_customer": só chama DefinirItemCarrinho depois de TODAS as perguntas pendentes respondidas', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('modo "ask_customer"')
    expect(PRODUCT_OPTIONS_NOTE).toContain('nunca tente adicionar ao carrinho com uma pergunta "ask_customer" ainda pendente')
  })

  it('modo "invalid_catalog": nunca pergunta ao cliente, trata como erro técnico', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('modo "invalid_catalog"')
    expect(PRODUCT_OPTIONS_NOTE).toContain('problema de cadastro do produto')
  })

  it('instrui a citar as opções escolhidas (nome_congelado) na confirmação — chance do cliente notar opção errada', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('nome_congelado')
    expect(PRODUCT_OPTIONS_NOTE).toContain('unica chance do cliente notar')
  })

  it('texto_livre/upload_arquivo (migration 127): nunca bloqueiam DefinirItemCarrinho, e o modelo NAO decide quando perguntar — isso vem de PROXIMO PASSO OBRIGATORIO (ASK_ITEM_TEXT/ASK_ITEM_ART em resolveNextAction.ts), nunca de prosa (regressão real — MANGA LONGA misturou a pergunta de personalização com a de quantidade quando isso dependia só de instrução em texto)', () => {
    expect(PRODUCT_OPTIONS_NOTE).toContain('NUNCA bloqueiam DefinirItemCarrinho')
    expect(PRODUCT_OPTIONS_NOTE).toContain('ASK_ITEM_TEXT')
    expect(PRODUCT_OPTIONS_NOTE).toContain('ASK_ITEM_ART')
    expect(PRODUCT_OPTIONS_NOTE).toContain('Voce NAO decide quando perguntar')
    // Não pode sobrar a instrução contraditória antiga ("tao obrigatorios quanto
    // ask_customer", que implica bloquear o add) — foi exatamente isso que
    // confundiu o modelo e gerou a regressão.
    expect(PRODUCT_OPTIONS_NOTE).not.toContain('tao obrigatorios quanto qualquer "ask_customer"')
  })
})

describe('CONVERSATION_STATE_NOTE — retomada de pergunta pendente (auditoria 24/08, COMPRA EXPRESSA)', () => {
  it('entra no system prompt e nas regras do juiz', () => {
    const prompt = buildSystemPrompt({ briefing: 'BRIEFING' })
    expect(prompt).toContain(CONVERSATION_STATE_NOTE)
    expect(AGENT_JUDGE_RULES).toContain(CONVERSATION_STATE_NOTE)
  })

  it('NÃO contamina FIXED_RULES — mesmo guard byte-a-byte da armadilha nº 7', () => {
    expect(FIXED_RULES).not.toContain('RETOMADA DE PERGUNTA PENDENTE')
  })

  it('instrui a repetir a pergunta pendente quando o cliente não responde ela, em vez de reiniciar o fluxo', () => {
    // Transcrição real: agente perguntou tamanho, cliente repetiu "Quero
    // comprar CAMISA..." em vez de responder, agente largou a pergunta e
    // pulou pro grupo de nome personalizado.
    expect(CONVERSATION_STATE_NOTE).toContain('NAO responde ela')
    expect(CONVERSATION_STATE_NOTE).toContain('NAO reinicie o fluxo')
    expect(CONVERSATION_STATE_NOTE).toContain('repita a MESMA pergunta pendente')
  })

  it('proíbe reconfirmar uma opção que o histórico já mostra respondida', () => {
    expect(CONVERSATION_STATE_NOTE).toContain('NUNCA pergunte de novo')
    expect(CONVERSATION_STATE_NOTE).toContain('use a resposta que ja esta no historico')
  })

  it('proíbe juntar confirmação do item com pergunta de quantidade na mesma mensagem (REGRA 5)', () => {
    expect(CONVERSATION_STATE_NOTE).toContain('DUAS perguntas')
    expect(CONVERSATION_STATE_NOTE).toContain('nunca as junte na mesma mensagem')
  })

  it('proíbe assumir quantidade sem o cliente ter dito um número explícito (REGRA 1)', () => {
    // Transcrição real: cliente respondeu só "Sim" a uma mensagem que
    // misturava confirmação + "Quantas unidades quer?" — agente assumiu
    // quantidade=1 sem nenhum número ter sido dito.
    expect(CONVERSATION_STATE_NOTE).toContain('nunca informam quantidade')
    expect(CONVERSATION_STATE_NOTE).toContain('nunca assuma 1 nem qualquer outro valor')
  })
})
