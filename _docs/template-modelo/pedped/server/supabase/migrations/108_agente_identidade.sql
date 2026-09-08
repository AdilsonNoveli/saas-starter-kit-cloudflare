-- =====================================================================================
-- MIGRATION: Identidade do agente — nome + saudação
-- Versão: 108
-- =====================================================================================
-- CONTEXTO: transcrição real (05/08) mostrou o agente abrindo a conversa
-- recitando a lista de tópicos da SCOPE_RULES ("Posso ajudar com produtos,
-- pedidos, entrega, retirada, pagamento ou horário da loja?") — sintoma de
-- robô, não só falta de nome. Este par de colunas dá ao lojista a opção de
-- batizar o agente (ex.: "Marcos") e, opcionalmente, escrever a própria frase
-- de saudação — sem exigir nenhuma das duas (vazio = comportamento atual).
-- Decisão de postura (mantida): o agente continua se apresentando como
-- "atendente", nunca revela que é automação (REGRA 1, systemPrompt.ts).
-- =====================================================================================

BEGIN;

ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS agente_nome     text,
  ADD COLUMN IF NOT EXISTS agente_saudacao text;

COMMENT ON COLUMN public.loja.agente_nome IS
  'Nome próprio do agente (ex.: "Marcos"). NULL/vazio = sem identidade, saudação genérica atual. Usado só na primeira mensagem de um cliente novo (customer_profile.is_new_customer), nunca repetido — ver AGENT_IDENTITY_NOTE em systemPrompt.ts.';
COMMENT ON COLUMN public.loja.agente_saudacao IS
  'Frase de saudação customizada, opcional. NULL/vazio = buildSystemPrompt monta uma saudação padrão a partir de agente_nome + nome_fantasia.';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   ALTER TABLE public.loja DROP COLUMN IF EXISTS agente_saudacao;
--   ALTER TABLE public.loja DROP COLUMN IF EXISTS agente_nome;
-- =====================================================================================
