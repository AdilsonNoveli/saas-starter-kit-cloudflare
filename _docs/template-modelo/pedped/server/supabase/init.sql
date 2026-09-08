-- =====================================================================================
-- Sales Delivery — Init SQL Consolidado
-- Gerado em: 2026-07-01 · Atualizado em: 2026-08-10 (auditoria: trigger de
--   customer_intelligence, CHECK de kits.etiqueta e mostrar_faixa_fechada no
--   default de config_loja_fechada estavam faltando; seção de ações manuais
--   corrigida — nomes de env var e nota sobre colunas do Kanban)
-- Validado contra: Supabase project zwzklwuugysugiyncasc (sa-east-1, PostgreSQL 17.6)
-- Migrações incorporadas: 001 → 113 (completo)
--   • 033–039: cron de arquivamento, faturamento por status, hardening RBAC
--     (helpers movidos para o schema private) e deny-all explícito
--   • 040: produtos.imagens text[] (galeria, CHECK <= 4)
--   • 041: freeze_product_info congela COALESCE(preco_promocional, preco_venda)
--   • 046: produto_opcao_item.foto_url
--   • 047: loja.logomarca_dark
--   • 048: loja.tema_catalogo + constraint
--   • 049b: promocoes.foto_url/imagens/descricao · 053: posicao_exibicao · 055: categorias_ids
--   • 052/056: tabela cupons + claim_cupom_atomico/decrement_cupom_uso
--   • 054/071: tabela produto_relacionados + RLS
--   • 062: tabela paginas (Termos/Privacidade) + RLS + seeds
--   • 063: loja.config_layout
--   • 110: opções de produto no carrinho (cart_items_opcoes, tem_opcoes em search_products)
--   • 111–113: gestão de estoque (insumos, produto_insumos, estoque_movimentacoes, consumo atômico, unificação de capacidade diária)
-- =====================================================================================
-- IDEMPOTÊNCIA: Este arquivo pode ser executado múltiplas vezes com segurança.
--   • Enums         → DO $$ BEGIN ... EXCEPTION WHEN duplicate_object
--   • Tabelas       → CREATE TABLE IF NOT EXISTS
--   • Funções       → CREATE OR REPLACE FUNCTION
--   • Índices       → CREATE INDEX IF NOT EXISTS
--   • View          → DROP VIEW IF EXISTS + CREATE VIEW
--   • Triggers      → DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   • Políticas RLS → DROP POLICY IF EXISTS + CREATE POLICY
--   • pg_cron       → INSERT WHERE NOT EXISTS
--   • Seeds         → INSERT ... ON CONFLICT DO UPDATE / DO NOTHING
--
-- ATENÇÕES PÓS-EXECUÇÃO (ver seção final do arquivo):
--   • auth_leaked_password_protection → Supabase Dashboard (único item manual)
--   • app.base_url / app.worker_token → ALTER DATABASE (crons webhook + archive)
-- =====================================================================================

BEGIN;

