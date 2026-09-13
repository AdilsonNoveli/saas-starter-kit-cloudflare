-- =====================================================================================
-- Sales Delivery — Init SQL Consolidado
-- Gerado em: 2026-07-01 · Atualizado em: 2026-08-20 (dobra 114→121, depois
--   renomeação completa de tabelas/colunas/enums/funções/RPCs/triggers/
--   índices PT-BR→EN — ver _docs/PROXIMA-ETAPA.md. Valores de enum e nomes
--   de role (ex.: 'gerente', 'producao') ficaram DE FORA de propósito —
--   são dado de negócio, não identificador.)
-- Validado contra: Supabase project zwzklwuugysugiyncasc (sa-east-1, PostgreSQL 17.6)
-- Migrações incorporadas: 001 → 127 (completo)
--   • 033–039: cron de arquivamento, faturamento por status, hardening RBAC
--     (helpers movidos para o schema private) e deny-all explícito
--   • 040: products.images text[] (galeria, CHECK <= 4)
--   • 041: freeze_product_info congela COALESCE(promo_price, sale_price)
--   • 046: product_option_item.photo_url
--   • 047: store.logo_url_dark
--   • 048: store.catalog_theme + constraint
--   • 049b: promotions.photo_url/images/description · 053: display_position · 055: category_ids
--   • 052/056: tabela coupons + claim_coupon_atomic/decrement_coupon_usage
--   • 054/071: tabela related_products + RLS
--   • 062: tabela pages (Termos/Privacidade) + RLS + seeds
--   • 063: store.layout_config
--   • 110: opções de produto no carrinho (cart_item_options, tem_opcoes em search_products)
--   • 111–113: gestão de estoque (ingredients, product_ingredients, stock_movements, consumo atômico, unificação de capacidade diária)
--   • 114: grupos de opção texto_livre/upload_arquivo (product_option_group + text_value/file_url em cart_item_options/order_item_options)
--   • 115–117: Chat — whatsapp_conversations.actor/status/wamid/channel + tabela customer_conversation_summary (trigger de resumo da inbox)
--   • 118: store.chat_sound_alert_active
--   • 119: sem efeito no baseline — o fallback pg_cron/Docker que ela remove nunca chegou a entrar neste arquivo
--   • 120–121: tabela agent_quick_responses (respostas automáticas do agente IA, incl. gatilho por etapa do Kanban)
--   • 123: customer_conversation_summary.last_message_channel — ícone de
--     canal na inbox do Chat
--   • 124: coluna única de entrada do Kanban — remove 'confirmado' como
--     status inicial automático (pedido nasce sempre 'pendente'/"Novo",
--     independente de forma de pagamento ou validação de endereço); apaga a
--     coluna de sistema 'confirmado' (órfãos migrados pra 'pendente' antes
--     do DELETE) e renomeia o label de 'pendente' para "Novo"
--   • 125: kanban_column.is_entry — flag pra coluna de entrada (mesmo desenho
--     de is_delivery_dispatch/is_out_for_delivery/is_delivered/
--     is_revenue_trigger, índice único parcial incluso), pra parar de
--     hardcodar a string 'pendente' no código da aplicação;
--     guard_system_kanban_column passa a proteger is_entry junto de key/
--     is_system numa coluna de sistema
--   • 126: set_principal_kanban_column — troca deliberada (via UI em
--     Configurações → Avançado) de qual coluna é a ENTRADA/principal;
--     is_system + is_entry se movem juntos pra coluna escolhida, a antiga
--     vira uma coluna comum (editável/excluível normalmente)
--   • 127: cart_item_options.deferred / order_item_options.deferred —
--     recusa explícita de preenchimento de texto_livre/upload_arquivo
--     (distinto de "não perguntado ainda"), sustenta o botão "Enviar depois"
--     e o path diferir do DefinirItemCarrinho no WhatsApp
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
-- Busca fuzzy de products (migration 068): trigramas + normalização de acento.
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

-- ─── 1c. GRANTS DE TABELA (schema public) ─────────────────────────────────────
-- OBRIGATÓRIO: anon/authenticated precisam de privilégio de tabela MESMO com RLS ativo.
-- GRANT = camada 1 (o role pode tocar a tabela?).
-- RLS policy = camada 2 (quais linhas o role pode ver/modificar?).
-- Sem o GRANT, o banco retorna 42501 "permission denied for table" ANTES de checar RLS.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT                              ON ALL TABLES    IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE      ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL                                 ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT USAGE, SELECT                       ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT                       ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL                                 ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Garante que tabelas criadas no futuro herdem automaticamente esses grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT                          ON TABLES    TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE  ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL                             ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                   ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                   ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL                             ON SEQUENCES TO service_role;

