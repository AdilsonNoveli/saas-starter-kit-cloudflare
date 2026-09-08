-- =====================================================================================
-- MIGRATION: Estado único de atendimento/pausa por cliente
-- Versão: 104
-- =====================================================================================
-- CONTEXTO: item 2 da §7.6 de `_docs/em-andamento.md` — §0.5.2 (a)(b)(c2)(d)-(g).
--
--   clientes.pausado_ate / pausado_motivo — uma só fonte de verdade do estado
--     de atendimento por cliente. PRAZO, não flag: o echo do humano grava
--     `now() + minutos`, o "assumir" futuro (§0.5.2 item i, fora deste item)
--     grava à mão, o "devolver agora" zera — e a expiração não precisa de
--     cron: o produtor confere e limpa na chegada da próxima mensagem do
--     cliente (§0.5.1b). Os dois campos andam juntos: motivo sem prazo (ou
--     prazo sem motivo) não descreve nenhum estado válido.
--
--   loja.agente_pausa_humana_minutos / agente_pausa_humana_ativo — config da
--     aba Agente IA (§0.5.2 item b), escrita pelo `save()` que já existe, sem
--     endpoint novo — mesmo caminho da fase 7 dos toggles de mídia (093).
-- =====================================================================================

BEGIN;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS pausado_ate    timestamptz,
  ADD COLUMN IF NOT EXISTS pausado_motivo text;

ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_pausado_motivo_chk;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_pausado_motivo_chk
  CHECK (pausado_motivo IS NULL OR pausado_motivo IN ('transbordo', 'resposta_humana', 'manual'));

-- Os dois campos são um par: motivo sem prazo (ou vice-versa) não é um estado
-- válido — evita a UPDATE parcial que deixaria o par inconsistente.
ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_pausado_par_chk;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_pausado_par_chk
  CHECK ((pausado_ate IS NULL) = (pausado_motivo IS NULL));

COMMENT ON COLUMN public.clientes.pausado_ate IS
  'Prazo até quando o agente fica pausado para este cliente (nunca uma flag). NULL = agente ativo. Expira sem cron: o produtor confere e limpa na chegada da próxima mensagem do cliente (§0.5.1b de _docs/em-andamento.md).';
COMMENT ON COLUMN public.clientes.pausado_motivo IS
  'transbordo | resposta_humana | manual — anda em par com pausado_ate (constraint clientes_pausado_par_chk).';

ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS agente_pausa_humana_minutos integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS agente_pausa_humana_ativo   boolean NOT NULL DEFAULT true;

ALTER TABLE public.loja
  DROP CONSTRAINT IF EXISTS loja_agente_pausa_humana_minutos_chk;
ALTER TABLE public.loja
  ADD CONSTRAINT loja_agente_pausa_humana_minutos_chk
  CHECK (agente_pausa_humana_minutos > 0);

COMMENT ON COLUMN public.loja.agente_pausa_humana_minutos IS
  'Janela deslizante (minutos) da pausa por resposta humana — expira N minutos após a ÚLTIMA mensagem do humano (§0.5.2 item g). Config da aba Agente IA.';
COMMENT ON COLUMN public.loja.agente_pausa_humana_ativo IS
  'Toggle da aba Agente IA: desligado, o echo do humano nunca pausa o agente (§0.5.2 item b).';

COMMIT;

-- =====================================================================================
-- DOWN (rollback manual):
--   ALTER TABLE public.loja     DROP CONSTRAINT IF EXISTS loja_agente_pausa_humana_minutos_chk;
--   ALTER TABLE public.loja     DROP COLUMN IF EXISTS agente_pausa_humana_ativo;
--   ALTER TABLE public.loja     DROP COLUMN IF EXISTS agente_pausa_humana_minutos;
--   ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_pausado_par_chk;
--   ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_pausado_motivo_chk;
--   ALTER TABLE public.clientes DROP COLUMN IF EXISTS pausado_motivo;
--   ALTER TABLE public.clientes DROP COLUMN IF EXISTS pausado_ate;
-- =====================================================================================