-- ─── 1. EXTENSÕES ─────────────────────────────────────────────────────────────
-- PostGIS NÃO é instalado: o cálculo de distância usa Haversine puro (função
-- is_within_delivery_radius). Instalá-lo só adicionava a tabela spatial_ref_sys
-- sem RLS e funções st_estimatedextent expostas — ruído de segurança sem ganho.
CREATE EXTENSION IF NOT EXISTS pg_cron      WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net       WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  WITH SCHEMA extensions;
-- Busca fuzzy de produtos (migration 068): trigramas + normalização de acento.
CREATE EXTENSION IF NOT EXISTS pg_trgm      WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent     WITH SCHEMA extensions;
-- Cofre de segredos e credenciais criptografadas em repouso (OpenAI e WhatsApp).
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── 1b. SCHEMAS INTERNOS ──────────────────────────────────────────────────────
-- Schema privado para funções auxiliares de segurança/RBAC e inteligência não expostas via PostgREST
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- ─── 2. TIPOS ENUM (idempotente via DO blocks) ────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.apelido_endereco_enum AS ENUM ('casa', 'trabalho', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.forma_pagamento_enum AS ENUM ('pix', 'dinheiro', 'cartao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.role_usuario_enum AS ENUM (
    'entregador', 'atendente', 'producao', 'gerente', 'administrador', 'proprietario'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_cliente_enum AS ENUM (
    'Novo', 'Ocasional', 'Frequente', 'VIP', 'Inativo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_conta_enum AS ENUM (
    'ativo', 'pausado', 'bloqueado', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_operacao_enum AS ENUM ('aberta', 'fechada', 'pausada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_sessao_enum AS ENUM ('ativa', 'expirada', 'convertida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_entrega_enum AS ENUM ('entrega', 'retirada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_opcao_grupo_enum AS ENUM ('single', 'multiple', 'toggle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_promocao_enum AS ENUM (
    'leve_pague', 'progressivo', 'desconto_carrinho', 'destaque'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Idempotente p/ bancos existentes sem o valor 'destaque' (migration 053):
DO $$ BEGIN
  ALTER TYPE public.tipo_promocao_enum ADD VALUE IF NOT EXISTS 'destaque';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.unidade_medida_enum AS ENUM (
    'kg', 'litro', 'metro', 'unidade', 'caixa'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.webhook_outbox_status_enum AS ENUM (
    'pendente', 'enviando', 'enviado', 'falha', 'morto'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 3. TABELAS (ordem por dependência de FK) ─────────────────────────────────

-- 3.1 loja (raiz — sem dependências)
CREATE TABLE IF NOT EXISTS public.loja (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logomarca             text,
  nome_fantasia         text        NOT NULL,
  cnpj                  text,
  chave_pix             text,
  whatsapp_atendimento  text,
  latitude_origem       numeric,
  longitude_origem      numeric,
  raio_atendimento_km   numeric     DEFAULT 10,
  taxa_entrega_padrao   numeric     NOT NULL DEFAULT 5.00,
  permite_retirada      boolean     NOT NULL DEFAULT true,
  -- VARCHAR em vez de enum para suportar 'automatico' além de aberta/fechada/pausada
  status_operacao       varchar(20) NOT NULL DEFAULT 'automatico',
  status_conta          varchar(20) NOT NULL DEFAULT 'ativo',
  webhook_url           text,
  -- Webhook de notificação de saída (migration 103). `webhook_ativo` separa
  -- "desligado" de "não configurado" — apagar a URL para pausar perderia a
  -- configuração inteira. Os dois segredos (Bearer do canal e chave do HMAC
  -- do corpo) vivem no Vault, referenciados pelos *_id; só a máscara fica
  -- legível, para a tela mostrar que existe sem expor o valor.
  webhook_ativo                  boolean NOT NULL DEFAULT false,
  webhook_token_id               uuid,
  webhook_token_mascara          text,
  webhook_signing_secret_id      uuid,
  webhook_signing_secret_mascara text,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  config_promocoes      jsonb       DEFAULT '{}'::jsonb,
  config_horarios       jsonb       DEFAULT '{"0":{"aberto":true,"inicio":"00:00","fim":"23:59"},"1":{"aberto":true,"inicio":"00:00","fim":"23:59"},"2":{"aberto":true,"inicio":"00:00","fim":"23:59"},"3":{"aberto":true,"inicio":"00:00","fim":"23:59"},"4":{"aberto":true,"inicio":"00:00","fim":"23:59"},"5":{"aberto":true,"inicio":"00:00","fim":"23:59"},"6":{"aberto":true,"inicio":"00:00","fim":"23:59"}}'::jsonb,
  endereco_rua          text,
  endereco_numero       text,
  endereco_complemento  text,
  endereco_bairro       text,
  endereco_cidade       text,
  endereco_uf           char(2),
  endereco_cep          text,
  status_override_data  date,
  config_loja_fechada   jsonb       NOT NULL DEFAULT '{"titulo":"","mensagem_custom":"","mostrar_endereco":false,"mostrar_horarios":true,"mostrar_whatsapp":true,"mostrar_pagina_fechada":true,"mostrar_faixa_fechada":true}'::jsonb,
  config_pedidos        jsonb       DEFAULT '{"horas_fallback":48,"regras_arquivamento":[{"horas":6,"status":"entregue"},{"horas":6,"status":"cancelado"}]}'::jsonb,
  -- Integração WhatsApp via UazAPI
  uazapi_instance_name  text,
  uazapi_instance_token text,
  -- Agente WhatsApp — chave OpenAI via Supabase Vault + config direta
  -- (migration 088, passo 8 da arquitetura do agente WhatsApp).
  agente_openai_key_id      uuid,
  agente_openai_key_mascara text,
  agente_modelo             text NOT NULL DEFAULT 'gpt-4.1-mini',
  agente_ativo              boolean NOT NULL DEFAULT true,
  agente_instrucoes_extra   text,
  -- 110: ConsultarOpcoesProduto somada à lista (borda recheada, variações...).
  agente_tools_habilitadas  jsonb   NOT NULL DEFAULT '["BuscarProdutos","DefinirItemCarrinho","ConsultarEnderecoEntrega","AtualizarPedido","FinalizarPedido","ConsultarDetalhePedido","EnviarBotaoCatalogo","ConsultarDatasEncomenda","AtualizarContexto","ConsultarOpcoesProduto"]'::jsonb,
  -- Provedor de WhatsApp configurável + flags de mídia do agente (migration
  -- 093, fase 2 de _docs/implementar/arquitetura-midia-e-provedor-whatsapp.md).
  -- URL base e rótulo em coluna (não são segredo, precisam ser trocáveis sem
  -- deploy); o token vive no Vault, referenciado por whatsapp_api_key_id.
  -- SEM DEFAULT desde a migration 103: a aplicação é agnóstica de fornecedor e
  -- instalação nova não pode nascer acoplada a um. Quem instala escolhe.
  whatsapp_provedor_nome    text    NOT NULL DEFAULT '',
  whatsapp_api_base_url     text    NOT NULL DEFAULT '',
  whatsapp_api_key_id       uuid,
  whatsapp_api_key_mascara  text,
  agente_audio_habilitado   boolean NOT NULL DEFAULT true,
  agente_imagem_habilitado  boolean NOT NULL DEFAULT true,
  agente_modelo_transcricao text    NOT NULL DEFAULT 'gpt-4o-mini-transcribe',
  agente_modelo_visao       text    NOT NULL DEFAULT 'gpt-4o-mini',
  -- Modelo do Avaliador de Qualidade (LLM-as-a-Judge), escolhido pelo lojista na
  -- aba Agente IA (migration 097). Default igual ao de OPENAI_JUDGE_MODELS.
  agente_modelo_avaliador   text    NOT NULL DEFAULT 'gpt-4.1-mini',
  -- Pausa por resposta humana (migration 104, §0.5.2 (a)(b) de
  -- _docs/em-andamento.md): janela deslizante em minutos + toggle da aba
  -- Agente IA. O prazo em si (pausado_ate/pausado_motivo) mora em `clientes`,
  -- por cliente — aqui só a config da loja.
  agente_pausa_humana_minutos integer NOT NULL DEFAULT 15
    CONSTRAINT loja_agente_pausa_humana_minutos_chk CHECK (agente_pausa_humana_minutos > 0),
  agente_pausa_humana_ativo   boolean NOT NULL DEFAULT true,
  -- 108: identidade do agente — nome próprio + saudação custom, ambos
  -- opcionais (NULL = comportamento genérico atual). Ver AGENT_IDENTITY_NOTE
  -- em systemPrompt.ts.
  agente_nome                 text,
  agente_saudacao             text,
  -- 047: logomarca para modo escuro (logo dark-mode do catálogo)
  logomarca_dark            text,
  -- 048: tema global do catálogo (light | dark | system)
  tema_catalogo             text    NOT NULL DEFAULT 'system'
    CONSTRAINT loja_tema_catalogo_check CHECK (tema_catalogo IN ('light', 'dark', 'system')),
  -- 063: customização visual do layout do catálogo
  config_layout             jsonb   NOT NULL DEFAULT '{}'::jsonb
);

-- `loja` é SINGLETON (migration 102). Toda a aplicação lê com `LIMIT 1` **sem
-- `ORDER BY`** — no servidor e dentro dos RPCs plpgsql (090/092/093). O Postgres
-- não promete ordem sem `ORDER BY` e ela muda a cada `UPDATE`: com mais de uma
-- linha a leitura vira sorteio, e em produção isso deixou o agente mudo de forma
-- intermitente (a linha sorteada não tinha `agente_openai_key_id`). Índice único
-- sobre expressão constante: só uma linha satisfaz `(true)`. Configuração da
-- loja se ATUALIZA, nunca se insere de novo.
CREATE UNIQUE INDEX IF NOT EXISTS loja_linha_unica_idx
  ON public.loja ((true));

-- 3.2 categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id         uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       text    NOT NULL,
  descricao  text,
  icone_url  text,
  ordem      int     DEFAULT 0,
  ativa      boolean DEFAULT true,
  cor        text,
  -- 064: categoria âncora do catálogo (substitui a aba "Todos"). Unicidade
  -- garantida por trigger (trg_garantir_unica_categoria_principal).
  principal  boolean NOT NULL DEFAULT false
);

-- 3.3 promocoes
CREATE TABLE IF NOT EXISTS public.promocoes (
  id                 uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id       uuid                      REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome               text                      NOT NULL,
  tipo               public.tipo_promocao_enum NOT NULL,
  configuracao       jsonb                     NOT NULL,
  ativa              boolean                   DEFAULT true,
  data_inicio        timestamptz,
  data_fim           timestamptz,
  criado_em          timestamptz               DEFAULT now(),
  -- 049b: galeria e descrição do banner/promoção (migration 049)
  foto_url           text,
  imagens            text[]                    DEFAULT '{}',
  descricao          text,
  -- 053: posição de exibição (apenas banners do tipo 'destaque')
  posicao_exibicao   text
    CONSTRAINT promocoes_posicao_exibicao_check CHECK (posicao_exibicao IN ('topo', 'meio', 'rodape')),
  -- 055: múltiplas categorias onde o banner deve aparecer
  categorias_ids     uuid[]
);

-- 3.3b cupons
CREATE TABLE IF NOT EXISTS public.cupons (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo          text        NOT NULL UNIQUE,
  descricao       text,
  tipo_desconto   text        NOT NULL DEFAULT 'percentual'
    CONSTRAINT cupons_tipo_check CHECK (tipo_desconto IN ('percentual', 'fixo')),
  valor           numeric     NOT NULL CHECK (valor > 0),
  valor_minimo    numeric     NOT NULL DEFAULT 0,
  uso_maximo      int,
  uso_atual       int         NOT NULL DEFAULT 0 CHECK (uso_atual >= 0),
  ativo           boolean     NOT NULL DEFAULT true,
  data_inicio     timestamptz,
  data_fim        timestamptz,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- 3.4 kits
CREATE TABLE IF NOT EXISTS public.kits (
  id                  uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id        uuid    REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome                text    NOT NULL,
  descricao           text,
  foto_url            text,
  preco_fixo          numeric,
  disponivel          boolean DEFAULT true,
  criado_em           timestamptz DEFAULT now(),
  mostrar_no_checkout boolean NOT NULL DEFAULT false,
  etiqueta            text    NOT NULL DEFAULT 'KIT'
    CONSTRAINT kits_etiqueta_check CHECK (etiqueta IN ('KIT', 'COMBO', 'PACOTE')),
  -- Galeria: foto_url é a CAPA; `imagens` guarda as fotos EXTRAS (máx. 4 → total 5).
  imagens             text[]  NOT NULL DEFAULT '{}'
    CONSTRAINT kits_imagens_max_check CHECK (cardinality(imagens) <= 4)
);

-- 3.5 kanban_coluna (pedidos tem FK para esta tabela)
CREATE TABLE IF NOT EXISTS public.kanban_coluna (
  chave              text        NOT NULL PRIMARY KEY,
  label              text        NOT NULL,
  cor                text        NOT NULL DEFAULT '#6B7280',
  ordem              int         NOT NULL DEFAULT 0,
  visivel            boolean     NOT NULL DEFAULT true,
  atualizado_em      timestamptz NOT NULL DEFAULT now(),
  is_revenue_trigger boolean     NOT NULL DEFAULT false,
  is_cancelled       boolean     NOT NULL DEFAULT false,
  is_open            boolean     NOT NULL DEFAULT false,
  -- Coluna de sistema: protegida contra exclusão/renome (trigger guard_system_kanban_coluna).
  is_sistema         boolean     NOT NULL DEFAULT false,
  -- Papéis semânticos do fluxo de entrega (substituem chaves hardcoded na automação).
  -- Entrada nesta coluna + tipo_entrega=entrega dispara a atribuição de entregador.
  is_delivery_dispatch boolean   NOT NULL DEFAULT false,
  -- Estado "saiu para entrega" (entregador atribuído/despachado).
  is_out_for_delivery  boolean   NOT NULL DEFAULT false,
  -- Estado terminal "entregue" (define entregue_em e métricas do cliente).
  is_delivered         boolean   NOT NULL DEFAULT false
);

-- 3.6 clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id                    uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 032: nullable — a nova API do WhatsApp pode entregar apenas o @lid.
  telefone_whatsapp     text                      UNIQUE,
  -- 031: identificador @lid da nova API do WhatsApp (privacidade).
  whatsapp_lid          text,
  nome                  text                      NOT NULL,
  data_nascimento       date,
  status                public.status_cliente_enum DEFAULT 'Novo',
  possui_pendencias     boolean                   DEFAULT false,
  descricao_pendencia   text,
  cliente_desde         timestamptz               DEFAULT now(),
  total_pedidos         int                       DEFAULT 0,
  total_cancelamentos   int                       DEFAULT 0,
  valor_gasto_acumulado numeric                   DEFAULT 0,
  ticket_medio          numeric,
  ultimo_pedido_em      timestamptz,
  frequencia_compra     text,
  bairro_frequente      text,
  preferencias          text,
  observacoes_internas  text,
  -- Pausa por atendimento (migration 104, §0.5.2 (a) de _docs/em-andamento.md):
  -- estado único, um PRAZO nunca uma flag. Os dois campos andam em par
  -- (constraint clientes_pausado_par_chk) — motivo sem prazo não é estado válido.
  pausado_ate           timestamptz,
  pausado_motivo        text
    CONSTRAINT clientes_pausado_motivo_chk CHECK (pausado_motivo IS NULL OR pausado_motivo IN ('transbordo', 'resposta_humana', 'manual')),
  tem_contexto          boolean                   DEFAULT false,
  contexto_resumo       text,
  -- 066: afinidade com o catálogo aprendida pelo agente (oferta dinâmica).
  -- 'catalogo' | 'chat' | 'misto' | NULL (desconhecido).
  canal_preferido       text,
  ultima_conversa       timestamptz,
  foto_url              text,
  criado_em             timestamptz               DEFAULT now(),
  atualizado_em         timestamptz               DEFAULT now(),
  is_visitante          boolean                   DEFAULT true,
  -- 105: cliente sintético do laboratório de avaliação (telefone
  -- 5521999990000+índice, DDD 21 reservado). Propósito único — não reaproveita
  -- `arquivado` (armadilha 6 de _docs/em-andamento.md) nem `is_visitante`.
  e_teste_laboratorio   boolean     NOT NULL      DEFAULT false,

  -- 032: pelo menos UM identificador de WhatsApp é obrigatório.
  CONSTRAINT chk_clientes_identificador
    CHECK (telefone_whatsapp IS NOT NULL OR whatsapp_lid IS NOT NULL),

  -- 104: motivo sem prazo (ou vice-versa) não é um estado de pausa válido.
  CONSTRAINT clientes_pausado_par_chk
    CHECK ((pausado_ate IS NULL) = (pausado_motivo IS NULL))
);

-- 3.7 sessoes (→ clientes)
-- delivery_mode/payment_method/address_id: estado de checkout server-side
-- (migration 082) — o agente grava, a app finaliza como commit puro.
-- address_id ganha FK para enderecos_cliente logo após a definição dela (3.12).
CREATE TABLE IF NOT EXISTS public.sessoes (
  id             uuid                       NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id     uuid                       REFERENCES public.clientes(id),
  status         public.status_sessao_enum  DEFAULT 'ativa',
  criado_em      timestamptz                DEFAULT now(),
  expira_em      timestamptz                DEFAULT (now() + interval '24 hours'),
  canal          varchar(50)                DEFAULT 'whatsapp_bot',
  delivery_mode  text NULL
    CONSTRAINT sessoes_delivery_mode_check CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada')),
  payment_method text NULL
    CONSTRAINT sessoes_payment_method_check CHECK (payment_method IS NULL OR payment_method IN ('pix', 'dinheiro', 'cartao')),
  address_id     uuid NULL
);

-- 3.8 usuarios (→ auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id            uuid                      NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          text,
  avatar_url    text,
  whatsapp      text,
  role          public.role_usuario_enum  NOT NULL DEFAULT 'atendente',
  ativo         boolean                   NOT NULL DEFAULT true,
  criado_em     timestamptz               NOT NULL DEFAULT now(),
  atualizado_em timestamptz               NOT NULL DEFAULT now()
);

-- 3.8b Helpers RBAC no schema private (criados imediatamente após public.usuarios)
CREATE OR REPLACE FUNCTION private.has_role(roles public.role_usuario_enum[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid() AND u.ativo = true AND u.role = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid() AND u.ativo = true
      AND u.role IN ('atendente','producao','gerente','administrador','proprietario')
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS public.role_usuario_enum LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT u.role FROM public.usuarios u WHERE u.id = auth.uid() AND u.ativo = true;
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(public.role_usuario_enum[])   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_staff()                             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_role()                    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.has_role(public.role_usuario_enum[])   TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION private.is_staff()                             TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION private.current_user_role()                    TO authenticated, service_role;

-- 3.9 produtos (→ categorias)
CREATE TABLE IF NOT EXISTS public.produtos (
  id                    uuid                       NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id          uuid                       REFERENCES public.categorias(id),
  nome                  text                       NOT NULL,
  descricao             text,
  foto_url              text,
  preco_custo           numeric                    NOT NULL DEFAULT 0,
  margem_lucro          numeric                    NOT NULL DEFAULT 0,
  preco_venda           numeric,
  unidade_medida        public.unidade_medida_enum DEFAULT 'unidade',
  permite_fracionamento boolean                    DEFAULT false,
  estoque_atual         numeric,
  disponivel            boolean                    DEFAULT true,
  criado_em             timestamptz                DEFAULT now(),
  preco_promocional     numeric,
  -- Galeria: foto_url é a CAPA; `imagens` guarda as fotos EXTRAS (máx. 4 → total 5).
  imagens               text[]                     NOT NULL DEFAULT '{}'
    CONSTRAINT produtos_imagens_max_check CHECK (cardinality(imagens) <= 4),
  -- Ordem pseudo-aleatória do catálogo (paginação por keyset — ver 4.x /
  -- catalog_products_page). Novos produtos recebem posição aleatória.
  rank_aleatorio        double precision           NOT NULL DEFAULT random(),
  -- Variações/apelidos coloquiais para a busca fuzzy da LLM (migration 070).
  -- Índice GIN (idx_produtos_trgm_busca) aplica f_unaccent(lower(...)) sobre
  -- nome + descrição + sinônimos — ver função search_products.
  sinonimos             text[]                     NOT NULL DEFAULT '{}',
  -- Pre-Order System (migration 078/079): modo de venda + regras de encomenda.
  -- 'stock' (venda imediata) OU 'preorder' (encomenda) — sem modo híbrido.
  product_type          text                       NOT NULL DEFAULT 'stock'
    CONSTRAINT produtos_product_type_check CHECK (product_type IN ('stock','preorder')),
  preorder_config       jsonb,
  -- Requisitos p/ motor de missing_fields (migration 084). Schema:
  -- ProductRequirements em shared/types/preorder.ts. Backfill: preorder ⇒
  -- requires_date=true, admin escreve isto ao salvar o produto.
  requirements          jsonb                      NOT NULL DEFAULT '{}'::jsonb,
  -- Gestão de estoque (migrations 111 & 112): política por produto + insumos + limite diário
  controle_estoque        text                       NOT NULL DEFAULT 'nenhum'
    CONSTRAINT produtos_controle_estoque_check CHECK (controle_estoque IN ('nenhum', 'contagem', 'producao_diaria')),
  estoque_minimo          numeric,
  producao_diaria_limite  numeric,
  CONSTRAINT produtos_estoque_atual_nao_negativo CHECK (estoque_atual IS NULL OR estoque_atual >= 0),
  CONSTRAINT produtos_producao_diaria_exclusivo_encomenda CHECK (NOT (product_type = 'preorder' AND controle_estoque = 'producao_diaria'))
);

-- Índices de suporte à ordem aleatória escalável do catálogo (keyset).
CREATE INDEX IF NOT EXISTS idx_produtos_rank
  ON public.produtos (rank_aleatorio, id) WHERE disponivel;
CREATE INDEX IF NOT EXISTS idx_produtos_cat_rank
  ON public.produtos (categoria_id, rank_aleatorio, id) WHERE disponivel;

-- 3.10 produto_opcao_grupo (→ produtos)
CREATE TABLE IF NOT EXISTS public.produto_opcao_grupo (
  id           uuid                         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id   uuid                         NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome         text                         NOT NULL,
  tipo         public.tipo_opcao_grupo_enum NOT NULL DEFAULT 'single',
  obrigatorio  boolean                      NOT NULL DEFAULT false,
  min_selecoes int                          NOT NULL DEFAULT 0,
  max_selecoes int                          NOT NULL DEFAULT 1,
  ordem        int                          NOT NULL DEFAULT 0,
  criado_em    timestamptz                  NOT NULL DEFAULT now()
);

-- tem_opcoes (EXISTS por produto na RPC do catálogo) usa este índice.
CREATE INDEX IF NOT EXISTS idx_produto_opcao_grupo_produto
  ON public.produto_opcao_grupo (produto_id);

-- 3.11 produto_opcao_item (→ produto_opcao_grupo)
CREATE TABLE IF NOT EXISTS public.produto_opcao_item (
  id                 uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id           uuid    NOT NULL REFERENCES public.produto_opcao_grupo(id) ON DELETE CASCADE,
  nome               text    NOT NULL,
  preco_delta        numeric NOT NULL DEFAULT 0,
  selecionado_padrao boolean NOT NULL DEFAULT false,
  ativo              boolean NOT NULL DEFAULT true,
  ordem              int     NOT NULL DEFAULT 0,
  -- 046: foto da variação (ex: cor/modelo) — nullable
  foto_url           text,
  criado_em          timestamptz NOT NULL DEFAULT now()
);

-- 3.12 enderecos_cliente (→ clientes)
CREATE TABLE IF NOT EXISTS public.enderecos_cliente (
  id          uuid                           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id  uuid                           REFERENCES public.clientes(id) ON DELETE CASCADE,
  rua         text                           NOT NULL,
  numero      text                           NOT NULL,
  complemento text,
  bairro      text                           NOT NULL,
  cep         text,
  latitude    numeric,
  longitude   numeric,
  apelido     public.apelido_endereco_enum   DEFAULT 'casa',
  padrao      boolean                        DEFAULT false,
  criado_em   timestamptz                    DEFAULT now(),
  cidade      text,
  estado      text
);

DO $$ BEGIN
  ALTER TABLE public.sessoes
    ADD CONSTRAINT sessoes_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.enderecos_cliente(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3.13 evento_rastreamento (→ sessoes)
CREATE TABLE IF NOT EXISTS public.evento_rastreamento (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id   uuid        REFERENCES public.sessoes(id),
  tipo        text        NOT NULL,
  entidade    text,
  entidade_id uuid,
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- 3.14 kit_itens (→ kits, produtos)
CREATE TABLE IF NOT EXISTS public.kit_itens (
  id         uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id     uuid    REFERENCES public.kits(id) ON DELETE CASCADE,
  produto_id uuid    REFERENCES public.produtos(id),
  quantidade numeric NOT NULL DEFAULT 1
);

-- 3.14b produto_relacionados — produtos sugeridos no checkout (migrations 054 + 071)
CREATE TABLE IF NOT EXISTS public.produto_relacionados (
  produto_id             uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_relacionado_id uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  ordem                  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (produto_id, produto_relacionado_id),
  CONSTRAINT no_self_relation CHECK (produto_id <> produto_relacionado_id)
);
CREATE INDEX IF NOT EXISTS idx_produto_relacionados_produto_id
  ON public.produto_relacionados (produto_id);

-- 3.14c paginas — conteúdo estático (Termos de Uso, Política de Privacidade) — migration 062
CREATE TABLE IF NOT EXISTS public.paginas (
  slug          text        PRIMARY KEY,
  titulo        text        NOT NULL,
  conteudo      text        NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- 3.15 promocao_produtos (→ promocoes, produtos)
CREATE TABLE IF NOT EXISTS public.promocao_produtos (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promocao_id uuid REFERENCES public.promocoes(id) ON DELETE CASCADE,
  produto_id  uuid REFERENCES public.produtos(id)
);

-- 3.16 pedidos (→ clientes, sessoes, enderecos_cliente, usuarios, kanban_coluna)
CREATE SEQUENCE IF NOT EXISTS public.pedido_short_id_seq START WITH 28431;

CREATE TABLE IF NOT EXISTS public.pedidos (
  id                    uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_id              integer                   UNIQUE DEFAULT nextval('public.pedido_short_id_seq'),
  cliente_id            uuid                      REFERENCES public.clientes(id),
  sessao_id             uuid                      REFERENCES public.sessoes(id),
  endereco_id           uuid                      REFERENCES public.enderecos_cliente(id),
  forma_pagamento       public.forma_pagamento_enum NOT NULL,
  troco_para            numeric,
  tipo_entrega          public.tipo_entrega_enum  NOT NULL,
  valor_subtotal        numeric                   DEFAULT 0,
  desconto_aplicado     numeric                   DEFAULT 0,
  valor_entrega         numeric                   DEFAULT 0,
  valor_total           numeric,
  tempo_entrega_minutos int,
  -- FK para kanban_coluna.chave — status é texto livre controlado pelo kanban
  status                text                      DEFAULT 'pendente' REFERENCES public.kanban_coluna(chave),
  observacoes           text,
  -- 067: instrução operacional no card (staff), gerada quando o pedido nasce pendente.
  nota_operacional      text,
  -- 109: nota do atendente sobre o andamento do pedido, editável a qualquer
  -- momento pelo staff — staff-only, nunca em recibo (ver comentário da coluna).
  nota_atendimento      text,
  criado_em             timestamptz               DEFAULT now(),
  atualizado_em         timestamptz               DEFAULT now(),
  valor_desconto        numeric                   DEFAULT 0,
  frete_gratis_aplicado boolean                   DEFAULT false,
  valor_frete           numeric                   DEFAULT 0,
  entregue_em           timestamptz,
  entregador_id         uuid                      REFERENCES public.usuarios(id),
  atribuido_em          timestamptz,
  arquivado             boolean                   DEFAULT false,
  arquivado_em          timestamptz
);

-- 3.17 itens_pedido (→ pedidos, produtos)
-- delivery_mode/endereco_id (migration 085): override de fulfillment SÓ deste
-- item (Feature 4.1), preservado do carrinho — NULL herda pedidos.tipo_entrega/
-- endereco_id (resolução de nível: comum promovido ao pedido).
CREATE TABLE IF NOT EXISTS public.itens_pedido (
  id                       uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id                uuid    REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id               uuid    REFERENCES public.produtos(id),
  nome_produto_congelado   text,
  preco_unitario_congelado numeric,
  quantidade               numeric NOT NULL DEFAULT 1,
  subtotal                 numeric,
  delivery_mode            text NULL
    CONSTRAINT itens_pedido_delivery_mode_check CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada')),
  endereco_id              uuid NULL REFERENCES public.enderecos_cliente(id)
);

-- 3.18 itens_pedido_opcoes (→ itens_pedido, produto_opcao_item)
CREATE TABLE IF NOT EXISTS public.itens_pedido_opcoes (
  id                    uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_pedido_id        uuid    NOT NULL REFERENCES public.itens_pedido(id) ON DELETE CASCADE,
  opcao_item_id         uuid    REFERENCES public.produto_opcao_item(id),
  nome_congelado        text    NOT NULL,
  preco_delta_congelado numeric NOT NULL DEFAULT 0,
  criado_em             timestamptz NOT NULL DEFAULT now()
);

-- 3.19 pedido_status_historico (→ pedidos, usuarios)
CREATE TABLE IF NOT EXISTS public.pedido_status_historico (
  id              uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id       uuid    NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo     text    NOT NULL,
  alterado_por    uuid    REFERENCES public.usuarios(id),
  origem          text    NOT NULL DEFAULT 'sistema',
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- 3.19a preorders (→ pedidos, produtos) — Pre-Order System (migration 078).
-- Status da encomenda = status do pedido (kanban); sem status próprio por design.
-- Capacidade diária = SUM(quantity) vs produtos.preorder_config->>'daily_capacity'.
CREATE TABLE IF NOT EXISTS public.preorders (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid        NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  product_id     uuid        NOT NULL REFERENCES public.produtos(id),
  delivery_date  date        NOT NULL,
  quantity       numeric     NOT NULL CHECK (quantity > 0),
  unit           text        NOT NULL,
  rules_snapshot jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preorders_product_date ON public.preorders (product_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_preorders_delivery_date ON public.preorders (delivery_date);
CREATE INDEX IF NOT EXISTS idx_preorders_order ON public.preorders (order_id);

-- 3.19b preorder_blocked_dates — datas sem entrega (feriados). product_id NULL = global.
CREATE TABLE IF NOT EXISTS public.preorder_blocked_dates (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date date        NOT NULL,
  product_id   uuid        REFERENCES public.produtos(id) ON DELETE CASCADE,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE parcial: deduplica bloqueio global (NULL não conflita em UNIQUE comum).
CREATE UNIQUE INDEX IF NOT EXISTS uq_preorder_blocked_global
  ON public.preorder_blocked_dates (blocked_date) WHERE product_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_preorder_blocked_product
  ON public.preorder_blocked_dates (blocked_date, product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preorder_blocked_date ON public.preorder_blocked_dates (blocked_date);

-- 3.20 webhook_outbox (outbox pattern para entregas confiáveis de webhook)
CREATE TABLE IF NOT EXISTS public.webhook_outbox (
  id                   uuid                          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id             uuid                          NOT NULL UNIQUE,
  evento               text                          NOT NULL,
  payload              jsonb                         NOT NULL,
  destino_url          text                          NOT NULL,
  status               public.webhook_outbox_status_enum NOT NULL DEFAULT 'pendente',
  tentativas           int                           NOT NULL DEFAULT 0,
  max_tentativas       int                           NOT NULL DEFAULT 6,
  proxima_tentativa_em timestamptz                   NOT NULL DEFAULT now(),
  ultimo_erro          text,
  http_status          int,
  criado_em            timestamptz                   NOT NULL DEFAULT now(),
  enviado_em           timestamptz
);

-- 3.21 webhook_queue (fila de webhook para integração WhatsApp/UazAPI)
CREATE TABLE IF NOT EXISTS public.webhook_queue (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event           varchar(100) NOT NULL,
  payload         jsonb       NOT NULL,
  webhook_url     text        NOT NULL,
  status          varchar(20) NOT NULL DEFAULT 'pending',
  attempts        int         NOT NULL DEFAULT 0,
  max_attempts    int         NOT NULL DEFAULT 5,
  last_attempt_at timestamptz,
  last_error      text,
  next_retry_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

-- 3.21b integration_idempotency (idempotência da integração inbound — 6.4)
--   Mapeia Idempotency-Key -> pedido (payload.pedido_id). O UNIQUE(key) atua
--   como trava: retries do n8n em POST /orders e /cart/checkout não duplicam
--   pedidos. Acesso exclusivo via service_role (RLS habilitado sem policy de
--   acesso — ver seção 6). Consolidado no init a partir da migration 057.
CREATE TABLE IF NOT EXISTS public.integration_idempotency (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text        NOT NULL UNIQUE,
  payload     jsonb,
  status      text        NOT NULL DEFAULT 'completed',
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regras_frete_distancia (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  distancia_min_km numeric NOT NULL CHECK (distancia_min_km >= 0),
  distancia_max_km numeric NOT NULL,
  valor_frete      numeric NOT NULL CHECK (valor_frete >= 0),
  ativo            boolean NOT NULL DEFAULT true,
  ordem            int     NOT NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_distancia_ordenada CHECK (distancia_max_km > distancia_min_km),
  CONSTRAINT unique_ordem UNIQUE (ordem)
);

-- 031: carrinho server-side do fluxo agentivo (→ sessoes, produtos).
-- TTL herdado da sessão; agente LLM nunca mantém estado próprio.
-- target_date/observacao (migration 082): atributos por-item de checkout,
-- usados por produtos de encomenda no carrinho unificado (EPIC 3).
-- delivery_mode/address_id (migration 085): override de fulfillment SÓ deste
-- item (Feature 4.1) — NULL herda sessoes.delivery_mode/address_id.
CREATE TABLE IF NOT EXISTS public.cart_items (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id     uuid    NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
  produto_id    uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade    numeric NOT NULL CHECK (quantidade > 0),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  target_date   date NULL,
  observacao    text NULL,
  delivery_mode text NULL
    CONSTRAINT cart_items_delivery_mode_check CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada')),
  address_id    uuid NULL REFERENCES public.enderecos_cliente(id),
  -- 110: opções de produto no carrinho (assinatura de variação ordenando opcao_item_ids)
  opcoes_assinatura text NOT NULL DEFAULT '',

  CONSTRAINT cart_items_sessao_produto_opcoes_unique UNIQUE (sessao_id, produto_id, opcoes_assinatura)
);

-- 3.18b cart_items_opcoes (migration 110) — opção selecionada por linha do carrinho
CREATE TABLE IF NOT EXISTS public.cart_items_opcoes (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_item_id          uuid        NOT NULL REFERENCES public.cart_items(id) ON DELETE CASCADE,
  opcao_item_id         uuid        REFERENCES public.produto_opcao_item(id),
  nome_congelado        text        NOT NULL,
  preco_delta_congelado numeric     NOT NULL DEFAULT 0,
  criado_em             timestamptz NOT NULL DEFAULT now()
);

-- 087: schema do agente WhatsApp in-app (transporte) — ver
-- _docs/implementar/arquitetura-agente-whatsapp-in-app.md seções 4 e 9.
-- whatsapp_mensagens_recebidas: dedup por wamid (PRIMARY KEY).
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens_recebidas (
  wamid        text        NOT NULL PRIMARY KEY,
  recebido_em  timestamptz NOT NULL DEFAULT now()
);

-- whatsapp_turno_buffer: buffer de rajada (debounce) — claim atômico via
-- DELETE ... WHERE chave = $1 AND ultima_msg_id = $2 RETURNING *.
-- `whatsapp_lid` (migration 100) leva o identificador estável do WhatsApp
-- (`messages[].from_user_id`) do produtor até o consumer, atravessando os ~8s
-- de debounce: sem ele o turno identificava o cliente só por telefone e o
-- lookup lid-first de `findOrCreateCustomer` nunca recebia o valor.
-- `chave` (migration 101, item (b) da FASE 0.4) é a identidade do turno
-- derivada do PAYLOAD — telefone quando ele veio, senão 'lid:'||whatsapp_lid.
-- Telefone primeiro porque todos os payloads reais o trazem: para o tráfego de
-- hoje `chave` é o próprio telefone. Chave composta foi rejeitada (coluna de PK
-- é NOT NULL, e NULLS DISTINCT fragmentaria a rajada mista) e identidade
-- resolvida (`clientes.id`) também: obrigaria o webhook a ler `clientes` e a
-- chave poderia MUDAR entre o append e o claim, quebrando a entrega única.
-- Os dois CHECKs são necessários — com telefone e lid nulos o check de chave
-- avalia para NULL, e CHECK que resulta em NULL é considerado satisfeito.
CREATE TABLE IF NOT EXISTS public.whatsapp_turno_buffer (
  chave         text        NOT NULL PRIMARY KEY,
  telefone      text,
  textos        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ultima_msg_id text        NOT NULL,
  whatsapp_lid  text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_turno_buffer_identidade_chk
    CHECK (telefone IS NOT NULL OR whatsapp_lid IS NOT NULL),
  CONSTRAINT whatsapp_turno_buffer_chave_chk
    CHECK (chave = COALESCE(telefone, 'lid:' || whatsapp_lid))
);

-- whatsapp_conversas: histórico de turno (só user/assistant; tool calls são
-- andaime interno do turno, não persistem).
-- `seq` (migration 091) é o desempate obrigatório da leitura: `criado_em`
-- default `now()` é o timestamp da TRANSAÇÃO, e as duas linhas do turno
-- (user + assistant) são gravadas num único INSERT — nascem com valor idêntico.
-- Sem `seq`, o histórico podia sair com a resposta antes da pergunta.
CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
  id        uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid       NOT NULL REFERENCES public.clientes(id),
  role      text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content   text        NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  seq       bigserial
);

-- whatsapp_midia: registro por mídia recebida (migration 094) — idempotência do
-- retry da fila, cache do resultado e telemetria de custo. Ver
-- _docs/implementar/arquitetura-midia-e-provedor-whatsapp.md §4.2.
-- `wamid` é PK por ser a chave natural de idempotência (§8.2): a retentativa
-- que encontra `status = 'concluido'` reaproveita `texto` em vez de pagar a
-- OpenAI de novo. Só o texto derivado é gravado — os bytes nunca saem da
-- memória do Worker (§9). 'recusado' é a mídia que nem chega a ser processada
-- (recurso desligado, tipo não suportado, tamanho acima do limite) e mesmo
-- assim recebe resposta ao cliente (§7.4).
-- `whatsapp_lid` + `telefone` nullable (migration 101, item (c) da FASE 0.4):
-- mesma dependência estrutural do buffer. Sem a coluna, o turno iniciado por
-- áudio ou imagem nunca gravava `clientes.whatsapp_lid` — `deliverToTurn` não
-- tinha o que propagar.
CREATE TABLE IF NOT EXISTS public.whatsapp_midia (
  wamid          text        NOT NULL PRIMARY KEY,
  telefone       text,
  whatsapp_lid   text,
  tipo           text        NOT NULL,          -- 'audio' | 'image'
  media_id       text        NOT NULL,
  mime_type      text,
  tamanho_bytes  integer,
  status         text        NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','processando','concluido','falhou','recusado')),
  texto          text,                          -- transcrição ou descrição
  erro           text,
  modelo         text,
  duracao_ms     integer,
  tentativas     integer     NOT NULL DEFAULT 0,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  -- 107: contacts[].profile.name do payload original (pushname) — sobrevive
  -- até o consumer de mídia resolver o cliente, depois da transcrição/visão.
  nome_contato   text,
  CONSTRAINT whatsapp_midia_identidade_chk
    CHECK (telefone IS NOT NULL OR whatsapp_lid IS NOT NULL)
);

-- customer_intelligence: fatos materializados por cliente (migration 095) — base
-- da Customer SKILL que o agente lê a cada turno. NÃO guarda o documento
-- renderizado: ele é projetado no turno (`server/utils/agent/customerSkill.ts`).
-- Identificadores em inglês por decisão de nomenclatura (§2 de
-- `_docs/REVENUE/study.md`); a ponte com o schema legado é a FK.
-- `atualizado_em` mantém o nome legado porque é a coluna que
-- `update_updated_at_column()` grava.
CREATE TABLE IF NOT EXISTS public.customer_intelligence (
  customer_id        uuid        NOT NULL PRIMARY KEY
                                 REFERENCES public.clientes(id) ON DELETE CASCADE,
  median_cycle_days  numeric,
  cycle_sample_size  int         NOT NULL DEFAULT 0,
  churn_risk         text        NOT NULL DEFAULT 'no_orders'
    CONSTRAINT customer_intelligence_churn_risk_check
      CHECK (churn_risk IN ('low','medium','high','critical','no_orders')),
  delivered_orders   int         NOT NULL DEFAULT 0,
  avg_ticket         numeric,
  top_products       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  payment_method     text,
  payment_share      numeric,
  delivery_mode      text,
  delivery_share     numeric,
  peak_weekday       int,
  peak_hour          int,
  peak_share         numeric,
  rfm_recency_q      int,
  rfm_frequency_q    int,
  rfm_monetary_q     int,
  rfm_segment        text
    CONSTRAINT customer_intelligence_rfm_segment_check
      CHECK (rfm_segment IS NULL OR rfm_segment IN ('champion','loyal','at_risk','dormant','new')),
  preferences        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  computed_at        timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

-- agente_uso_tokens: telemetria de custo/latência por turno do agente.
-- `rounds` e `avaliacao_pendente` vieram na migration 097 (observabilidade):
-- `rounds` é NULL em registro de mídia (transcrição/visão não têm loop de tool
-- calls) — NULL e zero significam coisas diferentes aqui.
-- `seq` veio na migration 105: seq (whatsapp_conversas) da resposta do
-- assistente deste turno, gravado pelo mesmo INSERT de saveConversationTurn —
-- âncora exata para loadJudgeWindow montar a janela de julgamento, sem
-- ambiguidade de timestamp (NULL para turnos sem cliente_id, ex.: mídia).
-- `tool_trace` veio na migration 106: tool calls executadas neste turno
-- ([{name,args,result}]) — dá ao juiz (conversationJudge.ts) visibilidade
-- para não marcar dado tool-grounded como alucinação. NULL para turnos
-- anteriores ao deploy da 106, nunca [] retroativo.
CREATE TABLE IF NOT EXISTS public.agente_uso_tokens (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id         uuid        REFERENCES public.clientes(id),
  modelo             text        NOT NULL,
  prompt_tokens      integer     NOT NULL,
  completion_tokens  integer     NOT NULL,
  latencia_ms        integer,
  rounds             integer,
  avaliacao_pendente boolean     NOT NULL DEFAULT true,
  seq                integer,
  tool_trace         jsonb,
  criado_em          timestamptz NOT NULL DEFAULT now()
);

-- Índice parcial: a task `agent:evaluate` lê apenas os pendentes, do mais antigo
-- para o mais novo. Mantém os já avaliados fora do scan (migration 097).
CREATE INDEX IF NOT EXISTS idx_agente_uso_tokens_pendente_criado_em
  ON public.agente_uso_tokens (criado_em ASC)
  WHERE avaliacao_pendente = true;

-- Turnos "pesados" (rounds = MAX_AGENT_ROUNDS) no dashboard (migration 097).
CREATE INDEX IF NOT EXISTS idx_agente_uso_tokens_rounds
  ON public.agente_uso_tokens (rounds)
  WHERE rounds IS NOT NULL;

-- agente_teste_run / agente_avaliacao (migration 105): avaliador unificado por
-- janela/conversa — substitui agente_avaliacao_turnos (098, avaliação por par
-- isolado; removida na 105). Dois gatilhos escrevem na mesma tabela: a task
-- agendada `agent:evaluate` (origem='producao') e o runner do laboratório sob
-- demanda (origem='laboratorio', agrupado por agente_teste_run). O dashboard lê
-- por rota de API com service role — nunca pelo client autenticado do navegador.
CREATE TABLE IF NOT EXISTS public.agente_teste_run (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status        text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'done', 'failed')),
  score         smallint    CHECK (score BETWEEN 0 AND 100),
  erro          text,
  iniciado_em   timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz
);

-- Só 1 corrida `running` por vez (mesmo padrão de loja_linha_unica_idx, 102).
CREATE UNIQUE INDEX IF NOT EXISTS agente_teste_run_unica_ativa
  ON public.agente_teste_run ((true)) WHERE status = 'running';

CREATE TABLE IF NOT EXISTS public.agente_avaliacao (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origem           text        NOT NULL CHECK (origem IN ('producao', 'laboratorio')),
  run_id           uuid        REFERENCES public.agente_teste_run(id) ON DELETE CASCADE,
  persona          text,
  uso_id           uuid        REFERENCES public.agente_uso_tokens(id) ON DELETE CASCADE,
  cliente_id       uuid        REFERENCES public.clientes(id),
  modelo_avaliador text        NOT NULL,
  janela           jsonb       NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'done', 'judge_failed', 'failed')),
  veredicto        text        CHECK (veredicto IN ('verde', 'amarelo', 'vermelho')),
  achados          jsonb,
  tokens_avaliacao integer,
  avaliado_em      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agente_avaliacao_origem_chk CHECK (
    (origem = 'laboratorio' AND run_id IS NOT NULL AND persona IS NOT NULL AND uso_id IS NULL)
    OR
    (origem = 'producao' AND uso_id IS NOT NULL AND run_id IS NULL AND persona IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_avaliado_em
  ON public.agente_avaliacao (avaliado_em DESC);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_origem_avaliado_em
  ON public.agente_avaliacao (origem, avaliado_em DESC);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_run_id
  ON public.agente_avaliacao (run_id);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_uso_id
  ON public.agente_avaliacao (uso_id);

CREATE INDEX IF NOT EXISTS idx_agente_avaliacao_cliente_id
  ON public.agente_avaliacao (cliente_id, avaliado_em DESC);

-- 3.23 insumos (migration 111) — matéria-prima com ciclo de vida próprio
CREATE TABLE IF NOT EXISTS public.insumos (
  id             uuid                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome           text                     NOT NULL,
  unidade_medida public.unidade_medida_enum NOT NULL DEFAULT 'unidade',
  estoque_atual  numeric                  NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  estoque_minimo numeric,
  ativo          boolean                  NOT NULL DEFAULT true,
  criado_em      timestamptz              NOT NULL DEFAULT now(),
  atualizado_em  timestamptz              NOT NULL DEFAULT now()
);

-- 3.24 produto_insumos (migration 111) — receita/BOM: consumo de insumo por produto
CREATE TABLE IF NOT EXISTS public.produto_insumos (
  produto_id             uuid    NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  insumo_id              uuid    NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  quantidade_por_unidade numeric NOT NULL CHECK (quantidade_por_unidade > 0),
  PRIMARY KEY (produto_id, insumo_id)
);

-- 3.25 estoque_movimentacoes (migration 111) — trilha de auditoria e ledger de estoque
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_entidade  text        NOT NULL CHECK (tipo_entidade IN ('produto', 'insumo')),
  entidade_id    uuid        NOT NULL,
  tipo_movimento text        NOT NULL CHECK (tipo_movimento IN ('entrada', 'saida', 'ajuste', 'venda', 'cancelamento')),
  quantidade     numeric     NOT NULL,
  motivo         text,
  pedido_id      uuid        REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id     uuid        REFERENCES public.usuarios(id),
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. FUNÇÕES ───────────────────────────────────────────────────────────────

-- 4.1 update_updated_at_column — trigger utilitário
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- 4.2 RBAC helpers — SECURITY DEFINER obrigatório para evitar recursão RLS na
--     tabela usuarios (as políticas de usuarios chamam has_role/is_staff, que
--     precisam ler usuarios sem passar pelo RLS — de outra forma entrariam em loop).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.role_usuario_enum
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT u.role
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND u.ativo = true;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.ativo = true
      AND u.role IN ('atendente', 'producao', 'gerente', 'administrador', 'proprietario')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(roles public.role_usuario_enum[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.ativo = true
      AND u.role = ANY(roles)
  );
$$;

-- 4.3 handle_new_auth_user — cria perfil em public.usuarios ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.role_usuario_enum, 'atendente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4.4 freeze_product_info — congela nome/preço do produto no momento do pedido
CREATE OR REPLACE FUNCTION public.freeze_product_info()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_nome  text;
  v_preco numeric;
BEGIN
  -- Preço vigente = promocional quando definido, senão o preço de venda.
  SELECT p.nome, COALESCE(p.preco_promocional, p.preco_venda)
    INTO v_nome, v_preco
    FROM public.produtos p
   WHERE p.id = NEW.produto_id;

  NEW.nome_produto_congelado   := v_nome;
  NEW.preco_unitario_congelado := v_preco;
  RETURN NEW;
END;
$$;

-- 4.5 recalculate_item_subtotal — recalcula subtotal do item e das opções
CREATE OR REPLACE FUNCTION public.recalculate_item_subtotal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_extras numeric := 0;
  v_item   RECORD;
BEGIN
  -- Disparado por itens_pedido_opcoes: recalcula o item pai
  IF TG_TABLE_NAME = 'itens_pedido_opcoes' THEN
    SELECT COALESCE(SUM(preco_delta_congelado), 0) INTO v_extras
    FROM public.itens_pedido_opcoes
    WHERE item_pedido_id = COALESCE(NEW.item_pedido_id, OLD.item_pedido_id);

    SELECT preco_unitario_congelado, quantidade INTO v_item
    FROM public.itens_pedido
    WHERE id = COALESCE(NEW.item_pedido_id, OLD.item_pedido_id);

    UPDATE public.itens_pedido
    SET subtotal = (COALESCE(v_item.preco_unitario_congelado, 0) + v_extras)
                  * COALESCE(v_item.quantidade, 0)
    WHERE id = COALESCE(NEW.item_pedido_id, OLD.item_pedido_id);

    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Disparado por itens_pedido (INSERT/UPDATE)
  SELECT COALESCE(SUM(preco_delta_congelado), 0) INTO v_extras
  FROM public.itens_pedido_opcoes
  WHERE item_pedido_id = NEW.id;

  NEW.subtotal := (COALESCE(NEW.preco_unitario_congelado, 0) + v_extras)
                  * COALESCE(NEW.quantidade, 0);
  RETURN NEW;
END;
$$;

-- 4.6 recalculate_order_subtotal — atualiza valor_subtotal do pedido
CREATE OR REPLACE FUNCTION public.recalculate_order_subtotal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_pedido_id uuid;
  v_subtotal  numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_pedido_id := OLD.pedido_id;
  ELSE
    v_pedido_id := NEW.pedido_id;
  END IF;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
  FROM public.itens_pedido
  WHERE pedido_id = v_pedido_id;

  UPDATE public.pedidos
  SET valor_subtotal = v_subtotal
  WHERE id = v_pedido_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- 4.7 calculate_frequencia_compra — classifica frequência de compra do cliente
CREATE OR REPLACE FUNCTION public.calculate_frequencia_compra(p_cliente_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_total_pedidos int;
  v_meses_ativo   numeric;
  v_freq          numeric;
BEGIN
  SELECT
    total_pedidos,
    GREATEST(EXTRACT(EPOCH FROM (now() - cliente_desde)) / 2592000, 1)
  INTO v_total_pedidos, v_meses_ativo
  FROM public.clientes WHERE id = p_cliente_id;

  IF v_total_pedidos = 0 THEN RETURN 'Novo'; END IF;

  v_freq := v_total_pedidos / v_meses_ativo;

  IF    v_freq >= 4 THEN RETURN 'Semanal';
  ELSIF v_freq >= 2 THEN RETURN 'Quinzenal';
  ELSIF v_freq >= 1 THEN RETURN 'Mensal';
  ELSE                   RETURN 'Esporádico';
  END IF;
END;
$$;

-- 4.8 update_client_metrics — atualiza métricas do cliente ao mudar status do pedido
CREATE OR REPLACE FUNCTION public.update_client_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Flag-driven (sem chave hardcoded): a coluna de destino é que define o papel.
    IF EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = NEW.status AND is_delivered) THEN
      UPDATE public.clientes
      SET total_pedidos          = total_pedidos + 1,
          valor_gasto_acumulado  = valor_gasto_acumulado + NEW.valor_total,
          ultimo_pedido_em       = now(),
          frequencia_compra      = public.calculate_frequencia_compra(NEW.cliente_id)
      WHERE id = NEW.cliente_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = NEW.status AND is_cancelled) THEN
      UPDATE public.clientes
      SET total_cancelamentos = total_cancelamentos + 1
      WHERE id = NEW.cliente_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4.8b increment_cupom_uso — incremento atômico de uso
CREATE OR REPLACE FUNCTION public.increment_cupom_uso(p_cupom_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.cupons SET uso_atual = uso_atual + 1 WHERE id = p_cupom_id;
$$;

-- 4.8c claim_cupom_atomico — valida E incrementa em um único UPDATE (migration 056).
--      Elimina a race condition TOCTOU de dois checkouts simultâneos com o mesmo cupom.
--      Retorna zero linhas quando o cupom é inválido/esgotado. Único chamador: BFF.
CREATE OR REPLACE FUNCTION public.claim_cupom_atomico(p_codigo text, p_subtotal numeric)
RETURNS TABLE(cupom_id uuid, desconto numeric)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.cupons
  SET uso_atual = uso_atual + 1
  WHERE codigo  = upper(p_codigo)
    AND ativo   = true
    AND (uso_maximo  IS NULL OR uso_atual < uso_maximo)
    AND (data_inicio IS NULL OR data_inicio <= now())
    AND (data_fim    IS NULL OR data_fim    >= now())
    AND p_subtotal >= valor_minimo
  RETURNING
    id AS cupom_id,
    CASE tipo_desconto
      WHEN 'percentual' THEN round(p_subtotal * valor / 100.0, 2)
      ELSE least(valor, p_subtotal)
    END AS desconto;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_cupom_atomico(text, numeric) FROM PUBLIC, anon, authenticated;

-- 4.8d decrement_cupom_uso — rollback do uso quando o pedido falha após o claim (migration 056).
--      Best-effort: não rebaixa abaixo de 0.
CREATE OR REPLACE FUNCTION public.decrement_cupom_uso(p_cupom_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.cupons SET uso_atual = GREATEST(uso_atual - 1, 0) WHERE id = p_cupom_id;
$$;
REVOKE EXECUTE ON FUNCTION public.decrement_cupom_uso(uuid) FROM PUBLIC, anon, authenticated;

-- 4.9 log_pedido_status_change — registra histórico de status e define entregue_em
CREATE OR REPLACE FUNCTION public.log_pedido_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- entregue_em derivado do papel is_delivered da coluna (sem chave hardcoded).
    IF EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = NEW.status AND is_delivered) THEN
      IF NEW.entregue_em IS NULL THEN
        NEW.entregue_em := now();
      END IF;
    ELSIF OLD.entregue_em IS NOT NULL THEN
      -- Pedido revertido (ex.: cancelado após entregue) — limpa timestamp
      NEW.entregue_em := NULL;
    END IF;

    INSERT INTO public.pedido_status_historico (
      pedido_id, status_anterior, status_novo, alterado_por, origem
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(current_setting('app.origem', true), 'sistema')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4.10 cleanup_expired_sessions — expira sessões e purga o carrinho abandonado;
--      chamada pelo pg_cron. Sessões nascem com TTL de 2h; ao vencer, os
--      cart_items da compra abandonada são removidos (a linha da sessão fica
--      para auditoria). Sessões 'convertida' já têm o carrinho limpo no checkout.
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TABLE(total_expired integer, execution_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.sessoes
  SET status = 'expirada'
  WHERE status = 'ativa'
    AND expira_em <= now();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  -- Purga o carrinho-resíduo de toda sessão que não está mais ativa.
  DELETE FROM public.cart_items ci
  USING public.sessoes s
  WHERE ci.sessao_id = s.id
    AND s.status <> 'ativa';

  RETURN QUERY
  SELECT affected_rows AS total_expired, now() AS execution_time;
END;
$$;

-- 4.11 is_within_delivery_radius — Haversine pura (sem PostGIS)
--      SECURITY INVOKER: loja tem política "Public read available store" (USING true)
CREATE OR REPLACE FUNCTION public.is_within_delivery_radius(clat numeric, clng numeric)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT COALESCE(
    (
      SELECT
        6371 * 2 * ASIN(SQRT(
          POWER(SIN((RADIANS(clat::double precision) - RADIANS(l.latitude_origem::double precision)) / 2), 2) +
          COS(RADIANS(l.latitude_origem::double precision)) *
          COS(RADIANS(clat::double precision)) *
          POWER(SIN((RADIANS(clng::double precision) - RADIANS(l.longitude_origem::double precision)) / 2), 2)
        ))
        <= l.raio_atendimento_km::double precision
      FROM public.loja l
      WHERE l.latitude_origem IS NOT NULL
        AND l.longitude_origem IS NOT NULL
        AND l.raio_atendimento_km IS NOT NULL
      LIMIT 1
    ),
    -- Retorna true quando a loja ainda não configurou coordenadas (instalação nova)
    true
  );
$$;

COMMENT ON FUNCTION public.is_within_delivery_radius(numeric, numeric) IS
'Retorna true se (clat, clng) está dentro do raio de atendimento da loja. Usa Haversine pura (sem PostGIS). Retorna true quando não há coordenadas configuradas.';

-- 4.12 get_dashboard_metrics — faturamento por período em America/Sao_Paulo
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_date_start date DEFAULT NULL,
  p_date_end   date DEFAULT NULL
)
RETURNS TABLE (
  faturamento    numeric,
  total_pedidos  bigint,
  ticket_medio   numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_hoje  date        := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_start timestamptz := COALESCE(p_date_start, v_hoje) AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (COALESCE(p_date_end, v_hoje) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.valor_total), 0)::numeric,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(p.valor_total), 0) / COUNT(*)
         ELSE 0 END::numeric
  FROM public.pedidos p
  JOIN public.kanban_coluna k
    ON k.chave = p.status AND k.is_revenue_trigger = true
  -- Data do faturamento = quando o pedido ENTROU na coluna de receita atual.
  -- Generaliza para QUALQUER status escolhido (não usa entregue_em, que só
  -- existe para 'entregue'). Para 'entregue' o valor coincide com entregue_em.
  -- COALESCE cobre pedido criado direto no status (trigger só loga em UPDATE).
  CROSS JOIN LATERAL (
    SELECT COALESCE(max(h.criado_em), p.criado_em) AS entrou_em
    FROM public.pedido_status_historico h
    WHERE h.pedido_id = p.id
      AND h.status_novo = p.status
  ) e
  WHERE e.entrou_em >= v_start
    AND e.entrou_em  < v_end;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics(date, date) IS
'Faturamento, nº de pedidos e ticket médio para [p_date_start, p_date_end] em America/Sao_Paulo. Padrão: dia atual. Soma pedidos cujo status atual tem is_revenue_trigger=true, datados por quando entraram nesse status (via pedido_status_historico). Conversão saiu daqui: agora derivada do funil (visitas→pedidos).';

-- 4.13 get_dashboard_counts — contadores de cancelados, abertos, clientes, leads, produtos
CREATE OR REPLACE FUNCTION public.get_dashboard_counts(
  p_date_start date,
  p_date_end   date
)
RETURNS TABLE (
  cancelados      bigint,
  em_aberto       bigint,
  clientes_novos  bigint,
  leads           bigint,
  produtos_ativos bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_start timestamptz := p_date_start AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (p_date_end + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.pedidos p
     JOIN public.kanban_coluna k ON k.chave = p.status
     WHERE k.is_cancelled = true
       AND p.criado_em >= v_start AND p.criado_em < v_end)::bigint,

    (SELECT COUNT(*) FROM public.pedidos p
     JOIN public.kanban_coluna k ON k.chave = p.status
     WHERE k.is_open = true
       AND p.criado_em >= v_start AND p.criado_em < v_end)::bigint,

    (SELECT COUNT(*) FROM public.clientes c
     WHERE c.is_visitante = false
       AND c.cliente_desde >= v_start AND c.cliente_desde < v_end)::bigint,

    (SELECT COUNT(*) FROM public.clientes c WHERE c.is_visitante = true)::bigint,

    (SELECT COUNT(*) FROM public.produtos pr WHERE pr.disponivel = true)::bigint;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_counts(date, date) IS
'Contadores auxiliares para [p_date_start, p_date_end] em America/Sao_Paulo. Usa is_cancelled/is_open — sem status hardcoded.';

-- 4.14 get_top_produtos — top N produtos por quantidade vendida no período
CREATE OR REPLACE FUNCTION public.get_top_produtos(
  p_date_start date,
  p_date_end   date,
  p_limit      int DEFAULT 5
)
RETURNS TABLE (produto_id uuid, nome text, qtde bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_start timestamptz := p_date_start AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (p_date_end + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    ip.produto_id,
    pr.nome::text,
    SUM(ip.quantidade)::bigint AS qtde
  FROM public.itens_pedido ip
  JOIN public.pedidos        pe ON pe.id   = ip.pedido_id
  JOIN public.kanban_coluna  k  ON k.chave = pe.status
  JOIN public.produtos        pr ON pr.id  = ip.produto_id
  WHERE pe.criado_em >= v_start
    AND pe.criado_em  < v_end
    AND k.is_cancelled = false
  GROUP BY ip.produto_id, pr.nome
  ORDER BY qtde DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_top_produtos(date, date, int) IS
'Top N produtos por quantidade no período. Exclui pedidos is_cancelled.';

-- 4.15 get_top_paginas — top páginas visitadas (eventos page_view)
CREATE OR REPLACE FUNCTION public.get_top_paginas(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (pagina text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT (metadata->>'pagina') AS pagina, COUNT(*)::bigint AS total
  FROM public.evento_rastreamento
  WHERE tipo = 'page_view'
    AND criado_em >= now() - make_interval(hours => p_horas)
    AND metadata ? 'pagina'
  GROUP BY metadata->>'pagina'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- 4.16 get_top_cliques — top elementos clicados (eventos click)
CREATE OR REPLACE FUNCTION public.get_top_cliques(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (rotulo text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT (metadata->>'rotulo') AS rotulo, COUNT(*)::bigint AS total
  FROM public.evento_rastreamento
  WHERE tipo = 'click'
    AND criado_em >= now() - make_interval(hours => p_horas)
    AND metadata ? 'rotulo'
  GROUP BY metadata->>'rotulo'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- 4.17 get_funil_conversao — etapas web do funil (page_view → add_to_cart →
--      checkout_iniciado) por PERÍODO. A etapa final de pedidos reais é anexada
--      no frontend via total_pedidos (mesma base do faturamento — DRY),
--      reconciliando funil e card de faturamento. Ver migration 076.
CREATE OR REPLACE FUNCTION public.get_funil_conversao(
  p_date_start date DEFAULT NULL,
  p_date_end   date DEFAULT NULL
)
RETURNS TABLE (etapa text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  WITH bounds AS (
    SELECT
      COALESCE(p_date_start, (now() AT TIME ZONE 'America/Sao_Paulo')::date)
        AT TIME ZONE 'America/Sao_Paulo' AS v_start,
      (COALESCE(p_date_end, (now() AT TIME ZONE 'America/Sao_Paulo')::date) + interval '1 day')
        AT TIME ZONE 'America/Sao_Paulo' AS v_end
  ),
  ev AS (
    SELECT e.tipo
    FROM public.evento_rastreamento e, bounds b
    WHERE e.criado_em >= b.v_start AND e.criado_em < b.v_end
      AND e.tipo IN ('page_view', 'add_to_cart', 'checkout_iniciado')
  )
  SELECT etapa, total FROM (
    SELECT 1 AS ord, 'page_view'::text        AS etapa, COUNT(*) FILTER (WHERE tipo = 'page_view')::bigint        AS total FROM ev
    UNION ALL
    SELECT 2,        'add_to_cart',                     COUNT(*) FILTER (WHERE tipo = 'add_to_cart')::bigint               FROM ev
    UNION ALL
    SELECT 3,        'checkout_iniciado',               COUNT(*) FILTER (WHERE tipo = 'checkout_iniciado')::bigint         FROM ev
  ) s
  ORDER BY ord;
$$;

-- 4.18 get_top_categorias — top categorias por visualizações (eventos categoria_view)
CREATE OR REPLACE FUNCTION public.get_top_categorias(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (categoria_nome text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT (metadata->>'nome') AS categoria_nome, COUNT(*)::bigint AS total
  FROM public.evento_rastreamento
  WHERE tipo = 'categoria_view'
    AND criado_em >= now() - make_interval(hours => p_horas)
    AND metadata ? 'nome'
  GROUP BY metadata->>'nome'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_top_categorias(int, int) IS
'Top categorias navegadas no catálogo nas últimas N horas, via eventos categoria_view.';

-- 4.19 get_top_produtos_click — top produtos mais clicados/visualizados
CREATE OR REPLACE FUNCTION public.get_top_produtos_click(p_horas int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (produto_id uuid, nome text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    e.entidade_id                         AS produto_id,
    COALESCE(p.nome, 'Produto removido')  AS nome,
    COUNT(*)::bigint                      AS total
  FROM public.evento_rastreamento e
  LEFT JOIN public.produtos p ON p.id = e.entidade_id
  WHERE e.tipo = 'produto_click'
    AND e.entidade = 'produto'
    AND e.entidade_id IS NOT NULL
    AND e.criado_em >= now() - make_interval(hours => p_horas)
  GROUP BY e.entidade_id, p.nome
  ORDER BY total DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_top_produtos_click(int, int) IS
'Top produtos mais visualizados/clicados nas últimas N horas, via eventos produto_click.';

-- 4.20 set_revenue_status — define qual coluna kanban dispara faturamento (atômico)
--      SECURITY INVOKER + verificação explícita de papel (fail-fast)
CREATE OR REPLACE FUNCTION public.set_revenue_status(p_chave text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = p_chave) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_chave;
  END IF;

  -- Swap em dois passos (ver migration 075): um UPDATE de linha única sobre 2
  -- linhas pode transitar por 2 linhas is_revenue_trigger=true simultâneas e
  -- violar o índice único parcial não-adiável kanban_coluna_uniq_revenue_trigger
  -- (23505 → HTTP 409). Zerar todas antes de ligar a escolhida elimina o estado
  -- transitório. Ambos os UPDATEs têm WHERE (safeupdate ok). Corpo é atômico.
  UPDATE public.kanban_coluna
  SET is_revenue_trigger = false
  WHERE is_revenue_trigger;

  UPDATE public.kanban_coluna
  SET is_revenue_trigger = true
  WHERE chave = p_chave;
END;
$$;

COMMENT ON FUNCTION public.set_revenue_status(text) IS
'Define qual coluna kanban dispara o faturamento. Swap atômico em dois passos: exatamente 1 coluna ativa, sem violar o índice único parcial.';

-- 4.21 rls_auto_enable — event trigger: habilita RLS automaticamente em novas tabelas públicas
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
       AND cmd.schema_name IN ('public')
       AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
       AND cmd.schema_name NOT LIKE 'pg_toast%'
       AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip % (%.)', cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$$;

-- 4.22 trigger_webhook_outbox_worker — pg_cron aciona o endpoint interno da app
--      que drena o webhook_outbox (retry/backoff). Requer as configurações
--      app.base_url e app.worker_token (ver AÇÕES MANUAIS); sem elas, faz skip
--      silencioso — instalação nova não quebra, mas o fallback fica inativo.
CREATE OR REPLACE FUNCTION public.trigger_webhook_outbox_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_app_url      text := current_setting('app.base_url',     true);
  v_worker_token text := current_setting('app.worker_token', true);
BEGIN
  IF v_app_url IS NULL OR v_worker_token IS NULL THEN
    RAISE NOTICE 'app.base_url ou app.worker_token não configurados; pulando.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_app_url || '/api/internal/webhook-worker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_worker_token,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- 4.22b trigger_archive_orders — pg_cron aciona o endpoint de arquivamento de
--       pedidos (POST /api/cron/archive-orders). Substitui o antigo Vercel Cron.
--       Mesma dupla de configs do worker (app.base_url + app.worker_token);
--       sem elas, faz skip silencioso. Regras vêm de loja.config_pedidos.
CREATE OR REPLACE FUNCTION public.trigger_archive_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_app_url      text := current_setting('app.base_url',     true);
  v_worker_token text := current_setting('app.worker_token', true);
BEGIN
  IF v_app_url IS NULL OR v_worker_token IS NULL THEN
    RAISE NOTICE 'app.base_url ou app.worker_token não configurados; pulando.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_app_url || '/api/cron/archive-orders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_worker_token,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- 4.23 calcular_frete_por_distancia — frete por faixa de km (migration 030)
--      Retorna NULL se nenhuma regra ativa englobar a distância; o caller
--      (app) usa loja.taxa_entrega_padrao como fallback.
CREATE OR REPLACE FUNCTION public.calcular_frete_por_distancia(p_distancia_km numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_valor numeric;
BEGIN
  SELECT valor_frete INTO v_valor
  FROM public.regras_frete_distancia
  WHERE ativo = true
    AND p_distancia_km >= distancia_min_km
    AND p_distancia_km <  distancia_max_km
  ORDER BY ordem ASC
  LIMIT 1;

  RETURN v_valor;
END;
$$;

-- 4.23b catalog_products_page — página do catálogo em ordem pseudo-aleatória
--   por KEYSET (rank_aleatorio, id) com rotação por pivot (migration 061).
--   O(log n) por página: escala para 10k+ sem OFFSET nem count(*). Retorna só
--   campos públicos (nunca preco_custo/margem_lucro) + tem_opcoes inline.
-- Defaults (migration 083): o corpo já trata NULL em todos estes parâmetros
-- ("IS NULL OR ..."); sem DEFAULT eles ficavam obrigatórios na assinatura,
-- embora a primeira página (sem cursor) sempre os envie como null.
CREATE OR REPLACE FUNCTION public.catalog_products_page(
  p_pivot       double precision,
  p_cursor_rank double precision DEFAULT NULL,
  p_cursor_id   uuid             DEFAULT NULL,
  p_wrapped     boolean          DEFAULT false,
  p_limit       integer          DEFAULT 24,
  p_categoria   uuid             DEFAULT NULL
)
RETURNS TABLE (
  id                    uuid,
  categoria_id          uuid,
  nome                  text,
  descricao             text,
  foto_url              text,
  imagens               text[],
  preco_venda           numeric,
  preco_promocional     numeric,
  unidade_medida        public.unidade_medida_enum,
  permite_fracionamento boolean,
  estoque_atual         numeric,
  disponivel            boolean,
  criado_em             timestamptz,
  tem_opcoes            boolean,
  product_type          text,
  preorder_config       jsonb,
  rank_aleatorio        double precision,
  wrapped               boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lim integer := greatest(1, least(coalesce(p_limit, 24), 100));
  v_got integer;
BEGIN
  IF NOT coalesce(p_wrapped, false) THEN
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
             p.rank_aleatorio, false
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio >= p_pivot
        AND (p_cursor_rank IS NULL OR (p.rank_aleatorio, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.rank_aleatorio, p.id
      LIMIT v_lim;

    GET DIAGNOSTICS v_got = ROW_COUNT;
    IF v_got >= v_lim THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
             p.rank_aleatorio, true
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio < p_pivot
      ORDER BY p.rank_aleatorio, p.id
      LIMIT (v_lim - v_got);
  ELSE
    RETURN QUERY
      SELECT p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
             p.preco_venda, p.preco_promocional, p.unidade_medida,
             p.permite_fracionamento, p.estoque_atual, p.disponivel, p.criado_em,
             EXISTS (SELECT 1 FROM public.produto_opcao_grupo g WHERE g.produto_id = p.id),
             p.product_type, p.preorder_config,
             p.rank_aleatorio, true
      FROM public.produtos p
      WHERE p.disponivel
        AND (p_categoria IS NULL OR p.categoria_id = p_categoria)
        AND p.rank_aleatorio < p_pivot
        AND (p_cursor_rank IS NULL OR (p.rank_aleatorio, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.rank_aleatorio, p.id
      LIMIT v_lim;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid) TO anon, authenticated, service_role;

-- 4.23a reserve_preorders — reserva atômica anti-overbooking (migration 078).
-- Advisory lock por (produto, data) + validação + INSERT na mesma transação;
-- dois checkouts simultâneos jamais gravam além de daily_capacity. Erros
-- PREORDER_* (check_violation) são traduzidos pelo backend.
CREATE OR REPLACE FUNCTION public.reserve_preorders(p_order_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_item          jsonb;
  v_product_id    uuid;
  v_date          date;
  v_qty           numeric;
  v_produto       record;
  v_cfg           jsonb;
  v_capacity      numeric;
  v_min_qty       numeric;
  v_max_qty       numeric;
  v_min_lead      integer;
  v_max_lead      integer;
  v_used          numeric;
  v_today         date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_dow           text;
  v_horarios      jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
  END IF;

  SELECT config_horarios INTO v_horarios FROM public.loja LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_date       := (v_item->>'delivery_date')::date;
    v_qty        := (v_item->>'quantity')::numeric;

    IF v_product_id IS NULL OR v_date IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
    END IF;

    SELECT id, product_type, preorder_config, producao_diaria_limite, unidade_medida,
           COALESCE(preco_promocional, preco_venda) AS unit_price
      INTO v_produto
      FROM public.produtos
     WHERE id = v_product_id;

    IF v_produto.id IS NULL OR v_produto.product_type <> 'preorder'
       OR v_produto.preorder_config IS NULL THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PRODUCT' USING ERRCODE = 'check_violation',
        DETAIL = format('Produto %s não aceita encomenda.', v_product_id);
    END IF;

    v_cfg      := v_produto.preorder_config;
    -- Capacidade diária: migration 113 — fonte única com Gestão de Estoque
    -- (produtos.producao_diaria_limite), não mais preorder_config JSON.
    v_capacity := v_produto.producao_diaria_limite;
    v_min_qty  := COALESCE((v_cfg->>'min_quantity')::numeric, 0);
    v_max_qty  := COALESCE((v_cfg->>'max_quantity')::numeric, 'Infinity'::numeric);
    v_min_lead := COALESCE((v_cfg->>'min_lead_days')::integer, 0);
    v_max_lead := COALESCE((v_cfg->>'max_lead_days')::integer, 365);

    IF v_qty < v_min_qty OR v_qty > v_max_qty THEN
      RAISE EXCEPTION 'PREORDER_INVALID_QUANTITY' USING ERRCODE = 'check_violation',
        DETAIL = format('Quantidade %s fora do intervalo [%s, %s].', v_qty, v_min_qty, v_max_qty);
    END IF;

    IF v_date < v_today + v_min_lead OR v_date > v_today + v_max_lead THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Data %s fora da janela de antecedência.', v_date);
    END IF;

    v_dow := extract(dow FROM v_date)::int::text;
    IF v_horarios IS NOT NULL AND COALESCE(v_horarios->v_dow->>'aberto', 'false') <> 'true' THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Loja fechada em %s.', v_date);
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.preorder_blocked_dates b
       WHERE b.blocked_date = v_date
         AND (b.product_id IS NULL OR b.product_id = v_product_id)
    ) THEN
      RAISE EXCEPTION 'PREORDER_DATE_UNAVAILABLE' USING ERRCODE = 'check_violation',
        DETAIL = format('Data %s bloqueada.', v_date);
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_product_id::text || ':' || v_date::text, 0));

    SELECT COALESCE(SUM(pr.quantity), 0) INTO v_used
      FROM public.preorders pr
      JOIN public.pedidos pe ON pe.id = pr.order_id
      JOIN public.kanban_coluna kc ON kc.chave = pe.status
     WHERE pr.product_id = v_product_id
       AND pr.delivery_date = v_date
       AND NOT kc.is_cancelled;

    IF v_capacity IS NULL OR v_used + v_qty > v_capacity THEN
      RAISE EXCEPTION 'PREORDER_CAPACITY_EXCEEDED' USING ERRCODE = 'check_violation',
        DETAIL = format('Capacidade do dia %s esgotada (%s/%s).', v_date, v_used, v_capacity);
    END IF;

    INSERT INTO public.preorders (order_id, product_id, delivery_date, quantity, unit, rules_snapshot)
    VALUES (
      p_order_id,
      v_product_id,
      v_date,
      v_qty,
      COALESCE(v_produto.unidade_medida::text, 'unidade'),
      v_cfg || jsonb_build_object('unit_price', v_produto.unit_price, 'daily_capacity', v_capacity)
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) TO service_role;

-- 4.24 calculate_pedido_totals — valor_total = subtotal + frete - desconto (migration 030)
CREATE OR REPLACE FUNCTION public.calculate_pedido_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.valor_total :=
    COALESCE(NEW.valor_subtotal, 0)
    + COALESCE(NEW.valor_entrega, 0)
    - COALESCE(NEW.desconto_aplicado, 0);
  RETURN NEW;
END;
$$;

-- 4.25 prevent_self_privilege_change — bloqueia escalonamento de privilégio (migration 036)
--   A policy "Self update own profile" permite UPDATE da própria linha em
--   `usuarios` com WITH CHECK (id = auth.uid()). Como `role`/`ativo` vivem na
--   mesma linha e o RLS não checa por coluna, sem esta guarda um usuário de
--   baixo privilégio poderia se auto-promover a proprietário direto pela anon key.
--   Só bloqueia quando o usuário mexe em SI MESMO (auth.uid() = OLD.id) e não é
--   admin/proprietário. service_role (auth.uid() NULL) e admins editando terceiros
--   não são afetados.
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.ativo IS DISTINCT FROM OLD.ativo)
     AND NOT public.has_role(
       ARRAY['administrador','proprietario']::public.role_usuario_enum[]
     ) THEN
    RAISE EXCEPTION 'Alteração do próprio papel/status não é permitida.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_self_privilege_change() IS
'Bloqueia auto-alteração de role/ativo em usuarios por quem não é administrador/proprietario. '
'Defesa contra escalonamento de privilégio via policy "Self update own profile".';

REVOKE EXECUTE ON FUNCTION public.prevent_self_privilege_change() FROM PUBLIC, anon, authenticated;

-- 4.26 assign_order_driver — atribuição atômica de entregador (flag-driven)
--   Os estados de entrega vêm das flags de kanban_coluna (is_delivery_dispatch =
--   coluna gatilho; is_out_for_delivery = "saiu para entrega"), não de chaves
--   hardcoded. Seleciona um entregador livre com SKIP LOCKED (evita dupla
--   atribuição) e move o pedido para a coluna is_out_for_delivery.
CREATE OR REPLACE FUNCTION public.assign_order_driver(p_pedido_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_driver_id uuid;
  v_tipo_entrega text;
  v_status text;
  v_dispatch text;
  v_out text;
BEGIN
  -- Papéis de entrega resolvidos por flag (fonte única da verdade).
  SELECT chave INTO v_dispatch FROM public.kanban_coluna WHERE is_delivery_dispatch LIMIT 1;
  SELECT chave INTO v_out      FROM public.kanban_coluna WHERE is_out_for_delivery  LIMIT 1;
  IF v_dispatch IS NULL OR v_out IS NULL THEN
    RAISE EXCEPTION 'Fluxo de entrega não configurado: defina colunas is_delivery_dispatch e is_out_for_delivery em kanban_coluna.';
  END IF;

  -- Trava o pedido alvo e valida pré-condições (entrega + na coluna de despacho).
  SELECT p.tipo_entrega, p.status INTO v_tipo_entrega, v_status
  FROM public.pedidos p
  WHERE p.id = p_pedido_id
  FOR UPDATE;

  IF v_tipo_entrega IS DISTINCT FROM 'entrega' OR v_status IS DISTINCT FROM v_dispatch THEN
    RETURN NULL;
  END IF;

  -- Seleciona um entregador livre (sem pedido na coluna is_out_for_delivery),
  -- travando a linha para evitar escolha concorrente do mesmo entregador.
  SELECT u.id INTO v_driver_id
  FROM public.usuarios u
  WHERE u.role = 'entregador'
    AND u.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.entregador_id = u.id AND p.status = v_out
    )
  ORDER BY u.atualizado_em ASC
  LIMIT 1
  FOR UPDATE OF u SKIP LOCKED;

  IF v_driver_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Marca a origem desta transição automática para o histórico (trigger 006).
  PERFORM set_config('app.origem', 'sistema', true);

  UPDATE public.pedidos
  SET entregador_id = v_driver_id,
      atribuido_em = now(),
      status = v_out
  WHERE id = p_pedido_id
    AND entregador_id IS NULL
    AND status = v_dispatch;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_driver_id;
END;
$$;

COMMENT ON FUNCTION public.assign_order_driver(uuid) IS
'Atribui atomicamente um entregador livre a um pedido na coluna is_delivery_dispatch (SKIP LOCKED evita dupla atribuição). Estados por flag, sem chave hardcoded.';

REVOKE EXECUTE ON FUNCTION public.assign_order_driver(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.assign_order_driver(uuid) TO service_role;

-- 4.27 reevaluate_delivery_queue — atribui o próximo pedido pendente (flag-driven)
--   Ao liberar um entregador, pega o pedido mais antigo na coluna
--   is_delivery_dispatch sem entregador e tenta atribuí-lo.
CREATE OR REPLACE FUNCTION public.reevaluate_delivery_queue()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order_id uuid;
  v_driver_id uuid;
  v_dispatch text;
BEGIN
  SELECT chave INTO v_dispatch FROM public.kanban_coluna WHERE is_delivery_dispatch LIMIT 1;
  IF v_dispatch IS NULL THEN
    RETURN NULL;
  END IF;

  -- Pedido mais antigo aguardando entregador na coluna de despacho.
  SELECT id INTO v_order_id
  FROM public.pedidos
  WHERE status = v_dispatch
    AND tipo_entrega = 'entrega'
    AND entregador_id IS NULL
  ORDER BY criado_em ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_driver_id := public.assign_order_driver(v_order_id);
  IF v_driver_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.reevaluate_delivery_queue() IS
'Atribui o próximo pedido na coluna is_delivery_dispatch sem entregador ao liberar um entregador. Estados por flag.';

REVOKE EXECUTE ON FUNCTION public.reevaluate_delivery_queue() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reevaluate_delivery_queue() TO service_role;

-- 4.28 confirm_delivery_inbound — confirma entrega validando whatsapp (flag-driven)
--   Move o pedido da coluna is_out_for_delivery para is_delivered apenas se o
--   whatsapp informado bater com o entregador atribuído (números normalizados).
CREATE OR REPLACE FUNCTION public.confirm_delivery_inbound(p_pedido_id uuid, p_whatsapp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_valid boolean;
  v_normalized text := regexp_replace(COALESCE(p_whatsapp, ''), '\D', '', 'g');
  v_out text;
  v_delivered text;
BEGIN
  IF v_normalized = '' THEN
    RETURN false;
  END IF;

  SELECT chave INTO v_out       FROM public.kanban_coluna WHERE is_out_for_delivery LIMIT 1;
  SELECT chave INTO v_delivered FROM public.kanban_coluna WHERE is_delivered        LIMIT 1;
  IF v_out IS NULL OR v_delivered IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.pedidos p
    JOIN public.usuarios u ON u.id = p.entregador_id
    WHERE p.id = p_pedido_id
      AND p.status = v_out
      AND regexp_replace(COALESCE(u.whatsapp, ''), '\D', '', 'g') = v_normalized
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.origem', 'integracao', true);

  UPDATE public.pedidos
  SET status = v_delivered
  WHERE id = p_pedido_id AND status = v_out;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.confirm_delivery_inbound(uuid, text) IS
'Marca o pedido como entregue validando o whatsapp do entregador atribuído (integração inbound 6.4). Migration 017.';

REVOKE EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) TO service_role;

-- 4.29 guard_system_kanban_coluna — protege colunas de sistema (is_sistema)
--   BEFORE DELETE: bloqueia exclusão de coluna de sistema (mesmo vazia). Antes,
--   a FK ON DELETE RESTRICT só barrava se houvesse pedidos — uma coluna crítica
--   momentaneamente vazia podia ser excluída e quebrar a automação em silêncio.
--   BEFORE UPDATE: a chave (slug) e a própria flag is_sistema são imutáveis numa
--   coluna de sistema (renome/desproteção quebrariam FKs e a automação flag-driven).
CREATE OR REPLACE FUNCTION public.guard_system_kanban_coluna()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_sistema THEN
      RAISE EXCEPTION 'A coluna de sistema "%" não pode ser excluída.', OLD.label
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  ELSE -- UPDATE
    IF OLD.is_sistema AND (NEW.chave IS DISTINCT FROM OLD.chave OR NEW.is_sistema = false) THEN
      RAISE EXCEPTION 'Coluna de sistema "%": a chave e o status de sistema são imutáveis.', OLD.label
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.guard_system_kanban_coluna() IS
'Bloqueia exclusão de colunas de sistema e renome/desproteção da chave/is_sistema. Protege a automação flag-driven contra falhas de configuração.';

REVOKE EXECUTE ON FUNCTION public.guard_system_kanban_coluna() FROM PUBLIC, anon, authenticated;

-- 4.28 garantir_unica_categoria_principal — mantém no máximo UMA categoria
-- marcada como principal (âncora do catálogo). Migration 064.
CREATE OR REPLACE FUNCTION public.garantir_unica_categoria_principal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NEW.principal = TRUE THEN
    UPDATE public.categorias
    SET principal = FALSE
    WHERE id <> NEW.id AND principal = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

-- 4.30 f_unaccent / f_array_to_string — helpers IMMUTABLE p/ o índice GIN de
-- busca (uma função STABLE/VOLATILE não pode indexar; unaccent() é STABLE por
-- depender de configuração de texto, então embrulhamos como IMMUTABLE aqui).
-- Migration 068/070.
CREATE OR REPLACE FUNCTION public.f_unaccent(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
  SELECT extensions.unaccent(txt);
$$;
GRANT EXECUTE ON FUNCTION public.f_unaccent(text) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.f_array_to_string(arr text[])
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
  SELECT pg_catalog.array_to_string(arr, ' ');
$$;
GRANT EXECUTE ON FUNCTION public.f_array_to_string(text[]) TO PUBLIC;

-- 4.31 search_products — busca fuzzy p/ o agente (Token-AND + word_similarity
-- + sinônimos + tem_opcoes). SÓ service_role: é a integração inbound, nunca chamada direto
-- do cliente. Migration 068/070/071/110.
DROP FUNCTION IF EXISTS public.search_products(text, integer, integer);
CREATE FUNCTION public.search_products(p_term text, p_lim integer DEFAULT 20, p_off integer DEFAULT 0)
RETURNS TABLE(id uuid, nome text, descricao text, preco_venda numeric, preco_promocional numeric, unidade_medida text, categoria_nome text, tem_opcoes boolean)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  v_clean_term text;
  v_tokens     text[];
BEGIN
  v_clean_term := public.f_unaccent(lower(trim(COALESCE(p_term, ''))));

  IF v_clean_term = '' THEN
    RETURN;
  END IF;

  SELECT array_agg(t) INTO v_tokens
  FROM unnest(regexp_split_to_array(v_clean_term, '\s+')) t
  WHERE length(t) > 0;

  IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidato AS (
    SELECT
      p.id,
      p.nome,
      p.descricao,
      p.preco_venda,
      p.preco_promocional,
      p.unidade_medida::text,
      c.nome AS categoria_nome,
      EXISTS (
        SELECT 1 FROM public.produto_opcao_grupo pog WHERE pog.produto_id = p.id
      ) AS tem_opcoes,
      public.f_unaccent(lower(
        p.nome || ' ' ||
        COALESCE(p.descricao, '') || ' ' ||
        COALESCE(c.nome, '') || ' ' ||
        public.f_array_to_string(p.sinonimos)
      )) AS haystack,
      public.f_unaccent(lower(p.nome)) AS nome_clean,
      public.f_array_to_string(p.sinonimos) AS sinonimos_str
    FROM public.produtos p
    LEFT JOIN public.categorias c ON c.id = p.categoria_id
    WHERE p.disponivel = true
  )
  SELECT
    cand.id,
    cand.nome,
    cand.descricao,
    cand.preco_venda,
    cand.preco_promocional,
    cand.unidade_medida,
    cand.categoria_nome,
    cand.tem_opcoes
  FROM candidato cand
  WHERE
    NOT EXISTS (
      SELECT 1
      FROM unnest(v_tokens) tok
      WHERE NOT (
        cand.haystack LIKE '%' || tok || '%'
        OR extensions.word_similarity(tok, cand.haystack) >= 0.35
      )
    )
  ORDER BY
    (
      CASE
        WHEN cand.nome_clean = v_clean_term THEN 1000
        WHEN cand.sinonimos_str LIKE '%' || v_clean_term || '%' THEN 800
        WHEN cand.nome_clean LIKE '%' || v_clean_term || '%' THEN 600
        WHEN cand.haystack LIKE '%' || v_clean_term || '%' THEN 400
        ELSE 100
      END +
      (extensions.word_similarity(v_clean_term, cand.haystack) * 100)::integer
    ) DESC,
    cand.nome ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.search_products(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.search_products(text, integer, integer) TO service_role;

-- 4.32 search_admin_products — mesma busca de search_products + filtro por
-- categoria/disponibilidade/product_type, para o painel admin. Migration 071.
CREATE OR REPLACE FUNCTION public.search_admin_products(
  p_term text DEFAULT NULL, p_categoria_id uuid DEFAULT NULL, p_disponivel boolean DEFAULT NULL,
  p_lim integer DEFAULT 20, p_off integer DEFAULT 0, p_product_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, categoria_id uuid, nome text, descricao text, foto_url text, imagens text[],
  preco_custo numeric, margem_lucro numeric, preco_venda numeric, preco_promocional numeric,
  unidade_medida text, permite_fracionamento boolean, estoque_atual numeric, disponivel boolean,
  criado_em timestamptz, sinonimos text[], product_type text, preorder_config jsonb,
  categoria_nome text, tem_opcoes boolean, total_count bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  v_clean_term text;
  v_tokens     text[];
  v_has_term   boolean := false;
BEGIN
  IF p_term IS NOT NULL AND trim(p_term) <> '' THEN
    v_clean_term := public.f_unaccent(lower(trim(p_term)));
    SELECT array_agg(t) INTO v_tokens
    FROM unnest(regexp_split_to_array(v_clean_term, '\s+')) t
    WHERE length(t) > 0;

    IF v_tokens IS NOT NULL AND array_length(v_tokens, 1) > 0 THEN
      v_has_term := true;
    END IF;
  END IF;

  RETURN QUERY
  WITH filtrado AS (
    SELECT
      p.id, p.categoria_id, p.nome, p.descricao, p.foto_url, p.imagens,
      p.preco_custo, p.margem_lucro, p.preco_venda, p.preco_promocional,
      p.unidade_medida::text, p.permite_fracionamento, p.estoque_atual, p.disponivel,
      p.criado_em, p.sinonimos, p.product_type, p.preorder_config::jsonb,
      c.nome AS categoria_nome,
      EXISTS (
        SELECT 1 FROM public.produto_opcao_grupo pog WHERE pog.produto_id = p.id
      ) AS tem_opcoes,
      public.f_unaccent(lower(
        p.nome || ' ' ||
        COALESCE(p.descricao, '') || ' ' ||
        COALESCE(c.nome, '') || ' ' ||
        public.f_array_to_string(p.sinonimos)
      )) AS haystack,
      public.f_unaccent(lower(p.nome)) AS nome_clean,
      public.f_array_to_string(p.sinonimos) AS sinonimos_str
    FROM public.produtos p
    LEFT JOIN public.categorias c ON c.id = p.categoria_id
    WHERE
      (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
      AND (p_disponivel IS NULL OR p.disponivel = p_disponivel)
      AND (
        p_product_type IS NULL OR
        p.product_type = p_product_type OR
        (p_product_type = 'preorder' AND p.product_type = 'both') OR
        (p_product_type = 'stock' AND p.product_type = 'both')
      )
      AND (
        NOT v_has_term
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(v_tokens) tok
          WHERE NOT (
            public.f_unaccent(lower(
              p.nome || ' ' ||
              COALESCE(p.descricao, '') || ' ' ||
              COALESCE(c.nome, '') || ' ' ||
              public.f_array_to_string(p.sinonimos)
            )) LIKE '%' || tok || '%'
            OR extensions.word_similarity(tok, public.f_unaccent(lower(
              p.nome || ' ' ||
              COALESCE(p.descricao, '') || ' ' ||
              COALESCE(c.nome, '') || ' ' ||
              public.f_array_to_string(p.sinonimos)
            ))) >= 0.35
          )
        )
      )
  ),
  contado AS (
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtrado f
  )
  SELECT
    c.id, c.categoria_id, c.nome, c.descricao, c.foto_url, c.imagens,
    c.preco_custo, c.margem_lucro, c.preco_venda, c.preco_promocional,
    c.unidade_medida, c.permite_fracionamento, c.estoque_atual, c.disponivel,
    c.criado_em, c.sinonimos, c.product_type, c.preorder_config,
    c.categoria_nome, c.tem_opcoes, c.total_count
  FROM contado c
  ORDER BY
    CASE WHEN v_has_term THEN
      (
        CASE
          WHEN c.nome_clean = v_clean_term THEN 1000
          WHEN c.sinonimos_str LIKE '%' || v_clean_term || '%' THEN 800
          WHEN c.nome_clean LIKE '%' || v_clean_term || '%' THEN 600
          WHEN c.haystack LIKE '%' || v_clean_term || '%' THEN 400
          ELSE 100
        END +
        (extensions.word_similarity(v_clean_term, c.haystack) * 100)::integer
      )
    ELSE 0 END DESC,
    c.criado_em DESC,
    c.nome ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) TO anon, authenticated, service_role;

-- Índice GIN de suporte à busca fuzzy (idx_produtos_trgm_busca — migration 068/070).
CREATE INDEX IF NOT EXISTS idx_produtos_trgm_busca
  ON public.produtos USING gin (
    f_unaccent(lower(nome || ' ' || COALESCE(descricao, '') || ' ' || f_array_to_string(sinonimos))) extensions.gin_trgm_ops
  ) WHERE disponivel;

-- 4.33 create_integration_order — criação atômica de pedido da integração
-- inbound (idempotência + endereço + pedido + itens + fulfillment por-item +
-- reserva de encomenda + conversão de sessão), migrations 073/080/086. Único
-- chamador: server/utils/integration/createIntegrationOrder.ts.
CREATE OR REPLACE FUNCTION public.create_integration_order(
  p_idempotency_key   text,
  p_cliente_id        uuid,
  p_tipo_entrega      public.tipo_entrega_enum,
  p_forma_pagamento   public.forma_pagamento_enum,
  p_status            text,
  p_itens             jsonb,
  p_endereco_id       uuid    DEFAULT NULL,
  p_endereco_novo     jsonb   DEFAULT NULL,
  p_sessao_id         uuid    DEFAULT NULL,
  p_observacoes       text    DEFAULT NULL,
  p_nota_operacional  text    DEFAULT NULL,
  p_desconto_aplicado numeric DEFAULT 0,
  p_valor_entrega     numeric DEFAULT 0,
  p_frete_gratis      boolean DEFAULT false,
  p_preorder_items    jsonb   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_inserted    integer;
  v_existing    text;
  v_endereco_id uuid := p_endereco_id;
  v_pedido_id   uuid;
  v_subtotal    numeric;
  v_total       numeric;
  v_has_key     boolean := p_idempotency_key IS NOT NULL AND p_idempotency_key <> '';
BEGIN
  IF v_has_key THEN
    INSERT INTO public.integration_idempotency (key, status, payload)
    VALUES (p_idempotency_key, 'processing', NULL)
    ON CONFLICT (key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF v_inserted = 0 THEN
      SELECT payload->>'pedido_id' INTO v_existing
      FROM public.integration_idempotency
      WHERE key = p_idempotency_key;

      IF v_existing IS NOT NULL THEN
        SELECT p.valor_subtotal, p.valor_total INTO v_subtotal, v_total
        FROM public.pedidos p WHERE p.id = v_existing::uuid;
        RETURN jsonb_build_object(
          'outcome', 'replay',
          'pedido_id', v_existing,
          'subtotal', COALESCE(v_subtotal, 0),
          'total', COALESCE(v_total, 0)
        );
      END IF;

      RETURN jsonb_build_object('outcome', 'in_flight');
    END IF;
  END IF;

  IF p_endereco_novo IS NOT NULL THEN
    INSERT INTO public.enderecos_cliente (
      cliente_id, rua, numero, bairro, complemento, cidade, estado, cep, latitude, longitude
    )
    VALUES (
      p_cliente_id,
      p_endereco_novo->>'rua',
      p_endereco_novo->>'numero',
      p_endereco_novo->>'bairro',
      p_endereco_novo->>'complemento',
      p_endereco_novo->>'cidade',
      p_endereco_novo->>'estado',
      p_endereco_novo->>'cep',
      (p_endereco_novo->>'latitude')::numeric,
      (p_endereco_novo->>'longitude')::numeric
    )
    RETURNING id INTO v_endereco_id;
  END IF;

  INSERT INTO public.pedidos (
    cliente_id, sessao_id, endereco_id, tipo_entrega, forma_pagamento,
    observacoes, status, nota_operacional, desconto_aplicado, valor_entrega,
    frete_gratis_aplicado
  )
  VALUES (
    p_cliente_id, p_sessao_id, v_endereco_id, p_tipo_entrega, p_forma_pagamento,
    p_observacoes, p_status, p_nota_operacional, COALESCE(p_desconto_aplicado, 0),
    COALESCE(p_valor_entrega, 0), COALESCE(p_frete_gratis, false)
  )
  RETURNING id INTO v_pedido_id;

  -- Fulfillment por-item (Feature 4.1): delivery_mode/address_id no item jsonb
  -- SÓ quando diverge do padrão do carrinho; ausente = NULL = herda o pedido.
  INSERT INTO public.itens_pedido (pedido_id, produto_id, quantidade, delivery_mode, endereco_id)
  SELECT
    v_pedido_id,
    (item->>'produto_id')::uuid,
    (item->>'quantidade')::numeric,
    NULLIF(item->>'delivery_mode', ''),
    NULLIF(item->>'address_id', '')::uuid
  FROM jsonb_array_elements(p_itens) AS item;

  IF p_preorder_items IS NOT NULL
     AND jsonb_typeof(p_preorder_items) = 'array'
     AND jsonb_array_length(p_preorder_items) > 0 THEN
    PERFORM public.reserve_preorders(v_pedido_id, p_preorder_items);
  END IF;

  -- Gestão de estoque (migration 111): no-op para produto com
  -- controle_estoque='nenhum' — comportamento anterior preservado.
  PERFORM public.consumir_estoque_pedido(v_pedido_id, p_itens);

  IF v_has_key THEN
    UPDATE public.integration_idempotency
    SET status = 'completed', payload = jsonb_build_object('pedido_id', v_pedido_id)
    WHERE key = p_idempotency_key;
  END IF;

  IF p_sessao_id IS NOT NULL THEN
    UPDATE public.sessoes SET status = 'convertida' WHERE id = p_sessao_id;
    DELETE FROM public.cart_items WHERE sessao_id = p_sessao_id;
  END IF;

  SELECT p.valor_subtotal, p.valor_total INTO v_subtotal, v_total
  FROM public.pedidos p WHERE p.id = v_pedido_id;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'pedido_id', v_pedido_id,
    'subtotal', COALESCE(v_subtotal, 0),
    'total', COALESCE(v_total, 0)
  );
END;
$$;

-- 4.34 whatsapp_buffer_append — upsert atômico do buffer de rajada (migration
-- 087, `p_lid` na 100, chave por identidade e `RETURNS text` na 101). Evita a
-- janela de corrida de um read-modify-write em `textos` (jsonb) no lado da
-- aplicação quando duas mensagens do mesmo cliente chegam quase simultâneas.
-- Único chamador: server/utils/whatsapp/burstBuffer.ts.
-- Devolve a `chave` porque é o ÚNICO escritor da tabela: recalcular a derivação
-- no produtor criaria duas fontes de verdade para a chave do claim.
CREATE OR REPLACE FUNCTION public.whatsapp_buffer_append(
  p_telefone text,
  p_texto    text,
  p_msg_id   text,
  p_lid      text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_chave text;
BEGIN
  IF p_telefone IS NULL AND p_lid IS NULL THEN
    -- Sem identificador nenhum não há turno possível: não dá para reivindicar
    -- nem para responder. Falhar é melhor que gravar linha órfã.
    RAISE EXCEPTION 'whatsapp_buffer_append exige p_telefone ou p_lid';
  END IF;

  v_chave := COALESCE(p_telefone, 'lid:' || p_lid);

  INSERT INTO public.whatsapp_turno_buffer (chave, telefone, textos, ultima_msg_id, whatsapp_lid)
  VALUES (v_chave, p_telefone, jsonb_build_array(p_texto), p_msg_id, p_lid)
  ON CONFLICT (chave) DO UPDATE
  SET textos        = public.whatsapp_turno_buffer.textos || jsonb_build_array(p_texto),
      ultima_msg_id = p_msg_id,
      -- Nunca rebaixa para NULL: o append do consumer de mídia só conhece o lid
      -- quando o payload daquela mídia o trouxe, e numa rajada mista texto+áudio
      -- ele apagaria o lid gravado pela mensagem de texto.
      whatsapp_lid  = COALESCE(p_lid, public.whatsapp_turno_buffer.whatsapp_lid),
      atualizado_em = now();
  -- `telefone` não é atualizado no conflito: é o que deriva a chave, e a linha
  -- só conflita quando a chave é idêntica.

  RETURN v_chave;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) TO service_role;

-- 4.35 agente_openai_key_get — única leitura de vault.decrypted_secrets no
-- runtime do agente (migration 088). SECURITY DEFINER: vault.decrypted_secrets
-- não é acessível a service_role por padrão, só ao dono da função.
CREATE OR REPLACE FUNCTION public.agente_openai_key_get()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  SELECT agente_openai_key_id INTO v_key_id FROM public.loja LIMIT 1;
  IF v_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_get() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_get() TO service_role;

-- 4.36 agente_openai_key_set — única escrita em vault.create_secret/update_secret
-- (migration 088, corrigida na 089 e na 090). Cria o segredo na primeira
-- gravação, atualiza in-place nas seguintes; retorna o id para o endpoint
-- confirmar sucesso. Dois detalhes que já custaram um 500 cada:
--   • `vault.create_secret` retorna um escalar uuid — atribuição direta (`:=`),
--     nunca `SELECT ... FROM vault.create_secret(...)` (isso produziria uma
--     coluna chamada `create_secret`, não `id`; bug da 088, fix na 089).
--   • Todo UPDATE precisa de WHERE: a Supabase carrega `pg-safeupdate` no role
--     do PostgREST e aborta UPDATE/DELETE sem WHERE com `21000` (bug da
--     088/089, fix na 090 — mesmo tropeço que `set_revenue_status` teve).
-- A busca por `vault.secrets.name` antes de criar reconcilia o estado
-- divergente (coluna NULL + segredo existente), que violaria o UNIQUE do nome.
CREATE OR REPLACE FUNCTION public.agente_openai_key_set(p_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id     uuid;
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  SELECT id, agente_openai_key_id
    INTO v_loja_id, v_existing_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada — configure a loja antes da chave OpenAI.';
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM vault.secrets WHERE name = 'loja_openai_key';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_key);
    UPDATE public.loja SET agente_openai_key_id = v_existing_id WHERE id = v_loja_id;
    RETURN v_existing_id;
  END IF;

  v_new_id := vault.create_secret(p_key, 'loja_openai_key');
  UPDATE public.loja SET agente_openai_key_id = v_new_id WHERE id = v_loja_id;
  RETURN v_new_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_set(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_set(text) TO service_role;

-- 4.37 agente_openai_key_delete — revogação (migration 092). Deleta o segredo
-- de fato: revogação que deixa o texto cifrado no banco não é revogação.
-- Limpa também a máscara, que é o indicador de "há chave" na UI.
CREATE OR REPLACE FUNCTION public.agente_openai_key_delete()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id uuid;
  v_key_id  uuid;
BEGIN
  SELECT id, agente_openai_key_id
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'loja_openai_key';
  END IF;

  UPDATE public.loja
     SET agente_openai_key_id = NULL,
         agente_openai_key_mascara = NULL
   WHERE id = v_loja_id;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agente_openai_key_delete() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agente_openai_key_delete() TO service_role;

-- 4.38 whatsapp_api_key_get/set/delete — token do provedor de WhatsApp no Vault
-- (migration 093). Espelho exato do trio da chave OpenAI acima, com o nome de
-- segredo `loja_whatsapp_api_key`: mesmas três lições já pagas (escalar de
-- `vault.create_secret`, UPDATE sempre com WHERE por causa do `pg-safeupdate`,
-- reconciliação por `vault.secrets.name` antes de criar).
CREATE OR REPLACE FUNCTION public.whatsapp_api_key_get()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  SELECT whatsapp_api_key_id INTO v_key_id FROM public.loja LIMIT 1;
  IF v_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_api_key_get() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_api_key_get() TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_api_key_set(p_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id     uuid;
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  SELECT id, whatsapp_api_key_id
    INTO v_loja_id, v_existing_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada — configure a loja antes do token do provedor de WhatsApp.';
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM vault.secrets WHERE name = 'loja_whatsapp_api_key';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_key);
    UPDATE public.loja SET whatsapp_api_key_id = v_existing_id WHERE id = v_loja_id;
    RETURN v_existing_id;
  END IF;

  v_new_id := vault.create_secret(p_key, 'loja_whatsapp_api_key');
  UPDATE public.loja SET whatsapp_api_key_id = v_new_id WHERE id = v_loja_id;
  RETURN v_new_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_api_key_set(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_api_key_set(text) TO service_role;

-- Revoga o token, mantendo URL base e rótulo: eles não são credencial, e
-- zerá-los faria o card perder a configuração junto com a revogação.
CREATE OR REPLACE FUNCTION public.whatsapp_api_key_delete()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id uuid;
  v_key_id  uuid;
BEGIN
  SELECT id, whatsapp_api_key_id
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'loja_whatsapp_api_key';
  END IF;

  UPDATE public.loja
     SET whatsapp_api_key_id = NULL,
         whatsapp_api_key_mascara = NULL
   WHERE id = v_loja_id;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_api_key_delete() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_api_key_delete() TO service_role;

-- 4.38b webhook_secret_get/set/delete — Bearer e chave de assinatura do webhook
-- de saída no Vault (migration 103). Terceiro uso do mesmo padrão (OpenAI 088,
-- provedor de WhatsApp 093), com uma diferença: UMA função por operação,
-- parametrizada pelo tipo, em vez de seis quase idênticas — os dois segredos
-- têm ciclo de vida igual, e corpo duplicado é como as versões divergem.
--
-- Estes segredos vieram do `.env` para o banco de propósito: com eles em
-- `wrangler secret`, só quem tem acesso ao deploy conseguia apontar a
-- notificação para o sistema da loja. Vault (e não coluna de texto) porque um
-- Bearer e uma chave de HMAC em coluna legível vazam em qualquer dump.
CREATE OR REPLACE FUNCTION public.webhook_secret_nome(p_tipo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE p_tipo
    WHEN 'token'   THEN 'loja_webhook_token'
    WHEN 'signing' THEN 'loja_webhook_signing_secret'
  END;
$function$;

CREATE OR REPLACE FUNCTION public.webhook_secret_get(p_tipo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  IF public.webhook_secret_nome(p_tipo) IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_tipo;
  END IF;

  SELECT CASE p_tipo
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.webhook_secret_get(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.webhook_secret_get(text) TO service_role;

CREATE OR REPLACE FUNCTION public.webhook_secret_set(p_tipo text, p_valor text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id     uuid;
  v_key_id      uuid;
  v_nome        text := public.webhook_secret_nome(p_tipo);
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_tipo;
  END IF;

  SELECT id,
         CASE p_tipo
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada.';
  END IF;

  IF v_key_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_key_id, p_valor);
    RETURN;
  END IF;

  SELECT id INTO v_existing_id FROM vault.secrets WHERE name = v_nome;
  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_valor);
    v_new_id := v_existing_id;
  ELSE
    v_new_id := vault.create_secret(p_valor, v_nome);
  END IF;

  IF p_tipo = 'token' THEN
    UPDATE public.loja SET webhook_token_id = v_new_id WHERE id = v_loja_id;
  ELSE
    UPDATE public.loja SET webhook_signing_secret_id = v_new_id WHERE id = v_loja_id;
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.webhook_secret_set(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.webhook_secret_set(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.webhook_secret_delete(p_tipo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_loja_id uuid;
  v_key_id  uuid;
  v_nome    text := public.webhook_secret_nome(p_tipo);
BEGIN
  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_tipo;
  END IF;

  SELECT id,
         CASE p_tipo
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_loja_id, v_key_id
    FROM public.loja
   LIMIT 1;

  IF v_loja_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = v_nome;
  END IF;

  IF p_tipo = 'token' THEN
    UPDATE public.loja SET webhook_token_id = NULL, webhook_token_mascara = NULL WHERE id = v_loja_id;
  ELSE
    UPDATE public.loja SET webhook_signing_secret_id = NULL, webhook_signing_secret_mascara = NULL WHERE id = v_loja_id;
  END IF;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.webhook_secret_delete(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.webhook_secret_delete(text) TO service_role;

-- 4.39 whatsapp_midia_claim — claim atômico da fila de mídia (migration 094,
-- `whatsapp_lid` na 101).
-- Mesmo papel de `whatsapp_turno_buffer`/`claimBurstBuffer`: um único statement
-- com WHERE e RETURNING decide quem processa. Duas entregas concorrentes do
-- mesmo `wamid` (a fila é at-least-once) disputam a mesma linha; a segunda
-- encontra 'processando', não casa o WHERE e recebe zero linhas — no-op, sem
-- pagar a OpenAI duas vezes.
-- É UPDATE, e não o `INSERT ... ON CONFLICT DO UPDATE` esboçado na §4.2, porque
-- a mensagem da fila carrega só o `wamid` (§5.2) e `tipo`/`media_id` são NOT
-- NULL de posse do produtor, que insere a linha 'pendente' antes de enfileirar:
-- um INSERT de duas colunas violaria NOT NULL (23502) para todo wamid
-- desconhecido, virando erro onde se espera no-op.
-- `whatsapp_lid` está no RETURNING desde a 101: é o que faz o turno iniciado por
-- mídia também gravar `clientes.whatsapp_lid`. Sem ele a coluna morre no banco.
-- UPDATE com WHERE por regra (`pg-safeupdate` aborta sem ele com `21000`,
-- inclusive em SECURITY DEFINER — incidentes das 038/075 e 090).
-- Único chamador: server/utils/whatsapp/claimMedia.ts.
-- nome_contato no RETURNING desde a 107: mesmo motivo do whatsapp_lid na 101 —
-- é o que faz o turno iniciado por mídia também chegar com o pushname até
-- `deliverToTurn`/`gateInboundTurn`.
CREATE OR REPLACE FUNCTION public.whatsapp_midia_claim(
  p_wamid          text,
  p_max_tentativas integer
)
RETURNS TABLE (
  wamid         text,
  telefone      text,
  whatsapp_lid  text,
  nome_contato  text,
  tipo          text,
  media_id      text,
  mime_type     text,
  tamanho_bytes integer,
  tentativas    integer
)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.whatsapp_midia AS m
     SET status        = 'processando',
         tentativas    = m.tentativas + 1,
         atualizado_em = now()
   WHERE m.wamid = p_wamid
     AND m.status IN ('pendente','falhou')
     AND m.tentativas < p_max_tentativas
  RETURNING m.wamid, m.telefone, m.whatsapp_lid, m.nome_contato, m.tipo, m.media_id, m.mime_type, m.tamanho_bytes, m.tentativas;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_midia_claim(text, integer) TO service_role;

-- 4.40 compute_churn_risk — risco relativo ao ciclo DO PRÓPRIO CLIENTE (migration 095).
-- Pura: o tempo entra por parâmetro. Uma versão que chamasse now() não poderia
-- ser IMMUTABLE — o planejador teria licença para dobrar a chamada em constante.
CREATE OR REPLACE FUNCTION private.compute_churn_risk(
  p_days_since  numeric,
  p_cycle_days  numeric
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  factor numeric;
BEGIN
  IF p_days_since IS NULL THEN
    RETURN 'no_orders';
  END IF;

  IF p_cycle_days IS NULL OR p_cycle_days <= 0 THEN
    RETURN CASE
      WHEN p_days_since > 60 THEN 'critical'
      WHEN p_days_since > 30 THEN 'high'
      WHEN p_days_since > 14 THEN 'medium'
      ELSE 'low'
    END;
  END IF;

  factor := p_days_since / p_cycle_days;

  RETURN CASE
    WHEN factor >= 2.5 THEN 'critical'
    WHEN factor >= 1.8 THEN 'high'
    WHEN factor >= 1.2 THEN 'medium'
    ELSE 'low'
  END;
END;
$function$;
REVOKE EXECUTE ON FUNCTION private.compute_churn_risk(numeric, numeric) FROM PUBLIC, anon, authenticated;

-- 4.41 recompute_rfm_segments — quintis dentro da base (migration 095).
-- Piso de 25 clientes: NTILE(5) sobre base menor rotula por posição relativa,
-- não por comportamento. Melhor segmento ausente que inventado.
CREATE OR REPLACE FUNCTION public.recompute_rfm_segments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  eligible int;
BEGIN
  SELECT count(*) INTO eligible
    FROM public.clientes
   WHERE is_visitante IS NOT TRUE
     AND COALESCE(total_pedidos, 0) > 0
     AND ultimo_pedido_em IS NOT NULL;

  IF eligible < 25 THEN
    UPDATE public.customer_intelligence
       SET rfm_recency_q = NULL, rfm_frequency_q = NULL,
           rfm_monetary_q = NULL, rfm_segment = NULL
     WHERE rfm_segment IS NOT NULL;   -- WHERE obrigatório (pg-safeupdate)
    RETURN;
  END IF;

  WITH base AS (
    SELECT
      c.id,
      EXTRACT(EPOCH FROM now() - c.ultimo_pedido_em) / 86400.0 AS days_since,
      COALESCE(c.total_pedidos, 0)                             AS orders,
      COALESCE(c.valor_gasto_acumulado, 0)                     AS spent
    FROM public.clientes c
    WHERE c.is_visitante IS NOT TRUE
      AND COALESCE(c.total_pedidos, 0) > 0
      AND c.ultimo_pedido_em IS NOT NULL
  ),
  quintiles AS (
    SELECT
      id,
      NTILE(5) OVER (ORDER BY days_since DESC) AS r_q,
      NTILE(5) OVER (ORDER BY orders     ASC)  AS f_q,
      NTILE(5) OVER (ORDER BY spent      ASC)  AS m_q
    FROM base
  )
  UPDATE public.customer_intelligence ci
     SET rfm_recency_q   = q.r_q,
         rfm_frequency_q = q.f_q,
         rfm_monetary_q  = q.m_q,
         rfm_segment = CASE
           WHEN q.r_q >= 4 AND q.f_q >= 4 AND q.m_q >= 4 THEN 'champion'
           WHEN q.r_q >= 3 AND q.f_q >= 3                THEN 'loyal'
           WHEN q.r_q <= 2 AND q.f_q >= 3                THEN 'at_risk'
           WHEN q.r_q <= 2 AND q.f_q <= 2                THEN 'dormant'
           ELSE 'new'
         END
    FROM quintiles q
   WHERE ci.customer_id = q.id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.recompute_rfm_segments() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.recompute_rfm_segments() TO service_role;

-- 4.42 recompute_customer_intelligence — job noturno da SKILL (migration 095).
-- UMA passada sobre pedidos: ciclo, ticket, pagamento, entrega e pico saem da
-- mesma CTE. Ciclo é MEDIANA dos 10 gaps mais recentes (média é destruída por
-- uma viagem de 3 meses), em fração de dia via EPOCH/86400 — EXTRACT(DAY)
-- truncaria dois pedidos no mesmo dia para 0 e inflaria o churn de todo mundo.
CREATE OR REPLACE FUNCTION public.recompute_customer_intelligence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  WITH valid_orders AS (
    -- `arquivado` NÃO entra aqui de propósito (migration 099): arquivamento é
    -- estado de kanban e apagaria o histórico da SKILL 6h depois da entrega.
    -- Cancelado sai porque `delivered_orders` conta compra, não tentativa.
    SELECT p.cliente_id, p.criado_em, p.valor_total, p.forma_pagamento, p.tipo_entrega
      FROM public.pedidos p
     WHERE p.cliente_id IS NOT NULL
       AND p.status <> 'cancelado'
  ),
  gaps AS (
    SELECT
      cliente_id,
      criado_em,
      EXTRACT(EPOCH FROM criado_em
              - LAG(criado_em) OVER (PARTITION BY cliente_id ORDER BY criado_em)
             ) / 86400.0 AS gap_days
    FROM valid_orders
  ),
  recent_gaps AS (
    SELECT cliente_id, gap_days,
           ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY criado_em DESC) AS rn
      FROM gaps
     WHERE gap_days IS NOT NULL
  ),
  cycles AS (
    -- ::numeric obrigatório (migration 096): `percentile_cont` devolve
    -- `double precision`, e o Postgres NÃO converte implicitamente para numeric
    -- na resolução de `compute_churn_risk(numeric, numeric)` — a chamada falha
    -- com 42883 em tempo de execução, que o CREATE FUNCTION não detecta.
    SELECT cliente_id,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY gap_days))::numeric AS median_cycle_days,
           count(*)::int                                                    AS cycle_sample_size
      FROM recent_gaps
     WHERE rn <= 10
     GROUP BY cliente_id
  ),
  totals AS (
    SELECT cliente_id, count(*)::int AS delivered_orders, avg(valor_total) AS avg_ticket
      FROM valid_orders
     GROUP BY cliente_id
  ),
  payment AS (
    SELECT DISTINCT ON (cliente_id)
           cliente_id, forma_pagamento,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY cliente_id) AS share
      FROM valid_orders
     WHERE forma_pagamento IS NOT NULL
     GROUP BY cliente_id, forma_pagamento
     ORDER BY cliente_id, count(*) DESC
  ),
  delivery AS (
    SELECT DISTINCT ON (cliente_id)
           cliente_id, tipo_entrega,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY cliente_id) AS share
      FROM valid_orders
     WHERE tipo_entrega IS NOT NULL
     GROUP BY cliente_id, tipo_entrega
     ORDER BY cliente_id, count(*) DESC
  ),
  peak AS (
    SELECT DISTINCT ON (cliente_id)
           cliente_id,
           EXTRACT(DOW  FROM criado_em)::int AS weekday,
           EXTRACT(HOUR FROM criado_em)::int AS hour,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY cliente_id) AS share
      FROM valid_orders
     GROUP BY cliente_id, EXTRACT(DOW FROM criado_em), EXTRACT(HOUR FROM criado_em)
     ORDER BY cliente_id, count(*) DESC
  ),
  favorites AS (
    SELECT ranked.cliente_id,
           jsonb_agg(jsonb_build_object('name', ranked.nome, 'count', ranked.n)
                     ORDER BY ranked.n DESC) FILTER (WHERE ranked.rn <= 3) AS top_products
      FROM (
        SELECT o.cliente_id,
               COALESCE(i.nome_produto_congelado, pr.nome) AS nome,
               count(*)::int                               AS n,
               ROW_NUMBER() OVER (
                 PARTITION BY o.cliente_id ORDER BY count(*) DESC
               )                                           AS rn
          FROM public.itens_pedido i
          JOIN public.pedidos o        ON o.id  = i.pedido_id
          LEFT JOIN public.produtos pr ON pr.id = i.produto_id
         WHERE o.cliente_id IS NOT NULL
           AND o.status <> 'cancelado'
           AND COALESCE(i.nome_produto_congelado, pr.nome) IS NOT NULL
         GROUP BY o.cliente_id, COALESCE(i.nome_produto_congelado, pr.nome)
      ) ranked
     GROUP BY ranked.cliente_id
  )
  INSERT INTO public.customer_intelligence AS ci (
    customer_id, median_cycle_days, cycle_sample_size, churn_risk,
    delivered_orders, avg_ticket, top_products,
    payment_method, payment_share, delivery_mode, delivery_share,
    peak_weekday, peak_hour, peak_share, computed_at
  )
  SELECT
    c.id,
    cy.median_cycle_days,
    COALESCE(cy.cycle_sample_size, 0),
    private.compute_churn_risk(
      (EXTRACT(EPOCH FROM now() - c.ultimo_pedido_em) / 86400.0)::numeric,
      cy.median_cycle_days
    ),
    COALESCE(t.delivered_orders, 0),
    t.avg_ticket,
    COALESCE(f.top_products, '[]'::jsonb),
    pm.forma_pagamento, pm.share,
    dl.tipo_entrega,    dl.share,
    pk.weekday, pk.hour, pk.share,
    now()
  FROM public.clientes c
  LEFT JOIN cycles    cy ON cy.cliente_id = c.id
  LEFT JOIN totals    t  ON t.cliente_id  = c.id
  LEFT JOIN payment   pm ON pm.cliente_id = c.id
  LEFT JOIN delivery  dl ON dl.cliente_id = c.id
  LEFT JOIN peak      pk ON pk.cliente_id = c.id
  LEFT JOIN favorites f  ON f.cliente_id  = c.id
  WHERE c.is_visitante IS NOT TRUE
  ON CONFLICT (customer_id) DO UPDATE SET
    median_cycle_days = EXCLUDED.median_cycle_days,
    cycle_sample_size = EXCLUDED.cycle_sample_size,
    churn_risk        = EXCLUDED.churn_risk,
    delivered_orders  = EXCLUDED.delivered_orders,
    avg_ticket        = EXCLUDED.avg_ticket,
    top_products      = EXCLUDED.top_products,
    payment_method    = EXCLUDED.payment_method,
    payment_share     = EXCLUDED.payment_share,
    delivery_mode     = EXCLUDED.delivery_mode,
    delivery_share    = EXCLUDED.delivery_share,
    peak_weekday      = EXCLUDED.peak_weekday,
    peak_hour         = EXCLUDED.peak_hour,
    peak_share        = EXCLUDED.peak_share,
    computed_at       = EXCLUDED.computed_at;
    -- `preferences` NUNCA é tocada aqui: quem escreve é a tool, no turno.

  PERFORM public.recompute_rfm_segments();
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.recompute_customer_intelligence() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.recompute_customer_intelligence() TO service_role;

-- 4.43 purge_agent_memory — retenção da memória do agente (migration 095).
-- No fluxo n8n TODO dado de memória tinha TTL (Redis: 24h de chat, 900s de dedup,
-- 120s de buffer). O porte para Postgres preservou a semântica e perdeu o TTL.
-- Todo DELETE/UPDATE leva WHERE: pg-safeupdate aborta com 21000 sem cláusula.
CREATE OR REPLACE FUNCTION public.purge_agent_memory()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_conversations int;
  v_media         int;
  v_inbound       int;
  v_buffer        int;
  v_tokens        int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.whatsapp_conversas
     WHERE criado_em < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_conversations FROM deleted;

  -- Anonimiza o CONTEÚDO e preserva a linha: `wamid` é PK e chave de
  -- idempotência da fila de mídia — apagar reabriria o reprocessamento.
  WITH updated AS (
    UPDATE public.whatsapp_midia
       SET texto = NULL, erro = NULL
     WHERE criado_em < now() - interval '30 days'
       AND (texto IS NOT NULL OR erro IS NOT NULL)
    RETURNING 1
  ) SELECT count(*)::int INTO v_media FROM updated;

  WITH deleted AS (
    DELETE FROM public.whatsapp_mensagens_recebidas
     WHERE recebido_em < now() - interval '7 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_inbound FROM deleted;

  WITH deleted AS (
    DELETE FROM public.whatsapp_turno_buffer
     WHERE atualizado_em < now() - interval '2 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_buffer FROM deleted;

  WITH deleted AS (
    DELETE FROM public.agente_uso_tokens
     WHERE criado_em < now() - interval '13 months'
    RETURNING 1
  ) SELECT count(*)::int INTO v_tokens FROM deleted;

  RETURN jsonb_build_object(
    'conversations',    v_conversations,
    'media_anonymized', v_media,
    'inbound_dedup',    v_inbound,
    'burst_buffer',     v_buffer,
    'token_usage',      v_tokens,
    'executed_at',      now()
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.purge_agent_memory() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purge_agent_memory() TO service_role;

-- 4.41 consumir_estoque_pedido — consumo atômico de estoque e insumos por pedido (migration 111)
CREATE OR REPLACE FUNCTION public.consumir_estoque_pedido(p_pedido_id uuid, p_itens jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_item       jsonb;
  v_produto_id uuid;
  v_qty        numeric;
  v_produto    record;
  v_used       numeric;
  v_insumo     record;
  v_hoje       date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    v_produto_id := (v_item->>'produto_id')::uuid;
    v_qty        := (v_item->>'quantidade')::numeric;

    IF v_produto_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id, controle_estoque, estoque_atual, producao_diaria_limite
      INTO v_produto
      FROM public.produtos
     WHERE id = v_produto_id
     FOR UPDATE;

    IF v_produto.id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_produto.controle_estoque = 'contagem' THEN
      IF v_produto.estoque_atual IS NULL OR v_produto.estoque_atual < v_qty THEN
        RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE' USING ERRCODE = 'check_violation',
          DETAIL = format('Produto %s tem %s unidade(s) em estoque, pedido pede %s.',
            v_produto_id, COALESCE(v_produto.estoque_atual, 0), v_qty);
      END IF;

      UPDATE public.produtos SET estoque_atual = estoque_atual - v_qty WHERE id = v_produto_id;

      INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
      VALUES ('produto', v_produto_id, 'venda', -v_qty, p_pedido_id);

    ELSIF v_produto.controle_estoque = 'producao_diaria' THEN
      SELECT COALESCE(-SUM(quantidade), 0) INTO v_used
        FROM public.estoque_movimentacoes
       WHERE tipo_entidade = 'produto'
         AND entidade_id = v_produto_id
         AND tipo_movimento IN ('venda', 'cancelamento')
         AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date = v_hoje;

      IF v_produto.producao_diaria_limite IS NULL OR v_used + v_qty > v_produto.producao_diaria_limite THEN
        RAISE EXCEPTION 'PRODUCAO_DIARIA_ESGOTADA' USING ERRCODE = 'check_violation',
          DETAIL = format('Produção de hoje para %s: %s/%s já usado.',
            v_produto_id, v_used, COALESCE(v_produto.producao_diaria_limite, 0));
      END IF;

      INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
      VALUES ('produto', v_produto_id, 'venda', -v_qty, p_pedido_id);
    END IF;

    FOR v_insumo IN
      SELECT pi.insumo_id, pi.quantidade_por_unidade, i.estoque_atual AS estoque_insumo, i.nome AS nome_insumo
        FROM public.produto_insumos pi
        JOIN public.insumos i ON i.id = pi.insumo_id
       WHERE pi.produto_id = v_produto_id
       FOR UPDATE OF i
    LOOP
      IF v_insumo.estoque_insumo < v_insumo.quantidade_por_unidade * v_qty THEN
        RAISE EXCEPTION 'INSUMO_INSUFICIENTE' USING ERRCODE = 'check_violation',
          DETAIL = format('Insumo %s: %s em estoque, pedido precisa de %s.',
            v_insumo.nome_insumo, v_insumo.estoque_insumo, v_insumo.quantidade_por_unidade * v_qty);
      END IF;

      UPDATE public.insumos
         SET estoque_atual = estoque_atual - (v_insumo.quantidade_por_unidade * v_qty)
       WHERE id = v_insumo.insumo_id;

      INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
      VALUES ('insumo', v_insumo.insumo_id, 'venda', -(v_insumo.quantidade_por_unidade * v_qty), p_pedido_id);
    END LOOP;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consumir_estoque_pedido(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consumir_estoque_pedido(uuid, jsonb) TO service_role;

-- 4.42 estornar_estoque_pedido — compensação de estoque em cancelamento (migration 111)
CREATE OR REPLACE FUNCTION public.estornar_estoque_pedido(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_mov record;
BEGIN
  FOR v_mov IN
    SELECT tipo_entidade, entidade_id, quantidade
      FROM public.estoque_movimentacoes
     WHERE pedido_id = p_pedido_id
       AND tipo_movimento = 'venda'
     ORDER BY criado_em
  LOOP
    IF v_mov.tipo_entidade = 'produto' THEN
      UPDATE public.produtos
         SET estoque_atual = estoque_atual - v_mov.quantidade
       WHERE id = v_mov.entidade_id
         AND controle_estoque = 'contagem';
    ELSIF v_mov.tipo_entidade = 'insumo' THEN
      UPDATE public.insumos
         SET estoque_atual = estoque_atual - v_mov.quantidade
       WHERE id = v_mov.entidade_id;
    END IF;

    INSERT INTO public.estoque_movimentacoes (tipo_entidade, entidade_id, tipo_movimento, quantidade, pedido_id)
    VALUES (v_mov.tipo_entidade, v_mov.entidade_id, 'cancelamento', -v_mov.quantidade, p_pedido_id);
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.estornar_estoque_pedido(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.estornar_estoque_pedido(uuid) TO service_role;

-- ─── 5. ÍNDICES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cart_items_opcoes_cart_item
  ON public.cart_items_opcoes (cart_item_id);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_entidade
  ON public.estoque_movimentacoes (tipo_entidade, entidade_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_churn
  ON public.customer_intelligence (churn_risk, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_sessao
  ON public.cart_items USING btree (sessao_id);

-- Papéis semânticos de valor único: no máximo UMA coluna pode carregar cada flag
-- (evita ambiguidade na automação, que resolve o papel via LIMIT 1). is_open fica
-- de fora de propósito — várias colunas podem ser "em aberto".
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_revenue_trigger
  ON public.kanban_coluna (is_revenue_trigger) WHERE is_revenue_trigger;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_cancelled
  ON public.kanban_coluna (is_cancelled) WHERE is_cancelled;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_delivery_dispatch
  ON public.kanban_coluna (is_delivery_dispatch) WHERE is_delivery_dispatch;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_out_for_delivery
  ON public.kanban_coluna (is_out_for_delivery) WHERE is_out_for_delivery;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_coluna_uniq_delivered
  ON public.kanban_coluna (is_delivered) WHERE is_delivered;

-- Suporta limpeza periódica das chaves de idempotência vencidas (housekeeping).
CREATE INDEX IF NOT EXISTS integration_idempotency_expires_at_idx
  ON public.integration_idempotency USING btree (expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS clientes_telefone_whatsapp_key
  ON public.clientes USING btree (telefone_whatsapp);

-- 091: inclui `seq` para cobrir o desempate da leitura do histórico.
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_cliente_criado_seq
  ON public.whatsapp_conversas (cliente_id, criado_em DESC, seq DESC);

-- 094: varredura operacional de mídia por estado (pendências e falhas recentes).
CREATE INDEX IF NOT EXISTS idx_whatsapp_midia_status
  ON public.whatsapp_midia (status, criado_em DESC);

-- 031: unicidade parcial do @lid (NULL livre para clientes legados).
CREATE UNIQUE INDEX IF NOT EXISTS clientes_whatsapp_lid_key
  ON public.clientes (whatsapp_lid)
  WHERE whatsapp_lid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evento_rastreamento_criado
  ON public.evento_rastreamento USING btree (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_evento_rastreamento_sessao
  ON public.evento_rastreamento USING btree (sessao_id)
  WHERE sessao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evento_rastreamento_tipo
  ON public.evento_rastreamento USING btree (tipo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_opcoes_item
  ON public.itens_pedido_opcoes USING btree (item_pedido_id);

CREATE INDEX IF NOT EXISTS idx_pedido_status_historico_pedido
  ON public.pedido_status_historico USING btree (pedido_id, criado_em);

CREATE INDEX IF NOT EXISTS idx_pedidos_em_entrega
  ON public.pedidos USING btree (entregador_id)
  WHERE entregador_id IS NOT NULL AND status = 'saiu_para_entrega';

CREATE INDEX IF NOT EXISTS idx_pedidos_entregue_em
  ON public.pedidos USING btree (entregue_em)
  WHERE entregue_em IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_historico
  ON public.pedidos USING btree (arquivado_em DESC, status)
  WHERE arquivado = true;

CREATE INDEX IF NOT EXISTS idx_pedidos_kanban
  ON public.pedidos USING btree (status, criado_em DESC)
  WHERE arquivado = false;

CREATE INDEX IF NOT EXISTS idx_produto_opcao_grupo_produto
  ON public.produto_opcao_grupo USING btree (produto_id, ordem);

CREATE INDEX IF NOT EXISTS idx_produto_opcao_item_grupo
  ON public.produto_opcao_item USING btree (grupo_id, ordem);

CREATE INDEX IF NOT EXISTS idx_regras_frete_ativas
  ON public.regras_frete_distancia USING btree (ordem)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em_ativas
  ON public.sessoes USING btree (expira_em)
  WHERE status = 'ativa';

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_evento_criado
  ON public.webhook_outbox USING btree (evento, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_pending
  ON public.webhook_outbox USING btree (status, proxima_tentativa_em)
  WHERE status = ANY (ARRAY[
    'pendente'::public.webhook_outbox_status_enum,
    'falha'::public.webhook_outbox_status_enum
  ]);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_outbox_event_id_key
  ON public.webhook_outbox USING btree (event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_created_at
  ON public.webhook_queue USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_status_retry
  ON public.webhook_queue USING btree (status, next_retry_at)
  WHERE status::text = ANY (ARRAY['pending'::text, 'failed'::text]);

-- ─── 6. VIEWS ─────────────────────────────────────────────────────────────────
-- (nenhuma view) A antiga `faturamento_diario` foi removida: não era usada por
-- nenhum código e carregava o mesmo acoplamento a entregue_em. As métricas de
-- faturamento vêm da RPC get_dashboard_metrics (seção 4.12).
DROP VIEW IF EXISTS public.faturamento_diario;

-- ─── 7. TRIGGER DE AUTH (auth.users → public.usuarios) ────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─── 8. TRIGGERS DE TABELA ────────────────────────────────────────────────────

-- cart_items
DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- categorias
DROP TRIGGER IF EXISTS trg_garantir_unica_categoria_principal ON public.categorias;
CREATE TRIGGER trg_garantir_unica_categoria_principal
  BEFORE INSERT OR UPDATE OF principal ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.garantir_unica_categoria_principal();

-- clientes
DROP TRIGGER IF EXISTS update_clientes_modtime ON public.clientes;
CREATE TRIGGER update_clientes_modtime
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- itens_pedido
DROP TRIGGER IF EXISTS trg_freeze_product_info ON public.itens_pedido;
CREATE TRIGGER trg_freeze_product_info
  BEFORE INSERT ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.freeze_product_info();

DROP TRIGGER IF EXISTS trg_itens_pedido_subtotal ON public.itens_pedido;
CREATE TRIGGER trg_itens_pedido_subtotal
  BEFORE INSERT OR UPDATE OF preco_unitario_congelado, quantidade ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_item_subtotal();

DROP TRIGGER IF EXISTS trg_recalculate_order_subtotal ON public.itens_pedido;
CREATE TRIGGER trg_recalculate_order_subtotal
  AFTER INSERT OR DELETE OR UPDATE ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_subtotal();

-- itens_pedido_opcoes
DROP TRIGGER IF EXISTS trg_itens_pedido_opcoes_subtotal ON public.itens_pedido_opcoes;
CREATE TRIGGER trg_itens_pedido_opcoes_subtotal
  AFTER INSERT OR DELETE OR UPDATE ON public.itens_pedido_opcoes
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_item_subtotal();

-- kanban_coluna
DROP TRIGGER IF EXISTS update_kanban_coluna_modtime ON public.kanban_coluna;
CREATE TRIGGER update_kanban_coluna_modtime
  BEFORE UPDATE ON public.kanban_coluna
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proteção de colunas de sistema (bloqueia exclusão e renome/desproteção).
DROP TRIGGER IF EXISTS trg_guard_system_kanban_coluna_del ON public.kanban_coluna;
CREATE TRIGGER trg_guard_system_kanban_coluna_del
  BEFORE DELETE ON public.kanban_coluna
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_kanban_coluna();

DROP TRIGGER IF EXISTS trg_guard_system_kanban_coluna_upd ON public.kanban_coluna;
CREATE TRIGGER trg_guard_system_kanban_coluna_upd
  BEFORE UPDATE ON public.kanban_coluna
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_kanban_coluna();

-- pedidos
DROP TRIGGER IF EXISTS trg_log_pedido_status ON public.pedidos;
CREATE TRIGGER trg_log_pedido_status
  BEFORE UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.log_pedido_status_change();

DROP TRIGGER IF EXISTS trg_update_client_metrics ON public.pedidos;
CREATE TRIGGER trg_update_client_metrics
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_client_metrics();

DROP TRIGGER IF EXISTS update_pedidos_modtime ON public.pedidos;
CREATE TRIGGER update_pedidos_modtime
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_calculate_pedido_totals ON public.pedidos;
CREATE TRIGGER trg_calculate_pedido_totals
  BEFORE INSERT OR UPDATE OF valor_subtotal, valor_entrega, desconto_aplicado
  ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.calculate_pedido_totals();

-- paginas (migration 062)
DROP TRIGGER IF EXISTS update_paginas_updated_at ON public.paginas;
CREATE TRIGGER update_paginas_updated_at
  BEFORE UPDATE ON public.paginas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- regras_frete_distancia
DROP TRIGGER IF EXISTS trg_regras_frete_updated_at ON public.regras_frete_distancia;
CREATE TRIGGER trg_regras_frete_updated_at
  BEFORE UPDATE ON public.regras_frete_distancia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- customer_intelligence (migration 095) — atualizado_em mantém o nome legado
-- porque update_updated_at_column() (migration 003) grava exatamente nessa coluna.
DROP TRIGGER IF EXISTS trg_customer_intelligence_atualizado_em ON public.customer_intelligence;
CREATE TRIGGER trg_customer_intelligence_atualizado_em
  BEFORE UPDATE ON public.customer_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- usuarios
DROP TRIGGER IF EXISTS update_usuarios_modtime ON public.usuarios;
CREATE TRIGGER update_usuarios_modtime
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- usuarios: barra escalonamento de privilégio via self-update (migration 036)
DROP TRIGGER IF EXISTS trg_prevent_self_privilege ON public.usuarios;
CREATE TRIGGER trg_prevent_self_privilege
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privilege_change();

-- ─── 9. EVENT TRIGGER (auto-enable RLS em novas tabelas) ──────────────────────
DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

-- ─── 10. HABILITAR RLS ────────────────────────────────────────────────────────
ALTER TABLE public.agente_uso_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enderecos_cliente       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_rastreamento     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido_opcoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_coluna           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_itens               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loja                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_status_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorder_blocked_dates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_opcao_grupo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_opcao_item      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocao_produtos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocoes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_frete_distancia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_outbox          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_queue           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensagens_recebidas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_midia                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_turno_buffer         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_intelligence         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_teste_run              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_avaliacao              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_relacionados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paginas                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items_opcoes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_insumos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes         ENABLE ROW LEVEL SECURITY;

-- agente_teste_run / agente_avaliacao (migration 105): observabilidade interna
-- de IA — mesmo padrão de RLS que agente_avaliacao_turnos (098) tinha. Só
-- service_role toca — a task agendada e o runner do laboratório escrevem, o
-- dashboard lê por rota de API. Deny explícito para authenticated existe para
-- o dado não vazar caso alguém passe a consultar a tabela pelo client do navegador.
DROP POLICY IF EXISTS "service_role_all_agente_teste_run" ON public.agente_teste_run;
CREATE POLICY "service_role_all_agente_teste_run" ON public.agente_teste_run
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "deny_authenticated_agente_teste_run" ON public.agente_teste_run;
CREATE POLICY "deny_authenticated_agente_teste_run" ON public.agente_teste_run
  FOR ALL TO authenticated
  USING (false);

DROP POLICY IF EXISTS "service_role_all_agente_avaliacao" ON public.agente_avaliacao;
CREATE POLICY "service_role_all_agente_avaliacao" ON public.agente_avaliacao
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "deny_authenticated_agente_avaliacao" ON public.agente_avaliacao;
CREATE POLICY "deny_authenticated_agente_avaliacao" ON public.agente_avaliacao
  FOR ALL TO authenticated
  USING (false);

-- customer_intelligence: staff LÊ (perfil do cliente na área administrativa),
-- ninguém escreve pelo client. A escrita é do job noturno e do agente, ambos
-- service_role (que bypassa RLS) — staff editando fato derivado à mão seria
-- sobrescrito em silêncio pelo próximo recompute.
DROP POLICY IF EXISTS "Staff read customer_intelligence" ON public.customer_intelligence;
CREATE POLICY "Staff read customer_intelligence" ON public.customer_intelligence
  FOR SELECT TO authenticated
  USING (private.is_staff());
-- NOTA: spatial_ref_sys pertence ao supabase_admin — não pode ser alterado aqui.
-- Veja seção "AÇÕES MANUAIS" ao final do arquivo.

-- ─── 11. POLÍTICAS RLS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Manage cupons (gerente+)" ON public.cupons;
CREATE POLICY "Manage cupons (gerente+)" ON public.cupons
FOR ALL TO authenticated
USING (private.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
WITH CHECK (private.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));


-- ── cart_items ────────────────────────────────────────────────────────────────
-- Sem políticas (deny-all para anon/authenticated): acesso exclusivo via
-- endpoints de integração com service_role, que bypassa RLS.

-- ── categorias ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Manage categorias (gerente+)" ON public.categorias;
CREATE POLICY "Manage categorias (gerente+)" ON public.categorias
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

DROP POLICY IF EXISTS "Public read available categories" ON public.categorias;
CREATE POLICY "Public read available categories" ON public.categorias
  FOR SELECT TO public USING (ativa = true);

-- ── clientes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage clientes" ON public.clientes;
CREATE POLICY "Staff manage clientes" ON public.clientes
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

DROP POLICY IF EXISTS "Entregador read cliente of own pedidos" ON public.clientes;
CREATE POLICY "Entregador read cliente of own pedidos" ON public.clientes
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.role_usuario_enum[])
    AND EXISTS (
      SELECT 1 FROM public.pedidos pe
      WHERE pe.cliente_id = clientes.id AND pe.entregador_id = auth.uid()
    )
  );

-- ── enderecos_cliente ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage enderecos_cliente" ON public.enderecos_cliente;
CREATE POLICY "Staff manage enderecos_cliente" ON public.enderecos_cliente
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

DROP POLICY IF EXISTS "Entregador read endereco of own pedidos" ON public.enderecos_cliente;
CREATE POLICY "Entregador read endereco of own pedidos" ON public.enderecos_cliente
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.role_usuario_enum[])
    AND EXISTS (
      SELECT 1 FROM public.pedidos pe
      WHERE pe.endereco_id = enderecos_cliente.id AND pe.entregador_id = auth.uid()
    )
  );

-- ── evento_rastreamento ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read evento_rastreamento" ON public.evento_rastreamento;
CREATE POLICY "Staff read evento_rastreamento" ON public.evento_rastreamento
  FOR SELECT TO public USING (private.is_staff());

-- ── itens_pedido ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage itens_pedido" ON public.itens_pedido;
CREATE POLICY "Staff manage itens_pedido" ON public.itens_pedido
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

DROP POLICY IF EXISTS "Entregador read itens of own pedidos" ON public.itens_pedido;
CREATE POLICY "Entregador read itens of own pedidos" ON public.itens_pedido
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.role_usuario_enum[])
    AND EXISTS (
      SELECT 1 FROM public.pedidos pe
      WHERE pe.id = itens_pedido.pedido_id AND pe.entregador_id = auth.uid()
    )
  );

-- ── itens_pedido_opcoes ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes;
CREATE POLICY "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

-- ── kanban_coluna ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read kanban_coluna" ON public.kanban_coluna;
CREATE POLICY "Staff read kanban_coluna" ON public.kanban_coluna
  FOR SELECT TO public USING (private.is_staff());

DROP POLICY IF EXISTS "Manage kanban_coluna (gerente+)" ON public.kanban_coluna;
CREATE POLICY "Manage kanban_coluna (gerente+)" ON public.kanban_coluna
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── kit_itens ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read kit_itens" ON public.kit_itens;
CREATE POLICY "Public read kit_itens" ON public.kit_itens
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_itens.kit_id AND k.disponivel = true
  ));

DROP POLICY IF EXISTS "Manage kit_itens (gerente+)" ON public.kit_itens;
CREATE POLICY "Manage kit_itens (gerente+)" ON public.kit_itens
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── kits ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read kits" ON public.kits;
CREATE POLICY "Public read kits" ON public.kits
  FOR SELECT TO public USING (disponivel = true);

DROP POLICY IF EXISTS "Manage kits (gerente+)" ON public.kits;
CREATE POLICY "Manage kits (gerente+)" ON public.kits
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── loja ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read available store" ON public.loja;
CREATE POLICY "Public read available store" ON public.loja
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Manage loja (gerente+)" ON public.loja;
CREATE POLICY "Manage loja (gerente+)" ON public.loja
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── pedido_status_historico ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read pedido_status_historico" ON public.pedido_status_historico;
CREATE POLICY "Staff read pedido_status_historico" ON public.pedido_status_historico
  FOR SELECT TO public USING (private.is_staff());

-- ── pedidos ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read pedidos" ON public.pedidos;
CREATE POLICY "Staff read pedidos" ON public.pedidos
  FOR SELECT TO public USING (private.is_staff());

DROP POLICY IF EXISTS "Staff insert pedidos" ON public.pedidos;
CREATE POLICY "Staff insert pedidos" ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK(has_role(ARRAY['atendente','gerente','administrador','proprietario']::public.role_usuario_enum[]));

DROP POLICY IF EXISTS "Staff update pedidos" ON public.pedidos;
CREATE POLICY "Staff update pedidos" ON public.pedidos
  FOR UPDATE TO authenticated
  USING     (has_role(ARRAY['atendente','producao','gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['atendente','producao','gerente','administrador','proprietario']::public.role_usuario_enum[]));

DROP POLICY IF EXISTS "Delete pedidos (admin+)" ON public.pedidos;
CREATE POLICY "Delete pedidos (admin+)" ON public.pedidos
  FOR DELETE TO authenticated
  USING (has_role(ARRAY['administrador','proprietario']::public.role_usuario_enum[]));

DROP POLICY IF EXISTS "Entregador read own pedidos" ON public.pedidos;
CREATE POLICY "Entregador read own pedidos" ON public.pedidos
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.role_usuario_enum[])
    AND entregador_id = auth.uid()
  );

-- ── produto_opcao_grupo ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read produto_opcao_grupo" ON public.produto_opcao_grupo;
CREATE POLICY "Public read produto_opcao_grupo" ON public.produto_opcao_grupo
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.produtos p
    WHERE p.id = produto_opcao_grupo.produto_id AND p.disponivel = true
  ));

DROP POLICY IF EXISTS "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo;
CREATE POLICY "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── produto_opcao_item ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read produto_opcao_item" ON public.produto_opcao_item;
CREATE POLICY "Public read produto_opcao_item" ON public.produto_opcao_item
  FOR SELECT TO public
  USING (
    ativo = true
    AND EXISTS (
      SELECT 1
      FROM public.produto_opcao_grupo g
      JOIN public.produtos p ON p.id = g.produto_id
      WHERE g.id = produto_opcao_item.grupo_id AND p.disponivel = true
    )
  );

DROP POLICY IF EXISTS "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item;
CREATE POLICY "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── produtos ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read available products" ON public.produtos;
CREATE POLICY "Public read available products" ON public.produtos
  FOR SELECT TO public USING (disponivel = true);

DROP POLICY IF EXISTS "Staff read produtos" ON public.produtos;
CREATE POLICY "Staff read produtos" ON public.produtos
  FOR SELECT TO public USING (private.is_staff());

DROP POLICY IF EXISTS "Manage produtos (gerente+)" ON public.produtos;
CREATE POLICY "Manage produtos (gerente+)" ON public.produtos
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── promocao_produtos ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read promocao_produtos" ON public.promocao_produtos;
CREATE POLICY "Public read promocao_produtos" ON public.promocao_produtos
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.promocoes p
    WHERE p.id = promocao_produtos.promocao_id AND p.ativa = true
  ));

DROP POLICY IF EXISTS "Manage promocao_produtos (gerente+)" ON public.promocao_produtos;
CREATE POLICY "Manage promocao_produtos (gerente+)" ON public.promocao_produtos
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── promocoes ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read promocoes" ON public.promocoes;
CREATE POLICY "Public read promocoes" ON public.promocoes
  FOR SELECT TO public USING (ativa = true);

DROP POLICY IF EXISTS "Manage promocoes (gerente+)" ON public.promocoes;
CREATE POLICY "Manage promocoes (gerente+)" ON public.promocoes
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── regras_frete_distancia ────────────────────────────────────────────────────
-- Leitura pública: /api/calculate-shipping usa serverSupabaseClient (anon role do catálogo)
DROP POLICY IF EXISTS "anon_read_regras_frete" ON public.regras_frete_distancia;
CREATE POLICY "anon_read_regras_frete"
  ON public.regras_frete_distancia FOR SELECT
  TO anon, authenticated USING (true);

-- Escrita para admins autenticados: admin/settings usa useSupabaseClient() (JWT do usuário).
-- Proteção real vem do middleware 3.admin-auth.ts — RLS garante que só role authenticated
-- pode escrever; o middleware garante que só admins chegam nessa página.
DROP POLICY IF EXISTS "authenticated_write_regras_frete" ON public.regras_frete_distancia;
CREATE POLICY "authenticated_write_regras_frete"
  ON public.regras_frete_distancia FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ── sessoes ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read active sessions" ON public.sessoes;
CREATE POLICY "Public read active sessions" ON public.sessoes
  FOR SELECT TO public
  USING (status = 'ativa' AND expira_em > now());

DROP POLICY IF EXISTS "Staff manage sessoes" ON public.sessoes;
CREATE POLICY "Staff manage sessoes" ON public.sessoes
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

-- ── usuarios ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Self read own profile" ON public.usuarios;
CREATE POLICY "Self read own profile" ON public.usuarios
  FOR SELECT TO public USING (id = auth.uid());

DROP POLICY IF EXISTS "Self update own profile" ON public.usuarios;
CREATE POLICY "Self update own profile" ON public.usuarios
  FOR UPDATE TO public
  USING     (id = auth.uid())
  WITH CHECK(id = auth.uid());

DROP POLICY IF EXISTS "Staff read all usuarios" ON public.usuarios;
CREATE POLICY "Staff read all usuarios" ON public.usuarios
  FOR SELECT TO authenticated
  USING (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

DROP POLICY IF EXISTS "Admins manage usuarios" ON public.usuarios;
CREATE POLICY "Admins manage usuarios" ON public.usuarios
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['administrador','proprietario']::public.role_usuario_enum[]))
  WITH CHECK(has_role(ARRAY['administrador','proprietario']::public.role_usuario_enum[]));

-- ── webhook_outbox ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read webhook_outbox" ON public.webhook_outbox;
CREATE POLICY "Staff read webhook_outbox" ON public.webhook_outbox
  FOR SELECT TO authenticated
  USING (has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]));

-- ── webhook_queue ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role can manage webhook_queue" ON public.webhook_queue;
CREATE POLICY "Service role can manage webhook_queue" ON public.webhook_queue
  FOR ALL TO public
  USING (auth.role() = 'service_role');

-- ─── 12. GRANTS DE FUNÇÕES ────────────────────────────────────────────────────

-- Funções de trigger internas — sem acesso público direto
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.freeze_product_info()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_order_subtotal()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_client_metrics()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_frequencia_compra(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                 FROM PUBLIC, anon, authenticated;

-- recalculate_item_subtotal: exclusivo para triggers (SECURITY DEFINER — não expor via RPC)
REVOKE EXECUTE ON FUNCTION public.increment_cupom_uso(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_cupom_atomico(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_cupom_uso(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_item_subtotal() FROM PUBLIC, anon, authenticated;

-- cleanup_expired_sessions: apenas service_role (chamada pelo pg_cron)
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_sessions() TO service_role;

-- log_pedido_status_change: trigger + service_role (não deve ser RPC público)
REVOKE EXECUTE ON FUNCTION public.log_pedido_status_change() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.log_pedido_status_change() TO authenticated, service_role;

-- RBAC helpers: authenticated + service_role (anon não acessa tabela de usuários)
REVOKE EXECUTE ON FUNCTION public.current_user_role()                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_user_role()                TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff()                         FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_staff()                         TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(public.role_usuario_enum[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(public.role_usuario_enum[]) TO authenticated, service_role;

-- is_within_delivery_radius: anon precisa acessar para validar checkout público
REVOKE EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) TO anon, authenticated, service_role;

-- calcular_frete_por_distancia: anon precisa acessar para preview de frete no checkout
REVOKE EXECUTE ON FUNCTION public.calcular_frete_por_distancia(numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.calcular_frete_por_distancia(numeric) TO anon, authenticated, service_role;

-- calculate_pedido_totals: função de trigger interna — sem acesso público direto
REVOKE EXECUTE ON FUNCTION public.calculate_pedido_totals() FROM PUBLIC;

-- Dashboard RPCs: apenas authenticated (staff)
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date)  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_counts(date, date)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_counts(date, date)   TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_produtos(date, date, int)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_produtos(date, date, int)  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_paginas(int, int)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_paginas(int, int)          TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_cliques(int, int)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_cliques(int, int)          TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_funil_conversao(date, date)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_funil_conversao(date, date)    TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_categorias(int, int)       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_categorias(int, int)       TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_produtos_click(int, int)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_produtos_click(int, int)   TO authenticated, service_role;

-- set_revenue_status: authenticated (a função verifica papel gerente+ internamente)
REVOKE EXECUTE ON FUNCTION public.set_revenue_status(text)           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_revenue_status(text)           TO authenticated, service_role;

-- trigger_webhook_outbox_worker: exclusivo do pg_cron (contém token nas headers)
REVOKE EXECUTE ON FUNCTION public.trigger_webhook_outbox_worker() FROM PUBLIC, anon, authenticated;

-- ─── 13. PG_CRON ──────────────────────────────────────────────────────────────
-- Agenda limpeza diária de sessões expiradas às 03h (idempotente via WHERE NOT EXISTS)
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 3 * * *',
  'SELECT public.cleanup_expired_sessions();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-sessions'
);

-- Drena o webhook_outbox a cada minuto — fallback de retry para entregas que o
-- disparo imediato (fire-and-forget do app) não concluiu. Inofensivo enquanto
-- app.base_url/app.worker_token não estiverem configurados (a função faz skip).
SELECT cron.schedule(
  'webhook-outbox-drain',
  '* * * * *',
  'SELECT public.trigger_webhook_outbox_worker();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'webhook-outbox-drain'
);

-- Arquiva pedidos elegíveis de hora em hora (substitui o antigo Vercel Cron).
-- Inofensivo enquanto app.base_url/app.worker_token não estiverem configurados
-- (a função faz skip). Regras de elegibilidade vêm de loja.config_pedidos.
SELECT cron.schedule(
  'archive-orders',
  '0 * * * *',
  'SELECT public.trigger_archive_orders();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'archive-orders'
);

-- Recalcula os fatos da Customer SKILL às 03:00 BRT (migration 095).
SELECT cron.schedule(
  'customer-intelligence-recompute',
  '0 6 * * *',
  'SELECT public.recompute_customer_intelligence();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'customer-intelligence-recompute'
);

-- Expurgo da memória do agente às 03:30 BRT, depois do recompute (migration 095).
-- É o TTL que o Redis fazia sozinho no fluxo n8n e que o porte para Postgres
-- havia perdido.
SELECT cron.schedule(
  'agent-memory-purge',
  '30 6 * * *',
  'SELECT public.purge_agent_memory();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'agent-memory-purge'
);

-- ─── 14. DADOS INICIAIS (seeds) ───────────────────────────────────────────────

-- Kanban: apenas as 2 colunas obrigatórias de sistema (pendente e confirmado).
-- is_sistema=true APENAS em pendente/confirmado: são as únicas chaves
-- obrigatórias do fluxo inicial. O usuário cria as demais colunas conforme sua necessidade.
INSERT INTO public.kanban_coluna
  (chave, label, cor, ordem, visivel, is_revenue_trigger, is_cancelled, is_open,
   is_sistema, is_delivery_dispatch, is_out_for_delivery, is_delivered)
VALUES
  ('pendente',   'Pendente',   '#EC4899', 1, true, false, false, true, true, false, false, false),
  ('confirmado', 'Confirmado', '#3B82F6', 2, true, false, false, true, true, false, false, false)
ON CONFLICT (chave) DO UPDATE SET
  label                = EXCLUDED.label,
  cor                  = EXCLUDED.cor,
  ordem                = EXCLUDED.ordem,
  visivel              = EXCLUDED.visivel,
  is_revenue_trigger   = EXCLUDED.is_revenue_trigger,
  is_cancelled         = EXCLUDED.is_cancelled,
  is_open              = EXCLUDED.is_open,
  is_sistema           = EXCLUDED.is_sistema,
  is_delivery_dispatch = EXCLUDED.is_delivery_dispatch,
  is_out_for_delivery  = EXCLUDED.is_out_for_delivery,
  is_delivered         = EXCLUDED.is_delivered;

-- Loja: linha inicial vazia para novas instalações (configurar via painel admin)
INSERT INTO public.loja (nome_fantasia, taxa_entrega_padrao, permite_retirada, status_operacao, status_conta)
SELECT 'Minha Loja', 5.00, true, 'automatico', 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.loja);

-- Páginas estáticas: Termos de Uso e Política de Privacidade (migration 062)
INSERT INTO public.paginas (slug, titulo, conteudo)
VALUES
  ('termos',      'Termos de Uso',           'Conteúdo padrão dos Termos de Uso. Edite no painel administrativo.'),
  ('privacidade', 'Política de Privacidade', 'Conteúdo padrão da Política de Privacidade. Edite no painel administrativo.')
ON CONFLICT (slug) DO NOTHING;

-- ─── 12. SECURITY HARDENING (consolida migrations 037–039) ────────────────────
-- Estado final de segurança para instalações novas:
--   • PostGIS removido (sem uso; era só ruído no linter — spatial_ref_sys/st_estimatedextent).
--   • Helpers RBAC movidos para o schema `private` → não expostos como RPC pela PostgREST,
--     mas continuam usáveis pela RLS (SECURITY DEFINER, mesmos grants).
--   • Policy de escrita de regras_frete restrita a gerente+ (era USING(true)).
--   • calcular_frete_por_distancia como SECURITY INVOKER.
--   • trigger_archive_orders sem EXECUTE para anon/authenticated.
--   • Deny-all explícito em cart_items (acesso só via service_role).

DROP EXTENSION IF EXISTS postgis;

-- Repontar funções dependentes + calcular_frete INVOKER + regras_frete
CREATE OR REPLACE FUNCTION public.set_revenue_status(p_chave text)
RETURNS void LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT private.has_role(ARRAY['gerente','administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kanban_coluna WHERE chave = p_chave) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_chave;
  END IF;
  -- Swap em dois passos (ver migration 075): evita o estado transitório de 2
  -- linhas is_revenue_trigger=true que viola o índice único parcial não-adiável
  -- kanban_coluna_uniq_revenue_trigger (23505 → HTTP 409).
  UPDATE public.kanban_coluna
  SET is_revenue_trigger = false
  WHERE is_revenue_trigger;

  UPDATE public.kanban_coluna
  SET is_revenue_trigger = true
  WHERE chave = p_chave;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.ativo IS DISTINCT FROM OLD.ativo)
     AND NOT private.has_role(ARRAY['administrador','proprietario']::public.role_usuario_enum[]) THEN
    RAISE EXCEPTION 'Alteração do próprio papel/status não é permitida.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_frete_por_distancia(p_distancia_km numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_valor numeric;
BEGIN
  SELECT valor_frete INTO v_valor
  FROM public.regras_frete_distancia
  WHERE ativo = true AND p_distancia_km >= distancia_min_km AND p_distancia_km < distancia_max_km
  ORDER BY ordem ASC LIMIT 1;
  RETURN v_valor;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_archive_orders() FROM PUBLIC, anon, authenticated;

-- Remove a policy permissiva antiga de regras_frete (a nova é recriada abaixo em private.*)
DROP POLICY IF EXISTS "authenticated_write_regras_frete" ON public.regras_frete_distancia;

-- Deny-all explícito (0008): acesso só via service_role.
DROP POLICY IF EXISTS "No client access" ON public.cart_items;
CREATE POLICY "No client access" ON public.cart_items
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- integration_idempotency: acesso exclusivo via service_role. Deny-all explícito
-- torna a intenção clara e resolve o linter 0008 (rls_enabled_no_policy).
DROP POLICY IF EXISTS "No client access" ON public.integration_idempotency;
CREATE POLICY "No client access" ON public.integration_idempotency
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Recriação das policies apontando para private.*:
-- 31 policies recriadas
DROP POLICY IF EXISTS "Manage categorias (gerente+)" ON public.categorias;
CREATE POLICY "Manage categorias (gerente+)" ON public.categorias
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Entregador read cliente of own pedidos" ON public.clientes;
CREATE POLICY "Entregador read cliente of own pedidos" ON public.clientes
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (EXISTS ( SELECT 1
   FROM pedidos pe
  WHERE ((pe.cliente_id = clientes.id) AND (pe.entregador_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage clientes" ON public.clientes;
CREATE POLICY "Staff manage clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Entregador read endereco of own pedidos" ON public.enderecos_cliente;
CREATE POLICY "Entregador read endereco of own pedidos" ON public.enderecos_cliente
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (EXISTS ( SELECT 1
   FROM pedidos pe
  WHERE ((pe.endereco_id = enderecos_cliente.id) AND (pe.entregador_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage enderecos_cliente" ON public.enderecos_cliente;
CREATE POLICY "Staff manage enderecos_cliente" ON public.enderecos_cliente
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff read evento_rastreamento" ON public.evento_rastreamento;
CREATE POLICY "Staff read evento_rastreamento" ON public.evento_rastreamento
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Entregador read itens of own pedidos" ON public.itens_pedido;
CREATE POLICY "Entregador read itens of own pedidos" ON public.itens_pedido
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (EXISTS ( SELECT 1
   FROM pedidos pe
  WHERE ((pe.id = itens_pedido.pedido_id) AND (pe.entregador_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage itens_pedido" ON public.itens_pedido;
CREATE POLICY "Staff manage itens_pedido" ON public.itens_pedido
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes;
CREATE POLICY "Staff manage itens_pedido_opcoes" ON public.itens_pedido_opcoes
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

-- Pre-Order System (migration 078): painel lê/gerencia sob RLS; rotas públicas
-- (availability/calendar/checkout) usam service_role.
DROP POLICY IF EXISTS "Staff manage preorders" ON public.preorders;
CREATE POLICY "Staff manage preorders" ON public.preorders
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff manage preorder_blocked_dates" ON public.preorder_blocked_dates;
CREATE POLICY "Staff manage preorder_blocked_dates" ON public.preorder_blocked_dates
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Manage kanban_coluna (gerente+)" ON public.kanban_coluna;
CREATE POLICY "Manage kanban_coluna (gerente+)" ON public.kanban_coluna
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read kanban_coluna" ON public.kanban_coluna;
CREATE POLICY "Staff read kanban_coluna" ON public.kanban_coluna
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Manage kit_itens (gerente+)" ON public.kit_itens;
CREATE POLICY "Manage kit_itens (gerente+)" ON public.kit_itens
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage kits (gerente+)" ON public.kits;
CREATE POLICY "Manage kits (gerente+)" ON public.kits
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage loja (gerente+)" ON public.loja;
CREATE POLICY "Manage loja (gerente+)" ON public.loja
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read pedido_status_historico" ON public.pedido_status_historico;
CREATE POLICY "Staff read pedido_status_historico" ON public.pedido_status_historico
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Delete pedidos (admin+)" ON public.pedidos;
CREATE POLICY "Delete pedidos (admin+)" ON public.pedidos
  FOR DELETE TO authenticated
  USING (private.has_role(ARRAY['administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Entregador read own pedidos" ON public.pedidos;
CREATE POLICY "Entregador read own pedidos" ON public.pedidos
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::role_usuario_enum]) AND (entregador_id = auth.uid())));

DROP POLICY IF EXISTS "Staff insert pedidos" ON public.pedidos;
CREATE POLICY "Staff insert pedidos" ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(ARRAY['atendente'::role_usuario_enum, 'gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read pedidos" ON public.pedidos;
CREATE POLICY "Staff read pedidos" ON public.pedidos
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Staff update pedidos" ON public.pedidos;
CREATE POLICY "Staff update pedidos" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (private.has_role(ARRAY['atendente'::role_usuario_enum, 'producao'::role_usuario_enum, 'gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['atendente'::role_usuario_enum, 'producao'::role_usuario_enum, 'gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo;
CREATE POLICY "Manage produto_opcao_grupo (gerente+)" ON public.produto_opcao_grupo
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item;
CREATE POLICY "Manage produto_opcao_item (gerente+)" ON public.produto_opcao_item
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage produtos (gerente+)" ON public.produtos;
CREATE POLICY "Manage produtos (gerente+)" ON public.produtos
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read produtos" ON public.produtos;
CREATE POLICY "Staff read produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Manage promocao_produtos (gerente+)" ON public.promocao_produtos;
CREATE POLICY "Manage promocao_produtos (gerente+)" ON public.promocao_produtos
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage promocoes (gerente+)" ON public.promocoes;
CREATE POLICY "Manage promocoes (gerente+)" ON public.promocoes
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff manage sessoes" ON public.sessoes;
CREATE POLICY "Staff manage sessoes" ON public.sessoes
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Admins manage usuarios" ON public.usuarios;
CREATE POLICY "Admins manage usuarios" ON public.usuarios
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read all usuarios" ON public.usuarios;
CREATE POLICY "Staff read all usuarios" ON public.usuarios
  FOR SELECT TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Staff read webhook_outbox" ON public.webhook_outbox;
CREATE POLICY "Staff read webhook_outbox" ON public.webhook_outbox
  FOR SELECT TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

DROP POLICY IF EXISTS "Manage regras_frete (gerente+)" ON public.regras_frete_distancia;
CREATE POLICY "Manage regras_frete (gerente+)" ON public.regras_frete_distancia
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

-- ── paginas (migration 062) ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read available pages" ON public.paginas;
CREATE POLICY "Public read available pages" ON public.paginas
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Manage paginas (gerente+)" ON public.paginas;
CREATE POLICY "Manage paginas (gerente+)" ON public.paginas
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));

-- ── produto_relacionados (migrations 054 + 071) ───────────────────────────────
DROP POLICY IF EXISTS "Public read produto_relacionados" ON public.produto_relacionados;
CREATE POLICY "Public read produto_relacionados" ON public.produto_relacionados
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Manage produto_relacionados (gerente+)" ON public.produto_relacionados;
CREATE POLICY "Manage produto_relacionados (gerente+)" ON public.produto_relacionados
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::role_usuario_enum, 'administrador'::role_usuario_enum, 'proprietario'::role_usuario_enum]));


-- ── cart_items_opcoes (migration 110) ─────────────────────────────────────────
DROP POLICY IF EXISTS "No client access" ON public.cart_items_opcoes;
CREATE POLICY "No client access" ON public.cart_items_opcoes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ── insumos / produto_insumos / estoque_movimentacoes (migration 111) ─────────
DROP POLICY IF EXISTS "Staff manage insumos" ON public.insumos;
CREATE POLICY "Staff manage insumos" ON public.insumos
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

DROP POLICY IF EXISTS "Staff manage produto_insumos" ON public.produto_insumos;
CREATE POLICY "Staff manage produto_insumos" ON public.produto_insumos
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

DROP POLICY IF EXISTS "Staff manage estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Staff manage estoque_movimentacoes" ON public.estoque_movimentacoes
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

DROP FUNCTION IF EXISTS public.has_role(public.role_usuario_enum[]);
DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.current_user_role();
-- ─── fim do bloco 12 ──────────────────────────────────────────────────────────

COMMIT;

-- =====================================================================================
-- AÇÕES MANUAIS OBRIGATÓRIAS APÓS EXECUÇÃO
-- =====================================================================================
--
-- 1. (Resolvido) spatial_ref_sys / PostGIS — a extensão não é mais instalada
--    (ver seção 12). Nenhuma ação manual necessária.
--
-- 2. auth_leaked_password_protection — ativar em:
--    Supabase Dashboard → Authentication → Settings → "Password protection"
--
-- 3. Configurações do banco para os jobs pg_cron (webhook-outbox-drain E
--    archive-orders). NÃO são variáveis do .env — são settings do Postgres,
--    lidos pelas funções via current_setting(). Sem isto os jobs fazem skip
--    silencioso (não quebram): o webhook de retry e o arquivamento horário de
--    pedidos ficam inativos. Execute no SQL Editor (superuser), substituindo
--    pelos valores reais da instalação:
--
--      ALTER DATABASE postgres SET app.base_url     = 'https://SEU-DOMINIO.com';
--      ALTER DATABASE postgres SET app.worker_token = 'VALOR-DO-NUXT_WORKER_TOKEN';
--
--    app.base_url   = URL pública da app (Cloudflare Workers ou domínio Docker).
--    app.worker_token = MESMO valor de NUXT_WORKER_TOKEN (item 4) — é o Bearer
--                       que os endpoints /api/internal/webhook-worker e
--                       /api/cron/archive-orders exigem.
--
-- 4. Variáveis de ambiente da aplicação (.env / Docker / Cloudflare Workers):
--    NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY, NUXT_SUPABASE_SECRET_KEY,
--    NUXT_SITE_URL, NUXT_WORKER_TOKEN (mesmo valor de app.worker_token acima),
--    NUXT_WHATSAPP_WEBHOOK_TOKEN — lista completa e comentada em .env.example.
--
-- 5. Colunas do Kanban além de "pendente"/"confirmado" (seção 14 — seed
--    deliberadamente mínimo). Sem pelo menos uma coluna com is_revenue_trigger,
--    is_out_for_delivery e is_delivered marcados, o dashboard de faturamento
--    (get_dashboard_metrics) fica preso em zero e confirm_delivery_inbound
--    nunca confirma entrega. Crie as colunas do seu fluxo (ex.: em_preparo,
--    saiu_para_entrega, entregue, cancelado) e marque as flags em
--    /admin → Kanban antes de processar o primeiro pedido.
-- =====================================================================================