-- ─── 2. TIPOS ENUM (idempotente via DO blocks) ────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.address_label_enum AS ENUM ('casa', 'trabalho', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method_enum AS ENUM ('pix', 'dinheiro', 'cartao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role_enum AS ENUM (
    'entregador', 'atendente', 'producao', 'gerente', 'administrador', 'proprietario'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_status_enum AS ENUM (
    'Novo', 'Ocasional', 'Frequente', 'VIP', 'Inativo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.account_status_enum AS ENUM (
    'ativo', 'pausado', 'bloqueado', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.operation_status_enum AS ENUM ('aberta', 'fechada', 'pausada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status_enum AS ENUM ('ativa', 'expirada', 'convertida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_mode_enum AS ENUM ('entrega', 'retirada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.option_group_type_enum AS ENUM ('single', 'multiple', 'toggle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Idempotente p/ bancos existentes sem os valores 'texto_livre'/'upload_arquivo' (migration 114):
DO $$ BEGIN
  ALTER TYPE public.option_group_type_enum ADD VALUE IF NOT EXISTS 'texto_livre';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.option_group_type_enum ADD VALUE IF NOT EXISTS 'upload_arquivo';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.promotion_type_enum AS ENUM (
    'leve_pague', 'progressivo', 'desconto_carrinho', 'destaque'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Idempotente p/ bancos existentes sem o amount 'destaque' (migration 053):
DO $$ BEGIN
  ALTER TYPE public.promotion_type_enum ADD VALUE IF NOT EXISTS 'destaque';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.unit_enum AS ENUM (
    'kg', 'litro', 'metro', 'unidade', 'caixa'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.webhook_outbox_status_enum AS ENUM (
    'pendente', 'enviando', 'enviado', 'falha', 'morto'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 3. TABELAS (sort_order por dependência de FK) ─────────────────────────────────

-- 3.1 store (raiz — sem dependências)
CREATE TABLE IF NOT EXISTS public.store (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url             text,
  trade_name         text        NOT NULL,
  cnpj                  text,
  pix_key             text,
  support_whatsapp_number  text,
  origin_latitude       numeric,
  origin_longitude      numeric,
  service_radius_km   numeric     DEFAULT 10,
  default_delivery_fee   numeric     NOT NULL DEFAULT 5.00,
  allows_pickup      boolean     NOT NULL DEFAULT true,
  -- VARCHAR em vez de enum para suportar 'automatico' além de aberta/fechada/pausada
  operation_status       varchar(20) NOT NULL DEFAULT 'automatico',
  account_status          varchar(20) NOT NULL DEFAULT 'ativo',
  webhook_url           text,
  -- Webhook de notificação de saída (migration 103). `webhook_active` separa
  -- "desligado" de "não configurado" — apagar a URL para pausar perderia a
  -- configuração inteira. Os dois segredos (Bearer do channel e key do HMAC
  -- do corpo) vivem no Vault, referenciados pelos *_id; só a máscara fica
  -- legível, para a tela mostrar que existe sem expor o amount.
  webhook_active                  boolean NOT NULL DEFAULT false,
  webhook_token_id               uuid,
  webhook_token_mask          text,
  webhook_signing_secret_id      uuid,
  webhook_signing_secret_mask text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  promotions_config      jsonb       DEFAULT '{}'::jsonb,
  hours_config       jsonb       DEFAULT '{"0":{"aberto":true,"inicio":"00:00","fim":"23:59"},"1":{"aberto":true,"inicio":"00:00","fim":"23:59"},"2":{"aberto":true,"inicio":"00:00","fim":"23:59"},"3":{"aberto":true,"inicio":"00:00","fim":"23:59"},"4":{"aberto":true,"inicio":"00:00","fim":"23:59"},"5":{"aberto":true,"inicio":"00:00","fim":"23:59"},"6":{"aberto":true,"inicio":"00:00","fim":"23:59"}}'::jsonb,
  address_street          text,
  address_number       text,
  address_complement  text,
  address_neighborhood       text,
  address_city       text,
  address_state           char(2),
  address_zip_code          text,
  status_override_date  date,
  closed_store_config   jsonb       NOT NULL DEFAULT '{"titulo":"","mensagem_custom":"","mostrar_endereco":false,"mostrar_horarios":true,"mostrar_whatsapp":true,"mostrar_pagina_fechada":true,"mostrar_faixa_fechada":true}'::jsonb,
  orders_config        jsonb       DEFAULT '{"horas_fallback":48,"regras_arquivamento":[{"horas":6,"status":"entregue"},{"horas":6,"status":"cancelado"}]}'::jsonb,
  -- Agente WhatsApp — key OpenAI via Supabase Vault + config direta
  -- (migration 088, passo 8 da arquitetura do agente WhatsApp).
  agent_openai_key_id      uuid,
  agent_openai_key_mask text,
  agent_model             text NOT NULL DEFAULT 'gpt-4.1-mini',
  agent_active              boolean NOT NULL DEFAULT true,
  agent_extra_instructions   text,
  -- 110: ConsultarOpcoesProduto somada à lista (borda recheada, variações...).
  agent_enabled_tools  jsonb   NOT NULL DEFAULT '["BuscarProdutos","DefinirItemCarrinho","ConsultarEnderecoEntrega","AtualizarPedido","FinalizarPedido","ConsultarDetalhePedido","EnviarBotaoCatalogo","ConsultarDatasEncomenda","AtualizarContexto","ConsultarOpcoesProduto"]'::jsonb,
  -- Provedor de WhatsApp configurável + flags de mídia do agente (migration
  -- 093, fase 2 de _docs/implementar/arquitetura-midia-e-provedor-whatsapp.md).
  -- URL base e rótulo em coluna (não são segredo, precisam ser trocáveis sem
  -- deploy); o token vive no Vault, referenciado por whatsapp_api_key_id.
  -- SEM DEFAULT desde a migration 103: a aplicação é agnóstica de fornecedor e
  -- instalação nova não pode nascer acoplada a um. Quem instala escolhe.
  whatsapp_provider_name    text    NOT NULL DEFAULT '',
  whatsapp_api_base_url     text    NOT NULL DEFAULT '',
  whatsapp_api_key_id       uuid,
  whatsapp_api_key_mask  text,
  agent_audio_enabled   boolean NOT NULL DEFAULT true,
  agent_image_enabled  boolean NOT NULL DEFAULT true,
  agent_transcription_model text    NOT NULL DEFAULT 'gpt-4o-mini-transcribe',
  agent_vision_model       text    NOT NULL DEFAULT 'gpt-4o-mini',
  -- Modelo do Avaliador de Qualidade (LLM-as-a-Judge), escolhido pelo lojista na
  -- aba Agente IA (migration 097). Default igual ao de OPENAI_JUDGE_MODELS.
  agent_evaluator_model   text    NOT NULL DEFAULT 'gpt-4.1-mini',
  -- Pausa por resposta humana (migration 104, §0.5.2 (a)(b) de
  -- _docs/em-andamento.md): window deslizante em minutos + toggle da aba
  -- Agente IA. O prazo em si (paused_until/pause_reason) mora em `customers`,
  -- por cliente — aqui só a config da store.
  agent_human_pause_minutes integer NOT NULL DEFAULT 15
    CONSTRAINT store_agent_human_pause_minutes_chk CHECK (agent_human_pause_minutes > 0),
  agent_human_pause_active   boolean NOT NULL DEFAULT true,
  -- 108: identidade do agente — name próprio + saudação custom, ambos
  -- opcionais (NULL = comportamento genérico atual). Ver AGENT_IDENTITY_NOTE
  -- em systemPrompt.ts.
  agent_name                 text,
  agent_greeting             text,
  -- 047: logo_url para modo escuro (logo dark-mode do catálogo)
  logo_url_dark            text,
  -- 048: tema global do catálogo (light | dark | system)
  catalog_theme             text    NOT NULL DEFAULT 'system'
    CONSTRAINT store_catalog_theme_check CHECK (catalog_theme IN ('light', 'dark', 'system')),
  -- 063: customização visual do layout do catálogo
  layout_config             jsonb   NOT NULL DEFAULT '{}'::jsonb,
  -- 118: alerta sonoro de transbordo (G13) — a bolinha pulsante nunca é
  -- desligável, só o som. Mesmo espírito de agent_human_pause_active.
  chat_sound_alert_active  boolean NOT NULL DEFAULT true
);

-- `store` é SINGLETON (migration 102). Toda a aplicação lê com `LIMIT 1` **sem
-- `ORDER BY`** — no servidor e dentro dos RPCs plpgsql (090/092/093). O Postgres
-- não promete sort_order sem `ORDER BY` e ela muda a cada `UPDATE`: com mais de uma
-- linha a leitura vira sorteio, e em produção isso deixou o agente mudo de forma
-- intermitente (a linha sorteada não tinha `agent_openai_key_id`). Índice único
-- sobre expressão constante: só uma linha satisfaz `(true)`. Configuração da
-- store se ATUALIZA, nunca se insere de novo.
CREATE UNIQUE INDEX IF NOT EXISTS store_single_row_idx
  ON public.store ((true));

-- 3.2 categories
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text    NOT NULL,
  description  text,
  icon_url  text,
  sort_order      int     DEFAULT 0,
  active      boolean DEFAULT true,
  color        text,
  -- 064: categoria âncora do catálogo (substitui a aba "Todos"). Unicidade
  -- garantida por trigger (trg_ensure_single_primary_category).
  is_primary  boolean NOT NULL DEFAULT false,
  -- 128: ordem de exibição dos produtos desta categoria no catálogo. 'random'
  -- (pseudo-aleatório via products.random_rank, padrão/comportamento original)
  -- ou 'numeric' (via products.number, NULLS LAST). Quando esta é a categoria
  -- Principal (is_primary), também governa a aba "Todos" — ver catalog_products_page.
  sort_mode  text    NOT NULL DEFAULT 'random'
    CONSTRAINT categories_sort_mode_check CHECK (sort_mode IN ('random', 'numeric'))
);

-- 3.3 promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id                 uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id       uuid                      REFERENCES public.categories(id) ON DELETE SET NULL,
  name               text                      NOT NULL,
  type               public.promotion_type_enum NOT NULL,
  config       jsonb                     NOT NULL,
  active              boolean                   DEFAULT true,
  start_date        timestamptz,
  end_date           timestamptz,
  created_at          timestamptz               DEFAULT now(),
  -- 049b: galeria e descrição do banner/promoção (migration 049)
  photo_url           text,
  images            text[]                    DEFAULT '{}',
  description          text,
  -- 053: posição de exibição (apenas banners do type 'destaque')
  display_position   text
    CONSTRAINT promotions_display_position_check CHECK (display_position IN ('topo', 'meio', 'rodape')),
  -- 055: múltiplas categories onde o banner deve aparecer
  category_ids     uuid[]
);

-- 3.3b coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code          text        NOT NULL UNIQUE,
  description       text,
  discount_type   text        NOT NULL DEFAULT 'percentual'
    CONSTRAINT coupons_type_check CHECK (discount_type IN ('percentual', 'fixo')),
  amount           numeric     NOT NULL CHECK (amount > 0),
  minimum_amount    numeric     NOT NULL DEFAULT 0,
  max_uses      int,
  current_uses       int         NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  active           boolean     NOT NULL DEFAULT true,
  start_date     timestamptz,
  end_date        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 3.4 kits
CREATE TABLE IF NOT EXISTS public.kits (
  id                  uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id        uuid    REFERENCES public.categories(id) ON DELETE SET NULL,
  name                text    NOT NULL,
  description           text,
  photo_url            text,
  fixed_price          numeric,
  available          boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  show_at_checkout boolean NOT NULL DEFAULT false,
  label            text    NOT NULL DEFAULT 'KIT'
    CONSTRAINT kits_label_check CHECK (label IN ('KIT', 'COMBO', 'PACOTE')),
  -- Galeria: photo_url é a CAPA; `images` guarda as fotos EXTRAS (máx. 4 → total 5).
  images             text[]  NOT NULL DEFAULT '{}'
    CONSTRAINT kits_images_max_check CHECK (cardinality(images) <= 4)
);

-- 3.5 kanban_column (orders tem FK para esta tabela)
CREATE TABLE IF NOT EXISTS public.kanban_column (
  key              text        NOT NULL PRIMARY KEY,
  label              text        NOT NULL,
  color                text        NOT NULL DEFAULT '#6B7280',
  sort_order              int         NOT NULL DEFAULT 0,
  visible            boolean     NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  is_revenue_trigger boolean     NOT NULL DEFAULT false,
  is_cancelled       boolean     NOT NULL DEFAULT false,
  is_open            boolean     NOT NULL DEFAULT false,
  -- Coluna de sistema: protegida contra exclusão/renome (trigger guard_system_kanban_column).
  is_system         boolean     NOT NULL DEFAULT false,
  -- Coluna de ENTRADA: todo pedido nasce nela, de qualquer canal (migration 125).
  -- No máximo uma true (kanban_column_uniq_entry); numa coluna de sistema é
  -- imutável junto de key/is_system (guard_system_kanban_column).
  is_entry          boolean     NOT NULL DEFAULT false,
  -- Papéis semânticos do fluxo de entrega (substituem chaves hardcoded na automação).
  -- Entrada nesta coluna + delivery_mode=entrega dispara a atribuição de entregador.
  is_delivery_dispatch boolean   NOT NULL DEFAULT false,
  -- Estado "saiu para entrega" (entregador atribuído/despachado).
  is_out_for_delivery  boolean   NOT NULL DEFAULT false,
  -- Estado terminal "entregue" (define delivered_at e métricas do cliente).
  is_delivered         boolean   NOT NULL DEFAULT false
);

-- 3.6 customers
CREATE TABLE IF NOT EXISTS public.customers (
  id                    uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 032: nullable — a nova API do WhatsApp pode entregar apenas o @lid.
  whatsapp_phone     text                      UNIQUE,
  -- 031: identificador @lid da nova API do WhatsApp (privacidade).
  whatsapp_lid          text,
  name                  text                      NOT NULL,
  birth_date       date,
  status                public.customer_status_enum DEFAULT 'Novo',
  has_pending_issues     boolean                   DEFAULT false,
  pending_issue_description   text,
  customer_since         timestamptz               DEFAULT now(),
  total_orders         int                       DEFAULT 0,
  total_cancellations   int                       DEFAULT 0,
  total_amount_spent numeric                   DEFAULT 0,
  average_ticket          numeric,
  last_order_at      timestamptz,
  purchase_frequency     text,
  frequent_neighborhood      text,
  preferences          text,
  internal_notes  text,
  -- Pausa por atendimento (migration 104, §0.5.2 (a) de _docs/em-andamento.md):
  -- state único, um PRAZO nunca uma flag. Os dois campos andam em par
  -- (constraint customers_pause_pair_chk) — reason sem prazo não é state válido.
  paused_until           timestamptz,
  pause_reason        text
    CONSTRAINT customers_pause_reason_chk CHECK (pause_reason IS NULL OR pause_reason IN ('transbordo', 'resposta_humana', 'manual')),
  has_context          boolean                   DEFAULT false,
  context_summary       text,
  -- 066: afinidade com o catálogo aprendida pelo agente (oferta dinâmica).
  -- 'catalogo' | 'chat' | 'misto' | NULL (desconhecido).
  preferred_channel       text,
  last_conversation_at       timestamptz,
  photo_url              text,
  created_at             timestamptz               DEFAULT now(),
  updated_at         timestamptz               DEFAULT now(),
  is_guest          boolean                   DEFAULT true,
  -- 105: cliente sintético do laboratório de avaliação (phone
  -- 5521999990000+índice, DDD 21 reservado). Propósito único — não reaproveita
  -- `archived` (armadilha 6 de _docs/em-andamento.md) nem `is_guest`.
  is_lab_test   boolean     NOT NULL      DEFAULT false,

  -- 032: pelo menos UM identificador de WhatsApp é obrigatório.
  CONSTRAINT chk_customers_identifier
    CHECK (whatsapp_phone IS NOT NULL OR whatsapp_lid IS NOT NULL),

  -- 104: reason sem prazo (ou vice-versa) não é um state de pausa válido.
  CONSTRAINT customers_pause_pair_chk
    CHECK ((paused_until IS NULL) = (pause_reason IS NULL))
);

-- 3.7 sessions (→ customers)
-- delivery_mode/payment_method/address_id: state de checkout server-side
-- (migration 082) — o agente grava, a app finaliza como commit puro.
-- address_id ganha FK para customer_addresses logo após a definição dela (3.12).
CREATE TABLE IF NOT EXISTS public.sessions (
  id             uuid                       NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     uuid                       REFERENCES public.customers(id),
  status         public.session_status_enum  DEFAULT 'ativa',
  created_at      timestamptz                DEFAULT now(),
  expires_at      timestamptz                DEFAULT (now() + interval '24 hours'),
  channel          varchar(50)                DEFAULT 'whatsapp_bot',
  delivery_mode  text NULL
    CONSTRAINT sessions_delivery_mode_check CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada')),
  payment_method text NULL
    CONSTRAINT sessions_payment_method_check CHECK (payment_method IS NULL OR payment_method IN ('pix', 'dinheiro', 'cartao')),
  address_id     uuid NULL
);

-- 3.8 users (→ auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid                      NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text,
  avatar_url    text,
  whatsapp      text,
  role          public.user_role_enum  NOT NULL DEFAULT 'atendente',
  active         boolean                   NOT NULL DEFAULT true,
  created_at     timestamptz               NOT NULL DEFAULT now(),
  updated_at timestamptz               NOT NULL DEFAULT now()
);

-- 3.8b Helpers RBAC no schema private (criados imediatamente após public.users)
CREATE OR REPLACE FUNCTION private.has_role(roles public.user_role_enum[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.active = true AND u.role = ANY(roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.active = true
      AND u.role IN ('atendente','producao','gerente','administrador','proprietario')
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS public.user_role_enum LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT u.role FROM public.users u WHERE u.id = auth.uid() AND u.active = true;
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(public.user_role_enum[])   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_staff()                             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.current_user_role()                    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.has_role(public.user_role_enum[])   TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION private.is_staff()                             TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION private.current_user_role()                    TO authenticated, service_role;

-- 3.9 products (→ categories)
CREATE TABLE IF NOT EXISTS public.products (
  id                    uuid                       NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id          uuid                       REFERENCES public.categories(id),
  name                  text                       NOT NULL,
  description             text,
  photo_url              text,
  cost_price           numeric                    NOT NULL DEFAULT 0,
  profit_margin          numeric                    NOT NULL DEFAULT 0,
  sale_price           numeric,
  unit        public.unit_enum DEFAULT 'unidade',
  allows_fractional_sale boolean                    DEFAULT false,
  current_stock         numeric,
  available            boolean                    DEFAULT true,
  created_at             timestamptz                DEFAULT now(),
  promo_price     numeric,
  -- Galeria: photo_url é a CAPA; `images` guarda as fotos EXTRAS (máx. 4 → total 5).
  images               text[]                     NOT NULL DEFAULT '{}'
    CONSTRAINT products_images_max_check CHECK (cardinality(images) <= 4),
  -- Ordem pseudo-aleatória do catálogo (paginação por keyset — ver 4.x /
  -- catalog_products_page). Novos products recebem posição aleatória.
  random_rank        double precision           NOT NULL DEFAULT random(),
  -- Variações/apelidos coloquiais para a busca fuzzy da LLM (migration 070).
  -- Índice GIN (idx_products_trgm_search) aplica f_unaccent(lower(...)) sobre
  -- name + descrição + sinônimos — ver função search_products.
  synonyms             text[]                     NOT NULL DEFAULT '{}',
  -- Pre-Order System (migration 078/079): modo de venda + regras de encomenda.
  -- 'stock' (venda imediata) OU 'preorder' (encomenda) — sem modo híbrido.
  product_type          text                       NOT NULL DEFAULT 'stock'
    CONSTRAINT produtos_product_type_check CHECK (product_type IN ('stock','preorder')),
  preorder_config       jsonb,
  -- Requisitos p/ motor de missing_fields (migration 084). Schema:
  -- ProductRequirements em shared/types/preorder.ts. Backfill: preorder ⇒
  -- requires_date=true, admin escreve isto ao salvar o produto.
  requirements          jsonb                      NOT NULL DEFAULT '{}'::jsonb,
  -- Gestão de estoque (migrations 111 & 112): política por produto + ingredients + limite diário
  stock_control        text                       NOT NULL DEFAULT 'nenhum'
    CONSTRAINT products_stock_control_check CHECK (stock_control IN ('nenhum', 'contagem', 'producao_diaria')),
  minimum_stock          numeric,
  daily_production_limit  numeric,
  -- 128: número manual de exibição no catálogo — opcional, único por categoria
  -- (NULL não colide). Alimenta a tag quadrada do card e a ordenação quando
  -- categories.sort_mode = 'numeric'.
  number                integer
    CONSTRAINT products_number_range_check CHECK (number IS NULL OR number BETWEEN 1 AND 999999),
  CONSTRAINT products_current_stock_not_negative CHECK (current_stock IS NULL OR current_stock >= 0),
  CONSTRAINT products_daily_production_exclusive_preorder CHECK (NOT (product_type = 'preorder' AND stock_control = 'producao_diaria')),
  CONSTRAINT products_category_number_unique UNIQUE (category_id, number)
);

-- Índices de suporte à sort_order aleatória escalável do catálogo (keyset).
CREATE INDEX IF NOT EXISTS idx_products_rank
  ON public.products (random_rank, id) WHERE available;
CREATE INDEX IF NOT EXISTS idx_products_cat_rank
  ON public.products (category_id, random_rank, id) WHERE available;
-- 128: índices equivalentes para paginação por keyset em modo numérico.
CREATE INDEX IF NOT EXISTS idx_products_number
  ON public.products (number, id) WHERE available;
CREATE INDEX IF NOT EXISTS idx_products_cat_number
  ON public.products (category_id, number, id) WHERE available;

-- 3.10 product_option_group (→ products)
CREATE TABLE IF NOT EXISTS public.product_option_group (
  id           uuid                         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   uuid                         NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name         text                         NOT NULL,
  type         public.option_group_type_enum NOT NULL DEFAULT 'single',
  required  boolean                      NOT NULL DEFAULT false,
  min_selections int                          NOT NULL DEFAULT 0,
  max_selections int                          NOT NULL DEFAULT 1,
  sort_order        int                          NOT NULL DEFAULT 0,
  created_at    timestamptz                  NOT NULL DEFAULT now(),
  -- 114: config dos tipos texto_livre/upload_arquivo — NULL para grupos
  -- single/multiple/toggle, que não usam estes campos.
  max_text_length       int NULL
    CONSTRAINT chk_texto_max_caracteres CHECK (max_text_length IS NULL OR max_text_length BETWEEN 1 AND 2000),
  text_placeholder          text NULL,
  accepted_file_types      text[] NULL DEFAULT ARRAY['application/pdf'],
  max_file_size_mb  int NULL DEFAULT 10
    CONSTRAINT chk_arquivo_tamanho_maximo_mb CHECK (max_file_size_mb IS NULL OR max_file_size_mb BETWEEN 1 AND 15)
);

COMMENT ON COLUMN public.product_option_group.max_text_length IS
'Limite de caracteres do valor livre (grupo tipo texto_livre). NULL = sem limite explícito (UI ainda pré-preenche um padrão).';
COMMENT ON COLUMN public.product_option_group.text_placeholder IS
'Texto de exemplo exibido no campo (grupo tipo texto_livre).';
COMMENT ON COLUMN public.product_option_group.accepted_file_types IS
'MIME types aceitos pelo grupo tipo upload_arquivo — subconjunto do whitelist rígido do servidor (PDF/JPEG/PNG/WebP), nunca uma ampliação.';
COMMENT ON COLUMN public.product_option_group.max_file_size_mb IS
'Tamanho máximo (MB) aceito pelo grupo tipo upload_arquivo — tetado em 15MB (teto rígido do endpoint de upload do cliente).';

-- tem_opcoes (EXISTS por produto na RPC do catálogo) usa este índice.
CREATE INDEX IF NOT EXISTS idx_product_option_group_product
  ON public.product_option_group (product_id);

-- 3.11 product_option_item (→ product_option_group)
CREATE TABLE IF NOT EXISTS public.product_option_item (
  id                 uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id           uuid    NOT NULL REFERENCES public.product_option_group(id) ON DELETE CASCADE,
  name               text    NOT NULL,
  price_delta        numeric NOT NULL DEFAULT 0,
  default_selected boolean NOT NULL DEFAULT false,
  active              boolean NOT NULL DEFAULT true,
  sort_order              int     NOT NULL DEFAULT 0,
  -- 046: foto da variação (ex: color/model) — nullable
  photo_url           text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 3.12 customer_addresses (→ customers)
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id          uuid                           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  uuid                           REFERENCES public.customers(id) ON DELETE CASCADE,
  street         text                           NOT NULL,
  number      text                           NOT NULL,
  complement text,
  neighborhood      text                           NOT NULL,
  zip_code         text,
  latitude    numeric,
  longitude   numeric,
  label     public.address_label_enum   DEFAULT 'casa',
  is_default      boolean                        DEFAULT false,
  created_at   timestamptz                    DEFAULT now(),
  city      text,
  state      text
);

DO $$ BEGIN
  ALTER TABLE public.sessions
    ADD CONSTRAINT sessions_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.customer_addresses(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3.13 tracking_events (→ sessions)
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   uuid        REFERENCES public.sessions(id),
  type        text        NOT NULL,
  entity    text,
  entity_id uuid,
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3.14 kit_items (→ kits, products)
CREATE TABLE IF NOT EXISTS public.kit_items (
  id         uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id     uuid    REFERENCES public.kits(id) ON DELETE CASCADE,
  product_id uuid    REFERENCES public.products(id),
  quantity numeric NOT NULL DEFAULT 1
);

-- 3.14b related_products — products sugeridos no checkout (migrations 054 + 071)
CREATE TABLE IF NOT EXISTS public.related_products (
  product_id             uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_product_id uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order                  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_product_id),
  CONSTRAINT no_self_relation CHECK (product_id <> related_product_id)
);
CREATE INDEX IF NOT EXISTS idx_related_products_product_id
  ON public.related_products (product_id);

-- 3.14c pages — conteúdo estático (Termos de Uso, Política de Privacidade) — migration 062
CREATE TABLE IF NOT EXISTS public.pages (
  slug          text        PRIMARY KEY,
  title        text        NOT NULL,
  content      text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.15 promotion_products (→ promotions, products)
CREATE TABLE IF NOT EXISTS public.promotion_products (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES public.products(id)
);

-- 3.16 orders (→ customers, sessions, customer_addresses, users, kanban_column)
CREATE SEQUENCE IF NOT EXISTS public.pedido_short_id_seq START WITH 28431;

CREATE TABLE IF NOT EXISTS public.orders (
  id                    uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_id              integer                   UNIQUE DEFAULT nextval('public.pedido_short_id_seq'),
  customer_id            uuid                      REFERENCES public.customers(id),
  session_id             uuid                      REFERENCES public.sessions(id),
  address_id           uuid                      REFERENCES public.customer_addresses(id),
  payment_method       public.payment_method_enum NOT NULL,
  change_for            numeric,
  delivery_mode          public.delivery_mode_enum  NOT NULL,
  subtotal_amount        numeric                   DEFAULT 0,
  discount_applied     numeric                   DEFAULT 0,
  delivery_fee         numeric                   DEFAULT 0,
  total_amount           numeric,
  delivery_time_minutes int,
  -- FK para kanban_column.key — status é text livre controlado pelo kanban.
  -- O DEFAULT literal é uma rede de segurança que nunca dispara na prática:
  -- todo caminho de criação de pedido informa `status` explicitamente,
  -- resolvido em runtime via `kanban_column.is_entry` (migration 125,
  -- `resolveEntryKanbanStatus.ts`), não este literal. Mantido em sincronia
  -- manual com a coluna is_entry só por segurança (nunca diverge na prática:
  -- guard_system_kanban_column trava os dois juntos numa coluna de sistema).
  status                text                      DEFAULT 'pendente' REFERENCES public.kanban_column(key),
  notes           text,
  -- 067: instrução operacional no card (staff), gerada quando o pedido nasce pendente.
  operational_note      text,
  -- 109: nota do atendente sobre o andamento do pedido, editável a qualquer
  -- momento pelo staff — staff-only, nunca em recibo (ver comentário da coluna).
  service_note      text,
  created_at             timestamptz               DEFAULT now(),
  updated_at         timestamptz               DEFAULT now(),
  discount_amount        numeric                   DEFAULT 0,
  free_shipping_applied boolean                   DEFAULT false,
  shipping_fee           numeric                   DEFAULT 0,
  delivered_at           timestamptz,
  driver_id         uuid                      REFERENCES public.users(id),
  assigned_at          timestamptz,
  archived             boolean                   DEFAULT false,
  archived_at          timestamptz
);

-- 3.17 order_items (→ orders, products)
-- delivery_mode/address_id (migration 085): override de fulfillment SÓ deste
-- item (Feature 4.1), preservado do carrinho — NULL herda orders.delivery_mode/
-- address_id (resolução de nível: comum promovido ao pedido).
CREATE TABLE IF NOT EXISTS public.order_items (
  id                       uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id                uuid    REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id               uuid    REFERENCES public.products(id),
  frozen_product_name   text,
  frozen_unit_price numeric,
  quantity               numeric NOT NULL DEFAULT 1,
  subtotal                 numeric,
  delivery_mode            text NULL
    CONSTRAINT itens_pedido_delivery_mode_check CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada')),
  address_id              uuid NULL REFERENCES public.customer_addresses(id)
);

-- 3.18 order_item_options (→ order_items, product_option_item)
CREATE TABLE IF NOT EXISTS public.order_item_options (
  id                    uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id        uuid    NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_item_id         uuid    REFERENCES public.product_option_item(id),
  frozen_name        text    NOT NULL,
  frozen_price_delta numeric NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  -- 114: amount fornecido pelo cliente (grupos texto_livre/upload_arquivo).
  text_value            text NULL,
  file_url            text NULL,
  original_file_name  text NULL,
  -- 127: recusa explícita de preenchimento (distinto de "não perguntado
  -- ainda", default false) — copiado de cart_item_options.deferred no
  -- checkout (finalizeCheckout.ts).
  deferred             boolean     NOT NULL DEFAULT false
);

COMMENT ON COLUMN public.order_item_options.text_value IS
'Texto digitado pelo cliente quando a opção pertence a um grupo tipo texto_livre. Validado/truncado no servidor em orders/create.post.ts antes de gravar.';
COMMENT ON COLUMN public.order_item_options.file_url IS
'URL do arquivo (PDF/imagem) enviado pelo cliente quando a opção pertence a um grupo tipo upload_arquivo. Servidor valida que a URL pertence ao bucket/prefixo artes-clientes/ antes de gravar.';
COMMENT ON COLUMN public.order_item_options.original_file_name IS
'Nome original do arquivo enviado (exibição para o staff no Kanban/recibo) — não usado para path no bucket.';
COMMENT ON COLUMN public.order_item_options.deferred IS
'Copiado de cart_item_options.deferred no checkout (finalizeCheckout.ts) — sustenta o fallback de anexação de arte pós-pedido em server/utils/orders/pendingOrderArt.ts. Migration 127.';

-- 3.19 order_status_history (→ orders, users)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id              uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid    NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status     text    NOT NULL,
  changed_by    uuid    REFERENCES public.users(id),
  source          text    NOT NULL DEFAULT 'sistema',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 3.19a preorders (→ orders, products) — Pre-Order System (migration 078).
-- Status da encomenda = status do pedido (kanban); sem status próprio por design.
-- Capacidade diária = SUM(quantity) vs products.preorder_config->>'daily_capacity'.
CREATE TABLE IF NOT EXISTS public.preorders (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id     uuid        NOT NULL REFERENCES public.products(id),
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
  product_id   uuid        REFERENCES public.products(id) ON DELETE CASCADE,
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
  event               text                          NOT NULL,
  payload              jsonb                         NOT NULL,
  destination_url          text                          NOT NULL,
  status               public.webhook_outbox_status_enum NOT NULL DEFAULT 'pendente',
  attempts           int                           NOT NULL DEFAULT 0,
  max_attempts       int                           NOT NULL DEFAULT 6,
  next_retry_at timestamptz                   NOT NULL DEFAULT now(),
  last_error          text,
  http_status          int,
  created_at            timestamptz                   NOT NULL DEFAULT now(),
  sent_at           timestamptz
);

-- 3.21 webhook_queue (fila de webhook para integração WhatsApp)
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
--   Mapeia Idempotency-Key -> pedido (payload.order_id). O UNIQUE(key) atua
--   como trava: retries do n8n em POST /orders e /cart/checkout não duplicam
--   orders. Acesso exclusivo via service_role (RLS habilitado sem policy de
--   acesso — ver seção 6). Consolidado no init a partir da migration 057.
CREATE TABLE IF NOT EXISTS public.integration_idempotency (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text        NOT NULL UNIQUE,
  payload     jsonb,
  status      text        NOT NULL DEFAULT 'completed',
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipping_distance_rules (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  min_distance_km numeric NOT NULL CHECK (min_distance_km >= 0),
  max_distance_km numeric NOT NULL,
  shipping_fee      numeric NOT NULL CHECK (shipping_fee >= 0),
  active            boolean NOT NULL DEFAULT true,
  sort_order            int     NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_distance_ordered CHECK (max_distance_km > min_distance_km),
  CONSTRAINT unique_sort_order UNIQUE (sort_order)
);

-- 031: carrinho server-side do fluxo agentivo (→ sessions, products).
-- TTL herdado da sessão; agente LLM nunca mantém state próprio.
-- target_date/note (migration 082): atributos por-item de checkout,
-- usados por products de encomenda no carrinho unificado (EPIC 3).
-- delivery_mode/address_id (migration 085): override de fulfillment SÓ deste
-- item (Feature 4.1) — NULL herda sessions.delivery_mode/address_id.
CREATE TABLE IF NOT EXISTS public.cart_items (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid    NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  product_id    uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    numeric NOT NULL CHECK (quantity > 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  target_date   date NULL,
  note    text NULL,
  delivery_mode text NULL
    CONSTRAINT cart_items_delivery_mode_check CHECK (delivery_mode IS NULL OR delivery_mode IN ('entrega', 'retirada')),
  address_id    uuid NULL REFERENCES public.customer_addresses(id),
  -- 110: opções de produto no carrinho (assinatura de variação ordenando opcao_item_ids)
  options_signature text NOT NULL DEFAULT '',

  CONSTRAINT cart_items_session_product_options_unique UNIQUE (session_id, product_id, options_signature)
);

-- 3.18b cart_item_options (migration 110) — opção selecionada por linha do carrinho
CREATE TABLE IF NOT EXISTS public.cart_item_options (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_item_id          uuid        NOT NULL REFERENCES public.cart_items(id) ON DELETE CASCADE,
  option_item_id         uuid        REFERENCES public.product_option_item(id),
  frozen_name        text        NOT NULL,
  frozen_price_delta numeric     NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  -- 114: mesmo par text_value/file_url de order_item_options, congelado
  -- já no carrinho (antes do pedido existir).
  text_value            text NULL,
  file_url            text NULL,
  original_file_name  text NULL,
  -- 127: cliente optou explicitamente por adiar o preenchimento (ex.:
  -- diferir:true no DefinirItemCarrinho do WhatsApp) — distinto de campo
  -- ainda não perguntado, que é o default false.
  deferred             boolean     NOT NULL DEFAULT false
);

COMMENT ON COLUMN public.cart_item_options.deferred IS
'Cliente optou explicitamente por adiar o preenchimento (ex.: diferir:true no DefinirItemCarrinho do WhatsApp) — distinto de campo ainda não perguntado. Migration 127.';

-- 087: schema do agente WhatsApp in-app (transporte) — ver
-- _docs/implementar/arquitetura-agente-whatsapp-in-app.md seções 4 e 9.
-- whatsapp_received_messages: dedup por wamid (PRIMARY KEY).
CREATE TABLE IF NOT EXISTS public.whatsapp_received_messages (
  wamid        text        NOT NULL PRIMARY KEY,
  received_at  timestamptz NOT NULL DEFAULT now()
);

-- whatsapp_turn_buffer: buffer de rajada (debounce) — claim atômico via
-- DELETE ... WHERE key = $1 AND last_message_id = $2 RETURNING *.
-- `whatsapp_lid` (migration 100) leva o identificador estável do WhatsApp
-- (`messages[].from_user_id`) do produtor até o consumer, atravessando os ~8s
-- de debounce: sem ele o turno identificava o cliente só por phone e o
-- lookup lid-first de `findOrCreateCustomer` nunca recebia o amount.
-- `key` (migration 101, item (b) da FASE 0.4) é a identidade do turno
-- derivada do PAYLOAD — phone quando ele veio, senão 'lid:'||whatsapp_lid.
-- Telefone primeiro porque todos os payloads reais o trazem: para o tráfego de
-- hoje `key` é o próprio phone. Chave composta foi rejeitada (coluna de PK
-- é NOT NULL, e NULLS DISTINCT fragmentaria a rajada mista) e identidade
-- resolvida (`customers.id`) também: obrigaria o webhook a ler `customers` e a
-- key poderia MUDAR entre o append e o claim, quebrando a entrega única.
-- Os dois CHECKs são necessários — com phone e lid nulos o check de key
-- avalia para NULL, e CHECK que resulta em NULL é considerado satisfeito.
CREATE TABLE IF NOT EXISTS public.whatsapp_turn_buffer (
  key         text        NOT NULL PRIMARY KEY,
  phone      text,
  texts        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  last_message_id text        NOT NULL,
  whatsapp_lid  text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_turno_buffer_identidade_chk
    CHECK (phone IS NOT NULL OR whatsapp_lid IS NOT NULL),
  CONSTRAINT whatsapp_turno_buffer_chave_chk
    CHECK (key = COALESCE(phone, 'lid:' || whatsapp_lid))
);

-- whatsapp_conversations: histórico de turno (só user/assistant; tool calls são
-- andaime interno do turno, não persistem).
-- `seq` (migration 091) é o desempate obrigatório da leitura: `created_at`
-- default `now()` é o timestamp da TRANSAÇÃO, e as duas linhas do turno
-- (user + assistant) são gravadas num único INSERT — nascem com amount idêntico.
-- Sem `seq`, o histórico podia sair com a resposta antes da pergunta.
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id        uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid       NOT NULL REFERENCES public.customers(id),
  role      text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seq       bigserial,
  -- 115: autoria explícita da linha. NULL = linha gravada antes desta
  -- migration — a UI cai de volta para a heurística de prefixo.
  actor      text NULL
    CONSTRAINT whatsapp_conversations_actor_chk CHECK (actor IS NULL OR actor IN ('cliente', 'agente_ia', 'humano_painel', 'humano_celular', 'sistema')),
  -- 116: status/wamid (dedupe do echo) / channel — ver comentários abaixo.
  status    text NOT NULL DEFAULT 'sent'
    CONSTRAINT whatsapp_conversations_status_chk CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  wamid     text NULL,
  channel   text NOT NULL DEFAULT 'whatsapp'
    CONSTRAINT whatsapp_conversations_channel_chk CHECK (channel IN ('whatsapp', 'web', 'instagram', 'telegram', 'custom'))
);

COMMENT ON COLUMN public.whatsapp_conversations.actor IS
'Autoria explícita da linha: cliente | agente_ia | humano_painel | humano_celular | sistema. NULL = linha gravada antes desta migration — a UI cai de volta para a heurística de prefixo (shared/utils/chatMessage.ts) nesse caso.';
COMMENT ON COLUMN public.whatsapp_conversations.status IS
'pending | sent | delivered | read | failed. Nasce pending, o consumer da fila chat-outbound grava sent/failed após resposta real da Cloud API. delivered/read reservados, nenhum código grava ainda.';
COMMENT ON COLUMN public.whatsapp_conversations.wamid IS
'Id da mensagem devolvido pela Cloud API no envio (painel) — usado para descartar o echo duplicado da mesma mensagem quando a Meta ecoa de volta (ver handleEchoEvent.ts). NULL para mensagens que nunca passaram pela Cloud API.';
COMMENT ON COLUMN public.whatsapp_conversations.channel IS
'Canal de origem da mensagem (ChatChannel em shared/types/chat.ts). Default ''whatsapp'' porque esta tabela é hoje exclusiva de WhatsApp por nome.';

-- whatsapp_media: registro por mídia recebida (migration 094) — idempotência do
-- retry da fila, cache do resultado e telemetria de custo. Ver
-- _docs/implementar/arquitetura-midia-e-provedor-whatsapp.md §4.2.
-- `wamid` é PK por ser a key natural de idempotência (§8.2): a retentativa
-- que encontra `status = 'concluido'` reaproveita `text` em vez de pagar a
-- OpenAI de novo. Só o text derivado é gravado — os bytes nunca saem da
-- memória do Worker (§9). 'recusado' é a mídia que nem chega a ser processada
-- (recurso desligado, type não suportado, tamanho acima do limite) e mesmo
-- assim recebe resposta ao cliente (§7.4).
-- `whatsapp_lid` + `phone` nullable (migration 101, item (c) da FASE 0.4):
-- mesma dependência estrutural do buffer. Sem a coluna, o turno iniciado por
-- áudio ou imagem nunca gravava `customers.whatsapp_lid` — `deliverToTurn` não
-- tinha o que propagar.
CREATE TABLE IF NOT EXISTS public.whatsapp_media (
  wamid          text        NOT NULL PRIMARY KEY,
  phone       text,
  whatsapp_lid   text,
  type           text        NOT NULL,          -- 'audio' | 'image'
  media_id       text        NOT NULL,
  mime_type      text,
  size_bytes  integer,
  status         text        NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','processando','concluido','falhou','recusado')),
  text          text,                          -- transcrição ou descrição
  error           text,
  model         text,
  duration_ms     integer,
  attempts     integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- 107: contacts[].profile.name do payload original (pushname) — sobrevive
  -- até o consumer de mídia resolver o cliente, depois da transcrição/visão.
  contact_name   text,
  CONSTRAINT whatsapp_media_identity_chk
    CHECK (phone IS NOT NULL OR whatsapp_lid IS NOT NULL)
);

-- customer_intelligence: fatos materializados por cliente (migration 095) — base
-- da Customer SKILL que o agente lê a cada turno. NÃO guarda o documento
-- renderizado: ele é projetado no turno (`server/utils/agent/customerSkill.ts`).
-- Identificadores em inglês por decisão de nomenclatura (§2 de
-- `_docs/REVENUE/study.md`); a ponte com o schema legado é a FK.
-- `updated_at` mantém o name legado porque é a coluna que
-- `update_updated_at_column()` grava.
CREATE TABLE IF NOT EXISTS public.customer_intelligence (
  customer_id        uuid        NOT NULL PRIMARY KEY
                                 REFERENCES public.customers(id) ON DELETE CASCADE,
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
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- agent_token_usage: telemetria de custo/latência por turno do agente.
-- `rounds` e `evaluation_pending` vieram na migration 097 (observabilidade):
-- `rounds` é NULL em registro de mídia (transcrição/visão não têm loop de tool
-- calls) — NULL e zero significam coisas diferentes aqui.
-- `seq` veio na migration 105: seq (whatsapp_conversations) da resposta do
-- assistente deste turno, gravado pelo mesmo INSERT de saveConversationTurn —
-- âncora exata para loadJudgeWindow montar a window de julgamento, sem
-- ambiguidade de timestamp (NULL para turnos sem customer_id, ex.: mídia).
-- `tool_trace` veio na migration 106: tool calls executadas neste turno
-- ([{name,args,result}]) — dá ao juiz (conversationJudge.ts) visibilidade
-- para não marcar dado tool-grounded como alucinação. NULL para turnos
-- anteriores ao deploy da 106, nunca [] retroativo.
CREATE TABLE IF NOT EXISTS public.agent_token_usage (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id         uuid        REFERENCES public.customers(id),
  model             text        NOT NULL,
  prompt_tokens      integer     NOT NULL,
  completion_tokens  integer     NOT NULL,
  latency_ms        integer,
  rounds             integer,
  evaluation_pending boolean     NOT NULL DEFAULT true,
  seq                integer,
  tool_trace         jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Índice parcial: a task `agent:evaluate` lê apenas os pendentes, do mais antigo
-- para o mais novo. Mantém os já avaliados fora do scan (migration 097).
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_pending_created_at
  ON public.agent_token_usage (created_at ASC)
  WHERE evaluation_pending = true;

-- Turnos "pesados" (rounds = MAX_AGENT_ROUNDS) no dashboard (migration 097).
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_rounds
  ON public.agent_token_usage (rounds)
  WHERE rounds IS NOT NULL;

-- agent_test_run / agent_evaluation (migration 105): avaliador unificado por
-- window/conversa — substitui agente_avaliacao_turnos (098, avaliação por par
-- isolado; removida na 105). Dois gatilhos escrevem na mesma tabela: a task
-- agendada `agent:evaluate` (source='producao') e o runner do laboratório sob
-- demanda (source='laboratorio', agrupado por agent_test_run). O dashboard lê
-- por rota de API com service role — nunca pelo client autenticado do navegador.
CREATE TABLE IF NOT EXISTS public.agent_test_run (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status        text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'done', 'failed')),
  score         smallint    CHECK (score BETWEEN 0 AND 100),
  error          text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

-- Só 1 corrida `running` por vez (mesmo padrão de store_single_row_idx, 102).
CREATE UNIQUE INDEX IF NOT EXISTS agent_test_run_unique_active
  ON public.agent_test_run ((true)) WHERE status = 'running';

CREATE TABLE IF NOT EXISTS public.agent_evaluation (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source           text        NOT NULL CHECK (source IN ('producao', 'laboratorio')),
  run_id           uuid        REFERENCES public.agent_test_run(id) ON DELETE CASCADE,
  persona          text,
  usage_id           uuid        REFERENCES public.agent_token_usage(id) ON DELETE CASCADE,
  customer_id       uuid        REFERENCES public.customers(id),
  evaluator_model text        NOT NULL,
  eval_window      jsonb       NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'done', 'judge_failed', 'failed')),
  verdict        text        CHECK (verdict IN ('verde', 'amarelo', 'vermelho')),
  findings          jsonb,
  evaluation_tokens integer,
  evaluated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agent_evaluation_source_chk CHECK (
    (source = 'laboratorio' AND run_id IS NOT NULL AND persona IS NOT NULL AND usage_id IS NULL)
    OR
    (source = 'producao' AND usage_id IS NOT NULL AND run_id IS NULL AND persona IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_evaluation_evaluated_at
  ON public.agent_evaluation (evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_evaluation_source_evaluated_at
  ON public.agent_evaluation (source, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_evaluation_run_id
  ON public.agent_evaluation (run_id);

CREATE INDEX IF NOT EXISTS idx_agent_evaluation_usage_id
  ON public.agent_evaluation (usage_id);

CREATE INDEX IF NOT EXISTS idx_agent_evaluation_customer_id
  ON public.agent_evaluation (customer_id, evaluated_at DESC);

-- 3.23 ingredients (migration 111) — matéria-prima com ciclo de vida próprio
CREATE TABLE IF NOT EXISTS public.ingredients (
  id             uuid                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text                     NOT NULL,
  unit public.unit_enum NOT NULL DEFAULT 'unidade',
  current_stock  numeric                  NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock numeric,
  active          boolean                  NOT NULL DEFAULT true,
  created_at      timestamptz              NOT NULL DEFAULT now(),
  updated_at  timestamptz              NOT NULL DEFAULT now()
);

-- 3.24 product_ingredients (migration 111) — receita/BOM: consumo de insumo por produto
CREATE TABLE IF NOT EXISTS public.product_ingredients (
  product_id             uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id              uuid    NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_per_unit numeric NOT NULL CHECK (quantity_per_unit > 0),
  PRIMARY KEY (product_id, ingredient_id)
);

-- 3.25 stock_movements (migration 111) — trilha de auditoria e ledger de estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type  text        NOT NULL CHECK (entity_type IN ('produto', 'insumo')),
  entity_id    uuid        NOT NULL,
  movement_type text        NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste', 'venda', 'cancelamento')),
  quantity     numeric     NOT NULL,
  reason         text,
  order_id      uuid        REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3.26 customer_conversation_summary (migration 117) — resumo denormalizado da
-- inbox do Chat (→ customers). Uma linha por cliente, mantida por trigger em
-- whatsapp_conversations (seção 8) — nunca um SELECT agregando a tabela inteira
-- na leitura.
CREATE TABLE IF NOT EXISTS public.customer_conversation_summary (
  customer_id           uuid        PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  last_message      text,
  last_message_at   timestamptz,
  last_message_role text,
  last_message_actor text,
  -- 123: canal da última mensagem (whatsapp | web | instagram | telegram |
  -- custom) — escolhe o ícone da inbox sem escanear whatsapp_conversations.
  last_message_channel text,
  unread_count            integer     NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_conversation_summary IS
'Resumo denormalizado por cliente da inbox do Chat (última mensagem + não lidas), mantido por trigger em whatsapp_conversas. Fonte de ordenação e contagem da inbox — nunca escaneia whatsapp_conversas inteira na leitura.';
COMMENT ON COLUMN public.customer_conversation_summary.unread_count IS
'Mensagens do cliente ainda não vistas por um humano. Zera quando ator = humano_painel/humano_celular grava uma linha, ou via POST .../read (abrir a conversa sem responder). Resposta do agente IA sozinha não zera.';
COMMENT ON COLUMN public.customer_conversation_summary.last_message_channel IS
'Canal da última mensagem (whatsapp | web | instagram | telegram | custom) — usado pelo ícone de canal da inbox. NULL = linha anterior à migration 123, cai no fallback "whatsapp" na leitura.';

-- 3.27 agent_quick_responses (migrations 120 + 121) — regras determinísticas
-- (trigger_type + customer_statuses/kanban_stage_key opcionais → reply_text)
-- que respondem SEM chamar o model, configuráveis pelo lojista em
-- /admin/settings/respostas-rapidas.
--
-- Nome da tabela e colunas em inglês por decisão explícita do usuário
-- (2026-08-18) — mesmo o schema do projeto sendo majoritariamente PT-BR,
-- identificadores NOVOS (tabelas, colunas, funções) devem ser sempre em
-- inglês daqui em diante.
--
-- `trigger_type text` SEM CHECK de enumeração de propósito: cada gatilho novo
-- deve custar só código (matcher + opção no Zod da rota de escrita), nunca
-- uma migration. Vocabulário validado só na camada Zod. Valor desconhecido
-- nunca bate (defensivo em quickResponse.ts), nunca quebra o pipeline.
CREATE TABLE IF NOT EXISTS public.agent_quick_responses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL CHECK (name <> ''),
  trigger_type      text        NOT NULL,
  keywords          text[],
  customer_statuses public.customer_status_enum[],
  -- 121: gatilho outbound — FK de verdade pra kanban_column.key (Kanban
  -- dinâmico desde a migration 015). ON DELETE SET NULL: coluna excluída
  -- deixa a regra inerte, nunca trava a exclusão.
  kanban_stage_key  text        REFERENCES public.kanban_column(key) ON DELETE SET NULL,
  reply_text        text        NOT NULL CHECK (reply_text <> ''),
  active            boolean     NOT NULL DEFAULT true,
  sort_order        integer     NOT NULL,
  trigger_count     integer     NOT NULL DEFAULT 0 CHECK (trigger_count >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agent_quick_responses IS
'Regras de resposta automática do agente IA (trigger_type + customer_statuses/kanban_stage_key opcionais → reply_text), sem chamar o modelo. Distinta de ChatComposerQuickReplies.vue (atalho de digitação do atendente humano).';
COMMENT ON COLUMN public.agent_quick_responses.trigger_type IS
'Sem CHECK de propósito — vocabulário validado só no Zod da rota de escrita. Hoje: ''greeting'' | ''first_message'' | ''keyword'' | ''kanban_stage''. Valor desconhecido nunca bate (defensivo em quickResponse.ts), nunca quebra o pipeline.';
COMMENT ON COLUMN public.agent_quick_responses.keywords IS
'Só usado quando trigger_type=''keyword''. Substring, normalizado via deaccent() (server/utils/agent/guardrails.ts) — mesmo espírito de transbordoHeuristic.ts, sem duplicar a normalização.';
COMMENT ON COLUMN public.agent_quick_responses.customer_statuses IS
'NULL/vazio = qualquer status do cliente. Preenchido = a regra só dispara para customers.status IN (...). Valores do enum (Novo/Ocasional/...) continuam em PT-BR por serem dado de negócio, não identificador — fora do escopo desta renomeação.';
COMMENT ON COLUMN public.agent_quick_responses.kanban_stage_key IS
'Só usado quando trigger_type=''kanban_stage''. Disparado por server/api/admin/orders/[id]/status.put.ts quando o staff move um pedido de coluna — diferente dos demais gatilhos (todos reagem a mensagem inbound do cliente), este é outbound.';
COMMENT ON COLUMN public.agent_quick_responses.trigger_count IS
'Telemetria de uso (nunca lida por decisão de negócio) — incrementada atomicamente via increment_agent_quick_response_usage(), fire-and-forget no consumer.';

-- ─── 4. FUNÇÕES ───────────────────────────────────────────────────────────────

-- 4.1 update_updated_at_column — trigger utilitário
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4.2 RBAC helpers — SECURITY DEFINER obrigatório para evitar recursão RLS na
--     tabela users (as políticas de users chamam has_role/is_staff, que
--     precisam ler users sem passar pelo RLS — de outra forma entrariam em loop).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role_enum
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.active = true
      AND u.role IN ('atendente', 'producao', 'gerente', 'administrador', 'proprietario')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(roles public.user_role_enum[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.active = true
      AND u.role = ANY(roles)
  );
$$;

-- 4.3 handle_new_auth_user — cria perfil em public.users ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role_enum, 'atendente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4.4 freeze_product_info — congela name/preço do produto no momento do pedido
CREATE OR REPLACE FUNCTION public.freeze_product_info()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_name  text;
  v_price numeric;
BEGIN
  -- Preço vigente = promocional quando definido, senão o preço de venda.
  SELECT p.name, COALESCE(p.promo_price, p.sale_price)
    INTO v_name, v_price
    FROM public.products p
   WHERE p.id = NEW.product_id;

  NEW.frozen_product_name   := v_name;
  NEW.frozen_unit_price := v_price;
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
  -- Disparado por order_item_options: recalcula o item pai
  IF TG_TABLE_NAME = 'itens_pedido_opcoes' THEN
    SELECT COALESCE(SUM(frozen_price_delta), 0) INTO v_extras
    FROM public.order_item_options
    WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id);

    SELECT frozen_unit_price, quantity INTO v_item
    FROM public.order_items
    WHERE id = COALESCE(NEW.order_item_id, OLD.order_item_id);

    UPDATE public.order_items
    SET subtotal = (COALESCE(v_item.frozen_unit_price, 0) + v_extras)
                  * COALESCE(v_item.quantity, 0)
    WHERE id = COALESCE(NEW.order_item_id, OLD.order_item_id);

    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Disparado por order_items (INSERT/UPDATE)
  SELECT COALESCE(SUM(frozen_price_delta), 0) INTO v_extras
  FROM public.order_item_options
  WHERE order_item_id = NEW.id;

  NEW.subtotal := (COALESCE(NEW.frozen_unit_price, 0) + v_extras)
                  * COALESCE(NEW.quantity, 0);
  RETURN NEW;
END;
$$;

-- 4.6 recalculate_order_subtotal — atualiza subtotal_amount do pedido
CREATE OR REPLACE FUNCTION public.recalculate_order_subtotal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_order_id uuid;
  v_subtotal  numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  UPDATE public.orders
  SET subtotal_amount = v_subtotal
  WHERE id = v_order_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- 4.7 calculate_purchase_frequency — classifica frequência de compra do cliente
CREATE OR REPLACE FUNCTION public.calculate_purchase_frequency(p_customer_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_total_orders int;
  v_active_months   numeric;
  v_freq          numeric;
BEGIN
  SELECT
    total_orders,
    GREATEST(EXTRACT(EPOCH FROM (now() - customer_since)) / 2592000, 1)
  INTO v_total_orders, v_active_months
  FROM public.customers WHERE id = p_customer_id;

  IF v_total_orders = 0 THEN RETURN 'Novo'; END IF;

  v_freq := v_total_orders / v_active_months;

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
    -- Flag-driven (sem key hardcoded): a coluna de destino é que define o papel.
    IF EXISTS (SELECT 1 FROM public.kanban_column WHERE key = NEW.status AND is_delivered) THEN
      UPDATE public.customers
      SET total_orders          = total_orders + 1,
          total_amount_spent  = total_amount_spent + NEW.total_amount,
          last_order_at       = now(),
          purchase_frequency      = public.calculate_purchase_frequency(NEW.customer_id)
      WHERE id = NEW.customer_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.kanban_column WHERE key = NEW.status AND is_cancelled) THEN
      UPDATE public.customers
      SET total_cancellations = total_cancellations + 1
      WHERE id = NEW.customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4.8b increment_coupon_usage — incremento atômico de uso
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.coupons SET current_uses = current_uses + 1 WHERE id = p_coupon_id;
$$;

-- 4.8c claim_coupon_atomic — valida E incrementa em um único UPDATE (migration 056).
--      Elimina a race condition TOCTOU de dois checkouts simultâneos com o mesmo cupom.
--      Retorna zero linhas quando o cupom é inválido/esgotado. Único chamador: BFF.
CREATE OR REPLACE FUNCTION public.claim_coupon_atomic(p_code text, p_subtotal numeric)
RETURNS TABLE(cupom_id uuid, desconto numeric)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE code  = upper(p_code)
    AND active   = true
    AND (max_uses  IS NULL OR current_uses < max_uses)
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date    IS NULL OR end_date    >= now())
    AND p_subtotal >= minimum_amount
  RETURNING
    id AS cupom_id,
    CASE discount_type
      WHEN 'percentual' THEN round(p_subtotal * amount / 100.0, 2)
      ELSE least(amount, p_subtotal)
    END AS desconto;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_coupon_atomic(text, numeric) FROM PUBLIC, anon, authenticated;

-- 4.8d decrement_coupon_usage — rollback do uso quando o pedido falha após o claim (migration 056).
--      Best-effort: não rebaixa abaixo de 0.
CREATE OR REPLACE FUNCTION public.decrement_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.coupons SET current_uses = GREATEST(current_uses - 1, 0) WHERE id = p_coupon_id;
$$;
REVOKE EXECUTE ON FUNCTION public.decrement_coupon_usage(uuid) FROM PUBLIC, anon, authenticated;

-- 4.9 log_order_status_change — registra histórico de status e define delivered_at
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- delivered_at derivado do papel is_delivered da coluna (sem key hardcoded).
    IF EXISTS (SELECT 1 FROM public.kanban_column WHERE key = NEW.status AND is_delivered) THEN
      IF NEW.delivered_at IS NULL THEN
        NEW.delivered_at := now();
      END IF;
    ELSIF OLD.delivered_at IS NOT NULL THEN
      -- Pedido revertido (ex.: cancelado após entregue) — limpa timestamp
      NEW.delivered_at := NULL;
    END IF;

    INSERT INTO public.order_status_history (
      order_id, previous_status, new_status, changed_by, source
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
  UPDATE public.sessions
  SET status = 'expirada'
  WHERE status = 'ativa'
    AND expires_at <= now();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  -- Purga o carrinho-resíduo de toda sessão que não está mais active.
  DELETE FROM public.cart_items ci
  USING public.sessions s
  WHERE ci.session_id = s.id
    AND s.status <> 'ativa';

  RETURN QUERY
  SELECT affected_rows AS total_expired, now() AS execution_time;
END;
$$;

-- 4.11 is_within_delivery_radius — Haversine pura (sem PostGIS)
--      SECURITY INVOKER: store tem política "Public read available store" (USING true)
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
          POWER(SIN((RADIANS(clat::double precision) - RADIANS(l.origin_latitude::double precision)) / 2), 2) +
          COS(RADIANS(l.origin_latitude::double precision)) *
          COS(RADIANS(clat::double precision)) *
          POWER(SIN((RADIANS(clng::double precision) - RADIANS(l.origin_longitude::double precision)) / 2), 2)
        ))
        <= l.service_radius_km::double precision
      FROM public.store l
      WHERE l.origin_latitude IS NOT NULL
        AND l.origin_longitude IS NOT NULL
        AND l.service_radius_km IS NOT NULL
      LIMIT 1
    ),
    -- Retorna true quando a store ainda não configurou coordenadas (instalação nova)
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
  total_orders  bigint,
  average_ticket   numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_today  date        := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_start timestamptz := COALESCE(p_date_start, v_today) AT TIME ZONE 'America/Sao_Paulo';
  v_end   timestamptz := (COALESCE(p_date_end, v_today) + interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.total_amount), 0)::numeric,
    COUNT(*)::bigint,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(p.total_amount), 0) / COUNT(*)
         ELSE 0 END::numeric
  FROM public.orders p
  JOIN public.kanban_column k
    ON k.key = p.status AND k.is_revenue_trigger = true
  -- Data do faturamento = quando o pedido ENTROU na coluna de receita atual.
  -- Generaliza para QUALQUER status escolhido (não usa delivered_at, que só
  -- existe para 'entregue'). Para 'entregue' o amount coincide com delivered_at.
  -- COALESCE cobre pedido criado direto no status (trigger só loga em UPDATE).
  CROSS JOIN LATERAL (
    SELECT COALESCE(max(h.created_at), p.created_at) AS entrou_em
    FROM public.order_status_history h
    WHERE h.order_id = p.id
      AND h.new_status = p.status
  ) e
  WHERE e.entrou_em >= v_start
    AND e.entrou_em  < v_end;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics(date, date) IS
'Faturamento, nº de pedidos e ticket médio para [p_date_start, p_date_end] em America/Sao_Paulo. Padrão: dia atual. Soma pedidos cujo status atual tem is_revenue_trigger=true, datados por quando entraram nesse status (via pedido_status_historico). Conversão saiu daqui: agora derivada do funil (visitas→pedidos).';

-- 4.13 get_dashboard_counts — contadores de cancelados, abertos, customers, leads, products
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
    (SELECT COUNT(*) FROM public.orders p
     JOIN public.kanban_column k ON k.key = p.status
     WHERE k.is_cancelled = true
       AND p.created_at >= v_start AND p.created_at < v_end)::bigint,

    (SELECT COUNT(*) FROM public.orders p
     JOIN public.kanban_column k ON k.key = p.status
     WHERE k.is_open = true
       AND p.created_at >= v_start AND p.created_at < v_end)::bigint,

    (SELECT COUNT(*) FROM public.customers c
     WHERE c.is_guest = false
       AND c.customer_since >= v_start AND c.customer_since < v_end)::bigint,

    (SELECT COUNT(*) FROM public.customers c WHERE c.is_guest = true)::bigint,

    (SELECT COUNT(*) FROM public.products pr WHERE pr.available = true)::bigint;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_counts(date, date) IS
'Contadores auxiliares para [p_date_start, p_date_end] em America/Sao_Paulo. Usa is_cancelled/is_open — sem status hardcoded.';

-- 4.14 get_top_products — top N products por quantity vendida no período
CREATE OR REPLACE FUNCTION public.get_top_products(
  p_date_start date,
  p_date_end   date,
  p_limit      int DEFAULT 5
)
RETURNS TABLE (product_id uuid, name text, qtde bigint)
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
    ip.product_id,
    pr.name::text,
    SUM(ip.quantity)::bigint AS qtde
  FROM public.order_items ip
  JOIN public.orders        pe ON pe.id   = ip.order_id
  JOIN public.kanban_column  k  ON k.key = pe.status
  JOIN public.products        pr ON pr.id  = ip.product_id
  WHERE pe.created_at >= v_start
    AND pe.created_at  < v_end
    AND k.is_cancelled = false
  GROUP BY ip.product_id, pr.name
  ORDER BY qtde DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_top_products(date, date, int) IS
'Top N produtos por quantidade no período. Exclui pedidos is_cancelled.';

-- 4.15 get_top_pages — top páginas visitadas (eventos page_view)
CREATE OR REPLACE FUNCTION public.get_top_pages(p_hours int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (pagina text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT (metadata->>'pagina') AS pagina, COUNT(*)::bigint AS total
  FROM public.tracking_events
  WHERE type = 'page_view'
    AND created_at >= now() - make_interval(hours => p_hours)
    AND metadata ? 'pagina'
  GROUP BY metadata->>'pagina'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- 4.16 get_top_clicks — top elementos clicados (eventos click)
CREATE OR REPLACE FUNCTION public.get_top_clicks(p_hours int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (rotulo text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT (metadata->>'rotulo') AS rotulo, COUNT(*)::bigint AS total
  FROM public.tracking_events
  WHERE type = 'click'
    AND created_at >= now() - make_interval(hours => p_hours)
    AND metadata ? 'rotulo'
  GROUP BY metadata->>'rotulo'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

-- 4.17 get_conversion_funnel — etapas web do funil (page_view → add_to_cart →
--      checkout_iniciado) por PERÍODO. A etapa final de orders reais é anexada
--      no frontend via total_orders (mesma base do faturamento — DRY),
--      reconciliando funil e card de faturamento. Ver migration 076.
CREATE OR REPLACE FUNCTION public.get_conversion_funnel(
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
    SELECT e.type
    FROM public.tracking_events e, bounds b
    WHERE e.created_at >= b.v_start AND e.created_at < b.v_end
      AND e.type IN ('page_view', 'add_to_cart', 'checkout_iniciado')
  )
  SELECT etapa, total FROM (
    SELECT 1 AS ord, 'page_view'::text        AS etapa, COUNT(*) FILTER (WHERE type = 'page_view')::bigint        AS total FROM ev
    UNION ALL
    SELECT 2,        'add_to_cart',                     COUNT(*) FILTER (WHERE type = 'add_to_cart')::bigint               FROM ev
    UNION ALL
    SELECT 3,        'checkout_iniciado',               COUNT(*) FILTER (WHERE type = 'checkout_iniciado')::bigint         FROM ev
  ) s
  ORDER BY ord;
$$;

-- 4.18 get_top_categories — top categories por visualizações (eventos categoria_view)
CREATE OR REPLACE FUNCTION public.get_top_categories(p_hours int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (categoria_nome text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT (metadata->>'nome') AS categoria_nome, COUNT(*)::bigint AS total
  FROM public.tracking_events
  WHERE type = 'categoria_view'
    AND created_at >= now() - make_interval(hours => p_hours)
    AND metadata ? 'nome'
  GROUP BY metadata->>'nome'
  ORDER BY total DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_top_categories(int, int) IS
'Top categorias navegadas no catálogo nas últimas N horas, via eventos categoria_view.';

-- 4.19 get_top_clicked_products — top products mais clicados/visualizados
CREATE OR REPLACE FUNCTION public.get_top_clicked_products(p_hours int DEFAULT 24, p_limit int DEFAULT 10)
RETURNS TABLE (product_id uuid, name text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    e.entity_id                         AS product_id,
    COALESCE(p.name, 'Produto removido')  AS name,
    COUNT(*)::bigint                      AS total
  FROM public.tracking_events e
  LEFT JOIN public.products p ON p.id = e.entity_id
  WHERE e.type = 'produto_click'
    AND e.entity = 'produto'
    AND e.entity_id IS NOT NULL
    AND e.created_at >= now() - make_interval(hours => p_hours)
  GROUP BY e.entity_id, p.name
  ORDER BY total DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_top_clicked_products(int, int) IS
'Top produtos mais visualizados/clicados nas últimas N horas, via eventos produto_click.';

-- 4.20 set_revenue_status — define qual coluna kanban dispara faturamento (atômico)
--      SECURITY INVOKER + verificação explícita de papel (fail-fast)
CREATE OR REPLACE FUNCTION public.set_revenue_status(p_key text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.kanban_column WHERE key = p_key) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_key;
  END IF;

  -- Swap em dois passos (ver migration 075): um UPDATE de linha única sobre 2
  -- linhas pode transitar por 2 linhas is_revenue_trigger=true simultâneas e
  -- violar o índice único parcial não-adiável kanban_column_uniq_revenue_trigger
  -- (23505 → HTTP 409). Zerar todas antes de ligar a escolhida elimina o state
  -- transitório. Ambos os UPDATEs têm WHERE (safeupdate ok). Corpo é atômico.
  UPDATE public.kanban_column
  SET is_revenue_trigger = false
  WHERE is_revenue_trigger;

  UPDATE public.kanban_column
  SET is_revenue_trigger = true
  WHERE key = p_key;
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

-- 4.23 calculate_shipping_by_distance — frete por faixa de km (migration 030)
--      Retorna NULL se nenhuma regra active englobar a distância; o caller
--      (app) usa store.default_delivery_fee como fallback.
CREATE OR REPLACE FUNCTION public.calculate_shipping_by_distance(p_distance_km numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_amount numeric;
BEGIN
  SELECT shipping_fee INTO v_amount
  FROM public.shipping_distance_rules
  WHERE active = true
    AND p_distance_km >= min_distance_km
    AND p_distance_km <  max_distance_km
  ORDER BY sort_order ASC
  LIMIT 1;

  RETURN v_amount;
END;
$$;

-- 4.23b catalog_products_page — página do catálogo em sort_order pseudo-aleatória
--   por KEYSET (random_rank, id) com rotação por pivot (migration 061), OU em
--   ordem numérica determinística por products.number (migration 128) —
--   o modo é resolvido por categories.sort_mode dentro da função.
--   O(log n) por página: escala para 10k+ sem OFFSET nem count(*). Retorna só
--   campos públicos (nunca cost_price/profit_margin) + tem_opcoes inline.
-- Defaults (migration 083): o corpo já trata NULL em todos estes parâmetros
-- ("IS NULL OR ..."); sem DEFAULT eles ficavam obrigatórios na assinatura,
-- embora a primeira página (sem cursor) sempre os envie como null.
CREATE OR REPLACE FUNCTION public.catalog_products_page(
  p_pivot         double precision,
  p_cursor_rank   double precision DEFAULT NULL,
  p_cursor_id     uuid             DEFAULT NULL,
  p_wrapped       boolean          DEFAULT false,
  p_limit         integer          DEFAULT 24,
  p_category     uuid             DEFAULT NULL,
  p_cursor_number integer          DEFAULT NULL
)
RETURNS TABLE (
  id                    uuid,
  category_id          uuid,
  name                  text,
  description             text,
  photo_url              text,
  images               text[],
  sale_price           numeric,
  promo_price     numeric,
  unit        public.unit_enum,
  allows_fractional_sale boolean,
  current_stock         numeric,
  available            boolean,
  created_at             timestamptz,
  tem_opcoes            boolean,
  product_type          text,
  preorder_config       jsonb,
  number                integer,
  sort_mode             text,
  random_rank        double precision,
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
  v_mode text;
  v_null_sentinel constant integer := 1000000;
BEGIN
  -- Resolve o modo de ordenação efetivo (migration 128): pela categoria pedida,
  -- ou pela categoria Principal quando p_category é NULL (aba "Todos" —
  -- is_primary). RLS de "Public read available categories" já filtra
  -- categorias inativas; se a leitura não encontrar nada, cai no fallback
  -- 'random' (comportamento original).
  IF p_category IS NULL THEN
    SELECT c.sort_mode INTO v_mode FROM public.categories c WHERE c.is_primary LIMIT 1;
  ELSE
    SELECT c.sort_mode INTO v_mode FROM public.categories c WHERE c.id = p_category;
  END IF;
  v_mode := coalesce(v_mode, 'random');

  IF v_mode = 'numeric' THEN
    -- Ordem determinística por products.number (NULLS LAST via sentinel maior
    -- que o teto do CHECK products_number_range_check) + id como desempate.
    -- Lista fixa, não "gira" como o modo aleatório — keyset simples basta.
    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'numeric'::text, p.random_rank, false
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND (
          p_cursor_id IS NULL
          OR (coalesce(p.number, v_null_sentinel), p.id) > (coalesce(p_cursor_number, v_null_sentinel), p_cursor_id)
        )
      ORDER BY coalesce(p.number, v_null_sentinel), p.id
      LIMIT v_lim;
    RETURN;
  END IF;

  -- Modo 'random' (default) — lógica original INALTERADA; só acrescenta
  -- p.number e o literal 'random'::text às colunas retornadas.
  IF NOT coalesce(p_wrapped, false) THEN
    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'random'::text, p.random_rank, false
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND p.random_rank >= p_pivot
        AND (p_cursor_rank IS NULL OR (p.random_rank, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.random_rank, p.id
      LIMIT v_lim;

    GET DIAGNOSTICS v_got = ROW_COUNT;
    IF v_got >= v_lim THEN
      RETURN;
    END IF;

    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'random'::text, p.random_rank, true
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND p.random_rank < p_pivot
      ORDER BY p.random_rank, p.id
      LIMIT (v_lim - v_got);
  ELSE
    RETURN QUERY
      SELECT p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
             p.sale_price, p.promo_price, p.unit,
             p.allows_fractional_sale, p.current_stock, p.available, p.created_at,
             EXISTS (SELECT 1 FROM public.product_option_group g WHERE g.product_id = p.id),
             p.product_type, p.preorder_config,
             p.number, 'random'::text, p.random_rank, true
      FROM public.products p
      WHERE p.available
        AND (p_category IS NULL OR p.category_id = p_category)
        AND p.random_rank < p_pivot
        AND (p_cursor_rank IS NULL OR (p.random_rank, p.id) > (p_cursor_rank, p_cursor_id))
      ORDER BY p.random_rank, p.id
      LIMIT v_lim;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.catalog_products_page(double precision, double precision, uuid, boolean, integer, uuid, integer) TO anon, authenticated, service_role;

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
  v_product       record;
  v_cfg           jsonb;
  v_capacity      numeric;
  v_min_qty       numeric;
  v_max_qty       numeric;
  v_min_lead      integer;
  v_max_lead      integer;
  v_used          numeric;
  v_today         date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_dow           text;
  v_hours      jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
  END IF;

  SELECT hours_config INTO v_hours FROM public.store LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_date       := (v_item->>'delivery_date')::date;
    v_qty        := (v_item->>'quantity')::numeric;

    IF v_product_id IS NULL OR v_date IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PAYLOAD' USING ERRCODE = 'check_violation';
    END IF;

    SELECT id, product_type, preorder_config, daily_production_limit, unit,
           COALESCE(promo_price, sale_price) AS unit_price
      INTO v_product
      FROM public.products
     WHERE id = v_product_id;

    IF v_product.id IS NULL OR v_product.product_type <> 'preorder'
       OR v_product.preorder_config IS NULL THEN
      RAISE EXCEPTION 'PREORDER_INVALID_PRODUCT' USING ERRCODE = 'check_violation',
        DETAIL = format('Produto %s não aceita encomenda.', v_product_id);
    END IF;

    v_cfg      := v_product.preorder_config;
    -- Capacidade diária: migration 113 — fonte única com Gestão de Estoque
    -- (products.daily_production_limit), não mais preorder_config JSON.
    v_capacity := v_product.daily_production_limit;
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
    IF v_hours IS NOT NULL AND COALESCE(v_hours->v_dow->>'aberto', 'false') <> 'true' THEN
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
      JOIN public.orders pe ON pe.id = pr.order_id
      JOIN public.kanban_column kc ON kc.key = pe.status
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
      COALESCE(v_product.unit::text, 'unidade'),
      v_cfg || jsonb_build_object('unit_price', v_product.unit_price, 'daily_capacity', v_capacity)
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reserve_preorders(uuid, jsonb) TO service_role;

-- 4.24 calculate_order_totals — total_amount = subtotal + frete - desconto (migration 030)
CREATE OR REPLACE FUNCTION public.calculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.total_amount :=
    COALESCE(NEW.subtotal_amount, 0)
    + COALESCE(NEW.delivery_fee, 0)
    - COALESCE(NEW.discount_applied, 0);
  RETURN NEW;
END;
$$;

-- 4.25 prevent_self_privilege_change — bloqueia escalonamento de privilégio (migration 036)
--   A policy "Self update own profile" permite UPDATE da própria linha em
--   `users` com WITH CHECK (id = auth.uid()). Como `role`/`active` vivem na
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
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.active IS DISTINCT FROM OLD.active)
     AND NOT public.has_role(
       ARRAY['administrador','proprietario']::public.user_role_enum[]
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
--   Os estados de entrega vêm das flags de kanban_column (is_delivery_dispatch =
--   coluna gatilho; is_out_for_delivery = "saiu para entrega"), não de chaves
--   hardcoded. Seleciona um entregador livre com SKIP LOCKED (evita dupla
--   atribuição) e move o pedido para a coluna is_out_for_delivery.
CREATE OR REPLACE FUNCTION public.assign_order_driver(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_driver_id uuid;
  v_delivery_mode text;
  v_status text;
  v_dispatch text;
  v_out text;
BEGIN
  -- Papéis de entrega resolvidos por flag (fonte única da verdade).
  SELECT key INTO v_dispatch FROM public.kanban_column WHERE is_delivery_dispatch LIMIT 1;
  SELECT key INTO v_out      FROM public.kanban_column WHERE is_out_for_delivery  LIMIT 1;
  IF v_dispatch IS NULL OR v_out IS NULL THEN
    RAISE EXCEPTION 'Fluxo de entrega não configurado: defina colunas is_delivery_dispatch e is_out_for_delivery em kanban_coluna.';
  END IF;

  -- Trava o pedido alvo e valida pré-condições (entrega + na coluna de despacho).
  SELECT p.delivery_mode, p.status INTO v_delivery_mode, v_status
  FROM public.orders p
  WHERE p.id = p_order_id
  FOR UPDATE;

  IF v_delivery_mode IS DISTINCT FROM 'entrega' OR v_status IS DISTINCT FROM v_dispatch THEN
    RETURN NULL;
  END IF;

  -- Seleciona um entregador livre (sem pedido na coluna is_out_for_delivery),
  -- travando a linha para evitar escolha concorrente do mesmo entregador.
  SELECT u.id INTO v_driver_id
  FROM public.users u
  WHERE u.role = 'entregador'
    AND u.active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.orders p
      WHERE p.driver_id = u.id AND p.status = v_out
    )
  ORDER BY u.updated_at ASC
  LIMIT 1
  FOR UPDATE OF u SKIP LOCKED;

  IF v_driver_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Marca a source desta transição automática para o histórico (trigger 006).
  PERFORM set_config('app.origem', 'sistema', true);

  UPDATE public.orders
  SET driver_id = v_driver_id,
      assigned_at = now(),
      status = v_out
  WHERE id = p_order_id
    AND driver_id IS NULL
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
  SELECT key INTO v_dispatch FROM public.kanban_column WHERE is_delivery_dispatch LIMIT 1;
  IF v_dispatch IS NULL THEN
    RETURN NULL;
  END IF;

  -- Pedido mais antigo aguardando entregador na coluna de despacho.
  SELECT id INTO v_order_id
  FROM public.orders
  WHERE status = v_dispatch
    AND delivery_mode = 'entrega'
    AND driver_id IS NULL
  ORDER BY created_at ASC
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
CREATE OR REPLACE FUNCTION public.confirm_delivery_inbound(p_order_id uuid, p_whatsapp text)
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

  SELECT key INTO v_out       FROM public.kanban_column WHERE is_out_for_delivery LIMIT 1;
  SELECT key INTO v_delivered FROM public.kanban_column WHERE is_delivered        LIMIT 1;
  IF v_out IS NULL OR v_delivered IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.orders p
    JOIN public.users u ON u.id = p.driver_id
    WHERE p.id = p_order_id
      AND p.status = v_out
      AND regexp_replace(COALESCE(u.whatsapp, ''), '\D', '', 'g') = v_normalized
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.origem', 'integracao', true);

  UPDATE public.orders
  SET status = v_delivered
  WHERE id = p_order_id AND status = v_out;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.confirm_delivery_inbound(uuid, text) IS
'Marca o pedido como entregue validando o whatsapp do entregador atribuído (integração inbound 6.4). Migration 017.';

REVOKE EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_delivery_inbound(uuid, text) TO service_role;

-- 4.29 guard_system_kanban_column — protege colunas de sistema (is_system)
--   BEFORE DELETE: bloqueia exclusão de coluna de sistema (mesmo vazia). Antes,
--   a FK ON DELETE RESTRICT só barrava se houvesse orders — uma coluna crítica
--   momentaneamente vazia podia ser excluída e quebrar a automação em silêncio.
--   BEFORE UPDATE: a key (slug) e a própria flag is_system são imutáveis numa
--   coluna de sistema (renome/desproteção quebrariam FKs e a automação flag-driven).
CREATE OR REPLACE FUNCTION public.guard_system_kanban_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'A coluna de sistema "%" não pode ser excluída.', OLD.label
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  ELSE -- UPDATE
    IF OLD.is_system AND (
      NEW.key IS DISTINCT FROM OLD.key
      OR NEW.is_system = false
      OR NEW.is_entry IS DISTINCT FROM OLD.is_entry
    ) THEN
      RAISE EXCEPTION 'Coluna de sistema "%": a chave, o status de sistema e o flag de entrada são imutáveis.', OLD.label
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.guard_system_kanban_column() IS
'Bloqueia exclusão de colunas de sistema e renome/desproteção da chave/is_sistema/is_entry. Protege a automação flag-driven contra falhas de configuração.';

REVOKE EXECUTE ON FUNCTION public.guard_system_kanban_column() FROM PUBLIC, anon, authenticated;

-- 4.29b set_principal_kanban_column — troca deliberada de qual coluna é a
--       ENTRADA/principal (migration 126). SECURITY DEFINER: é a única forma
--       de contornar guard_system_kanban_column pra esta troca — um UPDATE
--       comum do papel `authenticated` seria barrado por ela mesmo aqui
--       dentro. A checagem de papel gerente+ abaixo é o gate real de
--       autorização, não o SECURITY DEFINER em si.
CREATE OR REPLACE FUNCTION public.set_principal_kanban_column(p_key text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.kanban_column WHERE key = p_key AND visible) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada ou não está visível.', p_key;
  END IF;

  -- Já é a principal — no-op idempotente, sem precisar tocar na guarda.
  IF EXISTS (SELECT 1 FROM public.kanban_column WHERE key = p_key AND is_system AND is_entry) THEN
    RETURN;
  END IF;

  ALTER TABLE public.kanban_column DISABLE TRIGGER trg_guard_system_kanban_column_upd;

  -- Swap em dois passos (mesmo motivo de set_revenue_status, migration 075):
  -- zera a principal atual ANTES de ligar a nova, pra nunca passar por um
  -- estado transitório de duas linhas com is_entry/is_system true e violar
  -- kanban_column_uniq_entry.
  UPDATE public.kanban_column
  SET is_system = false, is_entry = false
  WHERE is_system = true;

  UPDATE public.kanban_column
  SET is_system = true, is_entry = true
  WHERE key = p_key;

  ALTER TABLE public.kanban_column ENABLE TRIGGER trg_guard_system_kanban_column_upd;
END;
$$;

COMMENT ON FUNCTION public.set_principal_kanban_column(text) IS
'Define qual coluna kanban é a ENTRADA/principal (is_system + is_entry) — swap atômico em dois passos, a proteção contra exclusão se move junto pra coluna escolhida. Migration 126.';

REVOKE EXECUTE ON FUNCTION public.set_principal_kanban_column(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_principal_kanban_column(text) TO authenticated, service_role;

-- 4.28 ensure_single_primary_category — mantém no máximo UMA categoria
-- marcada como is_primary (âncora do catálogo). Migration 064.
CREATE OR REPLACE FUNCTION public.ensure_single_primary_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE public.categories
    SET is_primary = FALSE
    WHERE id <> NEW.id AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

-- 4.30 f_unaccent / f_array_to_string — helpers IMMUTABLE p/ o índice GIN de
-- busca (uma função STABLE/VOLATILE não pode indexar; unaccent() é STABLE por
-- depender de configuração de text, então embrulhamos como IMMUTABLE aqui).
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
RETURNS TABLE(id uuid, name text, description text, sale_price numeric, promo_price numeric, unit text, categoria_nome text, tem_opcoes boolean)
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
      p.name,
      p.description,
      p.sale_price,
      p.promo_price,
      p.unit::text,
      c.name AS categoria_nome,
      EXISTS (
        SELECT 1 FROM public.product_option_group pog WHERE pog.product_id = p.id
      ) AS tem_opcoes,
      public.f_unaccent(lower(
        p.name || ' ' ||
        COALESCE(p.description, '') || ' ' ||
        COALESCE(c.name, '') || ' ' ||
        public.f_array_to_string(p.synonyms)
      )) AS haystack,
      public.f_unaccent(lower(p.name)) AS nome_clean,
      public.f_array_to_string(p.synonyms) AS sinonimos_str
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.available = true
  )
  SELECT
    cand.id,
    cand.name,
    cand.description,
    cand.sale_price,
    cand.promo_price,
    cand.unit,
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
    cand.name ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.search_products(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.search_products(text, integer, integer) TO service_role;

-- 4.32 search_admin_products — mesma busca de search_products + filtro por
-- categoria/disponibilidade/product_type, para o painel admin. Migration 071
-- (+ products.number na saída, migration 128, paridade com AdminProductListItem.numero).
CREATE OR REPLACE FUNCTION public.search_admin_products(
  p_term text DEFAULT NULL, p_category_id uuid DEFAULT NULL, p_available boolean DEFAULT NULL,
  p_lim integer DEFAULT 20, p_off integer DEFAULT 0, p_product_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, category_id uuid, name text, description text, photo_url text, images text[],
  cost_price numeric, profit_margin numeric, sale_price numeric, promo_price numeric,
  unit text, allows_fractional_sale boolean, current_stock numeric, available boolean,
  created_at timestamptz, synonyms text[], product_type text, preorder_config jsonb,
  number integer,
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
      p.id, p.category_id, p.name, p.description, p.photo_url, p.images,
      p.cost_price, p.profit_margin, p.sale_price, p.promo_price,
      p.unit::text, p.allows_fractional_sale, p.current_stock, p.available,
      p.created_at, p.synonyms, p.product_type, p.preorder_config::jsonb,
      p.number,
      c.name AS categoria_nome,
      EXISTS (
        SELECT 1 FROM public.product_option_group pog WHERE pog.product_id = p.id
      ) AS tem_opcoes,
      public.f_unaccent(lower(
        p.name || ' ' ||
        COALESCE(p.description, '') || ' ' ||
        COALESCE(c.name, '') || ' ' ||
        public.f_array_to_string(p.synonyms)
      )) AS haystack,
      public.f_unaccent(lower(p.name)) AS nome_clean,
      public.f_array_to_string(p.synonyms) AS sinonimos_str
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE
      (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_available IS NULL OR p.available = p_available)
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
              p.name || ' ' ||
              COALESCE(p.description, '') || ' ' ||
              COALESCE(c.name, '') || ' ' ||
              public.f_array_to_string(p.synonyms)
            )) LIKE '%' || tok || '%'
            OR extensions.word_similarity(tok, public.f_unaccent(lower(
              p.name || ' ' ||
              COALESCE(p.description, '') || ' ' ||
              COALESCE(c.name, '') || ' ' ||
              public.f_array_to_string(p.synonyms)
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
    c.id, c.category_id, c.name, c.description, c.photo_url, c.images,
    c.cost_price, c.profit_margin, c.sale_price, c.promo_price,
    c.unit, c.allows_fractional_sale, c.current_stock, c.available,
    c.created_at, c.synonyms, c.product_type, c.preorder_config,
    c.number,
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
    c.created_at DESC,
    c.name ASC
  LIMIT  GREATEST(1, LEAST(p_lim, 100))
  OFFSET GREATEST(0, p_off);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_admin_products(text, uuid, boolean, integer, integer, text) TO anon, authenticated, service_role;

-- Índice GIN de suporte à busca fuzzy (idx_products_trgm_search — migration 068/070).
CREATE INDEX IF NOT EXISTS idx_products_trgm_search
  ON public.products USING gin (
    f_unaccent(lower(name || ' ' || COALESCE(description, '') || ' ' || f_array_to_string(synonyms))) extensions.gin_trgm_ops
  ) WHERE available;

-- 4.33 create_integration_order — criação atômica de pedido da integração
-- inbound (idempotência + endereço + pedido + itens + fulfillment por-item +
-- reserva de encomenda + conversão de sessão), migrations 073/080/086. Único
-- chamador: server/utils/integration/createIntegrationOrder.ts.
CREATE OR REPLACE FUNCTION public.create_integration_order(
  p_idempotency_key   text,
  p_customer_id        uuid,
  p_delivery_mode      public.delivery_mode_enum,
  p_payment_method   public.payment_method_enum,
  p_status            text,
  p_items             jsonb,
  p_address_id       uuid    DEFAULT NULL,
  p_new_address     jsonb   DEFAULT NULL,
  p_session_id         uuid    DEFAULT NULL,
  p_notes       text    DEFAULT NULL,
  p_operational_note  text    DEFAULT NULL,
  p_discount_applied numeric DEFAULT 0,
  p_delivery_fee     numeric DEFAULT 0,
  p_free_shipping      boolean DEFAULT false,
  p_preorder_items    jsonb   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_inserted    integer;
  v_existing    text;
  v_address_id uuid := p_address_id;
  v_order_id   uuid;
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
        SELECT p.subtotal_amount, p.total_amount INTO v_subtotal, v_total
        FROM public.orders p WHERE p.id = v_existing::uuid;
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

  IF p_new_address IS NOT NULL THEN
    INSERT INTO public.customer_addresses (
      customer_id, street, number, neighborhood, complement, city, state, zip_code, latitude, longitude
    )
    VALUES (
      p_customer_id,
      p_new_address->>'rua',
      p_new_address->>'numero',
      p_new_address->>'bairro',
      p_new_address->>'complemento',
      p_new_address->>'cidade',
      p_new_address->>'estado',
      p_new_address->>'cep',
      (p_new_address->>'latitude')::numeric,
      (p_new_address->>'longitude')::numeric
    )
    RETURNING id INTO v_address_id;
  END IF;

  INSERT INTO public.orders (
    customer_id, session_id, address_id, delivery_mode, payment_method,
    notes, status, operational_note, discount_applied, delivery_fee,
    free_shipping_applied
  )
  VALUES (
    p_customer_id, p_session_id, v_address_id, p_delivery_mode, p_payment_method,
    p_notes, p_status, p_operational_note, COALESCE(p_discount_applied, 0),
    COALESCE(p_delivery_fee, 0), COALESCE(p_free_shipping, false)
  )
  RETURNING id INTO v_order_id;

  -- Fulfillment por-item (Feature 4.1): delivery_mode/address_id no item jsonb
  -- SÓ quando diverge do padrão do carrinho; ausente = NULL = herda o pedido.
  INSERT INTO public.order_items (order_id, product_id, quantity, delivery_mode, address_id)
  SELECT
    v_order_id,
    (item->>'produto_id')::uuid,
    (item->>'quantidade')::numeric,
    NULLIF(item->>'delivery_mode', ''),
    NULLIF(item->>'address_id', '')::uuid
  FROM jsonb_array_elements(p_items) AS item;

  IF p_preorder_items IS NOT NULL
     AND jsonb_typeof(p_preorder_items) = 'array'
     AND jsonb_array_length(p_preorder_items) > 0 THEN
    PERFORM public.reserve_preorders(v_order_id, p_preorder_items);
  END IF;

  -- Gestão de estoque (migration 111): no-op para produto com
  -- stock_control='nenhum' — comportamento anterior preservado.
  PERFORM public.consume_order_stock(v_order_id, p_items);

  IF v_has_key THEN
    UPDATE public.integration_idempotency
    SET status = 'completed', payload = jsonb_build_object('pedido_id', v_order_id)
    WHERE key = p_idempotency_key;
  END IF;

  IF p_session_id IS NOT NULL THEN
    UPDATE public.sessions SET status = 'convertida' WHERE id = p_session_id;
    DELETE FROM public.cart_items WHERE session_id = p_session_id;
  END IF;

  SELECT p.subtotal_amount, p.total_amount INTO v_subtotal, v_total
  FROM public.orders p WHERE p.id = v_order_id;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'pedido_id', v_order_id,
    'subtotal', COALESCE(v_subtotal, 0),
    'total', COALESCE(v_total, 0)
  );
END;
$$;

-- 4.34 whatsapp_buffer_append — upsert atômico do buffer de rajada (migration
-- 087, `p_lid` na 100, key por identidade e `RETURNS text` na 101). Evita a
-- window de corrida de um read-modify-write em `texts` (jsonb) no lado da
-- aplicação quando duas mensagens do mesmo cliente chegam quase simultâneas.
-- Único chamador: server/utils/whatsapp/burstBuffer.ts.
-- Devolve a `key` porque é o ÚNICO escritor da tabela: recalcular a derivação
-- no produtor criaria duas fontes de verdade para a key do claim.
CREATE OR REPLACE FUNCTION public.whatsapp_buffer_append(
  p_phone text,
  p_text    text,
  p_msg_id   text,
  p_lid      text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF p_phone IS NULL AND p_lid IS NULL THEN
    -- Sem identificador nenhum não há turno possível: não dá para reivindicar
    -- nem para responder. Falhar é melhor que gravar linha órfã.
    RAISE EXCEPTION 'whatsapp_buffer_append exige p_phone ou p_lid';
  END IF;

  v_key := COALESCE(p_phone, 'lid:' || p_lid);

  INSERT INTO public.whatsapp_turn_buffer (key, phone, texts, last_message_id, whatsapp_lid)
  VALUES (v_key, p_phone, jsonb_build_array(p_text), p_msg_id, p_lid)
  ON CONFLICT (key) DO UPDATE
  SET texts        = public.whatsapp_turn_buffer.texts || jsonb_build_array(p_text),
      last_message_id = p_msg_id,
      -- Nunca rebaixa para NULL: o append do consumer de mídia só conhece o lid
      -- quando o payload daquela mídia o trouxe, e numa rajada mista text+áudio
      -- ele apagaria o lid gravado pela mensagem de text.
      whatsapp_lid  = COALESCE(p_lid, public.whatsapp_turn_buffer.whatsapp_lid),
      updated_at = now();
  -- `phone` não é atualizado no conflito: é o que deriva a key, e a linha
  -- só conflita quando a key é idêntica.

  RETURN v_key;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_buffer_append(text, text, text, text) TO service_role;

-- 4.35 agent_openai_key_get — única leitura de vault.decrypted_secrets no
-- runtime do agente (migration 088). SECURITY DEFINER: vault.decrypted_secrets
-- não é acessível a service_role por padrão, só ao dono da função.
CREATE OR REPLACE FUNCTION public.agent_openai_key_get()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  SELECT agent_openai_key_id INTO v_key_id FROM public.store LIMIT 1;
  IF v_key_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agent_openai_key_get() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agent_openai_key_get() TO service_role;

-- 4.36 agent_openai_key_set — única escrita em vault.create_secret/update_secret
-- (migration 088, corrigida na 089 e na 090). Cria o segredo na primeira
-- gravação, atualiza in-place nas seguintes; retorna o id para o endpoint
-- confirmar sucesso. Dois detalhes que já custaram um 500 cada:
--   • `vault.create_secret` retorna um escalar uuid — atribuição direta (`:=`),
--     nunca `SELECT ... FROM vault.create_secret(...)` (isso produziria uma
--     coluna chamada `create_secret`, não `id`; bug da 088, fix na 089).
--   • Todo UPDATE precisa de WHERE: a Supabase carrega `pg-safeupdate` no role
--     do PostgREST e aborta UPDATE/DELETE sem WHERE com `21000` (bug da
--     088/089, fix na 090 — mesmo tropeço que `set_revenue_status` teve).
-- A busca por `vault.secrets.name` antes de criar reconcilia o state
-- divergente (coluna NULL + segredo existente), que violaria o UNIQUE do name.
CREATE OR REPLACE FUNCTION public.agent_openai_key_set(p_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_store_id     uuid;
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  SELECT id, agent_openai_key_id
    INTO v_store_id, v_existing_id
    FROM public.store
   LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada — configure a loja antes da chave OpenAI.';
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM vault.secrets WHERE name = 'loja_openai_key';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_key);
    UPDATE public.store SET agent_openai_key_id = v_existing_id WHERE id = v_store_id;
    RETURN v_existing_id;
  END IF;

  v_new_id := vault.create_secret(p_key, 'loja_openai_key');
  UPDATE public.store SET agent_openai_key_id = v_new_id WHERE id = v_store_id;
  RETURN v_new_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agent_openai_key_set(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agent_openai_key_set(text) TO service_role;

-- 4.37 agent_openai_key_delete — revogação (migration 092). Deleta o segredo
-- de fato: revogação que deixa o text cifrado no banco não é revogação.
-- Limpa também a máscara, que é o indicador de "há key" na UI.
CREATE OR REPLACE FUNCTION public.agent_openai_key_delete()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_store_id uuid;
  v_key_id  uuid;
BEGIN
  SELECT id, agent_openai_key_id
    INTO v_store_id, v_key_id
    FROM public.store
   LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'loja_openai_key';
  END IF;

  UPDATE public.store
     SET agent_openai_key_id = NULL,
         agent_openai_key_mask = NULL
   WHERE id = v_store_id;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.agent_openai_key_delete() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.agent_openai_key_delete() TO service_role;

-- 4.38 whatsapp_api_key_get/set/delete — token do provedor de WhatsApp no Vault
-- (migration 093). Espelho exato do trio da key OpenAI acima, com o name de
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
  SELECT whatsapp_api_key_id INTO v_key_id FROM public.store LIMIT 1;
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
  v_store_id     uuid;
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  SELECT id, whatsapp_api_key_id
    INTO v_store_id, v_existing_id
    FROM public.store
   LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada — configure a loja antes do token do provedor de WhatsApp.';
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM vault.secrets WHERE name = 'loja_whatsapp_api_key';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_key);
    UPDATE public.store SET whatsapp_api_key_id = v_existing_id WHERE id = v_store_id;
    RETURN v_existing_id;
  END IF;

  v_new_id := vault.create_secret(p_key, 'loja_whatsapp_api_key');
  UPDATE public.store SET whatsapp_api_key_id = v_new_id WHERE id = v_store_id;
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
  v_store_id uuid;
  v_key_id  uuid;
BEGIN
  SELECT id, whatsapp_api_key_id
    INTO v_store_id, v_key_id
    FROM public.store
   LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'loja_whatsapp_api_key';
  END IF;

  UPDATE public.store
     SET whatsapp_api_key_id = NULL,
         whatsapp_api_key_mask = NULL
   WHERE id = v_store_id;

  IF v_key_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM vault.secrets WHERE id = v_key_id;
  RETURN true;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_api_key_delete() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_api_key_delete() TO service_role;

-- 4.38b webhook_secret_get/set/delete — Bearer e key de assinatura do webhook
-- de saída no Vault (migration 103). Terceiro uso do mesmo padrão (OpenAI 088,
-- provedor de WhatsApp 093), com uma diferença: UMA função por operação,
-- parametrizada pelo type, em vez de seis quase idênticas — os dois segredos
-- têm ciclo de vida igual, e corpo duplicado é como as versões divergem.
--
-- Estes segredos vieram do `.env` para o banco de propósito: com eles em
-- `wrangler secret`, só quem tem acesso ao deploy conseguia apontar a
-- notificação para o sistema da store. Vault (e não coluna de text) porque um
-- Bearer e uma key de HMAC em coluna legível vazam em qualquer dump.
CREATE OR REPLACE FUNCTION public.webhook_secret_name(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE p_type
    WHEN 'token'   THEN 'loja_webhook_token'
    WHEN 'signing' THEN 'loja_webhook_signing_secret'
  END;
$function$;

CREATE OR REPLACE FUNCTION public.webhook_secret_get(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_key_id uuid;
  v_secret text;
BEGIN
  IF public.webhook_secret_name(p_type) IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_type;
  END IF;

  SELECT CASE p_type
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_key_id
    FROM public.store
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

CREATE OR REPLACE FUNCTION public.webhook_secret_set(p_type text, p_amount text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_store_id     uuid;
  v_key_id      uuid;
  v_name        text := public.webhook_secret_name(p_type);
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_type;
  END IF;

  SELECT id,
         CASE p_type
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_store_id, v_key_id
    FROM public.store
   LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma loja cadastrada.';
  END IF;

  IF v_key_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_key_id, p_amount);
    RETURN;
  END IF;

  SELECT id INTO v_existing_id FROM vault.secrets WHERE name = v_name;
  IF v_existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_id, p_amount);
    v_new_id := v_existing_id;
  ELSE
    v_new_id := vault.create_secret(p_amount, v_name);
  END IF;

  IF p_type = 'token' THEN
    UPDATE public.store SET webhook_token_id = v_new_id WHERE id = v_store_id;
  ELSE
    UPDATE public.store SET webhook_signing_secret_id = v_new_id WHERE id = v_store_id;
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.webhook_secret_set(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.webhook_secret_set(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.webhook_secret_delete(p_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'vault'
AS $function$
DECLARE
  v_store_id uuid;
  v_key_id  uuid;
  v_name    text := public.webhook_secret_name(p_type);
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Tipo de segredo de webhook desconhecido: %', p_type;
  END IF;

  SELECT id,
         CASE p_type
           WHEN 'token'   THEN webhook_token_id
           WHEN 'signing' THEN webhook_signing_secret_id
         END
    INTO v_store_id, v_key_id
    FROM public.store
   LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_key_id IS NULL THEN
    SELECT id INTO v_key_id FROM vault.secrets WHERE name = v_name;
  END IF;

  IF p_type = 'token' THEN
    UPDATE public.store SET webhook_token_id = NULL, webhook_token_mask = NULL WHERE id = v_store_id;
  ELSE
    UPDATE public.store SET webhook_signing_secret_id = NULL, webhook_signing_secret_mask = NULL WHERE id = v_store_id;
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

-- 4.39 whatsapp_media_claim — claim atômico da fila de mídia (migration 094,
-- `whatsapp_lid` na 101).
-- Mesmo papel de `whatsapp_turn_buffer`/`claimBurstBuffer`: um único statement
-- com WHERE e RETURNING decide quem processa. Duas entregas concorrentes do
-- mesmo `wamid` (a fila é at-least-once) disputam a mesma linha; a segunda
-- encontra 'processando', não casa o WHERE e recebe zero linhas — no-op, sem
-- pagar a OpenAI duas vezes.
-- É UPDATE, e não o `INSERT ... ON CONFLICT DO UPDATE` esboçado na §4.2, porque
-- a mensagem da fila carrega só o `wamid` (§5.2) e `type`/`media_id` são NOT
-- NULL de posse do produtor, que insere a linha 'pendente' antes de enfileirar:
-- um INSERT de duas colunas violaria NOT NULL (23502) para todo wamid
-- desconhecido, virando error onde se espera no-op.
-- `whatsapp_lid` está no RETURNING desde a 101: é o que faz o turno iniciado por
-- mídia também gravar `customers.whatsapp_lid`. Sem ele a coluna morre no banco.
-- UPDATE com WHERE por regra (`pg-safeupdate` aborta sem ele com `21000`,
-- inclusive em SECURITY DEFINER — incidentes das 038/075 e 090).
-- Único chamador: server/utils/whatsapp/claimMedia.ts.
-- contact_name no RETURNING desde a 107: mesmo reason do whatsapp_lid na 101 —
-- é o que faz o turno iniciado por mídia também chegar com o pushname até
-- `deliverToTurn`/`gateInboundTurn`.
CREATE OR REPLACE FUNCTION public.whatsapp_media_claim(
  p_wamid          text,
  p_max_attempts integer
)
RETURNS TABLE (
  wamid         text,
  phone      text,
  whatsapp_lid  text,
  contact_name  text,
  type          text,
  media_id      text,
  mime_type     text,
  size_bytes integer,
  attempts    integer
)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.whatsapp_media AS m
     SET status        = 'processando',
         attempts    = m.attempts + 1,
         updated_at = now()
   WHERE m.wamid = p_wamid
     AND m.status IN ('pendente','falhou')
     AND m.attempts < p_max_attempts
  RETURNING m.wamid, m.phone, m.whatsapp_lid, m.contact_name, m.type, m.media_id, m.mime_type, m.size_bytes, m.attempts;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_media_claim(text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.whatsapp_media_claim(text, integer) TO service_role;

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
-- Piso de 25 customers: NTILE(5) sobre base menor rotula por posição relativa,
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
    FROM public.customers
   WHERE is_guest IS NOT TRUE
     AND COALESCE(total_orders, 0) > 0
     AND last_order_at IS NOT NULL;

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
      EXTRACT(EPOCH FROM now() - c.last_order_at) / 86400.0 AS days_since,
      COALESCE(c.total_orders, 0)                             AS orders,
      COALESCE(c.total_amount_spent, 0)                     AS spent
    FROM public.customers c
    WHERE c.is_guest IS NOT TRUE
      AND COALESCE(c.total_orders, 0) > 0
      AND c.last_order_at IS NOT NULL
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
-- UMA passada sobre orders: ciclo, ticket, pagamento, entrega e pico saem da
-- mesma CTE. Ciclo é MEDIANA dos 10 gaps mais recentes (média é destruída por
-- uma viagem de 3 meses), em fração de dia via EPOCH/86400 — EXTRACT(DAY)
-- truncaria dois orders no mesmo dia para 0 e inflaria o churn de todo mundo.
CREATE OR REPLACE FUNCTION public.recompute_customer_intelligence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  WITH valid_orders AS (
    -- `archived` NÃO entra aqui de propósito (migration 099): arquivamento é
    -- state de kanban e apagaria o histórico da SKILL 6h depois da entrega.
    -- Cancelado sai porque `delivered_orders` conta compra, não tentativa.
    SELECT p.customer_id, p.created_at, p.total_amount, p.payment_method, p.delivery_mode
      FROM public.orders p
     WHERE p.customer_id IS NOT NULL
       AND p.status <> 'cancelado'
  ),
  gaps AS (
    SELECT
      customer_id,
      created_at,
      EXTRACT(EPOCH FROM created_at
              - LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at)
             ) / 86400.0 AS gap_days
    FROM valid_orders
  ),
  recent_gaps AS (
    SELECT customer_id, gap_days,
           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
      FROM gaps
     WHERE gap_days IS NOT NULL
  ),
  cycles AS (
    -- ::numeric obrigatório (migration 096): `percentile_cont` devolve
    -- `double precision`, e o Postgres NÃO converte implicitamente para numeric
    -- na resolução de `compute_churn_risk(numeric, numeric)` — a chamada falha
    -- com 42883 em tempo de execução, que o CREATE FUNCTION não detecta.
    SELECT customer_id,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY gap_days))::numeric AS median_cycle_days,
           count(*)::int                                                    AS cycle_sample_size
      FROM recent_gaps
     WHERE rn <= 10
     GROUP BY customer_id
  ),
  totals AS (
    SELECT customer_id, count(*)::int AS delivered_orders, avg(total_amount) AS avg_ticket
      FROM valid_orders
     GROUP BY customer_id
  ),
  payment AS (
    SELECT DISTINCT ON (customer_id)
           customer_id, payment_method,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY customer_id) AS share
      FROM valid_orders
     WHERE payment_method IS NOT NULL
     GROUP BY customer_id, payment_method
     ORDER BY customer_id, count(*) DESC
  ),
  delivery AS (
    SELECT DISTINCT ON (customer_id)
           customer_id, delivery_mode,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY customer_id) AS share
      FROM valid_orders
     WHERE delivery_mode IS NOT NULL
     GROUP BY customer_id, delivery_mode
     ORDER BY customer_id, count(*) DESC
  ),
  peak AS (
    SELECT DISTINCT ON (customer_id)
           customer_id,
           EXTRACT(DOW  FROM created_at)::int AS weekday,
           EXTRACT(HOUR FROM created_at)::int AS hour,
           count(*)::numeric / sum(count(*)) OVER (PARTITION BY customer_id) AS share
      FROM valid_orders
     GROUP BY customer_id, EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)
     ORDER BY customer_id, count(*) DESC
  ),
  favorites AS (
    SELECT ranked.customer_id,
           jsonb_agg(jsonb_build_object('name', ranked.name, 'count', ranked.n)
                     ORDER BY ranked.n DESC) FILTER (WHERE ranked.rn <= 3) AS top_products
      FROM (
        SELECT o.customer_id,
               COALESCE(i.frozen_product_name, pr.name) AS name,
               count(*)::int                               AS n,
               ROW_NUMBER() OVER (
                 PARTITION BY o.customer_id ORDER BY count(*) DESC
               )                                           AS rn
          FROM public.order_items i
          JOIN public.orders o        ON o.id  = i.order_id
          LEFT JOIN public.products pr ON pr.id = i.product_id
         WHERE o.customer_id IS NOT NULL
           AND o.status <> 'cancelado'
           AND COALESCE(i.frozen_product_name, pr.name) IS NOT NULL
         GROUP BY o.customer_id, COALESCE(i.frozen_product_name, pr.name)
      ) ranked
     GROUP BY ranked.customer_id
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
      (EXTRACT(EPOCH FROM now() - c.last_order_at) / 86400.0)::numeric,
      cy.median_cycle_days
    ),
    COALESCE(t.delivered_orders, 0),
    t.avg_ticket,
    COALESCE(f.top_products, '[]'::jsonb),
    pm.payment_method, pm.share,
    dl.delivery_mode,    dl.share,
    pk.weekday, pk.hour, pk.share,
    now()
  FROM public.customers c
  LEFT JOIN cycles    cy ON cy.customer_id = c.id
  LEFT JOIN totals    t  ON t.customer_id  = c.id
  LEFT JOIN payment   pm ON pm.customer_id = c.id
  LEFT JOIN delivery  dl ON dl.customer_id = c.id
  LEFT JOIN peak      pk ON pk.customer_id = c.id
  LEFT JOIN favorites f  ON f.customer_id  = c.id
  WHERE c.is_guest IS NOT TRUE
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
    DELETE FROM public.whatsapp_conversations
     WHERE created_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_conversations FROM deleted;

  -- Anonimiza o CONTEÚDO e preserva a linha: `wamid` é PK e key de
  -- idempotência da fila de mídia — apagar reabriria o reprocessamento.
  WITH updated AS (
    UPDATE public.whatsapp_media
       SET text = NULL, error = NULL
     WHERE created_at < now() - interval '30 days'
       AND (text IS NOT NULL OR error IS NOT NULL)
    RETURNING 1
  ) SELECT count(*)::int INTO v_media FROM updated;

  WITH deleted AS (
    DELETE FROM public.whatsapp_received_messages
     WHERE received_at < now() - interval '7 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_inbound FROM deleted;

  WITH deleted AS (
    DELETE FROM public.whatsapp_turn_buffer
     WHERE updated_at < now() - interval '2 days'
    RETURNING 1
  ) SELECT count(*)::int INTO v_buffer FROM deleted;

  WITH deleted AS (
    DELETE FROM public.agent_token_usage
     WHERE created_at < now() - interval '13 months'
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

-- 4.41 consume_order_stock — consumo atômico de estoque e ingredients por pedido (migration 111)
CREATE OR REPLACE FUNCTION public.consume_order_stock(p_order_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_item       jsonb;
  v_product_id uuid;
  v_qty        numeric;
  v_product    record;
  v_used       numeric;
  v_ingredient     record;
  v_today       date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'produto_id')::uuid;
    v_qty        := (v_item->>'quantidade')::numeric;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id, stock_control, current_stock, daily_production_limit
      INTO v_product
      FROM public.products
     WHERE id = v_product_id
     FOR UPDATE;

    IF v_product.id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_product.stock_control = 'contagem' THEN
      IF v_product.current_stock IS NULL OR v_product.current_stock < v_qty THEN
        RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE' USING ERRCODE = 'check_violation',
          DETAIL = format('Produto %s tem %s unidade(s) em estoque, pedido pede %s.',
            v_product_id, COALESCE(v_product.current_stock, 0), v_qty);
      END IF;

      UPDATE public.products SET current_stock = current_stock - v_qty WHERE id = v_product_id;

      INSERT INTO public.stock_movements (entity_type, entity_id, movement_type, quantity, order_id)
      VALUES ('produto', v_product_id, 'venda', -v_qty, p_order_id);

    ELSIF v_product.stock_control = 'producao_diaria' THEN
      SELECT COALESCE(-SUM(quantity), 0) INTO v_used
        FROM public.stock_movements
       WHERE entity_type = 'produto'
         AND entity_id = v_product_id
         AND movement_type IN ('venda', 'cancelamento')
         AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = v_today;

      IF v_product.daily_production_limit IS NULL OR v_used + v_qty > v_product.daily_production_limit THEN
        RAISE EXCEPTION 'PRODUCAO_DIARIA_ESGOTADA' USING ERRCODE = 'check_violation',
          DETAIL = format('Produção de hoje para %s: %s/%s já usado.',
            v_product_id, v_used, COALESCE(v_product.daily_production_limit, 0));
      END IF;

      INSERT INTO public.stock_movements (entity_type, entity_id, movement_type, quantity, order_id)
      VALUES ('produto', v_product_id, 'venda', -v_qty, p_order_id);
    END IF;

    FOR v_ingredient IN
      SELECT pi.ingredient_id, pi.quantity_per_unit, i.current_stock AS estoque_insumo, i.name AS nome_insumo
        FROM public.product_ingredients pi
        JOIN public.ingredients i ON i.id = pi.ingredient_id
       WHERE pi.product_id = v_product_id
       FOR UPDATE OF i
    LOOP
      IF v_ingredient.estoque_insumo < v_ingredient.quantity_per_unit * v_qty THEN
        RAISE EXCEPTION 'INSUMO_INSUFICIENTE' USING ERRCODE = 'check_violation',
          DETAIL = format('Insumo %s: %s em estoque, pedido precisa de %s.',
            v_ingredient.nome_insumo, v_ingredient.estoque_insumo, v_ingredient.quantity_per_unit * v_qty);
      END IF;

      UPDATE public.ingredients
         SET current_stock = current_stock - (v_ingredient.quantity_per_unit * v_qty)
       WHERE id = v_ingredient.ingredient_id;

      INSERT INTO public.stock_movements (entity_type, entity_id, movement_type, quantity, order_id)
      VALUES ('insumo', v_ingredient.ingredient_id, 'venda', -(v_ingredient.quantity_per_unit * v_qty), p_order_id);
    END LOOP;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consume_order_stock(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_order_stock(uuid, jsonb) TO service_role;

-- 4.42 refund_order_stock — compensação de estoque em cancelamento (migration 111)
CREATE OR REPLACE FUNCTION public.refund_order_stock(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_movement record;
BEGIN
  FOR v_movement IN
    SELECT entity_type, entity_id, quantity
      FROM public.stock_movements
     WHERE order_id = p_order_id
       AND movement_type = 'venda'
     ORDER BY created_at
  LOOP
    IF v_movement.entity_type = 'produto' THEN
      UPDATE public.products
         SET current_stock = current_stock - v_movement.quantity
       WHERE id = v_movement.entity_id
         AND stock_control = 'contagem';
    ELSIF v_movement.entity_type = 'insumo' THEN
      UPDATE public.ingredients
         SET current_stock = current_stock - v_movement.quantity
       WHERE id = v_movement.entity_id;
    END IF;

    INSERT INTO public.stock_movements (entity_type, entity_id, movement_type, quantity, order_id)
    VALUES (v_movement.entity_type, v_movement.entity_id, 'cancelamento', -v_movement.quantity, p_order_id);
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refund_order_stock(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refund_order_stock(uuid) TO service_role;

-- 4.43 update_conversation_summary (migration 117) — upsert do resumo a cada
-- mensagem gravada em whatsapp_conversations. SECURITY DEFINER porque o writer
-- real (service_role) não precisa de policy própria nesta tabela.
CREATE OR REPLACE FUNCTION public.update_conversation_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.customer_conversation_summary (
    customer_id, last_message, last_message_at, last_message_role, last_message_actor, last_message_channel, unread_count, updated_at
  ) VALUES (
    NEW.customer_id, NEW.content, NEW.created_at, NEW.role, NEW.actor, NEW.channel,
    CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    last_message      = EXCLUDED.last_message,
    last_message_at   = EXCLUDED.last_message_at,
    last_message_role = EXCLUDED.last_message_role,
    last_message_actor = EXCLUDED.last_message_actor,
    last_message_channel = EXCLUDED.last_message_channel,
    unread_count = CASE
      WHEN NEW.role = 'user' THEN customer_conversation_summary.unread_count + 1
      WHEN NEW.actor IN ('humano_painel', 'humano_celular') THEN 0
      ELSE customer_conversation_summary.unread_count
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_conversation_summary() FROM PUBLIC, anon, authenticated;

-- 4.44 increment_agent_quick_response_usage (migration 120) — contador
-- atômico (evita a mesma race TOCTOU corrigida em claim_coupon_atomic). Só
-- service_role invoca (chamado do consumer da fila).
CREATE OR REPLACE FUNCTION public.increment_agent_quick_response_usage(p_rule_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  UPDATE public.agent_quick_responses
  SET trigger_count = trigger_count + 1
  WHERE id = p_rule_id;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_agent_quick_response_usage(uuid) FROM PUBLIC, anon, authenticated;

-- ─── 5. ÍNDICES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cart_item_options_cart_item
  ON public.cart_item_options (cart_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_entity
  ON public.stock_movements (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_intelligence_churn
  ON public.customer_intelligence (churn_risk, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_session
  ON public.cart_items USING btree (session_id);

-- Papéis semânticos de amount único: no máximo UMA coluna pode carregar cada flag
-- (evita ambiguidade na automação, que resolve o papel via LIMIT 1). is_open fica
-- de fora de propósito — várias colunas podem ser "em aberto".
CREATE UNIQUE INDEX IF NOT EXISTS kanban_column_uniq_entry
  ON public.kanban_column (is_entry) WHERE is_entry;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_column_uniq_revenue_trigger
  ON public.kanban_column (is_revenue_trigger) WHERE is_revenue_trigger;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_column_uniq_cancelled
  ON public.kanban_column (is_cancelled) WHERE is_cancelled;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_column_uniq_delivery_dispatch
  ON public.kanban_column (is_delivery_dispatch) WHERE is_delivery_dispatch;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_column_uniq_out_for_delivery
  ON public.kanban_column (is_out_for_delivery) WHERE is_out_for_delivery;
CREATE UNIQUE INDEX IF NOT EXISTS kanban_column_uniq_delivered
  ON public.kanban_column (is_delivered) WHERE is_delivered;

-- Suporta limpeza periódica das chaves de idempotência vencidas (housekeeping).
CREATE INDEX IF NOT EXISTS integration_idempotency_expires_at_idx
  ON public.integration_idempotency USING btree (expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS customers_whatsapp_phone_key
  ON public.customers USING btree (whatsapp_phone);

-- 091: inclui `seq` para cobrir o desempate da leitura do histórico.
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_created_seq
  ON public.whatsapp_conversations (customer_id, created_at DESC, seq DESC);

-- 094: varredura operacional de mídia por state (pendências e falhas recentes).
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_status
  ON public.whatsapp_media (status, created_at DESC);

-- 031: unicidade parcial do @lid (NULL livre para customers legados).
CREATE UNIQUE INDEX IF NOT EXISTS customers_whatsapp_lid_key
  ON public.customers (whatsapp_lid)
  WHERE whatsapp_lid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_events_created
  ON public.tracking_events USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_events_session
  ON public.tracking_events USING btree (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_events_type
  ON public.tracking_events USING btree (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_item_options_item
  ON public.order_item_options USING btree (order_item_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON public.order_status_history USING btree (order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_out_for_delivery
  ON public.orders USING btree (driver_id)
  WHERE driver_id IS NOT NULL AND status = 'saiu_para_entrega';

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
  ON public.orders USING btree (delivered_at)
  WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_history
  ON public.orders USING btree (archived_at DESC, status)
  WHERE archived = true;

CREATE INDEX IF NOT EXISTS idx_orders_kanban
  ON public.orders USING btree (status, created_at DESC)
  WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_product_option_group_product
  ON public.product_option_group USING btree (product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_option_item_group
  ON public.product_option_item USING btree (group_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_shipping_rules_active
  ON public.shipping_distance_rules USING btree (sort_order)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at_active
  ON public.sessions USING btree (expires_at)
  WHERE status = 'ativa';

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_event_created
  ON public.webhook_outbox USING btree (event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_pending
  ON public.webhook_outbox USING btree (status, next_retry_at)
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

-- Dedupe do echo (migration 116, G6): só um índice único quando o wamid existe de fato.
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_wamid
  ON public.whatsapp_conversations (wamid)
  WHERE wamid IS NOT NULL;

-- Ordenação da inbox por atividade de chat real (migration 117).
CREATE INDEX IF NOT EXISTS idx_customer_conversation_summary_last_message_at
  ON public.customer_conversation_summary (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_quick_responses_active
  ON public.agent_quick_responses (sort_order) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_agent_quick_responses_kanban_stage
  ON public.agent_quick_responses (kanban_stage_key) WHERE active = true AND kanban_stage_key IS NOT NULL;

-- ─── 6. VIEWS ─────────────────────────────────────────────────────────────────
-- (nenhuma view) A antiga `faturamento_diario` foi removida: não era usada por
-- nenhum código e carregava o mesmo acoplamento a delivered_at. As métricas de
-- faturamento vêm da RPC get_dashboard_metrics (seção 4.12).
DROP VIEW IF EXISTS public.faturamento_diario;

-- ─── 7. TRIGGER DE AUTH (auth.users → public.users) ────────────────────────
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

-- categories
DROP TRIGGER IF EXISTS trg_ensure_single_primary_category ON public.categories;
CREATE TRIGGER trg_ensure_single_primary_category
  BEFORE INSERT OR UPDATE OF is_primary ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_category();

-- customers
DROP TRIGGER IF EXISTS update_customers_modtime ON public.customers;
CREATE TRIGGER update_customers_modtime
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- order_items
DROP TRIGGER IF EXISTS trg_freeze_product_info ON public.order_items;
CREATE TRIGGER trg_freeze_product_info
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.freeze_product_info();

DROP TRIGGER IF EXISTS trg_order_items_subtotal ON public.order_items;
CREATE TRIGGER trg_order_items_subtotal
  BEFORE INSERT OR UPDATE OF frozen_unit_price, quantity ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_item_subtotal();

DROP TRIGGER IF EXISTS trg_recalculate_order_subtotal ON public.order_items;
CREATE TRIGGER trg_recalculate_order_subtotal
  AFTER INSERT OR DELETE OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_subtotal();

-- order_item_options
DROP TRIGGER IF EXISTS trg_order_item_options_subtotal ON public.order_item_options;
CREATE TRIGGER trg_order_item_options_subtotal
  AFTER INSERT OR DELETE OR UPDATE ON public.order_item_options
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_item_subtotal();

-- kanban_column
DROP TRIGGER IF EXISTS update_kanban_column_modtime ON public.kanban_column;
CREATE TRIGGER update_kanban_column_modtime
  BEFORE UPDATE ON public.kanban_column
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proteção de colunas de sistema (bloqueia exclusão e renome/desproteção).
DROP TRIGGER IF EXISTS trg_guard_system_kanban_column_del ON public.kanban_column;
CREATE TRIGGER trg_guard_system_kanban_column_del
  BEFORE DELETE ON public.kanban_column
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_kanban_column();

DROP TRIGGER IF EXISTS trg_guard_system_kanban_column_upd ON public.kanban_column;
CREATE TRIGGER trg_guard_system_kanban_column_upd
  BEFORE UPDATE ON public.kanban_column
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_kanban_column();

-- orders
DROP TRIGGER IF EXISTS trg_log_order_status ON public.orders;
CREATE TRIGGER trg_log_order_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS trg_update_client_metrics ON public.orders;
CREATE TRIGGER trg_update_client_metrics
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_client_metrics();

DROP TRIGGER IF EXISTS update_orders_modtime ON public.orders;
CREATE TRIGGER update_orders_modtime
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_calculate_order_totals ON public.orders;
CREATE TRIGGER trg_calculate_order_totals
  BEFORE INSERT OR UPDATE OF subtotal_amount, delivery_fee, discount_applied
  ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.calculate_order_totals();

-- pages (migration 062)
DROP TRIGGER IF EXISTS update_pages_updated_at ON public.pages;
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- shipping_distance_rules
DROP TRIGGER IF EXISTS trg_shipping_rules_updated_at ON public.shipping_distance_rules;
CREATE TRIGGER trg_shipping_rules_updated_at
  BEFORE UPDATE ON public.shipping_distance_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- customer_intelligence (migration 095) — updated_at mantém o name legado
-- porque update_updated_at_column() (migration 003) grava exatamente nessa coluna.
DROP TRIGGER IF EXISTS trg_customer_intelligence_updated_at ON public.customer_intelligence;
CREATE TRIGGER trg_customer_intelligence_updated_at
  BEFORE UPDATE ON public.customer_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- users
DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- users: barra escalonamento de privilégio via self-update (migration 036)
DROP TRIGGER IF EXISTS trg_prevent_self_privilege ON public.users;
CREATE TRIGGER trg_prevent_self_privilege
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privilege_change();

-- whatsapp_conversations (migration 117) — mantém customer_conversation_summary em dia.
DROP TRIGGER IF EXISTS trg_update_conversation_summary ON public.whatsapp_conversations;
CREATE TRIGGER trg_update_conversation_summary
AFTER INSERT ON public.whatsapp_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_summary();

-- Backfill idempotente (migration 117): uma linha por cliente com a mensagem
-- mais recente já existente em whatsapp_conversations. No-op num banco recém
-- resetado (tabela vazia); relevante ao reaplicar este arquivo sobre um banco
-- com histórico. unread_count nasce em 0 — sem marcador de "lido" anterior a
-- reconstruir; o contador passa a ser exato a partir daqui em diante.
INSERT INTO public.customer_conversation_summary (
  customer_id, last_message, last_message_at, last_message_role, last_message_actor, last_message_channel, unread_count, updated_at
)
SELECT DISTINCT ON (wc.customer_id)
  wc.customer_id, wc.content, wc.created_at, wc.role, wc.actor, wc.channel, 0, now()
FROM public.whatsapp_conversations wc
ORDER BY wc.customer_id, wc.created_at DESC, wc.seq DESC
ON CONFLICT (customer_id) DO NOTHING;

-- agent_quick_responses (migration 120)
DROP TRIGGER IF EXISTS update_agent_quick_responses_modtime ON public.agent_quick_responses;
CREATE TRIGGER update_agent_quick_responses_modtime
BEFORE UPDATE ON public.agent_quick_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 9. EVENT TRIGGER (auto-enable RLS em novas tabelas) ──────────────────────
DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

-- ─── 10. HABILITAR RLS ────────────────────────────────────────────────────────
ALTER TABLE public.agent_token_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_column           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorder_blocked_dates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_group     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_item      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_distance_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_outbox          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_queue           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_received_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_media                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_turn_buffer         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_intelligence         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_test_run              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_evaluation              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.related_products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_item_options             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_conversation_summary      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_quick_responses         ENABLE ROW LEVEL SECURITY;

-- agent_test_run / agent_evaluation (migration 105): observabilidade interna
-- de IA — mesmo padrão de RLS que agente_avaliacao_turnos (098) tinha. Só
-- service_role toca — a task agendada e o runner do laboratório escrevem, o
-- dashboard lê por rota de API. Deny explícito para authenticated existe para
-- o dado não vazar caso alguém passe a consultar a tabela pelo client do navegador.
DROP POLICY IF EXISTS "service_role_all_agent_test_run" ON public.agent_test_run;
CREATE POLICY "service_role_all_agent_test_run" ON public.agent_test_run
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "deny_authenticated_agent_test_run" ON public.agent_test_run;
CREATE POLICY "deny_authenticated_agent_test_run" ON public.agent_test_run
  FOR ALL TO authenticated
  USING (false);

DROP POLICY IF EXISTS "service_role_all_agent_evaluation" ON public.agent_evaluation;
CREATE POLICY "service_role_all_agent_evaluation" ON public.agent_evaluation
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "deny_authenticated_agent_evaluation" ON public.agent_evaluation;
CREATE POLICY "deny_authenticated_agent_evaluation" ON public.agent_evaluation
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
DROP POLICY IF EXISTS "Manage coupons (gerente+)" ON public.coupons;
CREATE POLICY "Manage coupons (gerente+)" ON public.coupons
FOR ALL TO authenticated
USING (private.has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
WITH CHECK (private.has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));


-- ── cart_items ────────────────────────────────────────────────────────────────
-- Sem políticas (deny-all para anon/authenticated): acesso exclusivo via
-- endpoints de integração com service_role, que bypassa RLS.

-- ── categories ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Manage categories (gerente+)" ON public.categories;
CREATE POLICY "Manage categories (gerente+)" ON public.categories
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

DROP POLICY IF EXISTS "Public read available categories" ON public.categories;
CREATE POLICY "Public read available categories" ON public.categories
  FOR SELECT TO public USING (active = true);

-- ── customers ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage customers" ON public.customers;
CREATE POLICY "Staff manage customers" ON public.customers
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

DROP POLICY IF EXISTS "Entregador read customer of own orders" ON public.customers;
CREATE POLICY "Entregador read customer of own orders" ON public.customers
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.user_role_enum[])
    AND EXISTS (
      SELECT 1 FROM public.orders pe
      WHERE pe.customer_id = customers.id AND pe.driver_id = auth.uid()
    )
  );

-- ── customer_addresses ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage customer_addresses" ON public.customer_addresses;
CREATE POLICY "Staff manage customer_addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

DROP POLICY IF EXISTS "Entregador read address of own orders" ON public.customer_addresses;
CREATE POLICY "Entregador read address of own orders" ON public.customer_addresses
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.user_role_enum[])
    AND EXISTS (
      SELECT 1 FROM public.orders pe
      WHERE pe.address_id = customer_addresses.id AND pe.driver_id = auth.uid()
    )
  );

-- ── tracking_events ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read tracking_events" ON public.tracking_events;
CREATE POLICY "Staff read tracking_events" ON public.tracking_events
  FOR SELECT TO public USING (private.is_staff());

-- ── order_items ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage order_items" ON public.order_items;
CREATE POLICY "Staff manage order_items" ON public.order_items
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

DROP POLICY IF EXISTS "Entregador read items of own orders" ON public.order_items;
CREATE POLICY "Entregador read items of own orders" ON public.order_items
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.user_role_enum[])
    AND EXISTS (
      SELECT 1 FROM public.orders pe
      WHERE pe.id = order_items.order_id AND pe.driver_id = auth.uid()
    )
  );

-- ── order_item_options ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage order_item_options" ON public.order_item_options;
CREATE POLICY "Staff manage order_item_options" ON public.order_item_options
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

-- ── kanban_column ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read kanban_column" ON public.kanban_column;
CREATE POLICY "Staff read kanban_column" ON public.kanban_column
  FOR SELECT TO public USING (private.is_staff());

DROP POLICY IF EXISTS "Manage kanban_column (gerente+)" ON public.kanban_column;
CREATE POLICY "Manage kanban_column (gerente+)" ON public.kanban_column
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── kit_items ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read kit_items" ON public.kit_items;
CREATE POLICY "Public read kit_items" ON public.kit_items
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_items.kit_id AND k.available = true
  ));

DROP POLICY IF EXISTS "Manage kit_items (gerente+)" ON public.kit_items;
CREATE POLICY "Manage kit_items (gerente+)" ON public.kit_items
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── kits ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read kits" ON public.kits;
CREATE POLICY "Public read kits" ON public.kits
  FOR SELECT TO public USING (available = true);

DROP POLICY IF EXISTS "Manage kits (gerente+)" ON public.kits;
CREATE POLICY "Manage kits (gerente+)" ON public.kits
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── store ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read available store" ON public.store;
CREATE POLICY "Public read available store" ON public.store
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Manage store (gerente+)" ON public.store;
CREATE POLICY "Manage store (gerente+)" ON public.store
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── order_status_history ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read order_status_history" ON public.order_status_history;
CREATE POLICY "Staff read order_status_history" ON public.order_status_history
  FOR SELECT TO public USING (private.is_staff());

-- ── orders ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read orders" ON public.orders;
CREATE POLICY "Staff read orders" ON public.orders
  FOR SELECT TO public USING (private.is_staff());

DROP POLICY IF EXISTS "Staff insert orders" ON public.orders;
CREATE POLICY "Staff insert orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK(has_role(ARRAY['atendente','gerente','administrador','proprietario']::public.user_role_enum[]));

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING     (has_role(ARRAY['atendente','producao','gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['atendente','producao','gerente','administrador','proprietario']::public.user_role_enum[]));

DROP POLICY IF EXISTS "Delete orders (admin+)" ON public.orders;
CREATE POLICY "Delete orders (admin+)" ON public.orders
  FOR DELETE TO authenticated
  USING (has_role(ARRAY['administrador','proprietario']::public.user_role_enum[]));

DROP POLICY IF EXISTS "Entregador read own orders" ON public.orders;
CREATE POLICY "Entregador read own orders" ON public.orders
  FOR SELECT TO public
  USING (
    has_role(ARRAY['entregador']::public.user_role_enum[])
    AND driver_id = auth.uid()
  );

-- ── product_option_group ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read product_option_group" ON public.product_option_group;
CREATE POLICY "Public read product_option_group" ON public.product_option_group
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_option_group.product_id AND p.available = true
  ));

DROP POLICY IF EXISTS "Manage product_option_group (gerente+)" ON public.product_option_group;
CREATE POLICY "Manage product_option_group (gerente+)" ON public.product_option_group
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── product_option_item ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read product_option_item" ON public.product_option_item;
CREATE POLICY "Public read product_option_item" ON public.product_option_item
  FOR SELECT TO public
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM public.product_option_group g
      JOIN public.products p ON p.id = g.product_id
      WHERE g.id = product_option_item.group_id AND p.available = true
    )
  );

DROP POLICY IF EXISTS "Manage product_option_item (gerente+)" ON public.product_option_item;
CREATE POLICY "Manage product_option_item (gerente+)" ON public.product_option_item
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── products ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read available products" ON public.products;
CREATE POLICY "Public read available products" ON public.products
  FOR SELECT TO public USING (available = true);

DROP POLICY IF EXISTS "Staff read products" ON public.products;
CREATE POLICY "Staff read products" ON public.products
  FOR SELECT TO public USING (private.is_staff());

DROP POLICY IF EXISTS "Manage products (gerente+)" ON public.products;
CREATE POLICY "Manage products (gerente+)" ON public.products
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── promotion_products ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read promotion_products" ON public.promotion_products;
CREATE POLICY "Public read promotion_products" ON public.promotion_products
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.promotions p
    WHERE p.id = promotion_products.promotion_id AND p.active = true
  ));

DROP POLICY IF EXISTS "Manage promotion_products (gerente+)" ON public.promotion_products;
CREATE POLICY "Manage promotion_products (gerente+)" ON public.promotion_products
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── promotions ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read promotions" ON public.promotions;
CREATE POLICY "Public read promotions" ON public.promotions
  FOR SELECT TO public USING (active = true);

DROP POLICY IF EXISTS "Manage promotions (gerente+)" ON public.promotions;
CREATE POLICY "Manage promotions (gerente+)" ON public.promotions
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

-- ── shipping_distance_rules ────────────────────────────────────────────────────
-- Leitura pública: /api/calculate-shipping usa serverSupabaseClient (anon role do catálogo)
DROP POLICY IF EXISTS "anon_read_shipping_rules" ON public.shipping_distance_rules;
CREATE POLICY "anon_read_shipping_rules"
  ON public.shipping_distance_rules FOR SELECT
  TO anon, authenticated USING (true);

-- Escrita para admins autenticados: admin/settings usa useSupabaseClient() (JWT do usuário).
-- Proteção real vem do middleware 3.admin-auth.ts — RLS garante que só role authenticated
-- pode escrever; o middleware garante que só admins chegam nessa página.
DROP POLICY IF EXISTS "authenticated_write_shipping_rules" ON public.shipping_distance_rules;
CREATE POLICY "authenticated_write_shipping_rules"
  ON public.shipping_distance_rules FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ── sessions ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read active sessions" ON public.sessions;
CREATE POLICY "Public read active sessions" ON public.sessions
  FOR SELECT TO public
  USING (status = 'ativa' AND expires_at > now());

DROP POLICY IF EXISTS "Staff manage sessions" ON public.sessions;
CREATE POLICY "Staff manage sessions" ON public.sessions
  FOR ALL TO authenticated
  USING     (is_staff())
  WITH CHECK(is_staff());

-- ── users ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Self read own profile" ON public.users;
CREATE POLICY "Self read own profile" ON public.users
  FOR SELECT TO public USING (id = auth.uid());

DROP POLICY IF EXISTS "Self update own profile" ON public.users;
CREATE POLICY "Self update own profile" ON public.users
  FOR UPDATE TO public
  USING     (id = auth.uid())
  WITH CHECK(id = auth.uid());

DROP POLICY IF EXISTS "Staff read all users" ON public.users;
CREATE POLICY "Staff read all users" ON public.users
  FOR SELECT TO authenticated
  USING (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

DROP POLICY IF EXISTS "Admins manage users" ON public.users;
CREATE POLICY "Admins manage users" ON public.users
  FOR ALL TO authenticated
  USING     (has_role(ARRAY['administrador','proprietario']::public.user_role_enum[]))
  WITH CHECK(has_role(ARRAY['administrador','proprietario']::public.user_role_enum[]));

-- ── webhook_outbox ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read webhook_outbox" ON public.webhook_outbox;
CREATE POLICY "Staff read webhook_outbox" ON public.webhook_outbox
  FOR SELECT TO authenticated
  USING (has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]));

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
REVOKE EXECUTE ON FUNCTION public.calculate_purchase_frequency(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                 FROM PUBLIC, anon, authenticated;

-- recalculate_item_subtotal: exclusivo para triggers (SECURITY DEFINER — não expor via RPC)
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_coupon_atomic(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_coupon_usage(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_item_subtotal() FROM PUBLIC, anon, authenticated;

-- cleanup_expired_sessions: apenas service_role (chamada pelo pg_cron)
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_sessions() TO service_role;

-- log_order_status_change: trigger + service_role (não deve ser RPC público)
REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.log_order_status_change() TO authenticated, service_role;

-- RBAC helpers: authenticated + service_role (anon não acessa tabela de usuários)
REVOKE EXECUTE ON FUNCTION public.current_user_role()                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_user_role()                TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff()                         FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_staff()                         TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(public.user_role_enum[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(public.user_role_enum[]) TO authenticated, service_role;

-- is_within_delivery_radius: anon precisa acessar para validar checkout público
REVOKE EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_within_delivery_radius(numeric, numeric) TO anon, authenticated, service_role;

-- calculate_shipping_by_distance: anon precisa acessar para preview de frete no checkout
REVOKE EXECUTE ON FUNCTION public.calculate_shipping_by_distance(numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.calculate_shipping_by_distance(numeric) TO anon, authenticated, service_role;

-- calculate_order_totals: função de trigger interna — sem acesso público direto
REVOKE EXECUTE ON FUNCTION public.calculate_order_totals() FROM PUBLIC;

-- Dashboard RPCs: apenas authenticated (staff)
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date)  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_counts(date, date)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_counts(date, date)   TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_products(date, date, int)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_products(date, date, int)  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_pages(int, int)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_pages(int, int)          TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_clicks(int, int)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_clicks(int, int)          TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_conversion_funnel(date, date)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_conversion_funnel(date, date)    TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_categories(int, int)       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_categories(int, int)       TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_top_clicked_products(int, int)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_clicked_products(int, int)   TO authenticated, service_role;

-- set_revenue_status: authenticated (a função verifica papel gerente+ internamente)
REVOKE EXECUTE ON FUNCTION public.set_revenue_status(text)           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_revenue_status(text)           TO authenticated, service_role;

-- ─── 13. PG_CRON ──────────────────────────────────────────────────────────────
-- Agenda limpeza diária de sessões expiradas às 03h (idempotente via WHERE NOT EXISTS)
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 3 * * *',
  'SELECT public.cleanup_expired_sessions();'
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-sessions'
);

-- `webhook:drain`/`orders:archive` NÃO usam pg_cron — Cloudflare Cron Trigger
-- aciona a Nitro Task diretamente (server/tasks/webhook/drain.ts,
-- server/tasks/orders/archive.ts), sem HTTP intermediário nem job aqui.

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

-- Kanban: apenas 1 coluna obrigatória de sistema ('pendente', rotulada
-- "Novo" — todo pedido nasce nela, de qualquer canal, migration 124).
-- is_system=true SÓ nela: é a única chave obrigatória do fluxo inicial. O
-- usuário cria as demais colunas conforme sua necessidade. is_entry=true
-- (migration 125) é o que a aplicação lê pra saber qual é — nunca a string
-- 'pendente' hardcoded (exceto no cliente anônimo, sem acesso RLS a esta
-- tabela — ver `resolveEntryKanbanStatus.ts`).
INSERT INTO public.kanban_column
  (key, label, color, sort_order, visible, is_revenue_trigger, is_cancelled, is_open,
   is_system, is_entry, is_delivery_dispatch, is_out_for_delivery, is_delivered)
VALUES
  ('pendente',   'Novo',   '#EC4899', 1, true, false, false, true, true, true, false, false, false)
ON CONFLICT (key) DO UPDATE SET
  label                = EXCLUDED.label,
  color                  = EXCLUDED.color,
  sort_order                = EXCLUDED.sort_order,
  visible              = EXCLUDED.visible,
  is_revenue_trigger   = EXCLUDED.is_revenue_trigger,
  is_cancelled         = EXCLUDED.is_cancelled,
  is_open              = EXCLUDED.is_open,
  is_system           = EXCLUDED.is_system,
  is_entry             = EXCLUDED.is_entry,
  is_delivery_dispatch = EXCLUDED.is_delivery_dispatch,
  is_out_for_delivery  = EXCLUDED.is_out_for_delivery,
  is_delivered         = EXCLUDED.is_delivered;

-- Loja: linha inicial vazia para novas instalações (configurar via painel admin)
INSERT INTO public.store (trade_name, default_delivery_fee, allows_pickup, operation_status, account_status)
SELECT 'Minha Loja', 5.00, true, 'automatico', 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.store);

-- Páginas estáticas: Termos de Uso e Política de Privacidade (migration 062)
INSERT INTO public.pages (slug, title, content)
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
--   • calculate_shipping_by_distance como SECURITY INVOKER.
--   • Deny-all explícito em cart_items (acesso só via service_role).

DROP EXTENSION IF EXISTS postgis;

-- Repontar funções dependentes + calcular_frete INVOKER + regras_frete
CREATE OR REPLACE FUNCTION public.set_revenue_status(p_key text)
RETURNS void LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT private.has_role(ARRAY['gerente','administrador','proprietario']::public.user_role_enum[]) THEN
    RAISE EXCEPTION 'Permission denied: papel gerente ou superior exigido.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kanban_column WHERE key = p_key) THEN
    RAISE EXCEPTION 'Coluna kanban "%" não encontrada.', p_key;
  END IF;
  -- Swap em dois passos (ver migration 075): evita o state transitório de 2
  -- linhas is_revenue_trigger=true que viola o índice único parcial não-adiável
  -- kanban_column_uniq_revenue_trigger (23505 → HTTP 409).
  UPDATE public.kanban_column
  SET is_revenue_trigger = false
  WHERE is_revenue_trigger;

  UPDATE public.kanban_column
  SET is_revenue_trigger = true
  WHERE key = p_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.active IS DISTINCT FROM OLD.active)
     AND NOT private.has_role(ARRAY['administrador','proprietario']::public.user_role_enum[]) THEN
    RAISE EXCEPTION 'Alteração do próprio papel/status não é permitida.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_shipping_by_distance(p_distance_km numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_amount numeric;
BEGIN
  SELECT shipping_fee INTO v_amount
  FROM public.shipping_distance_rules
  WHERE active = true AND p_distance_km >= min_distance_km AND p_distance_km < max_distance_km
  ORDER BY sort_order ASC LIMIT 1;
  RETURN v_amount;
END;
$$;

-- Remove a policy permissiva antiga de regras_frete (a nova é recriada abaixo em private.*)
DROP POLICY IF EXISTS "authenticated_write_shipping_rules" ON public.shipping_distance_rules;

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
DROP POLICY IF EXISTS "Manage categories (gerente+)" ON public.categories;
CREATE POLICY "Manage categories (gerente+)" ON public.categories
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Entregador read customer of own orders" ON public.customers;
CREATE POLICY "Entregador read customer of own orders" ON public.customers
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::user_role_enum]) AND (EXISTS ( SELECT 1
   FROM orders pe
  WHERE ((pe.customer_id = customers.id) AND (pe.driver_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage customers" ON public.customers;
CREATE POLICY "Staff manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Entregador read address of own orders" ON public.customer_addresses;
CREATE POLICY "Entregador read address of own orders" ON public.customer_addresses
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::user_role_enum]) AND (EXISTS ( SELECT 1
   FROM orders pe
  WHERE ((pe.address_id = customer_addresses.id) AND (pe.driver_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage customer_addresses" ON public.customer_addresses;
CREATE POLICY "Staff manage customer_addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff read tracking_events" ON public.tracking_events;
CREATE POLICY "Staff read tracking_events" ON public.tracking_events
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Entregador read items of own orders" ON public.order_items;
CREATE POLICY "Entregador read items of own orders" ON public.order_items
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::user_role_enum]) AND (EXISTS ( SELECT 1
   FROM orders pe
  WHERE ((pe.id = order_items.order_id) AND (pe.driver_id = auth.uid()))))));

DROP POLICY IF EXISTS "Staff manage order_items" ON public.order_items;
CREATE POLICY "Staff manage order_items" ON public.order_items
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Staff manage order_item_options" ON public.order_item_options;
CREATE POLICY "Staff manage order_item_options" ON public.order_item_options
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

DROP POLICY IF EXISTS "Manage kanban_column (gerente+)" ON public.kanban_column;
CREATE POLICY "Manage kanban_column (gerente+)" ON public.kanban_column
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Staff read kanban_column" ON public.kanban_column;
CREATE POLICY "Staff read kanban_column" ON public.kanban_column
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Manage kit_items (gerente+)" ON public.kit_items;
CREATE POLICY "Manage kit_items (gerente+)" ON public.kit_items
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Manage kits (gerente+)" ON public.kits;
CREATE POLICY "Manage kits (gerente+)" ON public.kits
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Manage store (gerente+)" ON public.store;
CREATE POLICY "Manage store (gerente+)" ON public.store
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Staff read order_status_history" ON public.order_status_history;
CREATE POLICY "Staff read order_status_history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Delete orders (admin+)" ON public.orders;
CREATE POLICY "Delete orders (admin+)" ON public.orders
  FOR DELETE TO authenticated
  USING (private.has_role(ARRAY['administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Entregador read own orders" ON public.orders;
CREATE POLICY "Entregador read own orders" ON public.orders
  FOR SELECT TO authenticated
  USING ((private.has_role(ARRAY['entregador'::user_role_enum]) AND (driver_id = auth.uid())));

DROP POLICY IF EXISTS "Staff insert orders" ON public.orders;
CREATE POLICY "Staff insert orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(ARRAY['atendente'::user_role_enum, 'gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Staff read orders" ON public.orders;
CREATE POLICY "Staff read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (private.has_role(ARRAY['atendente'::user_role_enum, 'producao'::user_role_enum, 'gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['atendente'::user_role_enum, 'producao'::user_role_enum, 'gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Manage product_option_group (gerente+)" ON public.product_option_group;
CREATE POLICY "Manage product_option_group (gerente+)" ON public.product_option_group
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Manage product_option_item (gerente+)" ON public.product_option_item;
CREATE POLICY "Manage product_option_item (gerente+)" ON public.product_option_item
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Manage products (gerente+)" ON public.products;
CREATE POLICY "Manage products (gerente+)" ON public.products
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Staff read products" ON public.products;
CREATE POLICY "Staff read products" ON public.products
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Manage promotion_products (gerente+)" ON public.promotion_products;
CREATE POLICY "Manage promotion_products (gerente+)" ON public.promotion_products
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Manage promotions (gerente+)" ON public.promotions;
CREATE POLICY "Manage promotions (gerente+)" ON public.promotions
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Staff manage sessions" ON public.sessions;
CREATE POLICY "Staff manage sessions" ON public.sessions
  FOR ALL TO authenticated
  USING (private.is_staff())
  WITH CHECK (private.is_staff());

DROP POLICY IF EXISTS "Admins manage users" ON public.users;
CREATE POLICY "Admins manage users" ON public.users
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Staff read all users" ON public.users;
CREATE POLICY "Staff read all users" ON public.users
  FOR SELECT TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Staff read webhook_outbox" ON public.webhook_outbox;
CREATE POLICY "Staff read webhook_outbox" ON public.webhook_outbox
  FOR SELECT TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP POLICY IF EXISTS "Manage shipping rules (gerente+)" ON public.shipping_distance_rules;
CREATE POLICY "Manage shipping rules (gerente+)" ON public.shipping_distance_rules
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

-- ── pages (migration 062) ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read available pages" ON public.pages;
CREATE POLICY "Public read available pages" ON public.pages
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Manage pages (gerente+)" ON public.pages;
CREATE POLICY "Manage pages (gerente+)" ON public.pages
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

-- ── related_products (migrations 054 + 071) ───────────────────────────────
DROP POLICY IF EXISTS "Public read related_products" ON public.related_products;
CREATE POLICY "Public read related_products" ON public.related_products
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Manage related_products (gerente+)" ON public.related_products;
CREATE POLICY "Manage related_products (gerente+)" ON public.related_products
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));


-- ── cart_item_options (migration 110) ─────────────────────────────────────────
DROP POLICY IF EXISTS "No client access" ON public.cart_item_options;
CREATE POLICY "No client access" ON public.cart_item_options
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ── ingredients / product_ingredients / stock_movements (migration 111) ─────────
DROP POLICY IF EXISTS "Staff manage ingredients" ON public.ingredients;
CREATE POLICY "Staff manage ingredients" ON public.ingredients
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

DROP POLICY IF EXISTS "Staff manage product_ingredients" ON public.product_ingredients;
CREATE POLICY "Staff manage product_ingredients" ON public.product_ingredients
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

DROP POLICY IF EXISTS "Staff manage stock_movements" ON public.stock_movements;
CREATE POLICY "Staff manage stock_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING     (private.is_staff())
  WITH CHECK(private.is_staff());

-- customer_conversation_summary (migration 117): sem policy — acesso exclusivo via
-- service_role, mesmo padrão de whatsapp_conversations. RLS habilitado (seção 10),
-- deny implícito para anon/authenticated.

-- ── agent_quick_responses (migrations 120 + 121) — dado operacional interno,
-- nunca lido por cliente anônimo (diferente de shipping_distance_rules).
DROP POLICY IF EXISTS "Staff read agent_quick_responses" ON public.agent_quick_responses;
CREATE POLICY "Staff read agent_quick_responses" ON public.agent_quick_responses
  FOR SELECT TO authenticated
  USING (private.is_staff());

DROP POLICY IF EXISTS "Manage agent_quick_responses (gerente+)" ON public.agent_quick_responses;
CREATE POLICY "Manage agent_quick_responses (gerente+)" ON public.agent_quick_responses
  FOR ALL TO authenticated
  USING (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]))
  WITH CHECK (private.has_role(ARRAY['gerente'::user_role_enum, 'administrador'::user_role_enum, 'proprietario'::user_role_enum]));

DROP FUNCTION IF EXISTS public.has_role(public.user_role_enum[]);
DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.current_user_role();

-- ─── 14. SINCRONIZAÇÃO DE USUÁRIOS (caso auth.users já existam) ───────────────
-- Cria linha em public.users para quaisquer usuários pré-existentes em auth.users.
-- Novos usuários criados no Supabase Auth são criados automaticamente via trigger on_auth_user_created.
-- Para alterar o papel de um usuário, basta executar UPDATE public.users SET role = 'proprietario' WHERE id = ...;
INSERT INTO public.users (id, name, role, active)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'nome', au.email),
  COALESCE((au.raw_user_meta_data->>'role')::public.user_role_enum, 'atendente'),
  true
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

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
-- 3. Variáveis de ambiente da aplicação (Cloudflare Workers — `wrangler secret
--    put`/dashboard): NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY,
--    NUXT_SUPABASE_SECRET_KEY, NUXT_SITE_URL, NUXT_WHATSAPP_WEBHOOK_TOKEN —
--    lista completa e comentada em .env.example. `webhook:drain` e
--    `orders:archive` rodam via Cloudflare Cron Triggers → Nitro Tasks
--    (`wrangler.toml` [triggers]), sem settings de Postgres nem endpoint HTTP.
--
-- 4. Colunas do Kanban além de "pendente" (seção 14 — seed deliberadamente
--    mínimo, só a coluna de entrada obrigatória). Sem pelo menos uma coluna com is_revenue_trigger,
--    is_out_for_delivery e is_delivered marcados, o dashboard de faturamento
--    (get_dashboard_metrics) fica preso em zero e confirm_delivery_inbound
--    nunca confirma entrega. Crie as colunas do seu fluxo (ex.: em_preparo,
--    saiu_para_entrega, entregue, cancelado) e marque as flags em
--    /admin → Kanban antes de processar o primeiro pedido.
-- =====================================================================================
