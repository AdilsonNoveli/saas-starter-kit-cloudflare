-- =========================================================================
-- MIGRATION: Catálogo Demo Completo (18 Categorias, 216 Produtos + Variações)
-- Gerado em: 2026-08-28T15:21:19.030Z
-- Compatível com PostgreSQL / Supabase
-- =========================================================================

BEGIN;

-- 1. CATEGORIAS (18 categorias)
-- -------------------------------------------------------------------------
INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('fde8797a-320a-4cfb-803e-3435c72db095', 'TODOS', '', '', 1, TRUE, 'brand-green', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('35874457-db2a-4928-bbc3-f35c92c0719d', 'Cafeteria', '', 'https://media.movimentabairro.org/1a35f9a4-73d8-4cc6-8120-9365c31647fc.webp', 2, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('82948f51-509b-478e-b58b-c36e6abbe332', 'Confeitaria', '', 'https://media.movimentabairro.org/2bc3ddb1-83bd-4467-aa0e-3b3cc317db0a.webp', 2, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('3cc3a7e5-404f-4f35-b176-1f8b1b025207', 'Cosméticos', '', 'https://media.movimentabairro.org/84685030-8795-4091-999b-7cdacfa3b713.webp', 12, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('6d1668ce-2df3-4f48-8dcc-05849cdf0ea9', 'Hamburgueria', '', 'https://media.movimentabairro.org/a5b0b3d5-1257-4ddb-b5e5-70a128f3f191.webp', 22, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('ed59b0f3-03cd-46eb-b69c-f7e72f18408e', 'Brinquedos', '', 'https://media.movimentabairro.org/8c133029-8e00-4b30-a799-fb184d47ee0e.webp', 32, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('3925f05e-7032-4a6d-a2f0-2f62c0e4c561', 'Hortifruti', '', 'https://media.movimentabairro.org/76cd0664-342e-4106-8f8f-cc7913fee2de.webp', 42, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('f7c5c071-1338-403c-a54f-a577e91ab803', 'Bebidas', '', 'https://media.movimentabairro.org/19248193-1372-41ed-95b8-654db126cef5.webp', 52, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('faab2ddf-d17a-45b6-9e89-0569e5f626ab', 'Bijuteria', '', 'https://media.movimentabairro.org/4661dfc5-aa33-4ed3-9cde-24eeeab1ca03.webp', 62, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('521975d6-4065-4dd9-a571-59cb6eb0f691', 'Calçados', '', 'https://media.movimentabairro.org/f0fba6ef-7ea1-4cc9-a894-f86fd69c4af3.webp', 72, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f', 'Material de Construção', '', 'https://media.movimentabairro.org/5fdee8df-5498-4d96-8cf9-04a58e149b13.webp', 82, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('59d35d56-52eb-4536-81ca-777ecc7d4f58', 'Maquiagem', '', 'https://media.movimentabairro.org/904a803b-6fe6-43ff-8265-b6ac1c6fef54.webp', 92, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('0ee642fc-1c30-4f97-90df-aa1973fb6be2', 'Roupas', '', 'https://media.movimentabairro.org/46ebb645-8a32-4c67-92d6-9abc7c61c8ce.webp', 102, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('d9a0351e-a1ca-46a7-9441-f7226f181e38', 'Suplementos', '', 'https://media.movimentabairro.org/b27dffda-15db-4338-a006-d410f1562d1b.webp', 112, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790', 'Padaria', '', 'https://media.movimentabairro.org/7e5da518-31bb-4288-a5a7-3f1224c58e1e.webp', 122, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('8b885dc5-128f-48d0-b189-ef93401c4299', 'Papelaria', '', 'https://media.movimentabairro.org/20b64366-00dc-48a9-843f-313d1bbc50c8.webp', 132, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('5e8bd422-7e14-4810-b4f4-e4de5f63307e', 'Restaurante', '', 'https://media.movimentabairro.org/bdd8079e-565b-4270-ae59-a1ab25b0386b.webp', 142, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09', 'Farmácia', '', 'https://media.movimentabairro.org/df960a47-b272-44ab-91cd-cde33b9837fb.webp', 152, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

INSERT INTO public.categories (id, name, description, icon_url, sort_order, active, color, is_primary)
VALUES ('b3a49fe0-96a8-4a6a-bedf-18002d1153ac', 'Perfumaria', 'Categoria Perfumaria', NULL, 180, TRUE, 'brand-green', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  is_primary = EXCLUDED.is_primary;

-- 2. PRODUTOS (216 produtos)
-- -------------------------------------------------------------------------
INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c638c4f8-3a86-472e-97eb-56fcab70ba2b',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Abacaxi',
  'Abacaxi selecionado, doce e refrescante.',
  8.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['abacaxi', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '12485550-708c-4bf9-84ce-6028e3b215c1',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Agenda',
  'Organize compromissos, tarefas e metas em um só lugar.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['agenda', 'papelaria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ef8da43f-5a8b-4f02-b9d8-018946eda910',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Água com Gás',
  'Refrescante e gelada, perfeita para acompanhar suas refeições.',
  4,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['água com gás', 'bebidas', 'água', 'com', 'gás']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '77b4a987-f2de-4ac5-a1c4-f3976ac7aaa4',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Água de Coco',
  'Refrescante e naturalmente saborosa, perfeita para dias quentes.',
  8,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['água de coco', 'bebidas', 'água', 'coco']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b275c415-f5d4-49d8-8912-1d9f3ae002b8',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Água Mineral',
  'Água mineral para manter sua hidratação sempre em dia.',
  3.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['água mineral', 'bebidas', 'água', 'mineral']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a49e30b3-b856-44a0-aaaa-baa516d17cc3',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Água Perfumada',
  'Fragrância suave para deixar uma sensação agradável e refrescante.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['água perfumada', 'perfumaria', 'água', 'perfumada']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3145e822-2c8c-435d-b042-9e475e4183ee',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Álcool em Gel',
  'Prático para higienização das mãos quando você estiver fora de casa.',
  7.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['álcool em gel', 'farmácia', 'álcool', 'gel']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '48ace5c4-df22-4b29-b34c-b670db4cb431',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Alface',
  'Folhas frescas e crocantes para deixar suas saladas mais completas.',
  4.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['alface', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '80dbc095-bd84-448c-913e-0a5a11c8d9f1',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Algodão',
  'Item essencial para cuidados pessoais e higiene diária.',
  6.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['algodão', 'farmácia']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b42afd81-26e1-4e48-87ed-6ac74c8611e5',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Anel Minimalista',
  'Design discreto e moderno para combinar com diferentes estilos.',
  19.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['anel minimalista', 'bijuteria', 'anel', 'minimalista']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '4e1d3b5b-3429-4211-a692-c52ec605bfa1',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Argamassa',
  'Ideal para assentamento e acabamento em diferentes tipos de obra.',
  19.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['argamassa', 'material de construção']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3a4cb1d0-0a86-41a5-b560-ce75c1278e22',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Avião de Brinquedo',
  'Modelo divertido para pequenas aventuras e grandes histórias.',
  38,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['avião de brinquedo', 'brinquedos', 'avião', 'brinquedo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c613da69-1a83-441e-8c88-22bf159a26ad',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Bacon Supreme',
  'Hambúrguer artesanal com queijo, bacon crocante e molho especial da casa.',
  34,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['bacon supreme', 'hamburgueria', 'bacon', 'supreme']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '208c545f-077b-4c4d-b701-b5c319e375be',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Banana Prata',
  'Bananas selecionadas, frescas e prontas para levar sabor e energia para sua rotina.',
  6.99,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['banana prata', 'hortifruti', 'banana', 'prata']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b15c2253-c2c0-405d-af18-30be2372d341',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Barra de Proteína',
  'Lanche prático para levar na bolsa e consumir onde estiver.',
  9.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['barra de proteína', 'suplementos', 'barra', 'proteína']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '64d6fe96-3af2-417d-b9b5-b8a3896e3832',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Base Líquida',
  'Cobertura confortável para uniformizar a pele e criar uma maquiagem impecável.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['base líquida', 'maquiagem', 'base', 'líquida']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'bde106f3-5332-482b-b454-3a9b1101bdcb',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Batata',
  'Batatas selecionadas para acompanhar desde o almoço até aquela receita especial.',
  6.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['batata', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '7edbe820-ecfa-42fc-9559-9198bcda3888',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Batata Frita Especial',
  'Batatas crocantes acompanhadas de um molho irresistível.',
  18,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['batata frita especial', 'hamburgueria', 'batata', 'frita', 'especial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '40b0df19-20f8-4e61-bc5f-3cc5b609f900',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Batom Matte',
  'Cor intensa com acabamento matte para completar sua produção.',
  22.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['batom matte', 'maquiagem', 'batom', 'matte']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c3101f4f-81d5-4f14-80fb-127b50f78a92',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'BBQ Burger',
  'Hambúrguer artesanal com queijo, cebola caramelizada e molho barbecue.',
  33,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['bbq burger', 'hamburgueria', 'bbq', 'burger']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8f7efa80-99ec-4809-a95d-ec97368f7581',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'BCAA',
  'Fórmula prática para acompanhar sua rotina de treinos.',
  59.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['bcaa', 'suplementos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '60abe375-ec41-49e6-9f28-16ef31f83b5d',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Bife Acebolado',
  'Carne macia preparada com cebolas douradas e acompanhamentos.',
  32,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['bife acebolado', 'restaurante', 'bife', 'acebolado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3ad5c720-659c-4b9a-9c8f-c8e90b5cbdfb',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Bloco de Notas',
  'Ideal para anotar ideias, lembretes e tarefas rapidamente.',
  9.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['bloco de notas', 'papelaria', 'bloco', 'notas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'aa5e7901-8c86-435c-8d7f-3a6c905958f7',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Blocos de Montar',
  'Peças coloridas para estimular criatividade, coordenação e imaginação.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['blocos de montar', 'brinquedos', 'blocos', 'montar']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '02696d39-f3f5-4196-b68b-89ebd939d73b',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Blusa Feminina',
  'Peça versátil para montar looks modernos e confortáveis.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['blusa feminina', 'roupas', 'blusa', 'feminina']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'f220c5f0-14f5-4eef-bc8d-374972f99275',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Blush',
  'Toque de cor para deixar o rosto com aparência mais saudável e iluminada.',
  27.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['blush', 'maquiagem']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '7e31a016-e73f-4428-8b5a-97d3b84ddca3',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Body Splash',
  'Fragrância leve e refrescante para deixar a pele perfumada ao longo do dia.',
  35,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['body splash', 'cosméticos', 'body', 'splash']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'f01fc7b9-1f19-4e32-b47a-7413a2d294b2',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Bolo Caseiro',
  'Bolo fresquinho com aquele sabor de receita feita em casa.',
  18,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['bolo caseiro', 'padaria', 'bolo', 'caseiro']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c6b032cc-a442-4fd7-969f-c16d29e2c1b4',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Bolo de Chocolate',
  'Massa fofinha de chocolate com cobertura cremosa e sabor marcante.',
  16,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'preorder',
  '{"max_quantity":50,"min_quantity":1,"max_lead_days":30,"min_lead_days":1,"scheduling_type":"made_to_order"}'::jsonb,
  '{"requires_date":true}'::jsonb,
  ARRAY['bolo de chocolate', 'confeitaria', 'bolo', 'chocolate']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a0203329-ee20-4d51-9565-a87ddf3cd4ef',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Bolo Red Velvet',
  'Massa aveludada com recheio cremoso e equilíbrio perfeito entre doce e sabor.',
  18.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'preorder',
  '{"max_quantity":50,"min_quantity":1,"max_lead_days":30,"min_lead_days":1,"scheduling_type":"made_to_order"}'::jsonb,
  '{"requires_date":true}'::jsonb,
  ARRAY['bolo red velvet', 'confeitaria', 'bolo', 'red', 'velvet']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '307fcbd6-1b15-4970-9b7a-72b14791f8ab',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Boneca Fashion',
  'Boneca estilosa para criar histórias e aventuras cheias de imaginação.',
  59,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['boneca fashion', 'brinquedos', 'boneca', 'fashion']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3ca9e6c6-18c6-424a-b6b5-9da198c23fdf',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Bota Casual',
  'Bota versátil para completar produções com personalidade.',
  179.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['bota casual', 'calçados', 'bota', 'casual']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '46e25ed0-ec40-4952-8b76-a8ed319ea3b9',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Brigadeiro Gourmet',
  'Brigadeiro artesanal feito com ingredientes selecionados e textura irresistivelmente cremosa.',
  5.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['brigadeiro gourmet', 'confeitaria', 'brigadeiro', 'gourmet']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a91e67d8-31c7-4000-993b-490eef1dd75a',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Brinco Argola',
  'Um clássico versátil que combina com produções do dia a dia ou ocasiões especiais.',
  24.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['brinco argola', 'bijuteria', 'brinco', 'argola']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '55287f60-7ab7-4a47-8a9f-8074f6bb0142',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Brinco Ponto de Luz',
  'Peça delicada que traz um toque de brilho para qualquer produção.',
  18,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['brinco ponto de luz', 'bijuteria', 'brinco', 'ponto', 'luz']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ec89e8a2-6e23-4b1a-81cf-dd38afca0800',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Brinco Statement',
  'Peça marcante para quem gosta de transformar o acessório no destaque do look.',
  36,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['brinco statement', 'bijuteria', 'brinco', 'statement']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd231858f-0964-4c83-97d5-de203a197ba2',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Brownie Artesanal',
  'Brownie denso, chocolatudo e com interior macio para matar qualquer vontade de doce.',
  12,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['brownie artesanal', 'confeitaria', 'brownie', 'artesanal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '1e832a74-01af-4096-a35b-9f244747c4e2',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Caderno de Desenho',
  'Espaço perfeito para transformar ideias em desenhos e criações.',
  18.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['caderno de desenho', 'papelaria', 'caderno', 'desenho']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8b85d55f-8e5e-4b2e-8ce5-8f14cbd03730',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Caderno Universitário',
  'Caderno resistente e prático para organizar estudos e anotações.',
  24.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['caderno universitário', 'papelaria', 'caderno', 'universitário']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e15fb575-c135-426f-8eb0-76ec17049018',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Café Espresso',
  'Café espresso intenso, aromático e preparado na hora para começar bem o dia.',
  7.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['café espresso', 'cafeteria', 'café', 'espresso']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'da5c14fd-16d8-413b-8da9-cc879eaabc2b',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Café Gelado',
  'Café refrescante servido gelado, perfeito para dias quentes e momentos de pausa.',
  14,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['café gelado', 'cafeteria', 'café', 'gelado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'f6a967e6-a3cc-43ea-b77a-782e990e85ff',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Caixa de Doces',
  'Seleção especial de doces para compartilhar ou presentear.',
  32,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'preorder',
  '{"max_quantity":50,"min_quantity":1,"max_lead_days":30,"min_lead_days":1,"scheduling_type":"made_to_order"}'::jsonb,
  '{"requires_date":true}'::jsonb,
  ARRAY['caixa de doces', 'confeitaria', 'caixa', 'doces']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '067a272d-bcb8-45e1-945d-9ae2aa2d5eac',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Calça Jeans',
  'Modelo versátil para combinar com praticamente qualquer produção.',
  119.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['calça jeans', 'roupas', 'calça', 'jeans']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '05f22ec6-520f-48f4-b023-84fa9c7e665b',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Calculadora',
  'Prática para estudos, trabalho e tarefas do dia a dia.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['calculadora', 'papelaria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd1a7e486-8af2-40c4-a8d4-a5785152368b',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Camisa Social',
  'Uma peça clássica para ocasiões profissionais e especiais.',
  99.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['camisa social', 'roupas', 'camisa', 'social']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '70262394-a8db-40b1-a269-2fb0efd07dc7',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Camiseta Básica',
  'Peça essencial para criar looks confortáveis e versáteis todos os dias.',
  45,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['camiseta básica', 'roupas', 'camiseta', 'básica']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e5a2b6ae-4403-48fd-a8d6-e8df9ee03b0d',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Camiseta Oversized',
  'Modelagem moderna e confortável para um visual urbano e despojado.',
  59.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['camiseta oversized', 'roupas', 'camiseta', 'oversized']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '4817b4e0-33f0-46fb-aac2-b6076a5e0b64',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Cappuccino Cremoso',
  'Cappuccino preparado com café espresso, leite vaporizado e uma espuma cremosa irresistível.',
  14.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cappuccino cremoso', 'cafeteria', 'cappuccino', 'cremoso']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'f4b89d20-5e43-4255-a4bb-4f8cba8e38f7',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Carrinho de Controle Remoto',
  'Diversão garantida com carrinho cheio de movimentos e aventuras.',
  79.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['carrinho de controle remoto', 'brinquedos', 'carrinho', 'controle', 'remoto']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '9e08274c-3fad-408b-9039-b06bc0d252e2',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Cebola',
  'Cebolas frescas e selecionadas para dar aquele toque especial às suas receitas.',
  5.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cebola', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '59cadfe1-f0bf-4b64-84f1-7bb8485bf870',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Cesta de Frutas',
  'Uma seleção prática de frutas frescas para sua casa.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cesta de frutas', 'hortifruti', 'cesta', 'frutas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e3919329-b7ae-4f63-97c4-9677c62786de',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Cesta de Padaria',
  'Mix de produtos fresquinhos para abastecer sua mesa.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cesta de padaria', 'padaria', 'cesta']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd5142c94-9b40-4e54-a9ab-f25ce23cf6a0',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Cesta Hortifruti',
  'Mix completo de frutas e verduras para abastecer sua cozinha.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cesta hortifruti', 'hortifruti', 'cesta']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '1d640611-3a8e-466c-a276-b156c88abb82',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Chá Especial',
  'Seleção de chás aromáticos para uma pausa leve, saborosa e reconfortante.',
  9.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['chá especial', 'cafeteria', 'chá', 'especial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'be6cc575-33fe-402a-a29c-9cb173e251ad',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Chá Gelado',
  'Bebida leve e refrescante para qualquer momento do dia.',
  7.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['chá gelado', 'bebidas', 'chá', 'gelado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b11df245-e43f-4715-9263-8e21e0a6fb41',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Cheddar Bacon',
  'A combinação irresistível de hambúrguer, cheddar cremoso e bacon crocante.',
  35.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cheddar bacon', 'hamburgueria', 'cheddar', 'bacon']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '55ca6585-191e-4eb0-a7ce-5d677931442b',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Cheesecake',
  'Sobremesa cremosa com base crocante e cobertura de frutas.',
  19.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'preorder',
  '{"max_quantity":50,"min_quantity":1,"max_lead_days":30,"min_lead_days":1,"scheduling_type":"made_to_order"}'::jsonb,
  '{"requires_date":true}'::jsonb,
  ARRAY['cheesecake', 'confeitaria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '43c3c4b7-fc26-4bb5-bb2c-07a92b69748d',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Chicken Crispy',
  'Frango crocante, queijo, alface e molho especial em pão macio.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['chicken crispy', 'hamburgueria', 'chicken', 'crispy']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '56ae3a76-555b-4232-adad-47b07f964bd2',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Chinelo Confort',
  'Leve, prático e perfeito para os momentos de descanso.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['chinelo confort', 'calçados', 'chinelo', 'confort']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '7138291f-0bb8-4dab-b004-ed767760330c',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Chocolate Quente',
  'Chocolate cremoso e encorpado, servido quentinho para deixar qualquer momento mais especial.',
  15,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['chocolate quente', 'cafeteria', 'chocolate', 'quente']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e7ed5ab1-7640-428c-81ff-7013683816f0',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Cimento',
  'Essencial para obras, reformas e diversos tipos de construção.',
  34.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cimento', 'material de construção']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '784a7706-f6d4-4622-8f84-b8dba6f3e774',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Classic Burger',
  'Hambúrguer artesanal, queijo derretido, molho especial e pão macio.',
  28,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['classic burger', 'hamburgueria', 'classic', 'burger']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'adcab8a4-ce1f-4331-98dc-a74951db0dd3',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Colar com Pingente',
  'Acessório versátil para criar combinações modernas e delicadas.',
  34.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['colar com pingente', 'bijuteria', 'colar', 'com', 'pingente']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '785b424c-f732-439f-b337-3204a712c009',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Colar Delicado',
  'Colar minimalista para completar o visual com elegância e leveza.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['colar delicado', 'bijuteria', 'colar', 'delicado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8407b627-e3c9-414d-8470-84ac55c6de49',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Combo Bebidas',
  'Seleção de bebidas para acompanhar seu pedido ou abastecer a geladeira.',
  32,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['combo bebidas', 'bebidas', 'combo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '2faecc67-80a3-4f29-a7b3-dc029311cc26',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Combo Burger + Batata',
  'Seu hambúrguer favorito acompanhado de batata crocante.',
  42,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['combo burger + batata', 'hamburgueria', 'combo', 'burger', 'batata']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b660e4ad-218d-4f75-adec-62ed860ead9b',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Combo Café da Manhã',
  'Uma seleção de pães, doces e bebida para começar o dia bem.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['combo café da manhã', 'padaria', 'combo', 'café', 'manhã']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '398535d2-d478-451e-9127-bdc56645adeb',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Combo Café da Manhã',
  'Uma combinação completa para começar o dia com muito sabor e praticidade.',
  26.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['combo café da manhã', 'cafeteria', 'combo', 'café', 'manhã']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '11cf761c-7310-4a4e-af46-497262cc1d2f',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Combo Família',
  'Uma refeição completa para compartilhar com toda a família.',
  89,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['combo família', 'restaurante', 'combo', 'família']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '5a1bce07-2f79-4035-be1f-96b0acff3093',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Combo Família',
  'Uma seleção completa para compartilhar com quem você gosta.',
  89,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['combo família', 'hamburgueria', 'combo', 'família']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ecf9446b-5835-433b-b580-63776d83208e',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Combo Individual',
  'Prato principal acompanhado de bebida e sobremesa.',
  42,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['combo individual', 'restaurante', 'combo', 'individual']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e0c5542b-a584-4732-a890-d0f5fcaef465',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Condicionador Intensivo',
  'Tratamento diário para desembaraçar e proporcionar fios mais macios.',
  39.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['condicionador intensivo', 'cosméticos', 'condicionador', 'intensivo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '450e6f0e-0f46-4118-9b9f-c53ae30d40f5',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Conjunto Casual',
  'Look coordenado para quem quer praticidade sem abrir mão do estilo.',
  139.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['conjunto casual', 'roupas', 'conjunto', 'casual']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3ebfb308-f3fa-4bf8-97f1-ebc28ff01ed7',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Conjunto Colar + Brinco',
  'Combinação pronta para deixar o visual harmonioso e elegante.',
  55,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['conjunto colar + brinco', 'bijuteria', 'conjunto', 'colar', 'brinco']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b37858c9-a9e1-4071-8c8e-bb767e08111e',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Corretivo',
  'Ajuda a uniformizar a aparência da pele e finalizar a maquiagem com precisão.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['corretivo', 'maquiagem']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3764902a-2e63-4dc0-9013-e16035e2ab35',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Coxinha',
  'Massa crocante por fora e recheio cremoso por dentro.',
  8.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['coxinha', 'padaria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'aa302d97-7471-4665-a1dc-0c2428322ee1',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Creatina',
  'Suplemento prático para incluir na rotina de quem busca desempenho nos treinos.',
  79.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['creatina', 'suplementos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c69adf14-f923-44b0-b816-dac1ee3d0a2b',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Creme Dental',
  'Cuidado diário para manter dentes e boca limpos e protegidos.',
  9.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['creme dental', 'farmácia', 'creme', 'dental']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '0e981173-d758-4803-b2f6-68e8ad6b4cb3',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Creme para Mãos',
  'Hidratação prática para manter as mãos macias e perfumadas.',
  24.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['creme para mãos', 'perfumaria', 'creme', 'para', 'mãos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'fc9abb19-47ca-4494-b1e4-2d08db333f79',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Creme para Pés',
  'Cuidado diário para manter os pés macios e confortáveis.',
  26.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['creme para pés', 'perfumaria', 'creme', 'para', 'pés']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '634d8962-736e-48bf-bbf4-720122d933fc',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Croissant',
  'Massa leve e dourada com recheio delicioso.',
  14.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['croissant', 'padaria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd2ac325c-61be-48cb-b590-cf56b7864cec',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Croissant na Chapa',
  'Croissant dourado e crocante, preparado na hora com recheio cremoso.',
  16.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['croissant na chapa', 'cafeteria', 'croissant', 'chapa']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'bbf05a24-2e09-45b4-8f8b-c0ef28cf7226',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Cupcake Gourmet',
  'Massa leve, recheio cremoso e cobertura especial em uma porção individual.',
  10,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['cupcake gourmet', 'confeitaria', 'cupcake', 'gourmet']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '6cc22d2d-d61f-471b-9875-940ce2de0dac',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Curativos Adesivos',
  'Práticos para pequenos cuidados do dia a dia.',
  8.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['curativos adesivos', 'farmácia', 'curativos', 'adesivos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '05aa398b-0ad9-40a3-9f5f-002510c6c6f9',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Delineador',
  'Traço preciso para transformar o olhar e finalizar a maquiagem.',
  26,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['delineador', 'maquiagem']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3bd3012a-3b3d-44a7-8724-07f7c55e0335',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Desodorante Corporal',
  'Proteção e fragrância para acompanhar sua rotina.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['desodorante corporal', 'perfumaria', 'desodorante', 'corporal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '2821de5d-e206-49f7-982a-76a5a6432e93',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Donuts Recheado',
  'Donut fofinho com cobertura generosa e recheio irresistível.',
  11.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['donuts recheado', 'confeitaria', 'donuts', 'recheado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'fab625a1-736e-4f2d-8510-2f179d177b7d',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Energético',
  'Bebida refrescante para acompanhar sua rotina e seus momentos de maior intensidade.',
  12,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['energético', 'bebidas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ccb62220-786e-4ed3-a7e0-047b2b9a7076',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Enxaguante Bucal',
  'Complemento para sua rotina diária de higiene bucal.',
  22,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['enxaguante bucal', 'farmácia', 'enxaguante', 'bucal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e9d2ab74-a1a1-4e27-bd1e-c070de09140a',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Escondidinho',
  'Purê cremoso com recheio bem temperado e cobertura gratinada.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['escondidinho', 'restaurante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '5beed968-5ad1-4926-b6da-110ec365b11e',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Escova Dental',
  'Escova desenvolvida para uma rotina de higiene bucal prática e confortável.',
  14.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['escova dental', 'farmácia', 'escova', 'dental']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '20a09e0a-05d2-4c6a-8e31-ab5ddc3f4ad1',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Esfoliante Corporal',
  'Esfoliação delicada que ajuda a remover células mortas e renovar a sensação da pele.',
  34.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['esfoliante corporal', 'cosméticos', 'esfoliante', 'corporal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '45c97958-7c8d-4ccc-b1a8-e8a76493c171',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Estojo Escolar',
  'Prático para organizar canetas, lápis e pequenos acessórios.',
  22,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['estojo escolar', 'papelaria', 'estojo', 'escolar']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'fba55bb7-526d-4afa-9b5c-696e9303eb1f',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Fatia de Bolo Caseiro',
  'Aquele sabor de bolo feito em casa, perfeito para acompanhar seu café.',
  8.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['fatia de bolo caseiro', 'confeitaria', 'fatia', 'bolo', 'caseiro']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '6f1d8f3f-3f1d-48df-9193-f9a76d67d9d5',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Feijoada',
  'Prato tradicional, completo e cheio de sabor para o almoço.',
  38,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['feijoada', 'restaurante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '41e85e3b-3b91-4f1e-a2ac-ef7706dba994',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Filé de Frango',
  'Filé de frango acompanhado de arroz, feijão e guarnições.',
  26,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['filé de frango', 'restaurante', 'filé', 'frango']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3275362c-2ec6-4317-9ae2-94951f5a99d9',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Fio Dental',
  'Prático para complementar a higiene entre os dentes.',
  8.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['fio dental', 'farmácia', 'fio', 'dental']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '9208976d-a360-4921-a9b7-853cb3f28976',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Fita Isolante',
  'Prática para trabalhos elétricos e pequenos reparos.',
  7.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['fita isolante', 'material de construção', 'fita', 'isolante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a6ba42c7-1227-4752-a753-f29a47ecf8c4',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Frappé de Café',
  'Bebida gelada e cremosa com café, gelo e uma deliciosa finalização.',
  18.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['frappé de café', 'cafeteria', 'frappé', 'café']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a44ab40b-311d-436f-8089-e9bde8adc5b8',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Gloss Labial',
  'Brilho confortável para deixar os lábios com aparência hidratada e luminosa.',
  24,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['gloss labial', 'maquiagem', 'gloss', 'labial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c09a264e-0bfd-4900-8e61-b09864579650',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Glutamina',
  'Suplemento em pó fácil de adicionar à sua rotina diária.',
  64.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['glutamina', 'suplementos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c2550062-6c29-449c-a71f-467422d978cc',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Hidratante Corporal',
  'Hidratação intensa com toque suave para deixar a pele macia e perfumada.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['hidratante corporal', 'cosméticos', 'hidratante', 'corporal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3d2d3f49-b138-407d-a863-eaf78c12b634',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Hidratante Facial',
  'Cuidado diário para manter a pele confortável e hidratada.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['hidratante facial', 'perfumaria', 'hidratante', 'facial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '6863bea7-4e45-4d26-874f-40909f0c8918',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Higiene Pessoal',
  'Seleção de produtos essenciais para cuidados diários.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['higiene pessoal', 'farmácia', 'higiene', 'pessoal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8a433436-40db-476f-b634-389f54c83feb',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Hipercalórico',
  'Opção prática para complementar a alimentação com maior aporte energético.',
  74.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['hipercalórico', 'suplementos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '44b13cb3-7fa5-4f96-8763-f8acad2a5600',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Hot Burger',
  'Hambúrguer com molho picante para quem gosta de sabores mais intensos.',
  32,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['hot burger', 'hamburgueria', 'hot', 'burger']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e9c66236-60a3-4a2b-a4ca-8028e0073836',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Iluminador',
  'Realce estratégico para trazer luminosidade e destaque à maquiagem.',
  34,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['iluminador', 'maquiagem']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ad990b8e-1249-416d-b695-7024fb9bd226',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Jaqueta Jeans',
  'Clássica e atemporal, perfeita para completar produções casuais.',
  149.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['jaqueta jeans', 'roupas', 'jaqueta', 'jeans']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3a200577-f0c7-4b98-af4a-453256a51f41',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Jogo de Memória',
  'Brincadeira divertida para toda a família, estimulando atenção e memória.',
  28,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['jogo de memória', 'brinquedos', 'jogo', 'memória']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '57eee9c8-3d57-4ca7-a222-9709e56d16ba',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Jogo de Tabuleiro',
  'Uma opção divertida para reunir a família e transformar qualquer momento em brincadeira.',
  65,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['jogo de tabuleiro', 'brinquedos', 'jogo', 'tabuleiro']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c80acbaf-9748-4176-9ed2-93daa019bced',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Kit 3 Camisetas',
  'Três peças essenciais para renovar o guarda-roupa de forma prática.',
  110,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit 3 camisetas', 'roupas', 'kit', 'camisetas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '0c985351-f341-435b-b33a-867d4dce4003',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Kit Acessórios',
  'Seleção de acessórios para renovar seu visual gastando pouco.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit acessórios', 'bijuteria', 'kit', 'acessórios']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8c0ab3ef-493e-447b-afa1-559f636dec23',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Kit Autocuidado',
  'Seleção de produtos para transformar a rotina em um momento especial.',
  79.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit autocuidado', 'perfumaria', 'kit', 'autocuidado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '74c1b93c-4a79-4b9d-ab3d-7da01ceb17e1',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Kit Canetas',
  'Canetas confortáveis para estudos, trabalho e organização.',
  15,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit canetas', 'papelaria', 'kit', 'canetas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a6e76d01-73be-4d9d-a2be-124b9fc82695',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Kit Carrinhos',
  'Coleção de carrinhos para brincar, correr e montar sua própria cidade.',
  35,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit carrinhos', 'brinquedos', 'kit', 'carrinhos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '14dd8c16-15ca-4eee-b951-576cc50f33a7',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Kit de Anéis',
  'Conjunto de anéis para usar juntos ou combinar com outras peças.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit de anéis', 'bijuteria', 'kit', 'anéis']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '5b706425-9796-49f6-9cb7-8064a8f0b5bc',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Kit Escolar',
  'Tudo o que você precisa para começar o ano letivo preparado.',
  69.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit escolar', 'papelaria', 'kit', 'escolar']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '16773bd5-d795-47a9-bccd-85c9f8b9172e',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Kit Ferramentas',
  'Conjunto prático para pequenos reparos e trabalhos domésticos.',
  79.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit ferramentas', 'material de construção', 'kit', 'ferramentas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '242912dc-d0f5-4b17-bf11-5f438c949305',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Kit Higiene Bucal',
  'Conjunto prático para manter sua rotina de higiene bucal completa.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit higiene bucal', 'farmácia', 'kit', 'higiene', 'bucal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '101c4f1b-de01-4df6-b565-3e59d9b22ebc',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Kit Lápis',
  'Conjunto essencial para escola, desenho e escrita.',
  14,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit lápis', 'papelaria', 'kit', 'lápis']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '12ac291d-dafb-4616-946c-bce6e66b7f2b',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Kit Maquiagem',
  'Seleção completa para montar uma maquiagem bonita e prática.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit maquiagem', 'maquiagem', 'kit']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '29c4b608-3910-4bf0-a6e3-5c5d0ce3c03f',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Kit Massinha',
  'Massinhas coloridas para criar personagens, formas e tudo que a imaginação mandar.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit massinha', 'brinquedos', 'kit', 'massinha']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '036e1ee7-e247-452c-acc0-0386c3af52c1',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Kit Médico Infantil',
  'Uma brincadeira criativa para estimular imaginação e faz de conta.',
  44.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit médico infantil', 'brinquedos', 'kit', 'médico', 'infantil']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '352d2504-f2c3-44b9-bbe4-7579e173b0b3',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Kit Performance',
  'Combinação prática de produtos para acompanhar sua rotina de exercícios.',
  199.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit performance', 'suplementos', 'kit', 'performance']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '86be9da7-bea0-4043-84e7-4c1e18a14c01',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Kit Perfume + Hidratante',
  'Combinação perfeita para manter a pele perfumada e bem cuidada.',
  119.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit perfume + hidratante', 'perfumaria', 'kit', 'perfume', 'hidratante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '14736ae7-bd53-4784-b14b-bd3f57e43144',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Kit Pintura',
  'Tudo para transformar criatividade em arte.',
  39.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit pintura', 'brinquedos', 'kit', 'pintura']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8dadc041-e332-4f55-b565-b8e9d2fe4991',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Kit Presente Perfumaria',
  'Uma combinação elegante pronta para presentear alguém especial.',
  129.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit presente perfumaria', 'perfumaria', 'kit', 'presente']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '2c87dbcd-0b19-4bef-b8d3-42e7453b1007',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Kit Primeiros Cuidados',
  'Seleção prática de itens para manter em casa e ter sempre à mão.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit primeiros cuidados', 'farmácia', 'kit', 'primeiros', 'cuidados']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3bfe12f6-42bc-49f1-a6fe-6ce2d21092bb',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Kit Proteína',
  'Seleção prática para quem deseja ter opções proteicas sempre à mão.',
  149.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit proteína', 'suplementos', 'kit', 'proteína']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b3c7ac14-bc91-41b0-bf96-c43f979d58a5',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Kit Spa em Casa',
  'Conjunto completo para transformar sua rotina de cuidados em um momento relaxante.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['kit spa em casa', 'cosméticos', 'kit', 'spa', 'casa']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3dd29812-d4e8-467b-bd8c-dc92b87a1c33',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Lâmpada LED',
  'Iluminação eficiente para deixar seus ambientes mais claros e confortáveis.',
  9.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['lâmpada led', 'material de construção', 'lâmpada', 'led']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '2d0209ec-9a42-4a3f-a724-54526602b5c3',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Lápis de Olho',
  'Precisão para criar contornos delicados ou looks mais marcantes.',
  16.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['lápis de olho', 'maquiagem', 'lápis', 'olho']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '89366c49-99fd-419c-a7d1-25e4fcf926ca',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Laranja',
  'Laranjas suculentas e selecionadas para consumo ou aquele suco natural.',
  5.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['laranja', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '1cb7cb51-5d1d-4110-ad61-557e84c2ac6e',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Lasanha',
  'Camadas de massa, molho e recheio preparadas para uma refeição especial.',
  34,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['lasanha', 'restaurante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '4ef386d9-9491-4332-8f67-dcc4798b36fd',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Latte Cremoso',
  'Espresso combinado com leite vaporizado para uma bebida suave, cremosa e equilibrada.',
  13.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['latte cremoso', 'cafeteria', 'latte', 'cremoso']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '6ab47209-8abf-45d0-ad74-a4bc6641a6af',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Lixa para Parede',
  'Ideal para preparar superfícies e garantir um acabamento mais uniforme.',
  3.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['lixa para parede', 'material de construção', 'lixa', 'para', 'parede']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '746f4041-b75f-4013-b98c-e53a09309c12',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Maçã',
  'Maçãs frescas e crocantes, selecionadas diariamente.',
  8.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['maçã', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'fc89e734-be40-48ed-915c-35e0331655ce',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Marca-Texto',
  'Ideal para destacar informações importantes sem perder a organização.',
  12,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['marca-texto', 'papelaria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8a290d28-12c7-4e15-8ff5-d2a786cec6f4',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Máscara Capilar',
  'Tratamento concentrado para recuperar a aparência saudável e o brilho dos cabelos.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['máscara capilar', 'cosméticos', 'máscara', 'capilar']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'bf7841b9-b831-4bba-bdea-12bc317d7064',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Máscara de Cílios',
  'Para cílios mais definidos e destacados em poucos minutos.',
  36,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['máscara de cílios', 'maquiagem', 'máscara', 'cílios']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3f634ede-b4b8-4465-a7ab-40a8134af109',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Máscara Facial',
  'Momento de autocuidado com fórmula desenvolvida para revitalizar e cuidar da pele.',
  19.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['máscara facial', 'cosméticos', 'máscara', 'facial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '16db573f-e050-4e6c-ac4c-272b4bedce81',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Massa Artesanal',
  'Massa preparada com molho especial para uma refeição cheia de sabor.',
  32.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['massa artesanal', 'restaurante', 'massa', 'artesanal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '08d2c698-6e28-42d9-b22e-adf97c89144f',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Massa Corrida',
  'Produto ideal para preparar paredes antes da pintura.',
  28,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['massa corrida', 'material de construção', 'massa', 'corrida']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c9917b38-da55-4136-890b-c31d45559ef8',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Milkshake',
  'Bebida cremosa e gelada para transformar qualquer momento em sobremesa.',
  18,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['milkshake', 'bebidas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '6bb3c123-ee23-4bbe-b69a-ed9d7f30a2be',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Mini Bolo Personalizado',
  'Mini bolo artesanal perfeito para comemorações e pequenos momentos especiais.',
  45,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'preorder',
  '{"max_quantity":50,"min_quantity":1,"max_lead_days":30,"min_lead_days":1,"scheduling_type":"made_to_order"}'::jsonb,
  '{"requires_date":true}'::jsonb,
  ARRAY['mini bolo personalizado', 'confeitaria', 'mini', 'bolo', 'personalizado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '608ec530-e683-4889-9c6f-8ef5ab10a74c',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Mix de Presilhas',
  'Presilhas estilosas para completar penteados com praticidade.',
  18.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['mix de presilhas', 'bijuteria', 'mix', 'presilhas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '23f4e445-67f3-4407-8897-15813d8910ee',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Mocassim',
  'Modelo elegante que combina facilmente com looks casuais ou profissionais.',
  119.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['mocassim', 'calçados']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '25ccb671-e00f-49d1-bad5-0fdca204b99e',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Mocha Especial',
  'A combinação perfeita de café, leite e chocolate para quem ama uma bebida mais indulgente.',
  16.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['mocha especial', 'cafeteria', 'mocha', 'especial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '2851f29c-093b-4c96-b2a2-2c115109203d',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Moletom',
  'Conforto e estilo para os dias mais frescos.',
  129.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['moletom', 'roupas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '1713da16-568f-45fd-a8d8-1d0cb7da1ba8',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Morango',
  'Morangos selecionados, frescos e cheios de sabor.',
  12,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['morango', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '79699139-3070-4b1c-9d17-b0561f87ba95',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Mushroom Burger',
  'Hambúrguer suculento com queijo e cogumelos salteados em molho especial.',
  38,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['mushroom burger', 'hamburgueria', 'mushroom', 'burger']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'fb66fa41-7657-4d95-afa3-a71f2f85e8b4',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Óleo Corporal',
  'Óleo perfumado para deixar a pele nutrida, macia e com toque sedoso.',
  42,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['óleo corporal', 'cosméticos', 'óleo', 'corporal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd772c63f-ad87-484b-be8b-31f1e01ab513',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Onion Rings',
  'Anéis de cebola empanados e crocantes, perfeitos para acompanhar seu burger.',
  19,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['onion rings', 'hamburgueria', 'onion', 'rings']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '57b9d54d-1448-4338-8cc1-55de576e21dd',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Paleta de Sombras',
  'Cores versáteis para criar desde maquiagens naturais até produções marcantes.',
  59.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['paleta de sombras', 'maquiagem', 'paleta', 'sombras']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '5b2589b0-c444-41d6-9b4d-a41b459f810d',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Pão de Leite',
  'Macio e levemente adocicado, perfeito para lanches e cafés.',
  8.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pão de leite', 'padaria', 'pão', 'leite']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'bf192e1f-7934-4c5c-b24d-04950aebea3b',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Pão de Queijo',
  'Pão de queijo quentinho, macio por dentro e douradinho por fora.',
  6.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pão de queijo', 'cafeteria', 'pão', 'queijo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '78daa8a2-5039-48b4-8fde-496d500be1b9',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Pão de Queijo',
  'Quentinho, dourado e irresistível para qualquer hora do dia.',
  12,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pão de queijo', 'padaria', 'pão', 'queijo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'cdc775bf-986c-40cd-875f-a3af0e744dcd',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Pão Francês',
  'Crocante por fora, macio por dentro e perfeito para o café da manhã.',
  6,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pão francês', 'padaria', 'pão', 'francês']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8e53d4a8-279a-4057-9aa0-b7b6ec978732',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Pão Integral',
  'Opção saborosa para deixar sua rotina ainda mais prática.',
  10.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pão integral', 'padaria', 'pão', 'integral']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'faf61ae1-fbb4-4bca-b309-f01861e106bd',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Papel Sulfite',
  'Papel versátil para impressões, trabalhos e atividades.',
  28,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['papel sulfite', 'papelaria', 'papel', 'sulfite']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e8ee33e6-eab9-4ee2-8125-09592b245cb9',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Papete Casual',
  'Conforto e praticidade para compor looks modernos.',
  99.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['papete casual', 'calçados', 'papete', 'casual']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '7e02a5a2-ee33-4ab7-ac5c-7b99b866777c',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Parmegiana',
  'Proteína empanada, molho de tomate e queijo gratinado.',
  35,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['parmegiana', 'restaurante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '03018dae-fa15-4173-a783-e7afb1a04905',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Pasta de Amendoim',
  'Cremosa e saborosa, perfeita para acompanhar frutas, pães e receitas.',
  24.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pasta de amendoim', 'suplementos', 'pasta', 'amendoim']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'cdfc59d7-cc1b-41d3-8c4c-6fd03a9d4bd0',
  '8b885dc5-128f-48d0-b189-ef93401c4299',
  'Pasta Organizadora',
  'Mantenha documentos, trabalhos e papéis importantes sempre organizados.',
  16,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pasta organizadora', 'papelaria', 'pasta', 'organizadora']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ca8fe5c5-f94a-40f7-8bde-1fc0988f3b83',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Pelúcia Fofa',
  'Companheiro macio e divertido para presentear e colecionar.',
  45,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pelúcia fofa', 'brinquedos', 'pelúcia', 'fofa']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'cfb95599-cb35-4487-a27e-cdc4f7eefc08',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Perfume Amadeirado',
  'Aroma marcante e sofisticado para quem prefere fragrâncias intensas.',
  99.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['perfume amadeirado', 'perfumaria', 'perfume', 'amadeirado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '4582f9c5-33fb-40dd-9020-fd9845b42eeb',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Perfume Cítrico',
  'Fragrância fresca e vibrante para uma sensação leve e refrescante.',
  85,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['perfume cítrico', 'perfumaria', 'perfume', 'cítrico']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '1aa0af17-9581-4190-a878-092baecde6bb',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Perfume Floral',
  'Fragrância elegante e delicada para acompanhar todos os momentos.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['perfume floral', 'perfumaria', 'perfume', 'floral']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'bdea675f-e95b-492e-b8b5-b2adf7197508',
  '59d35d56-52eb-4536-81ca-777ecc7d4f58',
  'Pó Compacto',
  'Finalização prática para deixar a maquiagem com aparência uniforme.',
  32,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pó compacto', 'maquiagem', 'compacto']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a068e9b3-8e4f-4769-94a0-0d7c342398e8',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Polo Masculina',
  'Elegância casual para quem busca praticidade e estilo.',
  69.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['polo masculina', 'roupas', 'polo', 'masculina']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'b4f1e55c-d4b7-4ad8-8f1a-9fedddf56a6c',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Prato Executivo',
  'Uma refeição completa e saborosa para deixar seu almoço muito mais prático.',
  28.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['prato executivo', 'restaurante', 'prato', 'executivo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '67c59f81-0da4-411f-87c1-c07ac673eac4',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Pré-Treino',
  'Bebida em pó desenvolvida para complementar sua rotina antes dos treinos.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pré-treino', 'suplementos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ff8acfaf-b4bf-4ea9-aad1-5a6a43ae9b8d',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Protetor Labial',
  'Ajuda a manter os lábios hidratados e protegidos no dia a dia.',
  12.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['protetor labial', 'farmácia', 'protetor', 'labial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a309ed85-408d-4dfb-bad2-4e6fe90e9d50',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Protetor Solar Facial',
  'Proteção diária com textura confortável para acompanhar sua rotina.',
  54.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['protetor solar facial', 'cosméticos', 'protetor', 'solar', 'facial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '59714e57-7dc2-44b6-9d7c-7870a8bfc930',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Pudim Cremoso',
  'Pudim artesanal com textura macia e calda de caramelo na medida certa.',
  12.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pudim cremoso', 'confeitaria', 'pudim', 'cremoso']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e74f64ef-83af-43b4-b363-e607ea86ccaa',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Pulseira Charm',
  'Pulseira delicada para adicionar personalidade ao seu look.',
  32,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['pulseira charm', 'bijuteria', 'pulseira', 'charm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '240a8d15-676a-4cbc-85b5-7fc94df10614',
  'ed59b0f3-03cd-46eb-b69c-f7e72f18408e',
  'Quebra-Cabeça Infantil',
  'Diversão que também ajuda a desenvolver concentração e raciocínio.',
  34.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['quebra-cabeça infantil', 'brinquedos', 'quebra-cabeça', 'infantil']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '1fc4c6e5-cf14-4cd7-860c-58ed2f03007d',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Rasteirinha',
  'Modelo delicado e versátil para os dias quentes.',
  49.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['rasteirinha', 'calçados']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '1f11a76b-7f38-46ec-b5a7-e4c853fc93cf',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Refrigerante 2L',
  'Tamanho ideal para compartilhar durante a refeição.',
  12.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['refrigerante 2l', 'bebidas', 'refrigerante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'e1fec6a9-8d93-4ee2-b72e-526d60649b67',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Refrigerante Lata',
  'Sua bebida favorita, gelada e pronta para acompanhar qualquer pedido.',
  6,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['refrigerante lata', 'bebidas', 'refrigerante', 'lata']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '2139fa4c-3144-462f-b93c-58f79b0c7f0e',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Rejunte',
  'Acabamento para pisos e revestimentos com aplicação prática.',
  14,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['rejunte', 'material de construção']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '7d0a681f-07ce-4260-8387-39d74e2621b5',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Rosca Doce',
  'Massa macia e saborosa para acompanhar seu café.',
  16,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['rosca doce', 'padaria', 'rosca', 'doce']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'de96a44f-b730-4d55-8db5-5f5005582cdd',
  'b3a49fe0-96a8-4a6a-bedf-18002d1153ac',
  'Sabonete Corporal',
  'Limpeza agradável com fragrância e sensação de frescor.',
  18,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['sabonete corporal', 'perfumaria', 'sabonete', 'corporal']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '771d632f-fca2-4276-b74c-da9cc849e2af',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Sabonete Facial',
  'Limpeza delicada que remove impurezas sem deixar sensação de ressecamento.',
  28,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['sabonete facial', 'cosméticos', 'sabonete', 'facial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '112e6653-2b82-4a3a-b5c6-5754296016c3',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Salada Completa',
  'Opção leve e saborosa com ingredientes frescos e selecionados.',
  24.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['salada completa', 'restaurante', 'salada', 'completa']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '912b2f31-bf72-4fab-befa-e74d45ced138',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Sandália Feminina',
  'Design elegante para completar produções leves e confortáveis.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['sandália feminina', 'calçados', 'sandália', 'feminina']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '87cdfb5c-cb53-4142-9315-bdd96452e0a2',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Sandália Masculina',
  'Conforto e praticidade para os dias mais quentes.',
  69.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['sandália masculina', 'calçados', 'sandália', 'masculina']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '6c759c67-84a4-41aa-9210-94707c2235f5',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Sapatilha',
  'Clássica e confortável para o trabalho ou ocasiões casuais.',
  69.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['sapatilha', 'calçados']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'c732cbde-ac0a-4902-bad4-aba50d01d6a0',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Sérum Facial',
  'Fórmula concentrada para complementar sua rotina de cuidados e deixar a pele mais uniforme.',
  69.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['sérum facial', 'cosméticos', 'sérum', 'facial']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a835fcbf-d5f2-4e51-9ca3-60e27ad94b9b',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Shaker',
  'Garrafa prática para preparar seus shakes e bebidas com facilidade.',
  25,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['shaker', 'suplementos']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'a32c0091-f6f3-4117-80e9-2f00030415f3',
  '3cc3a7e5-404f-4f35-b176-1f8b1b025207',
  'Shampoo Premium',
  'Limpeza suave com fórmula pensada para deixar os cabelos leves, macios e brilhantes.',
  38,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['shampoo premium', 'cosméticos', 'shampoo', 'premium']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '0f0bdf65-6f96-44c8-aed8-7b5ffc2a9f01',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Shorts Casual',
  'Leve e confortável para produções descontraídas.',
  59.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['shorts casual', 'roupas', 'shorts', 'casual']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '9b4103b7-20e9-4518-95f6-f6f68d99ba14',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Silicone',
  'Produto versátil para vedação e acabamento em diversos trabalhos.',
  21.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['silicone', 'material de construção']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '8ceac941-b979-4d48-b614-e96520e03557',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Slip On',
  'Praticidade para calçar rapidamente sem abrir mão do estilo.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['slip on', 'calçados', 'slip']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd771a869-8769-478f-b620-3f0399c0a078',
  '6d1668ce-2df3-4f48-8dcc-05849cdf0ea9',
  'Smash Burger',
  'Carne prensada na chapa para garantir bordas crocantes e muito sabor.',
  26,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['smash burger', 'hamburgueria', 'smash', 'burger']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ac6402d2-e7dd-4adb-9823-8dd5c47caf34',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Sonho',
  'Massa fofinha recheada com creme e finalizada com açúcar.',
  7,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['sonho', 'padaria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '935a5736-2f67-4bba-9a33-75a4e0329fda',
  '5e8bd422-7e14-4810-b4f4-e4de5f63307e',
  'Strogonoff',
  'Clássico cremoso servido com arroz e batata palha.',
  31.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['strogonoff', 'restaurante']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '984d3f9a-d933-4906-bcf6-608467518caf',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Suco Integral',
  'Sabor intenso de frutas em uma bebida prática para sua rotina.',
  14.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['suco integral', 'bebidas', 'suco', 'integral']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '76f34f7b-17dd-4ac9-8f37-b23de6f78c63',
  '35874457-db2a-4928-bbc3-f35c92c0719d',
  'Suco Natural',
  'Suco preparado com frutas selecionadas para entregar sabor e refrescância em cada gole.',
  11,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['suco natural', 'cafeteria', 'suco', 'natural']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '65780735-5768-465a-ab41-d7ca392ed00e',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Suco Natural',
  'Refrescante, saboroso e preparado com frutas selecionadas.',
  10,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['suco natural', 'bebidas', 'suco', 'natural']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd0697590-5d9f-423e-9cd1-dc2be2b68a3a',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Tênis Casual',
  'Conforto e estilo para acompanhar sua rotina com versatilidade.',
  129.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['tênis casual', 'calçados', 'tênis', 'casual']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3f44b5be-bbe3-4acf-9cb9-9644df2c5085',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Tênis Esportivo',
  'Modelo leve e confortável para acompanhar seus treinos e atividades.',
  159.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['tênis esportivo', 'calçados', 'tênis', 'esportivo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '3901a0a9-399f-43bd-b0cc-f5cba252cf1a',
  '521975d6-4065-4dd9-a571-59cb6eb0f691',
  'Tênis Infantil',
  'Confortável e divertido para acompanhar a rotina das crianças.',
  79.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['tênis infantil', 'calçados', 'tênis', 'infantil']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '9147473a-b2db-4c2a-9a08-a74a3f8badb0',
  '8a9d52f4-196c-4bb1-9425-5fcc8cf7aa09',
  'Termômetro Digital',
  'Medição prática para ter em casa e acompanhar a temperatura corporal.',
  29.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['termômetro digital', 'farmácia', 'termômetro', 'digital']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ad9d464f-c57a-4bc4-8b32-c7fdaf3b2551',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Tinta Acrílica',
  'Tinta de acabamento para renovar paredes e transformar ambientes.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['tinta acrílica', 'material de construção', 'tinta', 'acrílica']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '19e3446b-35d2-43e3-acf2-a0313fbe2f53',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Tomada',
  'Solução prática para instalações elétricas residenciais e comerciais.',
  12,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['tomada', 'material de construção']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'ddd954cf-7ea9-465a-a100-8b0b59c2c244',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Tomate',
  'Tomates frescos para deixar suas receitas ainda mais saborosas.',
  7.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['tomate', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '067ad455-3875-4631-9c68-ba87316628f4',
  '4c6ec094-c5c3-4afa-b1d3-28d5f6bab94f',
  'Torneira',
  'Modelo funcional para cozinhas, banheiros e áreas de serviço.',
  45,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['torneira', 'material de construção']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'fe70a902-8e0d-4231-b9c5-a24a43f9ca59',
  'faab2ddf-d17a-45b6-9e89-0569e5f626ab',
  'Tornozeleira',
  'Detalhe delicado para complementar seu visual com charme.',
  22,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['tornozeleira', 'bijuteria']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '29c29182-6f64-4315-ac12-fcd320c3a06b',
  '82948f51-509b-478e-b58b-c36e6abbe332',
  'Torta de Limão',
  'Torta equilibrada com creme de limão, base crocante e cobertura delicada.',
  15,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'preorder',
  '{"max_quantity":50,"min_quantity":1,"max_lead_days":30,"min_lead_days":1,"scheduling_type":"made_to_order"}'::jsonb,
  '{"requires_date":true}'::jsonb,
  ARRAY['torta de limão', 'confeitaria', 'torta', 'limão']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'edf4af13-1c08-450e-ab15-e9b7ef047c9f',
  '56e6cc00-3e4b-4cf0-87ce-c88b3ffd0790',
  'Torta Salgada',
  'Massa macia com recheio saboroso para um lanche rápido.',
  15,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['torta salgada', 'padaria', 'torta', 'salgada']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd202213f-1951-45c3-83ab-c138e4e5f0f1',
  '3925f05e-7032-4a6d-a2f0-2f62c0e4c561',
  'Uva',
  'Uvas frescas e doces, perfeitas para consumir ou compartilhar.',
  11.5,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['uva', 'hortifruti']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '9595100c-db4d-43d5-964f-870cb643b95e',
  '0ee642fc-1c30-4f97-90df-aa1973fb6be2',
  'Vestido Casual',
  'Leve, elegante e fácil de combinar para diferentes ocasiões.',
  89.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['vestido casual', 'roupas', 'vestido', 'casual']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '2bac3a04-d546-4e82-9696-07a874b1d8de',
  'f7c5c071-1338-403c-a54f-a577e91ab803',
  'Vitamina de Frutas',
  'Combinação cremosa de frutas para uma bebida deliciosa e nutritiva.',
  13,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['vitamina de frutas', 'bebidas', 'vitamina', 'frutas']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  '67522d35-cf49-454d-b3a9-1e8389776490',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Whey Isolado',
  'Opção de proteína com fórmula concentrada para complementar sua ingestão proteica.',
  159.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['whey isolado', 'suplementos', 'whey', 'isolado']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

INSERT INTO public.products (
  id, category_id, name, description, sale_price, cost_price, profit_margin,
  promo_price, unit, allows_fractional_sale, available, product_type,
  preorder_config, requirements, synonyms
)
VALUES (
  'd81515b3-07fc-4358-b606-fa7ae7010f96',
  'd9a0351e-a1ca-46a7-9441-f7226f181e38',
  'Whey Protein',
  'Proteína em pó prática para complementar sua rotina nutricional.',
  119.9,
  0,
  0,
  NULL,
  'unidade',
  FALSE,
  TRUE,
  'stock',
  NULL,
  '{}'::jsonb,
  ARRAY['whey protein', 'suplementos', 'whey', 'protein']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  profit_margin = EXCLUDED.profit_margin,
  promo_price = EXCLUDED.promo_price,
  unit = EXCLUDED.unit,
  allows_fractional_sale = EXCLUDED.allows_fractional_sale,
  available = EXCLUDED.available,
  product_type = EXCLUDED.product_type,
  preorder_config = EXCLUDED.preorder_config,
  requirements = EXCLUDED.requirements,
  synonyms = EXCLUDED.synonyms;

-- 3. GRUPOS DE OPÇÕES (product_option_group)
-- -------------------------------------------------------------------------
INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'a17ed77e-34e5-4cdf-9a19-6da377cb2086',
  'c638c4f8-3a86-472e-97eb-56fcab70ba2b',
  'Preparo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'efb86aab-6bcc-46c4-ba3d-1d437bfb5209',
  '12485550-708c-4bf9-84ce-6028e3b215c1',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '0f4f3a36-e6c4-4076-82c6-3b65cbba852c',
  'ef8da43f-5a8b-4f02-b9d8-018946eda910',
  'Embalagem',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'dd0be06a-6f35-4472-9c24-daf7a26b5845',
  '77b4a987-f2de-4ac5-a1c4-f3976ac7aaa4',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '90b78c31-9d25-4126-a8c5-a5175132b339',
  'b275c415-f5d4-49d8-8912-1d9f3ae002b8',
  'Volume',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8e4bc01c-1acc-48eb-b19a-39ae4e38fb7f',
  'a49e30b3-b856-44a0-aaaa-baa516d17cc3',
  'Fragrância',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e14790df-7191-4bd0-b97e-a5c503a93d88',
  '3145e822-2c8c-435d-b042-9e475e4183ee',
  'Volume',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e791f5dd-b5cb-40fc-8b28-e2f83c7678e2',
  '48ace5c4-df22-4b29-b34c-b670db4cb431',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '1f0d5cdf-1c8f-4b47-b324-b56f53097ec4',
  '80dbc095-bd84-448c-913e-0a5a11c8d9f1',
  'Formato',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'ec3d5f13-74a8-40da-8c23-4f6069a584f4',
  'b42afd81-26e1-4e48-87ed-6ac74c8611e5',
  'Aro',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5f89faef-979f-4d2a-a521-7b0c34661374',
  '4e1d3b5b-3429-4211-a692-c52ec605bfa1',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '42c342ca-a696-48ab-a08d-ef1d85d8c21d',
  '3a4cb1d0-0a86-41a5-b560-ce75c1278e22',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'dd28c037-90cd-45b2-abbb-9dbaf8b5ab93',
  'c613da69-1a83-441e-8c88-22bf159a26ad',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '224e79d4-d2f1-44a6-8bb8-f92f99e36ba1',
  '208c545f-077b-4c4d-b701-b5c319e375be',
  'Peso / Quantidade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '18032d10-b9d5-46d5-8cf5-c54317f0e6ac',
  'b15c2253-c2c0-405d-af18-30be2372d341',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e10a80f6-a969-4e0b-b538-58ae5a794d64',
  '64d6fe96-3af2-417d-b9b5-b8a3896e3832',
  'Tom',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'ce798039-b9b3-452b-b8b3-d1b014cb935f',
  'bde106f3-5332-482b-b454-3a9b1101bdcb',
  'Peso / Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '896f59e9-f585-46b7-a630-e59165b6518c',
  '7edbe820-ecfa-42fc-9559-9198bcda3888',
  'Acompanhamento',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '61c68b0c-84ce-4d88-aa84-9e4ad2417874',
  '40b0df19-20f8-4e61-bc5f-3cc5b609f900',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '55a60b6a-a3eb-46ff-abe7-b273d8a7dfe3',
  'c3101f4f-81d5-4f14-80fb-127b50f78a92',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '724cf09f-e15f-4bc7-8587-344999dab532',
  '8f7efa80-99ec-4809-a95d-ec97368f7581',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd3bf9b44-d53a-4a74-95f3-7367f28a27e1',
  '60abe375-ec41-49e6-9f28-16ef31f83b5d',
  'Preparo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5befbb82-287f-496a-9a98-963e2e3a6a3b',
  '3ad5c720-659c-4b9a-9c8f-c8e90b5cbdfb',
  'Tamanho / Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '51f3e353-f74e-4219-a6ad-7670775a2b10',
  'aa5e7901-8c86-435c-8d7f-3a6c905958f7',
  'Quantidade de Peças',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '851c3fc7-32d2-470f-83dc-791e6fe76427',
  '02696d39-f3f5-4196-b68b-89ebd939d73b',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '67cfc7f6-36e6-4ef7-bff7-c36e52cd9212',
  '02696d39-f3f5-4196-b68b-89ebd939d73b',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '30f55fb0-9736-435a-b14e-51aa1742ccdb',
  'f220c5f0-14f5-4eef-bc8d-374972f99275',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'a0510b9f-c215-4152-8111-b6ac59c8e622',
  '7e31a016-e73f-4428-8b5a-97d3b84ddca3',
  'Fragrância',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '72df77fb-cead-4be9-82a4-e4f8b1204bd5',
  'f01fc7b9-1f19-4e32-b47a-7413a2d294b2',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '170ea0a8-a033-4d0a-a154-42f08222501a',
  'c6b032cc-a442-4fd7-969f-c16d29e2c1b4',
  'Cobertura / Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b47b9d15-9900-4fa9-84ea-1e6915a81517',
  'a0203329-ee20-4d51-9565-a87ddf3cd4ef',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '51f7817e-3c20-476d-88cc-7eea7d1a656e',
  '307fcbd6-1b15-4970-9b7a-72b14791f8ab',
  'Cor / Estilo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b3cfbd10-30a3-46af-b386-7abaf31f67fa',
  '3ca9e6c6-18c6-424a-b6b5-9da198c23fdf',
  'Estilo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'a8399da7-3300-42f8-86eb-e8bf604aa31a',
  '46e25ed0-ec40-4952-8b76-a8ed319ea3b9',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '646d966d-0218-4de7-95e5-3460f93c2b78',
  'a91e67d8-31c7-4000-993b-490eef1dd75a',
  'Tamanho / Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '71b7b561-1de4-4303-b785-433b16950869',
  '55287f60-7ab7-4a47-8a9f-8074f6bb0142',
  'Pedra / Banho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '22f4f1fd-74a8-44ba-b7a7-0b58e248a161',
  'ec89e8a2-6e23-4b1a-81cf-dd38afca0800',
  'Design',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '0793262e-a805-4aba-a3bf-a40c922ff9d3',
  'd231858f-0964-4c83-97d5-de203a197ba2',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd2422b6d-c0cb-400b-8854-22bd42310ac8',
  '1e832a74-01af-4096-a35b-9f244747c4e2',
  'Formato',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '927187fe-7e4c-414b-a81b-a2046f64323a',
  '8b85d55f-8e5e-4b2e-8ce5-8f14cbd03730',
  'Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f60c1128-7561-417c-a2c1-f8f0cb3e400e',
  'e15fb575-c135-426f-8eb0-76ec17049018',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '45df267a-387f-4d09-95fe-79bc958d68b2',
  'da5c14fd-16d8-413b-8da9-cc879eaabc2b',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '373c0732-f426-4642-9a41-0d798da9a655',
  'f6a967e6-a3cc-43ea-b77a-782e990e85ff',
  'Quantidade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '57d568a0-81c5-4851-89f6-c0733effd1be',
  '067a272d-bcb8-45e1-945d-9ae2aa2d5eac',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c0bf5717-661d-4186-b5c9-98cf3adde844',
  '05f22ec6-520f-48f4-b023-84fa9c7e665b',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '14dd214c-7a4c-46c8-b7b9-f88fdea55d62',
  'd1a7e486-8af2-40c4-a8d4-a5785152368b',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd794f3d3-c06d-4f94-a49a-ad4b77eca1dc',
  'd1a7e486-8af2-40c4-a8d4-a5785152368b',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '4a452391-fddf-4997-82ec-e0d479b8af61',
  '70262394-a8db-40b1-a269-2fb0efd07dc7',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b6957150-c289-44ae-9cf4-d11ec4e7f5e6',
  '70262394-a8db-40b1-a269-2fb0efd07dc7',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '70ace509-5cc4-40d6-851e-1a9516566f23',
  'e5a2b6ae-4403-48fd-a8d6-e8df9ee03b0d',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '7294d1d0-7f3b-4d37-a5b2-ff639177738a',
  'e5a2b6ae-4403-48fd-a8d6-e8df9ee03b0d',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '648e1ed8-85b5-42ca-bca2-02602193bb44',
  '4817b4e0-33f0-46fb-aac2-b6076a5e0b64',
  'Sabor / Variação',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd679c61c-bc5f-4d19-919f-03ed20e269b7',
  'f4b89d20-5e43-4255-a4bb-4f8cba8e38f7',
  'Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '50cd1240-84ae-4d99-8b5f-1b51e2d1c07e',
  '9e08274c-3fad-408b-9039-b06bc0d252e2',
  'Tipo / Peso',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '18cc3c38-1a97-402c-91ce-4ebba524feab',
  '59cadfe1-f0bf-4b64-84f1-7bb8485bf870',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '122e61fe-6434-4591-8833-d7fbcaa4b85c',
  'e3919329-b7ae-4f63-97c4-9677c62786de',
  'Opção',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '01ea099c-1524-462b-9ce6-d29778590c04',
  'd5142c94-9b40-4e54-a9ab-f25ce23cf6a0',
  'Combo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '6c21f1bb-787c-4d59-aa14-472a8362f09e',
  '1d640611-3a8e-466c-a276-b156c88abb82',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '88e9fcd5-b01e-4b54-ac57-a816fa4c60ef',
  'be6cc575-33fe-402a-a29c-9cb173e251ad',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'fd952812-fb34-49a6-b6d0-94288582f326',
  'b11df245-e43f-4715-9263-8e21e0a6fb41',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '17d52a49-5831-4ad1-968f-a1ad1cbf0f90',
  '55ca6585-191e-4eb0-a7ce-5d677931442b',
  'Cobertura',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '75289080-bbbf-4c62-9021-f09c6fdc1b5a',
  '43c3c4b7-fc26-4bb5-bb2c-07a92b69748d',
  'Versão',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8e4a9580-b320-4d2d-93f3-0ad8fe2ffb6e',
  '56ae3a76-555b-4232-adad-47b07f964bd2',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f3747deb-7b8d-41e7-9689-5e2695756a82',
  '7138291f-0bb8-4dab-b004-ed767760330c',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'dca88e0a-096b-4564-bbc1-fb61908181e6',
  'e7ed5ab1-7640-428c-81ff-7013683816f0',
  'Peso',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '9829bed4-e02c-46e2-b251-5ecd63fedc27',
  '784a7706-f6d4-4622-8f84-b8dba6f3e774',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'bb24253f-e432-45e8-a571-d407352aa866',
  'adcab8a4-ce1f-4331-98dc-a74951db0dd3',
  'Pingente',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '47a4e964-dcb7-4677-a9f0-9153dd825676',
  '785b424c-f732-439f-b337-3204a712c009',
  'Acabamento',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '29ce109b-cb08-4a86-a4d9-e7bc5a495993',
  '8407b627-e3c9-414d-8470-84ac55c6de49',
  'Pacote',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2960a70d-a1ee-4ad9-a999-f14114c6c9bc',
  '2faecc67-80a3-4f29-a7b3-dc029311cc26',
  'Hambúrguer',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd1f0f1f5-c116-4910-b37d-8a4f1a27f295',
  'b660e4ad-218d-4f75-adec-62ed860ead9b',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '91cfe621-b99c-468b-9412-fa1dba959bf0',
  '398535d2-d478-451e-9127-bdc56645adeb',
  'Tipo de Combo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '47301635-eefb-461a-8df5-48954bd28f0c',
  '11cf761c-7310-4a4e-af46-497262cc1d2f',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5c47bc8e-b554-47ba-af6b-59760559d005',
  '5a1bce07-2f79-4035-be1f-96b0acff3093',
  'Tamanho do Combo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '89f0878e-5701-481b-8034-87c4d31155a1',
  'ecf9446b-5835-433b-b580-63776d83208e',
  'Prato Principal',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '33eaafc0-ce17-46eb-af88-767c872a760e',
  'e0c5542b-a584-4732-a890-d0f5fcaef465',
  'Tratamento',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '80ab4658-acf5-40c1-9706-e864e070f1bb',
  '450e6f0e-0f46-4118-9b9f-c53ae30d40f5',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'cbb8f87f-d5e0-4bd3-a9e3-fefb2e338df9',
  '450e6f0e-0f46-4118-9b9f-c53ae30d40f5',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b720cdce-d092-4c3b-98cb-c2b8c00f6944',
  '3ebfb308-f3fa-4bf8-97f1-ebc28ff01ed7',
  'Acabamento',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '6a5ff005-bbc8-4300-87c2-bb78e1d7ab04',
  'b37858c9-a9e1-4071-8c8e-bb767e08111e',
  'Tom',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '834172a9-a4a6-4cad-affc-bfaf32272ff2',
  '3764902a-2e63-4dc0-9013-e16035e2ab35',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'ad4837e7-99f0-4dd2-a784-f12f46da551a',
  'aa302d97-7471-4665-a1dc-0c2428322ee1',
  'Peso',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2eaedaa7-8a41-46b9-9894-5f088f213531',
  'c69adf14-f923-44b0-b816-dac1ee3d0a2b',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '67525160-8531-4ecc-8ba4-1ade493878a3',
  '0e981173-d758-4803-b2f6-68e8ad6b4cb3',
  'Peso',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'a9bc5f3a-2e82-47cc-a035-6f120a3bf8e6',
  'fc9abb19-47ca-4494-b1e4-2d08db333f79',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'ec7ed7b9-218f-49df-b68c-3b7ebc59adf1',
  '634d8962-736e-48bf-bbf4-720122d933fc',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c12ad440-064c-4067-84a3-409c91134d7e',
  'd2ac325c-61be-48cb-b590-cf56b7864cec',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '0a7b3fae-eaeb-4a71-ae92-66d5be4c71b3',
  'bbf05a24-2e09-45b4-8f8b-c0ef28cf7226',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'ecfdf20d-e417-433e-9676-5d18e7afab13',
  '6cc22d2d-d61f-471b-9875-940ce2de0dac',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '08a92e8a-5ef5-4db8-9dcd-30e2061ee23f',
  '05aa398b-0ad9-40a3-9f5f-002510c6c6f9',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2887d1c9-42dc-420b-a6ba-0895f2bafcf9',
  '3bd3012a-3b3d-44a7-8724-07f7c55e0335',
  'Fragrância',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'fcdaa940-3cd6-43aa-a0cf-926bf7cb8ea1',
  '2821de5d-e206-49f7-982a-76a5a6432e93',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'ece25e50-2e9b-4dfb-b43c-6f2efec36427',
  'fab625a1-736e-4f2d-8510-2f179d177b7d',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '4e85a287-be20-4524-aac2-3fbd0431a4c3',
  'ccb62220-786e-4ed3-a7e0-047b2b9a7076',
  'Volume / Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c83d0666-a066-429d-bc6d-6d2156a0ed87',
  'e9d2ab74-a1a1-4e27-bd1e-c070de09140a',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f9ec45e5-99d2-4ce5-a7f5-c78a41969f78',
  '5beed968-5ad1-4926-b6da-110ec365b11e',
  'Cerdas',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'a2311136-ca1f-40d1-9008-aa75572f6804',
  '20a09e0a-05d2-4c6a-8e31-ab5ddc3f4ad1',
  'Aroma',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '6fafb052-fff3-4cbc-a128-b4244eb6c266',
  '45c97958-7c8d-4ccc-b1a8-e8a76493c171',
  'Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '73823962-359d-404b-a17e-9f0e57f2d907',
  'fba55bb7-526d-4afa-9b5c-696e9303eb1f',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '9efc39c8-08f1-4322-a21f-835b8f915ca6',
  '6f1d8f3f-3f1d-48df-9193-f9a76d67d9d5',
  'Porção',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '41d71237-c306-4d16-a320-3119b97d72de',
  '41e85e3b-3b91-4f1e-a2ac-ef7706dba994',
  'Preparo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '066b7dc8-89b8-483c-98de-42904f4ae4eb',
  '3275362c-2ec6-4317-9ae2-94951f5a99d9',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'baa5885b-12a1-4afa-b0c4-981d3dde8f26',
  '9208976d-a360-4921-a9b7-853cb3f28976',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '3684937a-58db-4ec0-9bc0-56f06ae7ed17',
  'a6ba42c7-1227-4752-a753-f29a47ecf8c4',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '7fe68727-9514-4101-adc3-b8d0d21b87da',
  'a44ab40b-311d-436f-8089-e9bde8adc5b8',
  'Acabamento',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '400c1bc5-ce39-48e1-b4b2-6e4544fd50ef',
  'c09a264e-0bfd-4900-8e61-b09864579650',
  'Peso',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '34c0cbc9-d66b-420c-b915-c59702351c14',
  'c2550062-6c29-449c-a71f-467422d978cc',
  'Fragrância',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd772b223-2240-4894-b6a8-57572321fa7b',
  '3d2d3f49-b138-407d-a863-eaf78c12b634',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c0c954ac-e9df-4199-996c-a2c978a9aa55',
  '6863bea7-4e45-4d26-874f-40909f0c8918',
  'Kit',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '6b1196c2-70c3-428d-8626-e30fd3840cc8',
  '8a433436-40db-476f-b634-389f54c83feb',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '9de0a2fd-6516-4426-8fec-94827a13cb48',
  '44b13cb3-7fa5-4f96-8763-f8acad2a5600',
  'Nível de Pimenta',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd14383c0-7aa2-4178-bcba-aaeee1fdd3fa',
  'e9c66236-60a3-4a2b-a4ca-8028e0073836',
  'Tom',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b681a824-83ff-4f3b-a538-29de78aa5dad',
  'ad990b8e-1249-416d-b695-7024fb9bd226',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '6bcc7880-2a89-4227-919b-4661f29ab8f9',
  'ad990b8e-1249-416d-b695-7024fb9bd226',
  'Lavagem',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c710913b-08a1-4c52-803a-7a13f88addc3',
  '3a200577-f0c7-4b98-af4a-453256a51f41',
  'Tema',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e8adfbe8-574f-4c4e-89f9-50a85b42d58a',
  '57eee9c8-3d57-4ca7-a222-9709e56d16ba',
  'Estilo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e99a42ac-a22b-4cd9-9133-a20a14fbc433',
  'c80acbaf-9748-4176-9ed2-93daa019bced',
  'Linha',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '7bf53011-37fc-4371-96ef-721002c012e4',
  '0c985351-f341-435b-b33a-867d4dce4003',
  'Estilo do Kit',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b43d61f1-2a65-4a9f-9c81-ebf9c9c19c22',
  '8c0ab3ef-493e-447b-afa1-559f636dec23',
  'Linha',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f9a9503d-5a3f-4e4e-957d-c6a4b1d0596a',
  '74c1b93c-4a79-4b9d-ab3d-7da01ceb17e1',
  'Cor / Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'aef4c77e-373f-453d-b2f4-c9955fa8c09a',
  'a6e76d01-73be-4d9d-a2be-124b9fc82695',
  'Pacote',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2f7238f5-f3cd-40ed-9bba-eda9504b0c45',
  '14dd8c16-15ca-4eee-b951-576cc50f33a7',
  'Conjunto',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '0458edf9-a30c-468c-a19f-a4bf00cc1882',
  '5b706425-9796-49f6-9cb7-8064a8f0b5bc',
  'Nível',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd04dfd2a-1cbe-4a4a-92ec-f7e6fc8e4949',
  '16773bd5-d795-47a9-bccd-85c9f8b9172e',
  'Quantidade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '04c96dec-256d-4b1c-ab6c-677a7beddae2',
  '242912dc-d0f5-4b17-bf11-5f438c949305',
  'Conjunto',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '7049cf90-92d5-4e74-8055-2759b1659eac',
  '101c4f1b-de01-4df6-b565-3e59d9b22ebc',
  'Variação',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '933ea6ad-d27f-40ee-b631-831e119d6f80',
  '12ac291d-dafb-4616-946c-bce6e66b7f2b',
  'Conjunto',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '4a8a2b22-7222-439d-ae22-d4dbdc29d4d2',
  '29c4b608-3910-4bf0-a6e3-5c5d0ce3c03f',
  'Variação',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '0a51f92a-03c2-4dd7-b2de-98a6a13d4a0b',
  '036e1ee7-e247-452c-acc0-0386c3af52c1',
  'Versão',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '76c7f1c1-e717-4676-835b-34b0abdec5e7',
  '352d2504-f2c3-44b9-bbe4-7579e173b0b3',
  'Combo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '7844e0d0-7b5d-485c-a7ae-c65bd7bd2d53',
  '86be9da7-bea0-4043-84e7-4c1e18a14c01',
  'Fragrância',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5edcbda2-aa44-4402-b6aa-ddd29e50170f',
  '14736ae7-bd53-4784-b14b-bd3f57e43144',
  'Conjunto',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '040ed535-041a-4c50-a54d-03b4bcfa8143',
  '8dadc041-e332-4f55-b565-b8e9d2fe4991',
  'Estilo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '9ad15e74-05a0-4fb6-bf7a-44360d3b5513',
  '2c87dbcd-0b19-4bef-b8d3-42e7453b1007',
  'Composição',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '3d318a93-b2f8-4f82-b3fd-d06daacf2b68',
  '3bfe12f6-42bc-49f1-a6fe-6ce2d21092bb',
  'Combo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e08fb32f-dc7d-4e93-8ca3-26b915443ce2',
  'b3c7ac14-bc91-41b0-bf96-c43f979d58a5',
  'Linha',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b624772a-3554-491b-9f9c-7d9b658ece5f',
  '3dd29812-d4e8-467b-bd8c-dc92b87a1c33',
  'Potência',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8ecd3c08-77d1-43c9-ba82-d85b65fd56de',
  '2d0209ec-9a42-4a3f-a724-54526602b5c3',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '0d05e4ad-07b4-49b9-a0cd-27f5110a453a',
  '89366c49-99fd-419c-a7d1-25e4fcf926ca',
  'Quantidade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f3c2a064-970d-49bf-b442-1a1997bfb43b',
  '1cb7cb51-5d1d-4110-ad61-557e84c2ac6e',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'dbaf40ff-a774-4c6e-bb8e-3d9659df4cf8',
  '4ef386d9-9491-4332-8f67-dcc4798b36fd',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '909ca402-50e5-4eb2-957c-914bacb08379',
  '6ab47209-8abf-45d0-ad74-a4bc6641a6af',
  'Granulação',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '123a2b73-4e1b-4748-b8d8-6833cd82a5b4',
  '746f4041-b75f-4013-b98c-e53a09309c12',
  'Peso',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f0d05eb6-8475-43ff-98d2-a71933d9e3f6',
  'fc89e734-be40-48ed-915c-35e0331655ce',
  'Cores',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f51f17ed-79b1-4f0b-bffb-cbec58e955d9',
  '8a290d28-12c7-4e15-8ff5-d2a786cec6f4',
  'Função',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'eaacfa92-e354-4f58-8cb1-d8652a295834',
  'bf7841b9-b831-4bba-bdea-12bc317d7064',
  'Efeito',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '993eb7c6-0cc3-4530-8adf-c11500ffb4f3',
  '3f634ede-b4b8-4465-a7ab-40a8134af109',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '76107122-6bd5-4387-96cb-ce10ac2d0333',
  '16db573f-e050-4e6c-ac4c-272b4bedce81',
  'Molho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b01ddbff-a40c-4a89-bc71-30b1c20af804',
  '08d2c698-6e28-42d9-b22e-adf97c89144f',
  'Embalagem',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '6cdefb2c-d6ba-439e-ba60-80af5c90f298',
  'c9917b38-da55-4136-890b-c31d45559ef8',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2ab5aa65-3c6e-451a-9db5-d3285f923362',
  '6bb3c123-ee23-4bbe-b69a-ed9d7f30a2be',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '84e9e873-a2d2-42b7-9f2e-92b772d6e042',
  '6bb3c123-ee23-4bbe-b69a-ed9d7f30a2be',
  'Mensagem no Bolo',
  'texto_livre',
  FALSE,
  0,
  1,
  1,
  60,
  'Ex: Parabéns Lucas! 🎂',
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '31e78861-3da8-46c2-af34-afe6f69990ae',
  '608ec530-e683-4889-9c6f-8ef5ab10a74c',
  'Kit',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '546e84a5-613d-4334-825f-43e1cc02792c',
  '23f4e445-67f3-4407-8897-15813d8910ee',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'de9a069f-b884-4144-a74f-ad5894bd3498',
  '25ccb671-e00f-49d1-bad5-0fdca204b99e',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c63b2de7-b29e-43a7-8985-0e21ba464f21',
  '2851f29c-093b-4c96-b2a2-2c115109203d',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8e4f07a1-58b9-48ee-a7c5-c113b2fcb102',
  '2851f29c-093b-4c96-b2a2-2c115109203d',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5001e83b-9bd7-4cc1-bc41-9457426446a2',
  '1713da16-568f-45fd-a8d8-1d0cb7da1ba8',
  'Embalagem',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'db3259f9-05c5-467c-8924-e963a2b7ce02',
  '79699139-3070-4b1c-9d17-b0561f87ba95',
  'Versão',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '64fd74c0-e44f-4db2-834d-b02fff936963',
  'fb66fa41-7657-4d95-afa3-a71f2f85e8b4',
  'Fragrância',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2fcecc8c-5330-4105-bfef-71d0b42b34fe',
  'd772c63f-ad87-484b-be8b-31f1e01ab513',
  'Porção',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8f4edb8b-390d-494e-8d51-5c1baae394fc',
  '57b9d54d-1448-4338-8cc1-55de576e21dd',
  'Paleta',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '1181eb90-a404-49fe-8d3d-178657dbd0b9',
  '5b2589b0-c444-41d6-9b4d-a41b459f810d',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd4caef5d-d92c-4f3c-aeb7-3d3173f1b4c5',
  'bf192e1f-7934-4c5c-b24d-04950aebea3b',
  'Opção',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '63b9d131-9862-4e83-bca2-cbc589a7eb6f',
  '78daa8a2-5039-48b4-8fde-496d500be1b9',
  'Porção',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '1d1c7912-3247-493e-bb47-eed5e58763c3',
  'cdc775bf-986c-40cd-875f-a3af0e744dcd',
  'Quantidade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8ac92a5b-64e8-462a-a99c-3dcdc1ac7f08',
  '8e53d4a8-279a-4057-9aa0-b7b6ec978732',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c17039e2-4f63-457e-8428-0cf33ba45832',
  'faf61ae1-fbb4-4bca-b309-f01861e106bd',
  'Pacote',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b7676e05-bdc7-40eb-ae6c-bb409d31f77d',
  'e8ee33e6-eab9-4ee2-8125-09592b245cb9',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e5f103e7-e242-4ac2-a332-a7c01f6862f1',
  '7e02a5a2-ee33-4ab7-ac5c-7b99b866777c',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2d0d4aaa-ca6a-439d-a77e-c52089840842',
  '03018dae-fa15-4173-a783-e7afb1a04905',
  'Sabor / Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '244feacd-c5a8-4776-a780-5941b043fdee',
  'cdfc59d7-cc1b-41d3-8c4c-6fd03a9d4bd0',
  'Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '49d5619e-be09-40cf-9b6d-7908d99d466e',
  'ca8fe5c5-f94a-40f7-8bde-1fc0988f3b83',
  'Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c34fe1ee-c948-4950-8547-b0347a0d3581',
  'cfb95599-cb35-4487-a27e-cdc4f7eefc08',
  'Volume',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '54907a75-9b6d-4770-a89a-2254f39daba4',
  '4582f9c5-33fb-40dd-9020-fd9845b42eeb',
  'Volume',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '63562b0d-ea3c-4f7c-9804-209767027dfb',
  '1aa0af17-9581-4190-a878-092baecde6bb',
  'Volume',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e3141d11-2ff1-42f7-aa6c-3a7d519cc77e',
  'bdea675f-e95b-492e-b8b5-b2adf7197508',
  'Tom',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '27366150-03f8-4558-b220-a0f98974eda6',
  'a068e9b3-8e4f-4769-94a0-0d7c342398e8',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '6badd9c9-c47c-41b7-9a3f-3716d5754855',
  'a068e9b3-8e4f-4769-94a0-0d7c342398e8',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '413668c6-6943-41dc-bb0c-7d902c176347',
  'b4f1e55c-d4b7-4ad8-8f1a-9fedddf56a6c',
  'Proteína',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'aa9e5f58-507e-4184-83b8-42f5fd7a5a46',
  '67c59f81-0da4-411f-87c1-c07ac673eac4',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '09253cf9-5639-4944-aa6f-9b602fedbf94',
  'ff8acfaf-b4bf-4ea9-aad1-5a6a43ae9b8d',
  'Sabor / Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'ca361106-8782-466d-852e-b4cf4a37558c',
  'a309ed85-408d-4dfb-bad2-4e6fe90e9d50',
  'Variação',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '862fb762-3887-414e-9a81-08adf1dc08de',
  '59714e57-7dc2-44b6-9d7c-7870a8bfc930',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '06d7cdf8-b315-4456-bdef-9f0af1c26f6e',
  'e74f64ef-83af-43b4-b363-e607ea86ccaa',
  'Cor / Acabamento',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f1d2d3b8-4076-4986-956f-eb592016f8a3',
  '240a8d15-676a-4cbc-85b5-7fc94df10614',
  'Dificuldade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'af83c79d-2d24-42e2-a43b-92b9f4bfffc1',
  '1fc4c6e5-cf14-4cd7-860c-58ed2f03007d',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '696a9546-6d4b-4181-9218-f3a3b7a77c3e',
  '1f11a76b-7f38-46ec-b5a7-e4c853fc93cf',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '332f5a8d-c1ef-42e0-886a-3aea6554b6a4',
  'e1fec6a9-8d93-4ee2-b72e-526d60649b67',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '98497543-e664-4904-bf7c-1c67459f7423',
  '2139fa4c-3144-462f-b93c-58f79b0c7f0e',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '72c50bee-721e-4dbd-9292-bb0265973c05',
  '7d0a681f-07ce-4260-8387-39d74e2621b5',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '3e18c776-9640-430b-bb95-29aa4e0d07e8',
  'de96a44f-b730-4d55-8db5-5f5005582cdd',
  'Fragrância',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f6ab5491-8738-463a-9edb-3bb674cb5f53',
  '771d632f-fca2-4276-b74c-da9cc849e2af',
  'Tipo de Pele',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '69df37cc-f52a-4828-8447-7ee7bb9ba08f',
  '112e6653-2b82-4a3a-b5c6-5754296016c3',
  'Proteína / Estilo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5a42167a-b620-4eb3-a02f-8c03561d4896',
  '912b2f31-bf72-4fab-befa-e74d45ced138',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2d83722c-0124-45c2-b248-94c52f13bf3f',
  '87cdfb5c-cb53-4142-9315-bdd96452e0a2',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'bde413ad-fb36-42b0-99df-993b70ba0e75',
  '6c759c67-84a4-41aa-9210-94707c2235f5',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '9610dd9d-10e5-4190-83e0-27fdb1cb9312',
  'c732cbde-ac0a-4902-bad4-aba50d01d6a0',
  'Ativo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '17386d6b-c7ba-4e96-ac45-663312ab89b1',
  'a835fcbf-d5f2-4e51-9ca3-60e27ad94b9b',
  'Capacidade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5973bcbc-2ce9-4be4-81d0-a79a0f45149f',
  'a32c0091-f6f3-4117-80e9-2f00030415f3',
  'Tratamento',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '77bd2b2d-e547-41f8-93ef-79a2a01bdf6b',
  '0f0bdf65-6f96-44c8-aed8-7b5ffc2a9f01',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e6650e07-d65f-418a-96d4-1fae807f5a62',
  '0f0bdf65-6f96-44c8-aed8-7b5ffc2a9f01',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '5f4b81f0-bd6e-47eb-8c53-c2b464c3ef3e',
  '9b4103b7-20e9-4518-95f6-f6f68d99ba14',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'eca099f4-6ef9-4e25-83bc-729bee2aacd5',
  '8ceac941-b979-4d48-b614-e96520e03557',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '4dd34d0d-8e1c-45a4-bf1a-fda0055663bd',
  'd771a869-8769-478f-b620-3f0399c0a078',
  'Quantidade de Carnes',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '45b1e21c-dcd6-4d69-b8bd-eda94e11912f',
  'ac6402d2-e7dd-4adb-9823-8dd5c47caf34',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8a7239a2-fdb3-4bd6-a35d-31085f955e6b',
  '935a5736-2f67-4bba-9a33-75a4e0329fda',
  'Opção',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '9c328966-83ab-4d86-9724-7449445b8219',
  '984d3f9a-d933-4906-bcf6-608467518caf',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '43e870fa-2baf-42f2-b69f-5f98aefd38d7',
  '76f34f7b-17dd-4ac9-8f37-b23de6f78c63',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '04554e66-80f0-4b88-a8b6-67a6228b60c4',
  '65780735-5768-465a-ab41-d7ca392ed00e',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'cc439c42-1d67-4122-a6b1-a884aee5b974',
  'd0697590-5d9f-423e-9cd1-dc2be2b68a3a',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '4be8536e-af19-40cf-9461-1e202d2311ba',
  '3f44b5be-bbe3-4acf-9cb9-9644df2c5085',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'cd3524b8-d6d4-4626-b1a3-c1575d067c6c',
  '3901a0a9-399f-43bd-b0cc-f5cba252cf1a',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'e4b69ee7-6c94-46d7-a001-5165d3352fb4',
  '9147473a-b2db-4c2a-9a08-a74a3f8badb0',
  'Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '216d5683-5ecf-44db-b496-7f592f8b6fd7',
  'ad9d464f-c57a-4bc4-8b32-c7fdaf3b2551',
  'Cor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '2e539b93-5669-4f0b-aa2e-bac8a94198f2',
  '19e3446b-35d2-43e3-acf2-a0313fbe2f53',
  'Modelo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'bee9c3b7-0ead-4bf0-a008-6402054d0fde',
  'ddd954cf-7ea9-465a-a100-8b0b59c2c244',
  'Variedade',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'f41a3a50-84d8-4b88-ae16-6249137d35af',
  '067ad455-3875-4631-9c68-ba87316628f4',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'd4f54688-dbec-4bad-b3a9-257df3111713',
  'fe70a902-8e0d-4231-b9c5-a24a43f9ca59',
  'Estilo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b9cd2ae3-ce6d-4aa8-9594-53946962aa81',
  '29c29182-6f64-4315-ac12-fcd320c3a06b',
  'Cobertura',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8dad67d2-457c-4034-86fb-5407e3c53ba7',
  'edf4af13-1c08-450e-ab15-e9b7ef047c9f',
  'Recheio',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '51d4382d-cfaa-43f4-86e8-04de8acdc764',
  'd202213f-1951-45c3-83ab-c138e4e5f0f1',
  'Tipo',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '8cd36bac-a103-4219-9f56-fd9ff4231454',
  '9595100c-db4d-43d5-964f-870cb643b95e',
  'Tamanho',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'dc589a7f-8531-4cc8-8827-d6bf22d83067',
  '9595100c-db4d-43d5-964f-870cb643b95e',
  'Estampa / Cor',
  'single',
  TRUE,
  1,
  1,
  1,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  '7a59b638-21cd-42a4-b963-c57f334e3e1f',
  '2bac3a04-d546-4e82-9696-07a874b1d8de',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'c0f0c881-8607-44a4-b71c-548448ba6e31',
  '67522d35-cf49-454d-b3a9-1e8389776490',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

INSERT INTO public.product_option_group (
  id, product_id, name, type, required, min_selections, max_selections, sort_order, max_text_length, text_placeholder, accepted_file_types, max_file_size_mb
)
VALUES (
  'b8050945-a511-4c4b-a182-a47b26a15a6e',
  'd81515b3-07fc-4358-b606-fa7ae7010f96',
  'Sabor',
  'single',
  TRUE,
  1,
  1,
  0,
  NULL,
  NULL,
  ARRAY['application/pdf']::text[],
  10
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  sort_order = EXCLUDED.sort_order,
  max_text_length = EXCLUDED.max_text_length,
  text_placeholder = EXCLUDED.text_placeholder,
  accepted_file_types = EXCLUDED.accepted_file_types,
  max_file_size_mb = EXCLUDED.max_file_size_mb;

-- 4. ITENS DE OPÇÕES (product_option_item)
-- -------------------------------------------------------------------------
INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd20d5748-6f3c-4099-b1a2-08f320895bbe',
  'a17ed77e-34e5-4cdf-9a19-6da377cb2086',
  'Descascado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ea6ee475-7ba6-4618-8c6d-502b044d185f',
  'a17ed77e-34e5-4cdf-9a19-6da377cb2086',
  'Cortado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd770c70a-edd1-4822-bd15-40830df7da22',
  'a17ed77e-34e5-4cdf-9a19-6da377cb2086',
  'Bandeja',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0508db09-2f8b-4976-b4dd-758bc84b7832',
  'a17ed77e-34e5-4cdf-9a19-6da377cb2086',
  'Inteiro',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c5f90d54-beed-4871-9d9c-1083c0938e89',
  'efb86aab-6bcc-46c4-ba3d-1d437bfb5209',
  'Semanal',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0a081af4-5b28-4c5f-b704-3cd5095c1eb0',
  'efb86aab-6bcc-46c4-ba3d-1d437bfb5209',
  'Executiva',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bfd77c29-f8ff-46da-986a-501935717e15',
  'efb86aab-6bcc-46c4-ba3d-1d437bfb5209',
  'Espiral',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '013f74d2-7a06-429d-b413-e1bab2c063b6',
  'efb86aab-6bcc-46c4-ba3d-1d437bfb5209',
  'Diária',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3f2712bb-2bec-45f4-902d-ec7c5bd39e21',
  '0f4f3a36-e6c4-4076-82c6-3b65cbba852c',
  '1L',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5e371933-850e-4f48-8abb-4a31e8fd0900',
  '0f4f3a36-e6c4-4076-82c6-3b65cbba852c',
  'Pack 6',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '16c21fd9-54fb-404c-906c-0f168a9f6a4b',
  '0f4f3a36-e6c4-4076-82c6-3b65cbba852c',
  'Pack 12',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '38b91e0c-0f8a-48a7-ac4c-19c87162f1ab',
  '0f4f3a36-e6c4-4076-82c6-3b65cbba852c',
  '500ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '699ea27d-a7bd-484f-af11-978e0474c9d7',
  'dd0be06a-6f35-4472-9c24-daf7a26b5845',
  '500ml',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e25517ef-89ba-4951-b25c-58363fa9ec06',
  'dd0be06a-6f35-4472-9c24-daf7a26b5845',
  '1L',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c5e82ea4-a12c-41a4-9cfa-b9c702b5f642',
  'dd0be06a-6f35-4472-9c24-daf7a26b5845',
  'Pack',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '858ca667-e596-4a6e-8cc7-f8155850c213',
  'dd0be06a-6f35-4472-9c24-daf7a26b5845',
  '300ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3e691f02-3e30-4821-b130-e3cfb13b0ac7',
  '90b78c31-9d25-4126-a8c5-a5175132b339',
  '1L',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '01383c4a-020c-4b05-b44f-3edbe2ec7117',
  '90b78c31-9d25-4126-a8c5-a5175132b339',
  '1,5L',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '63b2f248-c3e8-4062-a404-0d02944edb90',
  '90b78c31-9d25-4126-a8c5-a5175132b339',
  '5L',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f1fee5bb-8e14-452d-bdbd-3ebf6fce7da7',
  '90b78c31-9d25-4126-a8c5-a5175132b339',
  '500ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5f0b53f7-01d1-4456-82e2-2888e68d4305',
  '8e4bc01c-1acc-48eb-b19a-39ae4e38fb7f',
  'Floral',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4938ccf7-6d44-49d8-ab34-fd78b9828939',
  '8e4bc01c-1acc-48eb-b19a-39ae4e38fb7f',
  'Algodão',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '465406fc-7cc4-453b-8575-74d2d6541032',
  '8e4bc01c-1acc-48eb-b19a-39ae4e38fb7f',
  'Frutas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4f57501d-0d11-44b7-bd50-07852e2ccb8f',
  '8e4bc01c-1acc-48eb-b19a-39ae4e38fb7f',
  'Lavanda',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e9025e76-b7cb-481e-8b5f-705e69eafd27',
  'e14790df-7191-4bd0-b97e-a5c503a93d88',
  '100ml',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8bf60e14-fc18-4327-85de-ff618b1ea468',
  'e14790df-7191-4bd0-b97e-a5c503a93d88',
  '300ml',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6019fafe-b7b3-4148-b3f9-e609869ffa0b',
  'e14790df-7191-4bd0-b97e-a5c503a93d88',
  '500ml',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '08115e06-9bb4-4a27-a495-11a9728fece7',
  'e14790df-7191-4bd0-b97e-a5c503a93d88',
  '60ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cc7d7c11-009a-466d-90f5-e485d756dd47',
  'e791f5dd-b5cb-40fc-8b28-e2f83c7678e2',
  'Americana',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cad062c2-efcd-4e31-9ce4-3cd113dae6b4',
  'e791f5dd-b5cb-40fc-8b28-e2f83c7678e2',
  'Lisa',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b21c1201-3414-46ab-8a9d-d056a0cda8a2',
  'e791f5dd-b5cb-40fc-8b28-e2f83c7678e2',
  'Hidropônica',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e055e840-7d82-4386-bf6b-342886b5566c',
  'e791f5dd-b5cb-40fc-8b28-e2f83c7678e2',
  'Crespa',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e525969f-f4fe-43f1-9c4a-b31a14cf3181',
  '1f0d5cdf-1c8f-4b47-b324-b56f53097ec4',
  'Disco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0cd6176b-ab20-45bd-8d12-5fc3b1b0a933',
  '1f0d5cdf-1c8f-4b47-b324-b56f53097ec4',
  'Hastes',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f05116a5-f615-4873-8209-487df2eb6122',
  '1f0d5cdf-1c8f-4b47-b324-b56f53097ec4',
  'Pacote econômico',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0f9bc0b8-93e2-41e9-838d-644c2bd579a7',
  '1f0d5cdf-1c8f-4b47-b324-b56f53097ec4',
  'Bolas',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '64f34f99-998d-4bd5-a1ec-ac882a977667',
  'ec3d5f13-74a8-40da-8c23-4f6069a584f4',
  '12',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fde6695e-cb6a-41ed-acb4-5350ee0581ed',
  'ec3d5f13-74a8-40da-8c23-4f6069a584f4',
  '14',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'caa4235f-cc61-42c4-b98a-e53767a60bf7',
  'ec3d5f13-74a8-40da-8c23-4f6069a584f4',
  '16',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e502a2e5-e2b7-4c1f-89a2-c5d4f4f82858',
  'ec3d5f13-74a8-40da-8c23-4f6069a584f4',
  '18',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '98ef63dd-1667-4c3d-9080-2e14f9590c0e',
  'ec3d5f13-74a8-40da-8c23-4f6069a584f4',
  '20',
  0,
  FALSE,
  TRUE,
  4,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cbfc1b1e-4028-4043-9a3a-02de470dea16',
  '5f89faef-979f-4d2a-a521-7b0c34661374',
  'AC1',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f786a423-cb57-47ba-938e-fe649475d6d0',
  '5f89faef-979f-4d2a-a521-7b0c34661374',
  'AC2',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7ca0c4fd-c4b6-45d4-a289-c6bb0999e649',
  '5f89faef-979f-4d2a-a521-7b0c34661374',
  'AC3',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7767fecd-c2f7-4d32-b51c-45b574237ef0',
  '5f89faef-979f-4d2a-a521-7b0c34661374',
  'Rejunte',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '69a0991b-ab86-4b54-9adc-0dd76870439d',
  '42c342ca-a696-48ab-a08d-ef1d85d8c21d',
  'Com luz',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '01327c44-263a-4f9a-8ed3-33adacb5d464',
  '42c342ca-a696-48ab-a08d-ef1d85d8c21d',
  'Com som',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c1a91324-56f9-4028-a52a-795dc32971bf',
  '42c342ca-a696-48ab-a08d-ef1d85d8c21d',
  'Controle remoto',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b0bb8964-8923-4f89-86a8-560926c4dea4',
  '42c342ca-a696-48ab-a08d-ef1d85d8c21d',
  'Plástico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6f2a4750-e2c3-40f9-9b57-ccb87a0f9813',
  'dd28c037-90cd-45b2-abbb-9dbaf8b5ab93',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '14c41107-1ce0-4aed-a5cb-8a4aac37474b',
  'dd28c037-90cd-45b2-abbb-9dbaf8b5ab93',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '392f114c-3b79-4b3c-8a43-f3b22946a132',
  'dd28c037-90cd-45b2-abbb-9dbaf8b5ab93',
  'Duplo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'de78c219-eebe-498a-b4d5-1c14d6fe199a',
  'dd28c037-90cd-45b2-abbb-9dbaf8b5ab93',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2a5960a6-f5c6-4a26-b4f9-77dd7fcc79af',
  '224e79d4-d2f1-44a6-8bb8-f92f99e36ba1',
  '1kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8fbf5f40-3842-4990-bae3-12ea641cfec3',
  '224e79d4-d2f1-44a6-8bb8-f92f99e36ba1',
  '2kg',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0686c5f7-bca2-46c0-8702-c16c5701f2bb',
  '224e79d4-d2f1-44a6-8bb8-f92f99e36ba1',
  'Cesta',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e9158256-2bf1-4820-8fc2-ec77cb8c11e3',
  '224e79d4-d2f1-44a6-8bb8-f92f99e36ba1',
  '500g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '105645c7-5a6a-4a6c-8d0b-55cbb4b0389f',
  '18032d10-b9d5-46d5-8cf5-c54317f0e6ac',
  'Morango',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'db5f01d8-4ec0-4367-85ad-a66231794ec2',
  '18032d10-b9d5-46d5-8cf5-c54317f0e6ac',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '32e1ff72-51a0-4fc3-847c-196674e8132b',
  '18032d10-b9d5-46d5-8cf5-c54317f0e6ac',
  'Cookies',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1df9f32b-e816-4c38-8858-54fc8e5aa5a9',
  '18032d10-b9d5-46d5-8cf5-c54317f0e6ac',
  'Amendoim',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cc98a7b6-b166-4cc2-a6ab-2c238b949ae3',
  'e10a80f6-a969-4e0b-b538-58ae5a794d64',
  'Clara',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9eb1c572-1c4f-43cc-b860-bec28dba9c3c',
  'e10a80f6-a969-4e0b-b538-58ae5a794d64',
  'Média',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '65bf2ff0-ca3f-4553-ac16-aeebd96b48df',
  'e10a80f6-a969-4e0b-b538-58ae5a794d64',
  'Escura',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3a4df9cb-3f76-4f77-ac5a-710357be3cbc',
  'e10a80f6-a969-4e0b-b538-58ae5a794d64',
  'Alta cobertura',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e9ebc0dc-6e55-4d35-b7ed-d6578699e144',
  'ce798039-b9b3-452b-b8b3-d1b014cb935f',
  '2kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4640a77f-9945-4352-823f-78b2f4b405c1',
  'ce798039-b9b3-452b-b8b3-d1b014cb935f',
  '5kg',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9ffa9083-f037-477c-915f-8203ef743762',
  'ce798039-b9b3-452b-b8b3-d1b014cb935f',
  'Lavada',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1d2518a5-ff29-42cc-84d4-0f7eb2ac4114',
  'ce798039-b9b3-452b-b8b3-d1b014cb935f',
  '1kg',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '51bba462-6015-454b-b6b5-15c8b9b6a49f',
  '896f59e9-f585-46b7-a630-e59165b6518c',
  'Cheddar',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1f055613-8923-4182-88ab-e510695aeb0d',
  '896f59e9-f585-46b7-a630-e59165b6518c',
  'Bacon',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '86549422-aab0-4c6f-8631-1673f0390ab6',
  '896f59e9-f585-46b7-a630-e59165b6518c',
  'Cheddar e bacon',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '50bea2cc-d579-402a-8344-f75979105d8f',
  '896f59e9-f585-46b7-a630-e59165b6518c',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '99629c5b-6481-4504-a8be-879f5bb03d6a',
  '61c68b0c-84ce-4d88-aa84-9e4ad2417874',
  'Rosa',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b05cb82b-a7b9-49ce-8834-b4e2390f8668',
  '61c68b0c-84ce-4d88-aa84-9e4ad2417874',
  'Vinho',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e3170935-b942-4aef-bb19-807c7632892c',
  '61c68b0c-84ce-4d88-aa84-9e4ad2417874',
  'Nude',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd2c0321a-9cc4-46dc-b715-21effa24391e',
  '61c68b0c-84ce-4d88-aa84-9e4ad2417874',
  'Vermelho',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '479fe77a-3665-4686-944c-4a38fd0d9104',
  '55a60b6a-a3eb-46ff-abe7-b273d8a7dfe3',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6b1b75d8-6608-4778-bd26-1613cba829b8',
  '55a60b6a-a3eb-46ff-abe7-b273d8a7dfe3',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9bacc66e-8643-444f-bac4-132ae5db0912',
  '55a60b6a-a3eb-46ff-abe7-b273d8a7dfe3',
  'Duplo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4a44835e-62c1-4694-a7f1-ff13e3d47c5d',
  '55a60b6a-a3eb-46ff-abe7-b273d8a7dfe3',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3e3e36db-257e-4e9f-9aa2-80f291507d95',
  '724cf09f-e15f-4bc7-8587-344999dab532',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e749ed44-a12e-4bbe-a441-12c15c2070b7',
  '724cf09f-e15f-4bc7-8587-344999dab532',
  'Limão',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'acaea905-51ac-4157-b726-fa881d7814bb',
  '724cf09f-e15f-4bc7-8587-344999dab532',
  'Laranja',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '251e9ca3-fd6e-4506-98f8-debd6acefab3',
  '724cf09f-e15f-4bc7-8587-344999dab532',
  'Uva',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a09f9024-044c-41e9-b995-e94d46396dda',
  'd3bf9b44-d53a-4a74-95f3-7367f28a27e1',
  'Grelhado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dae99cce-9624-42e2-8596-558e20715e8b',
  'd3bf9b44-d53a-4a74-95f3-7367f28a27e1',
  'Com queijo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '37545c5b-b48e-4094-bcfa-a614d9d81420',
  'd3bf9b44-d53a-4a74-95f3-7367f28a27e1',
  'Completo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ac0f09cd-b80c-4702-8f39-7ed8d98da353',
  'd3bf9b44-d53a-4a74-95f3-7367f28a27e1',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd5227baf-2e21-4901-8dd9-845c958514bf',
  '5befbb82-287f-496a-9a98-963e2e3a6a3b',
  'Médio',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f890c290-e2cb-4518-b438-bf25bbee8b46',
  '5befbb82-287f-496a-9a98-963e2e3a6a3b',
  'Grande',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c6495975-08f6-4b48-bf49-aea76959a1de',
  '5befbb82-287f-496a-9a98-963e2e3a6a3b',
  'Adesivo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3dacb04f-d910-46ca-b120-1439ae592c6a',
  '5befbb82-287f-496a-9a98-963e2e3a6a3b',
  'Pequeno',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2f79e5c0-4d76-4cfc-9d1c-bbca8342a404',
  '51f3e353-f74e-4219-a6ad-7670775a2b10',
  '100 peças',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '416200a3-013d-4fc9-910a-eddaa7289177',
  '51f3e353-f74e-4219-a6ad-7670775a2b10',
  '200 peças',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '46fc5f6a-11d0-44e1-a204-4337f6807514',
  '51f3e353-f74e-4219-a6ad-7670775a2b10',
  '500 peças',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '099d77df-3244-48f2-8b1b-81b64768c17d',
  '51f3e353-f74e-4219-a6ad-7670775a2b10',
  '50 peças',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2f52851e-7446-4fa5-8ea6-a3c8fa4d1ac0',
  '851c3fc7-32d2-470f-83dc-791e6fe76427',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ca1eeb74-a782-4224-b86e-d27c019a24ac',
  '851c3fc7-32d2-470f-83dc-791e6fe76427',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1a2a6cb9-d001-4544-b47d-65cd118d2366',
  '851c3fc7-32d2-470f-83dc-791e6fe76427',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f205fb8a-3f96-4fb1-ba7e-14463479d326',
  '851c3fc7-32d2-470f-83dc-791e6fe76427',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '09ae83d6-46c6-4c14-a315-68f09b52bc52',
  '67cfc7f6-36e6-4ef7-bff7-c36e52cd9212',
  'Preto',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c9268d5e-61df-4750-b57c-69d13a73cb94',
  '67cfc7f6-36e6-4ef7-bff7-c36e52cd9212',
  'Rosa',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b5c7a5bb-a042-4081-99f2-9fff6b0a43ae',
  '67cfc7f6-36e6-4ef7-bff7-c36e52cd9212',
  'Azul',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b9a771ac-f4dc-44be-9d2f-980e6768dff8',
  '67cfc7f6-36e6-4ef7-bff7-c36e52cd9212',
  'Branco',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e2329d84-dee3-493e-b961-c83b7e9e22fd',
  '30f55fb0-9736-435a-b14e-51aa1742ccdb',
  'Terracota',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4f5a2539-f368-4dd5-a6d1-9d4b4be6b118',
  '30f55fb0-9736-435a-b14e-51aa1742ccdb',
  'Rosado',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c49682ca-a411-4978-bcd8-94b5a7ff6c1a',
  '30f55fb0-9736-435a-b14e-51aa1742ccdb',
  'Pêssego',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '122d3705-aa07-4acd-bf50-78a18d66d1cb',
  '30f55fb0-9736-435a-b14e-51aa1742ccdb',
  'Coral',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a03c2732-cda8-4cec-a3a6-2a9e9675bade',
  'a0510b9f-c215-4152-8111-b6ac59c8e622',
  'Frutado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '260fe31a-3283-4792-932e-1d6fc29de012',
  'a0510b9f-c215-4152-8111-b6ac59c8e622',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1de2a9c8-751a-4525-8380-f52d6badfc69',
  'a0510b9f-c215-4152-8111-b6ac59c8e622',
  'Cítrico',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5e691c17-fa64-4dcd-8a80-e73646a2c282',
  'a0510b9f-c215-4152-8111-b6ac59c8e622',
  'Floral',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b5da4c52-87ba-426d-9460-3da46b021f28',
  '72df77fb-cead-4be9-82a4-e4f8b1204bd5',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '07458be6-e463-4730-948c-790c864a3fdf',
  '72df77fb-cead-4be9-82a4-e4f8b1204bd5',
  'Cenoura',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '64da70a5-39ae-40e3-9b37-add88b383713',
  '72df77fb-cead-4be9-82a4-e4f8b1204bd5',
  'Fubá',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '11851e84-9e32-4393-b505-be3f99a54c21',
  '72df77fb-cead-4be9-82a4-e4f8b1204bd5',
  'Laranja',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'af4195d2-5154-4614-adf3-06441de384c7',
  '170ea0a8-a033-4d0a-a154-42f08222501a',
  'Brigadeiro',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '14f3cf85-e0bf-4525-81e7-cbd3c2301f58',
  '170ea0a8-a033-4d0a-a154-42f08222501a',
  'Nutella',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0c03f994-41fb-48f7-8f20-fe4c3cb5d7b6',
  '170ea0a8-a033-4d0a-a154-42f08222501a',
  'Ninho',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f2ce6411-bcbc-41c8-b61d-2221a349d37a',
  '170ea0a8-a033-4d0a-a154-42f08222501a',
  'Morango',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '40eaedeb-338f-4684-a5ae-ebbb6dee38e5',
  'b47b9d15-9900-4fa9-84ea-1e6915a81517',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '24f7a081-38f9-4435-a4df-256db7633262',
  'b47b9d15-9900-4fa9-84ea-1e6915a81517',
  'Ninho',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e6aa73e2-d3b5-4cd6-bece-5a0c8c9e2c20',
  'b47b9d15-9900-4fa9-84ea-1e6915a81517',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '78479ef9-dc11-4cb2-8dd3-feb875f5a65b',
  'b47b9d15-9900-4fa9-84ea-1e6915a81517',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '12fdc098-7be1-482f-8e60-55457dac2a6a',
  '51f7817e-3c20-476d-88cc-7eea7d1a656e',
  'Lilás',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e905f2de-9bf6-4546-b74e-86e466480fd6',
  '51f7817e-3c20-476d-88cc-7eea7d1a656e',
  'Azul',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f5a1ae97-41c6-4753-ac1b-29cdbe0d8d73',
  '51f7817e-3c20-476d-88cc-7eea7d1a656e',
  'Kit',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '49ec3d76-e11f-471b-9518-ae27d480a3b4',
  '51f7817e-3c20-476d-88cc-7eea7d1a656e',
  'Rosa',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b83ce06b-d600-44d2-8620-d5e57679c08b',
  'b3cfbd10-30a3-46af-b386-7abaf31f67fa',
  'Preta',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '40743700-fb85-4715-8513-f97905881fe5',
  'b3cfbd10-30a3-46af-b386-7abaf31f67fa',
  'Marrom',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c3d3af02-1b01-4590-834c-c6d9cd79e0b2',
  'b3cfbd10-30a3-46af-b386-7abaf31f67fa',
  'Cano curto',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5ede2264-3898-4994-b09e-8a6086d160c3',
  'b3cfbd10-30a3-46af-b386-7abaf31f67fa',
  'Cano médio',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5e737a8a-3dce-4b0e-bf29-3400bc9c9e45',
  'a8399da7-3300-42f8-86eb-e8bf604aa31a',
  'Ninho',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ec78539f-0814-44a7-95f8-101982d84568',
  'a8399da7-3300-42f8-86eb-e8bf604aa31a',
  'Pistache',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '689a7a7a-1b34-4bca-b961-77bf6cdfefdb',
  'a8399da7-3300-42f8-86eb-e8bf604aa31a',
  'Doce de leite',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c27257f2-706d-4974-b212-a6bc937a0c1f',
  'a8399da7-3300-42f8-86eb-e8bf604aa31a',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4f33f41c-46fc-4e33-9ec5-9e8411490129',
  '646d966d-0218-4de7-95e5-3460f93c2b78',
  'Pequena',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2c14ccf1-74b9-4daf-ab57-c302afa990dc',
  '646d966d-0218-4de7-95e5-3460f93c2b78',
  'Média',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '55026ea4-026e-4aed-bc2d-4a04fe11a73e',
  '646d966d-0218-4de7-95e5-3460f93c2b78',
  'Grande',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7532c26e-f4e2-4bc5-a928-6889492bade2',
  '646d966d-0218-4de7-95e5-3460f93c2b78',
  'Texturizada',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ac58efd8-31ad-4349-8c33-3a5ca2276d68',
  '71b7b561-1de4-4303-b785-433b16950869',
  'Cristal',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '52b059da-dd1a-45bb-8428-8f6c221d6fa5',
  '71b7b561-1de4-4303-b785-433b16950869',
  'Zircônia',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '542119d2-20b3-431e-b5f9-03be582b5fd7',
  '71b7b561-1de4-4303-b785-433b16950869',
  'Dourado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6e1137b1-cf64-48ec-8efd-e73501c635b8',
  '71b7b561-1de4-4303-b785-433b16950869',
  'Prateado',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '419b5339-90c4-45c2-ab1a-41d8eb3de3d7',
  '22f4f1fd-74a8-44ba-b7a7-0b58e248a161',
  'Dourado',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0aaab690-95b0-4a2f-a1ed-653b4179671f',
  '22f4f1fd-74a8-44ba-b7a7-0b58e248a161',
  'Prateado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '608612c7-7375-4e19-bb4e-72bd7b4a5f36',
  '22f4f1fd-74a8-44ba-b7a7-0b58e248a161',
  'Colorido',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd45427f0-8797-447a-9482-8c138eed67e4',
  '22f4f1fd-74a8-44ba-b7a7-0b58e248a161',
  'Geométrico',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b3caefe9-ba35-4cfa-a052-f48292597d13',
  '0793262e-a805-4aba-a3bf-a40c922ff9d3',
  'Nozes',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a703b3d6-7877-48f0-8f5b-fd9361db2449',
  '0793262e-a805-4aba-a3bf-a40c922ff9d3',
  'Nutella',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '11b50f23-1b76-430f-9e1b-da2fd1ecc4e6',
  '0793262e-a805-4aba-a3bf-a40c922ff9d3',
  'Doce de leite',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '02c9fd77-955c-4ed1-afa0-731f4c8f6926',
  '0793262e-a805-4aba-a3bf-a40c922ff9d3',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2665b942-ed87-4ac9-a0b1-fab2c4b445e9',
  'd2422b6d-c0cb-400b-8854-22bd42310ac8',
  'A5',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c94baa43-c59c-49ff-a8a9-a7e895abf596',
  'd2422b6d-c0cb-400b-8854-22bd42310ac8',
  '50 folhas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '91a3a14a-98ce-4d22-b28a-fc7a03cc5e5c',
  'd2422b6d-c0cb-400b-8854-22bd42310ac8',
  '100 folhas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a759829d-1003-4b06-b452-6247d4773d34',
  'd2422b6d-c0cb-400b-8854-22bd42310ac8',
  'A4',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '907b3442-b8e6-4857-bb36-de1c1ccdaf84',
  '927187fe-7e4c-414b-a81b-a2046f64323a',
  '15 matérias',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0484c5ef-9911-46a6-ad6b-bd1872806780',
  '927187fe-7e4c-414b-a81b-a2046f64323a',
  '200 folhas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'eeb4dfab-91ff-4e0b-a1ae-0440d85fd0fd',
  '927187fe-7e4c-414b-a81b-a2046f64323a',
  '300 folhas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5699ce54-59a9-4d6b-8b61-138db699688d',
  '927187fe-7e4c-414b-a81b-a2046f64323a',
  '10 matérias',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '65a73137-87bc-4ca4-8d2a-1fac8e0ce130',
  'f60c1128-7561-417c-a2c1-f8f0cb3e400e',
  'Curto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a27aee0a-57b7-4b1c-af26-b1d9aced9473',
  'f60c1128-7561-417c-a2c1-f8f0cb3e400e',
  'Tradicional',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4542a29f-f9ad-40d3-9f15-88f547935d36',
  'f60c1128-7561-417c-a2c1-f8f0cb3e400e',
  'Duplo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5d92ce21-d6db-4ca2-bb97-a56b113b81ad',
  'f60c1128-7561-417c-a2c1-f8f0cb3e400e',
  'Descafeinado',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '70312470-8ab9-4bd4-8ff7-7669ccaca1c6',
  '45df267a-387f-4d09-95fe-79bc958d68b2',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fd77ce3d-a7fb-4c35-97b2-745ff4027f71',
  '45df267a-387f-4d09-95fe-79bc958d68b2',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'aeccb0e6-2fc0-4dfc-95db-2b3b5260f603',
  '45df267a-387f-4d09-95fe-79bc958d68b2',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '95a58477-ef9b-4bd2-9b43-a8b7028fc903',
  '45df267a-387f-4d09-95fe-79bc958d68b2',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bbd35691-1b4f-4218-bd8a-9165dc2d3701',
  '373c0732-f426-4642-9a41-0d798da9a655',
  '12 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a6451613-f223-4667-afe4-2bf2b48f8c1a',
  '373c0732-f426-4642-9a41-0d798da9a655',
  '24 unidades',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd8c42420-6654-48ed-a91c-693fbb3f5a35',
  '373c0732-f426-4642-9a41-0d798da9a655',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cffc311a-d82d-4476-a99f-5045c4342971',
  '373c0732-f426-4642-9a41-0d798da9a655',
  '6 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a7aa4bc6-4f0a-42be-a1a0-a4f19766505f',
  '57d568a0-81c5-4851-89f6-c0733effd1be',
  '36',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'da0adbbe-8bba-4868-97b1-c5850bd5a70f',
  '57d568a0-81c5-4851-89f6-c0733effd1be',
  '44',
  0,
  FALSE,
  TRUE,
  4,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ca1b851a-7b52-4b86-adda-5b4cf95d6387',
  '57d568a0-81c5-4851-89f6-c0733effd1be',
  '38',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'abdb0d00-058d-4130-8acc-a1bb69183479',
  '57d568a0-81c5-4851-89f6-c0733effd1be',
  '40',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4d56cd92-7662-4dab-b292-709d34f44f2d',
  '57d568a0-81c5-4851-89f6-c0733effd1be',
  '42',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '67abca89-4042-46d3-8c34-0dd9287ece9c',
  'c0bf5717-661d-4186-b5c9-98cf3adde844',
  'Científica',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2970760b-6259-44e3-b4a4-e5e66a591976',
  'c0bf5717-661d-4186-b5c9-98cf3adde844',
  '8 dígitos',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6282cbbd-c92b-4e2d-b470-cfbe367a6781',
  'c0bf5717-661d-4186-b5c9-98cf3adde844',
  '12 dígitos',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1d24df1e-4862-4aec-9def-c2de93680ed4',
  'c0bf5717-661d-4186-b5c9-98cf3adde844',
  'Básica',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e99de6aa-6d73-479e-a2df-4d3b3a508ebe',
  '14dd214c-7a4c-46c8-b7b9-f88fdea55d62',
  'Branca',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c4db5724-00df-4f9f-bacd-229d49cd3e63',
  '14dd214c-7a4c-46c8-b7b9-f88fdea55d62',
  'Azul',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f1b50b52-fc27-477a-ba87-452734087698',
  '14dd214c-7a4c-46c8-b7b9-f88fdea55d62',
  'Rosa',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b460f051-5f77-4dda-8a9a-78446e9380f1',
  '14dd214c-7a4c-46c8-b7b9-f88fdea55d62',
  'Preta',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b5eea5e9-9ebc-410c-adfa-49703a3073b8',
  'd794f3d3-c06d-4f94-a49a-ad4b77eca1dc',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '98f326c3-bdd7-4842-b08c-84e424b5d0a9',
  'd794f3d3-c06d-4f94-a49a-ad4b77eca1dc',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cc175aba-bc59-4d23-801d-34781e325da9',
  'd794f3d3-c06d-4f94-a49a-ad4b77eca1dc',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b06de1e3-55d0-464e-931e-83475e02784f',
  'd794f3d3-c06d-4f94-a49a-ad4b77eca1dc',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4428bce3-4134-4cfe-bc4a-6adfe14f6313',
  '4a452391-fddf-4997-82ec-e0d479b8af61',
  'Branco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2d1e90f9-4a7b-4dbc-b47a-8e675443510d',
  '4a452391-fddf-4997-82ec-e0d479b8af61',
  'Azul',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '287b358a-ae3e-4c4e-918e-b7248c4e3a04',
  '4a452391-fddf-4997-82ec-e0d479b8af61',
  'Cinza',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8a71ad27-fd0f-4fd8-8575-99c57baf7c29',
  '4a452391-fddf-4997-82ec-e0d479b8af61',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b353a016-6156-4b9a-9644-995d94fd8406',
  'b6957150-c289-44ae-9cf4-d11ec4e7f5e6',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '95a1d9b9-8bc6-416f-b1a4-97030458e38a',
  'b6957150-c289-44ae-9cf4-d11ec4e7f5e6',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7c8ef41e-8b04-4070-8a97-d96a692b8c58',
  'b6957150-c289-44ae-9cf4-d11ec4e7f5e6',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5da476e4-4e4d-4a9b-be2c-55f18663ef44',
  'b6957150-c289-44ae-9cf4-d11ec4e7f5e6',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '015e6e01-7d4b-4914-bd53-d604ce0553c8',
  '70ace509-5cc4-40d6-851e-1a9516566f23',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fa629e21-810d-493f-9633-ce6e947fa20b',
  '70ace509-5cc4-40d6-851e-1a9516566f23',
  'Branco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7ff597f4-f6f6-45ad-bfaf-c65b95d0e67d',
  '70ace509-5cc4-40d6-851e-1a9516566f23',
  'Bege',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e8e873a1-d44c-4d77-97b7-dbb2f22b8e6a',
  '70ace509-5cc4-40d6-851e-1a9516566f23',
  'Verde',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b8917028-2f2e-4249-aaa0-38dd12daa90b',
  '7294d1d0-7f3b-4d37-a5b2-ff639177738a',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'afc46f22-7c60-4bae-b402-7735dc5b188f',
  '7294d1d0-7f3b-4d37-a5b2-ff639177738a',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'eeab6cab-edea-4aa2-82b5-03c74003a2fd',
  '7294d1d0-7f3b-4d37-a5b2-ff639177738a',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '14e9f093-44a0-471f-a09b-2b643df77815',
  '7294d1d0-7f3b-4d37-a5b2-ff639177738a',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4846b9e7-bd8f-45c8-8173-dddc41b2cf03',
  '648e1ed8-85b5-42ca-bca2-02602193bb44',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '72aba3f1-6916-4374-92ee-ae854cf12dc3',
  '648e1ed8-85b5-42ca-bca2-02602193bb44',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'baf76709-2100-485e-9653-0d5a1ee90383',
  '648e1ed8-85b5-42ca-bca2-02602193bb44',
  'Canela',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7757c910-ba02-41d4-9234-263ad855eecb',
  '648e1ed8-85b5-42ca-bca2-02602193bb44',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'db7570ed-cd0a-4fa4-8677-963c7c1c46ee',
  'd679c61c-bc5f-4d19-919f-03ed20e269b7',
  'Off-road',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cec82095-f855-4372-9617-85457334d1c7',
  'd679c61c-bc5f-4d19-919f-03ed20e269b7',
  'Polícia',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd2b2b2f6-e60a-4d2f-ad1c-5121de4285b1',
  'd679c61c-bc5f-4d19-919f-03ed20e269b7',
  'Caminhão',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dec79229-327d-4e7e-906d-31221cd9269d',
  'd679c61c-bc5f-4d19-919f-03ed20e269b7',
  'Esportivo',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7637106e-9991-4b5e-8c5b-ff276108e127',
  '50cd1240-84ae-4d99-8b5f-1b51e2d1c07e',
  '1kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '74acd05b-f766-4674-ba36-cb8961ba137e',
  '50cd1240-84ae-4d99-8b5f-1b51e2d1c07e',
  'Branca',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f5d72bdc-b808-4d6b-86a4-d4e42aea16c7',
  '50cd1240-84ae-4d99-8b5f-1b51e2d1c07e',
  'Roxa',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '89809e05-bef5-4f04-9b4b-32e6e8a1c7e6',
  '50cd1240-84ae-4d99-8b5f-1b51e2d1c07e',
  '500g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '58eff99e-655b-4d62-9d1d-7d278cf10025',
  '18cc3c38-1a97-402c-91ce-4ebba524feab',
  'Média',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7bf28596-92c2-4dad-ae27-c08af9aa6df8',
  '18cc3c38-1a97-402c-91ce-4ebba524feab',
  'Grande',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '33468128-e7de-4dd2-ad94-1c0ed991dff1',
  '18cc3c38-1a97-402c-91ce-4ebba524feab',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c12ef422-a7ac-4d0c-ac72-944a21d88d0d',
  '18cc3c38-1a97-402c-91ce-4ebba524feab',
  'Pequena',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '41fac8bc-f783-417c-878d-e36022b95ded',
  '122e61fe-6434-4591-8833-d7fbcaa4b85c',
  'Café da manhã',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '388ef8af-7528-414e-a6f2-fdb869160722',
  '122e61fe-6434-4591-8833-d7fbcaa4b85c',
  'Família',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bfdb244e-1e83-4475-8232-ee5f86479007',
  '122e61fe-6434-4591-8833-d7fbcaa4b85c',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '14c59d94-508b-4bd6-b716-fe34f99f29c6',
  '122e61fe-6434-4591-8833-d7fbcaa4b85c',
  'Básica',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '035d342e-0e67-4679-a75e-07d344bac6c9',
  '01ea099c-1524-462b-9ce6-d29778590c04',
  'Família',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5b8b69da-1052-48d3-b4bf-e2a4593496e4',
  '01ea099c-1524-462b-9ce6-d29778590c04',
  'Econômica',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4be93904-007b-4754-a314-f13b29005f84',
  '01ea099c-1524-462b-9ce6-d29778590c04',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '91181d90-65a3-4f99-9299-e8c5bd0c1f27',
  '01ea099c-1524-462b-9ce6-d29778590c04',
  'Básica',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5a94f64e-93a7-414d-b350-66939c5c1023',
  '6c21f1bb-787c-4d59-aa14-472a8362f09e',
  'Camomila',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '66197d92-d8a1-47a5-8134-cff0adcfeb19',
  '6c21f1bb-787c-4d59-aa14-472a8362f09e',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c43a2875-026a-499d-a384-378b32399494',
  '6c21f1bb-787c-4d59-aa14-472a8362f09e',
  'Hortelã',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '08f59abc-3253-4e6d-9f23-68e8aaeffdb0',
  '6c21f1bb-787c-4d59-aa14-472a8362f09e',
  'Limão',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ada8c9f8-579a-4ca9-b025-b2f65b96c043',
  '88e9fcd5-b01e-4b54-ac57-a816fa4c60ef',
  'Pêssego',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5cf40cb8-32e1-4019-a3ae-123a041f0ef4',
  '88e9fcd5-b01e-4b54-ac57-a816fa4c60ef',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3c966821-8a0e-442a-9748-f4900406f25f',
  '88e9fcd5-b01e-4b54-ac57-a816fa4c60ef',
  'Hibisco',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '12e0357e-4830-410f-9668-0646e5df54b9',
  '88e9fcd5-b01e-4b54-ac57-a816fa4c60ef',
  'Limão',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e1548202-075a-4ec8-9a44-cdf1e5259c1c',
  'fd952812-fb34-49a6-b6d0-94288582f326',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bec98059-c0d8-4e8a-83c6-61c0327340dd',
  'fd952812-fb34-49a6-b6d0-94288582f326',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cf6804c8-8a9b-4617-835e-1f7259fac5a9',
  'fd952812-fb34-49a6-b6d0-94288582f326',
  'Duplo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0714a155-86d2-456a-a09b-7d656865b47e',
  'fd952812-fb34-49a6-b6d0-94288582f326',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '95be3ea8-2811-4421-a3ad-dd516fe0fd20',
  '17d52a49-5831-4ad1-968f-a1ad1cbf0f90',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ff9c8a00-c9d4-4fc4-910f-6808f6413e8f',
  '17d52a49-5831-4ad1-968f-a1ad1cbf0f90',
  'Maracujá',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '820e279e-9cca-45f1-a2f5-728778b3dbd1',
  '17d52a49-5831-4ad1-968f-a1ad1cbf0f90',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ebeb3fd3-425e-46ac-9255-91f2790703d2',
  '17d52a49-5831-4ad1-968f-a1ad1cbf0f90',
  'Morango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4ee25a1f-6148-4fa9-9c71-51c03ca857a0',
  '75289080-bbbf-4c62-9021-f09c6fdc1b5a',
  'Picante',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7c9999c2-b7da-4143-ab60-f22d3e0e5555',
  '75289080-bbbf-4c62-9021-f09c6fdc1b5a',
  'Duplo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c20810dd-ef5b-46b5-84ae-508f1d9f15a6',
  '75289080-bbbf-4c62-9021-f09c6fdc1b5a',
  'Combo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bfda604d-b57b-449b-9a54-bb22e4cb56dc',
  '75289080-bbbf-4c62-9021-f09c6fdc1b5a',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c0af450d-8cd8-40fe-9ac6-8eb5e392c1eb',
  '8e4a9580-b320-4d2d-93f3-0ad8fe2ffb6e',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'df0aca18-b68d-4e4c-a758-5df82d6c6552',
  '8e4a9580-b320-4d2d-93f3-0ad8fe2ffb6e',
  'Branco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4388d0c0-fd89-4c51-ae12-dee4005c9bed',
  '8e4a9580-b320-4d2d-93f3-0ad8fe2ffb6e',
  'Azul',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c2fe0864-c12a-4dda-a106-52b6741b24c1',
  '8e4a9580-b320-4d2d-93f3-0ad8fe2ffb6e',
  'Rosa',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'eabbd05d-1c1f-4bab-85e4-acaf07aa067f',
  'f3747deb-7b8d-41e7-9689-5e2695756a82',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'db3f87a3-88bf-4f89-899e-f59e56f6d937',
  'f3747deb-7b8d-41e7-9689-5e2695756a82',
  'Meio amargo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2bbd69bf-2629-44ba-8b3c-b64bea4890ed',
  'f3747deb-7b8d-41e7-9689-5e2695756a82',
  'Branco',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c4514c7f-fbd9-4797-9b07-d447d31d4974',
  'f3747deb-7b8d-41e7-9689-5e2695756a82',
  'Avelã',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1106a6c3-0fb8-4d2e-9b71-ac498ab15909',
  'dca88e0a-096b-4564-bbc1-fb61908181e6',
  '25kg',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '400943ef-1c7f-4fdb-a658-13debf3dbcee',
  'dca88e0a-096b-4564-bbc1-fb61908181e6',
  '32kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1e364392-e451-4ec3-80ce-a88570ed8d8d',
  'dca88e0a-096b-4564-bbc1-fb61908181e6',
  '40kg',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7b5bdd76-3b72-480c-8c3a-59a79ea9b189',
  'dca88e0a-096b-4564-bbc1-fb61908181e6',
  '50kg',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e8c0480c-73b1-4fcc-8e67-6437eaf9a16d',
  '9829bed4-e02c-46e2-b251-5ecd63fedc27',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dcb75c80-57ea-488a-8344-fef9ad08b6ab',
  '9829bed4-e02c-46e2-b251-5ecd63fedc27',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '26ce679b-5783-4d7e-b317-04b71e655ffd',
  '9829bed4-e02c-46e2-b251-5ecd63fedc27',
  'Duplo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3c34d56b-3900-49f9-9e63-aedead065e08',
  '9829bed4-e02c-46e2-b251-5ecd63fedc27',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0bec3dcc-6026-4ac3-9346-f1c906ae9745',
  'bb24253f-e432-45e8-a571-d407352aa866',
  'Coração',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c95606ea-3df4-454b-91be-0e29b1f0150f',
  'bb24253f-e432-45e8-a571-d407352aa866',
  'Estrela',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '89385eeb-2819-41a4-9e7a-1d6e626cdfba',
  'bb24253f-e432-45e8-a571-d407352aa866',
  'Lua',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c1ccc6f4-9de8-488b-b8c8-c5ee5372cfaa',
  'bb24253f-e432-45e8-a571-d407352aa866',
  'Inicial',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f048603a-478b-4f73-8fa8-0183f7ba363c',
  '47a4e964-dcb7-4677-a9f0-9153dd825676',
  'Dourado',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5c374a5d-76ee-4152-9cb1-862efd8d9fa5',
  '47a4e964-dcb7-4677-a9f0-9153dd825676',
  'Prateado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7fce459c-d4e0-4327-9b03-f9f48c1fdfd0',
  '47a4e964-dcb7-4677-a9f0-9153dd825676',
  'Rosé',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0a2999cc-c0a2-46b1-973b-7b9a67775c37',
  '47a4e964-dcb7-4677-a9f0-9153dd825676',
  'Preto',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9df47fee-eb7f-430a-b427-e1c93b5d91f2',
  '29ce109b-cb08-4a86-a4d9-e7bc5a495993',
  '6 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7ca1f622-b3ad-443b-9e83-3bd0d29845b0',
  '29ce109b-cb08-4a86-a4d9-e7bc5a495993',
  '12 unidades',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '157b7698-bf0a-4b70-a3ff-3085519da95d',
  '29ce109b-cb08-4a86-a4d9-e7bc5a495993',
  'Família',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '18a6cd5c-b12c-471f-97ba-73dfdea3e4f8',
  '29ce109b-cb08-4a86-a4d9-e7bc5a495993',
  '4 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bdc007f1-3d86-4e79-94e6-7c5be4d08a1f',
  '2960a70d-a1ee-4ad9-a999-f14114c6c9bc',
  'Bacon',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e9a83ff4-9b84-4f3f-8644-1a4b1b4232d0',
  '2960a70d-a1ee-4ad9-a999-f14114c6c9bc',
  'Cheddar',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cbfadd3c-5ef5-4c1f-8f14-1af5cd39fab6',
  '2960a70d-a1ee-4ad9-a999-f14114c6c9bc',
  'Chicken',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4dfe66b0-7d2d-4889-8079-233953267dcf',
  '2960a70d-a1ee-4ad9-a999-f14114c6c9bc',
  'Classic',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '36f3d645-3197-4cd6-a239-4c9c62e8818f',
  'd1f0f1f5-c116-4910-b37d-8a4f1a27f295',
  'Duplo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a8d8f265-b1c4-42af-b016-c542adcc824f',
  'd1f0f1f5-c116-4910-b37d-8a4f1a27f295',
  'Família',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c98b0c20-7dc7-4809-891f-b84644286df8',
  'd1f0f1f5-c116-4910-b37d-8a4f1a27f295',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a2863002-8593-4e27-b963-e9ef6d6fdc46',
  'd1f0f1f5-c116-4910-b37d-8a4f1a27f295',
  'Individual',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b797478e-d684-41d2-b7d2-e17fea10ae8c',
  '91cfe621-b99c-468b-9412-fa1dba959bf0',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f1e4a701-018c-45f8-a91e-29a2476f9c07',
  '91cfe621-b99c-468b-9412-fa1dba959bf0',
  'Tradicional',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f91bce73-4c25-4435-a241-956f954f7b21',
  '91cfe621-b99c-468b-9412-fa1dba959bf0',
  'Premium',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8195e43a-e069-4f6f-850a-8b91c9329f10',
  '91cfe621-b99c-468b-9412-fa1dba959bf0',
  'Família',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3d544be6-444f-4687-97ea-9e485f214b5c',
  '47301635-eefb-461a-8df5-48954bd28f0c',
  '3 pessoas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2f60c284-3a1d-4c8f-b245-1576ee73ca65',
  '47301635-eefb-461a-8df5-48954bd28f0c',
  '4 pessoas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6b15e1ee-4663-4fa4-8fa9-47988c8976bb',
  '47301635-eefb-461a-8df5-48954bd28f0c',
  '6 pessoas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd13a2017-cdfa-4eaf-bc8c-88e13cf8067a',
  '47301635-eefb-461a-8df5-48954bd28f0c',
  '2 pessoas',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0c9331cb-ab90-40d3-94c6-744ed0906629',
  '5c47bc8e-b554-47ba-af6b-59760559d005',
  '3 pessoas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4a643559-45a1-4c68-8770-4055c5691aad',
  '5c47bc8e-b554-47ba-af6b-59760559d005',
  '4 pessoas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '741b63a8-03d8-4342-8b96-b4c6ee591a42',
  '5c47bc8e-b554-47ba-af6b-59760559d005',
  '6 pessoas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1c872295-17c4-4df0-8680-b8add002e3fa',
  '5c47bc8e-b554-47ba-af6b-59760559d005',
  '2 pessoas',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4061055c-99f5-4cfd-89f6-b2f032c6a098',
  '89f0878e-5701-481b-8034-87c4d31155a1',
  'Carne',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '69adade9-c521-4fbc-9a64-56f083aadb7e',
  '89f0878e-5701-481b-8034-87c4d31155a1',
  'Massa',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd75f0b9f-cfd4-43cc-8c4a-f868a20b8cf8',
  '89f0878e-5701-481b-8034-87c4d31155a1',
  'Parmegiana',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '811006ac-f8e0-4dca-9c1d-8ae3633d0e09',
  '89f0878e-5701-481b-8034-87c4d31155a1',
  'Frango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cd93c5a1-39a1-4685-af5d-f20a676bde38',
  '33eaafc0-ce17-46eb-af88-767c872a760e',
  'Nutrição',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7e3f8402-43a5-4f94-ba95-0930cf976bd7',
  '33eaafc0-ce17-46eb-af88-767c872a760e',
  'Reconstrução',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6a33f732-5c57-41c5-a9d2-25392b4c47a5',
  '33eaafc0-ce17-46eb-af88-767c872a760e',
  'Cachos',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '062357b9-71d5-4bc2-bcb5-5ad7188e1eee',
  '33eaafc0-ce17-46eb-af88-767c872a760e',
  'Hidratação',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c25943a8-83f3-46e5-8677-bd87a3a1bece',
  '80ab4658-acf5-40c1-9706-e864e070f1bb',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd54f62d9-c9a4-4d69-b596-7f494b03e2a9',
  '80ab4658-acf5-40c1-9706-e864e070f1bb',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '79507b15-44b1-4dfd-82f2-25dac6d2135c',
  '80ab4658-acf5-40c1-9706-e864e070f1bb',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5489001a-4d28-4127-8d76-d23e59136841',
  '80ab4658-acf5-40c1-9706-e864e070f1bb',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dab6b15d-48ef-4217-9f61-c75ab9fa1be7',
  'cbb8f87f-d5e0-4bd3-a9e3-fefb2e338df9',
  'Verde',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7438466b-6c2a-4c74-b4b3-5faa3de328b9',
  'cbb8f87f-d5e0-4bd3-a9e3-fefb2e338df9',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5074dc9a-29d7-4b81-b551-61467d1b1c14',
  'cbb8f87f-d5e0-4bd3-a9e3-fefb2e338df9',
  'Bege',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f3b0bad3-63ef-402d-8bbf-ce6748f6017c',
  'cbb8f87f-d5e0-4bd3-a9e3-fefb2e338df9',
  'Rosa',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '155c77f4-ed38-44c1-b7bb-6f4f0569ff8d',
  'b720cdce-d092-4c3b-98cb-c2b8c00f6944',
  'Dourado',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'edbe8a55-e39f-4238-a78c-e5ca7f8896cf',
  'b720cdce-d092-4c3b-98cb-c2b8c00f6944',
  'Prateado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b7a95b0e-e7da-4d64-bbfb-772ad57a7436',
  'b720cdce-d092-4c3b-98cb-c2b8c00f6944',
  'Rosé',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1624ce21-597f-4640-8174-7336c99ef3ba',
  'b720cdce-d092-4c3b-98cb-c2b8c00f6944',
  'Pérola',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4a4b7eb9-a49e-4dd4-98c3-1a6002ad64bc',
  '6a5ff005-bbc8-4300-87c2-bb78e1d7ab04',
  'Claro',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3be4133c-66b8-4812-a0c8-7dc9cfbae35b',
  '6a5ff005-bbc8-4300-87c2-bb78e1d7ab04',
  'Médio',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5da0173e-f0a4-4952-902a-4cadbff29ff3',
  '6a5ff005-bbc8-4300-87c2-bb78e1d7ab04',
  'Escuro',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '250d5116-3897-4855-ac51-9e15899b9e2f',
  '6a5ff005-bbc8-4300-87c2-bb78e1d7ab04',
  'Alta cobertura',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dd25d356-603e-461a-aaff-1039a450b7cd',
  '834172a9-a4a6-4cad-affc-bfaf32272ff2',
  'Frango com catupiry',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6cad9513-edb3-4c40-834c-cc5510496429',
  '834172a9-a4a6-4cad-affc-bfaf32272ff2',
  'Carne',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4bd6cd0c-91bb-4cfc-bab6-b317466b8379',
  '834172a9-a4a6-4cad-affc-bfaf32272ff2',
  'Queijo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e1b4c7f0-c0dc-4ede-99e1-62628678df6d',
  '834172a9-a4a6-4cad-affc-bfaf32272ff2',
  'Frango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '813826ca-4986-429e-a1fe-b16c7febd19f',
  'ad4837e7-99f0-4dd2-a784-f12f46da551a',
  '1kg',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e56ea698-1849-47f5-aa1c-7abd06f4aff0',
  'ad4837e7-99f0-4dd2-a784-f12f46da551a',
  '100g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '02cd19ed-c789-4427-937a-dd4c134b6653',
  'ad4837e7-99f0-4dd2-a784-f12f46da551a',
  '300g',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2ace63f3-87c4-41a3-a894-74ff9ebfb2d0',
  'ad4837e7-99f0-4dd2-a784-f12f46da551a',
  '500g',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '37705fd5-eeef-4ef2-ba2f-d159411446d6',
  '2eaedaa7-8a41-46b9-9894-5f088f213531',
  'Branqueador',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5a2581ff-8a67-4c31-b531-92a74f5b8fea',
  '2eaedaa7-8a41-46b9-9894-5f088f213531',
  'Sensibilidade',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e9fcdf3c-0c3a-4571-8abd-91f995c6d390',
  '2eaedaa7-8a41-46b9-9894-5f088f213531',
  'Infantil',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5d5409cf-7c3b-4a59-ab93-26be7b48b5af',
  '2eaedaa7-8a41-46b9-9894-5f088f213531',
  'Anticáries',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '74b55151-654e-4dd6-ab71-08c638a15ea2',
  '67525160-8531-4ecc-8ba4-1ade493878a3',
  '100g',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '94267351-84d0-4ccd-8275-130396b941df',
  '67525160-8531-4ecc-8ba4-1ade493878a3',
  '200g',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '07e02168-dd7d-4dfc-bad6-4fd43dcd89e0',
  '67525160-8531-4ecc-8ba4-1ade493878a3',
  'Kit',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2f536a66-e984-455a-99f1-83bbba2ccb83',
  '67525160-8531-4ecc-8ba4-1ade493878a3',
  '50g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5a45c24d-9d48-4b21-a7f5-14ec68988ae3',
  'a9bc5f3a-2e82-47cc-a035-6f120a3bf8e6',
  'Refrescante',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd31a70c7-30fe-4991-b78f-5f17770e490e',
  'a9bc5f3a-2e82-47cc-a035-6f120a3bf8e6',
  'Ureia',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd5fd3872-3ca1-4d06-8ee0-33950c10d10e',
  'a9bc5f3a-2e82-47cc-a035-6f120a3bf8e6',
  'Lavanda',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '30164aa4-f7f0-4832-9539-c27af3ed3277',
  'a9bc5f3a-2e82-47cc-a035-6f120a3bf8e6',
  'Hidratante',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e9baf345-84a0-44ba-8397-4646d3ee18ea',
  'ec7ed7b9-218f-49df-b68c-3b7ebc59adf1',
  'Frango',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '75f77d1f-757e-40bf-a961-12fc93eea803',
  'ec7ed7b9-218f-49df-b68c-3b7ebc59adf1',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '46b030cf-3e7d-41f3-9fcc-b041925766cb',
  'ec7ed7b9-218f-49df-b68c-3b7ebc59adf1',
  'Queijo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c5502f5a-186f-4074-a115-25f11f64806b',
  'ec7ed7b9-218f-49df-b68c-3b7ebc59adf1',
  'Presunto',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '007456f8-6fd7-433e-a02a-eaa075de0216',
  'c12ad440-064c-4067-84a3-409c91134d7e',
  'Queijo',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b8fbd7ac-0c0c-4dec-804a-f93423b239ae',
  'c12ad440-064c-4067-84a3-409c91134d7e',
  'Presunto e queijo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '76b3a4c5-547f-4f3a-a871-3a3ba490a88a',
  'c12ad440-064c-4067-84a3-409c91134d7e',
  'Frango',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0825891d-c2a0-4cac-a8c1-ea59c3fb61eb',
  'c12ad440-064c-4067-84a3-409c91134d7e',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '05bb0865-75b4-4248-9f99-480004252821',
  '0a7b3fae-eaeb-4a71-ae92-66d5be4c71b3',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dc5e40fe-15ef-4137-841d-7d9eccabfba9',
  '0a7b3fae-eaeb-4a71-ae92-66d5be4c71b3',
  'Red velvet',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9cfbd095-8e2a-43c4-9012-ba7ccca432d1',
  '0a7b3fae-eaeb-4a71-ae92-66d5be4c71b3',
  'Cenoura',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '02145a0b-c577-4596-8d47-97b32290e9f0',
  '0a7b3fae-eaeb-4a71-ae92-66d5be4c71b3',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3d96b398-56fe-40d8-8844-70f28193c4de',
  'ecfdf20d-e417-433e-9676-5d18e7afab13',
  'Infantil',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5d4ecfa7-65cb-4612-94d8-9d0e56e62053',
  'ecfdf20d-e417-433e-9676-5d18e7afab13',
  'Transparente',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '30164238-e871-44d4-a442-b7090506586b',
  'ecfdf20d-e417-433e-9676-5d18e7afab13',
  'Kit',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b53262b6-1cd3-4fca-8ce9-24adee6d7256',
  'ecfdf20d-e417-433e-9676-5d18e7afab13',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8854648f-7f8a-4321-b940-e4f1e646fd3b',
  '08a92e8a-5ef5-4db8-9dcd-30e2061ee23f',
  'Caneta',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2091a175-b2f2-4b0f-9548-d4e005ea398b',
  '08a92e8a-5ef5-4db8-9dcd-30e2061ee23f',
  'Gel',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '79e96803-6149-4fcd-bd9b-3a2392880782',
  '08a92e8a-5ef5-4db8-9dcd-30e2061ee23f',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '938a2856-f5ff-4856-9baf-fe07857d386c',
  '08a92e8a-5ef5-4db8-9dcd-30e2061ee23f',
  'Marrom',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3f053ad9-0391-4fde-8893-74e6f41fe0ba',
  '2887d1c9-42dc-420b-a6ba-0895f2bafcf9',
  'Cítrico',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a46a8632-7be5-4310-864a-d48df3dea3b7',
  '2887d1c9-42dc-420b-a6ba-0895f2bafcf9',
  'Fresh',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4db8f527-dd65-4da9-ab51-0c82de40fc7c',
  '2887d1c9-42dc-420b-a6ba-0895f2bafcf9',
  'Amadeirado',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ebc64b03-ef93-4cd3-aa7a-352fa026df5a',
  '2887d1c9-42dc-420b-a6ba-0895f2bafcf9',
  'Floral',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0e6424f4-a21a-49d1-8e1a-44169121260f',
  'fcdaa940-3cd6-43aa-a0cf-926bf7cb8ea1',
  'Morango',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '97949e65-e0a6-493e-853c-7a7ef4f0b2c5',
  'fcdaa940-3cd6-43aa-a0cf-926bf7cb8ea1',
  'Ninho',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c312b982-0182-4a61-a34a-797764bc6b9a',
  'fcdaa940-3cd6-43aa-a0cf-926bf7cb8ea1',
  'Doce de leite',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a87a8716-3d01-4bfa-b3d0-fd2082377c9e',
  'fcdaa940-3cd6-43aa-a0cf-926bf7cb8ea1',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b5da7ae7-df8a-4b4a-9976-968d84a0e1e6',
  'ece25e50-2e9b-4dfb-b43c-6f2efec36427',
  'Zero',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '65bad30d-4eeb-4c8d-b4b9-5a3a264630a3',
  'ece25e50-2e9b-4dfb-b43c-6f2efec36427',
  'Frutas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '36c5eb64-f07d-444c-9c50-2a07a73f5198',
  'ece25e50-2e9b-4dfb-b43c-6f2efec36427',
  'Tropical',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '387a9e38-8f9d-48e3-afa8-3b2361cb7694',
  'ece25e50-2e9b-4dfb-b43c-6f2efec36427',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6b846cae-ae29-47aa-a35e-5d522205bbb9',
  '4e85a287-be20-4524-aac2-3fbd0431a4c3',
  '500ml',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7107a816-a77e-4222-99d0-74dfeacf1593',
  '4e85a287-be20-4524-aac2-3fbd0431a4c3',
  '1L',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '653b7bcd-4d5c-4aba-b05b-82425eb45efb',
  '4e85a287-be20-4524-aac2-3fbd0431a4c3',
  'Sem álcool',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9199216f-6230-48c2-ac5f-96efd8b565b4',
  '4e85a287-be20-4524-aac2-3fbd0431a4c3',
  '250ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f51bb257-cae9-4102-9bc8-52d485a646cb',
  'c83d0666-a066-429d-bc6d-6d2156a0ed87',
  'Frango',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b45f24ad-d98c-46a6-848a-5cf94aee4898',
  'c83d0666-a066-429d-bc6d-6d2156a0ed87',
  'Carne moída',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5e6f5be5-9126-4c4b-83b3-fdde16cfdcb6',
  'c83d0666-a066-429d-bc6d-6d2156a0ed87',
  'Vegetariano',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e59ff52b-3570-4ef4-bdee-ab0d8d13aacd',
  'c83d0666-a066-429d-bc6d-6d2156a0ed87',
  'Carne seca',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '40c7c96b-6652-42e9-98e9-ad2529c5bf87',
  'f9ec45e5-99d2-4ce5-a7f5-c78a41969f78',
  'Média',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6f402455-ae7b-4cc0-b4fa-03922760e0fb',
  'f9ec45e5-99d2-4ce5-a7f5-c78a41969f78',
  'Extra macia',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '58643fb6-e466-41f6-a216-90db2e76d8a6',
  'f9ec45e5-99d2-4ce5-a7f5-c78a41969f78',
  'Infantil',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ae8459f5-3a99-4bed-9c7b-a2a807577140',
  'f9ec45e5-99d2-4ce5-a7f5-c78a41969f78',
  'Macia',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '892674d9-90a1-4fd9-a273-38e89c76ea62',
  'a2311136-ca1f-40d1-9008-aa75572f6804',
  'Morango',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6e244955-9713-43a0-8f4d-980b056c016b',
  'a2311136-ca1f-40d1-9008-aa75572f6804',
  'Coco',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cdd0ae28-b679-4289-ad4e-42870d47b71f',
  'a2311136-ca1f-40d1-9008-aa75572f6804',
  'Açúcar',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bc53e4c9-2def-4dc0-be9e-b6fe883cbd84',
  'a2311136-ca1f-40d1-9008-aa75572f6804',
  'Café',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5775d5bc-4561-4416-b44a-9e699a98cdbc',
  '6fafb052-fff3-4cbc-a128-b4244eb6c266',
  'Duplo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4b140a92-590e-4fdd-a676-fe629405204d',
  '6fafb052-fff3-4cbc-a128-b4244eb6c266',
  'Triplo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '96240077-a177-4226-91c0-9eca29c615e0',
  '6fafb052-fff3-4cbc-a128-b4244eb6c266',
  'Grande',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7f130f44-55c2-4cad-b56b-68b373a594d9',
  '6fafb052-fff3-4cbc-a128-b4244eb6c266',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '27e56d67-cadc-4f8b-902d-514f7e7c37d7',
  '73823962-359d-404b-a17e-9f0e57f2d907',
  'Fubá',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5c5e3ec0-77ba-443a-9003-8d9c48682942',
  '73823962-359d-404b-a17e-9f0e57f2d907',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cee9f246-80d5-4573-b38b-f87bbbd8656e',
  '73823962-359d-404b-a17e-9f0e57f2d907',
  'Laranja',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6281e606-65f7-4a3b-aff7-1eec371dfb50',
  '73823962-359d-404b-a17e-9f0e57f2d907',
  'Cenoura',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '389c6747-7d16-41f5-9f12-6acbb0b63c46',
  '9efc39c8-08f1-4322-a21f-835b8f915ca6',
  'Média',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2e57a665-d378-4633-8fbf-0f603d7834dc',
  '9efc39c8-08f1-4322-a21f-835b8f915ca6',
  'Grande',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '068e3b17-2566-4076-816f-3dc3cac6ed98',
  '9efc39c8-08f1-4322-a21f-835b8f915ca6',
  'Família',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '501b69c6-c51c-4c9a-ac06-e8e55cccfbff',
  '9efc39c8-08f1-4322-a21f-835b8f915ca6',
  'Individual',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4df1579e-0f75-4bc3-9fe5-8d79806af8ba',
  '41d71237-c306-4d16-a320-3119b97d72de',
  'Empanado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '92dfd054-46f6-4ad8-856c-b7945c527ae4',
  '41d71237-c306-4d16-a320-3119b97d72de',
  'Acebolado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '94e13a92-bef6-4940-ac57-d40323f6f2a2',
  '41d71237-c306-4d16-a320-3119b97d72de',
  'Parmegiana',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5b0374be-5676-4f57-a135-480a9b3878b3',
  '41d71237-c306-4d16-a320-3119b97d72de',
  'Grelhado',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1baee586-6684-474c-8b7f-12abb22de6f1',
  '066b7dc8-89b8-483c-98de-42904f4ae4eb',
  '50m',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '21d2aa30-f45b-444e-b71f-b9b7f6d8d1cd',
  '066b7dc8-89b8-483c-98de-42904f4ae4eb',
  '100m',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '68289f74-7d97-4a9f-a1d5-8ebe75d5159d',
  '066b7dc8-89b8-483c-98de-42904f4ae4eb',
  'Com haste',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a8ad95bc-2687-4a3d-a15b-0c0498cce005',
  '066b7dc8-89b8-483c-98de-42904f4ae4eb',
  '25m',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5ecb0657-da69-4ef4-91b4-95e6e3ba0dca',
  'baa5885b-12a1-4afa-b0c4-981d3dde8f26',
  '5m',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8a31f565-2e34-40e9-9db7-117765fcb9ef',
  'baa5885b-12a1-4afa-b0c4-981d3dde8f26',
  '10m',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f9b2737e-e754-473e-ba3e-2dfcaa0e3778',
  'baa5885b-12a1-4afa-b0c4-981d3dde8f26',
  '20m',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '14897e48-260a-4885-9b67-9d80f15e76dc',
  'baa5885b-12a1-4afa-b0c4-981d3dde8f26',
  'Kit',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a5b60564-81f1-4169-9c0a-a1704e965fbd',
  '3684937a-58db-4ec0-9bc0-56f06ae7ed17',
  'Café',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c1fe614d-2278-4f35-8b78-6cd509dfd1ba',
  '3684937a-58db-4ec0-9bc0-56f06ae7ed17',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '266b97b5-8bca-433e-8fa8-b4386eee7b49',
  '3684937a-58db-4ec0-9bc0-56f06ae7ed17',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9b483a59-8019-47c2-9ecf-38bc66f10cc7',
  '3684937a-58db-4ec0-9bc0-56f06ae7ed17',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd2781c2a-fa70-4feb-a4c9-9e79e7faef7e',
  '7fe68727-9514-4101-adc3-b8d0d21b87da',
  'Rosa',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8192f672-8726-4e98-ae14-adbd8f02333a',
  '7fe68727-9514-4101-adc3-b8d0d21b87da',
  'Glitter',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b8c48735-8cef-4fc3-9a60-841419dde772',
  '7fe68727-9514-4101-adc3-b8d0d21b87da',
  'Transparente',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2db86246-809a-41e2-b081-1846ccc80951',
  '7fe68727-9514-4101-adc3-b8d0d21b87da',
  'Nude',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5498549f-5fa3-45bd-88f6-a21835d39406',
  '400c1bc5-ce39-48e1-b4b2-6e4544fd50ef',
  '1kg',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd2996264-acce-4174-8136-ec16ba198901',
  '400c1bc5-ce39-48e1-b4b2-6e4544fd50ef',
  '100g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0cd7216f-1660-4f6a-ad3b-0810e0c45105',
  '400c1bc5-ce39-48e1-b4b2-6e4544fd50ef',
  '300g',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '56ad2871-632a-447d-b8f2-e43c6b5b7abf',
  '400c1bc5-ce39-48e1-b4b2-6e4544fd50ef',
  '500g',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fb9f1039-30b3-4a09-b959-869a23c5ae60',
  '34c0cbc9-d66b-420c-b915-c59702351c14',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2cd6c420-4156-4625-87c9-02087a608a6f',
  '34c0cbc9-d66b-420c-b915-c59702351c14',
  'Coco',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f027fbf3-cb37-49bc-8cd6-5f7569756958',
  '34c0cbc9-d66b-420c-b915-c59702351c14',
  'Sem fragrância',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '46a44ead-2f6b-4748-97d5-ce3249c6f44f',
  '34c0cbc9-d66b-420c-b915-c59702351c14',
  'Baunilha',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0cdb8951-c5f9-43ee-9e62-21d6ee7f37a8',
  'd772b223-2240-4894-b6a8-57572321fa7b',
  'Creme',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f0c70db1-a726-4862-8205-10cf24fd841c',
  'd772b223-2240-4894-b6a8-57572321fa7b',
  'Oil free',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd8496379-93b5-4a8a-9490-c6f1540e6f00',
  'd772b223-2240-4894-b6a8-57572321fa7b',
  'Pele seca',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '96ee8728-c785-438b-9eff-ce6a2433ab11',
  'd772b223-2240-4894-b6a8-57572321fa7b',
  'Gel',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2e1af764-1d4b-4159-b78c-dc54f37322a6',
  'c0c954ac-e9df-4199-996c-a2c978a9aa55',
  'Masculino',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2698176c-0566-47b9-ab6b-25dbc2231211',
  'c0c954ac-e9df-4199-996c-a2c978a9aa55',
  'Feminino',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '532a9e0e-581f-4381-9984-36dcbc90b0b4',
  'c0c954ac-e9df-4199-996c-a2c978a9aa55',
  'Família',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd3f406e6-d88b-4bdc-a7c1-851bfab70154',
  'c0c954ac-e9df-4199-996c-a2c978a9aa55',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6e05aa27-dcff-4fff-bb1f-cf2bd4e117b7',
  '6b1196c2-70c3-428d-8626-e30fd3840cc8',
  'Cookies',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '89b742ab-5906-42e5-966f-9f4286a2c082',
  '6b1196c2-70c3-428d-8626-e30fd3840cc8',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f0ef7f26-ffc1-40c5-9c0a-c593a9dd4eaf',
  '6b1196c2-70c3-428d-8626-e30fd3840cc8',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b5a2f436-7ab1-4d57-bc7e-b48bbaf40d6c',
  '6b1196c2-70c3-428d-8626-e30fd3840cc8',
  'Morango',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e0cf250b-0701-4c46-ac26-32bcbe4fdeec',
  '9de0a2fd-6516-4426-8fec-94827a13cb48',
  'Médio',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bb992c44-6f85-4a26-9a4a-9ea1427dd9e7',
  '9de0a2fd-6516-4426-8fec-94827a13cb48',
  'Picante',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6e90791a-3b86-4a98-948c-13a59a3d8c00',
  '9de0a2fd-6516-4426-8fec-94827a13cb48',
  'Extra picante',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cd96e5ae-1695-4e96-8b0a-8b33ad79cd71',
  '9de0a2fd-6516-4426-8fec-94827a13cb48',
  'Suave',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '188e627a-29e7-424d-9c49-dc7263838f4e',
  'd14383c0-7aa2-4178-bcba-aaeee1fdd3fa',
  'Rosé',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f9b6cdaf-3d6e-4496-83df-24271e650881',
  'd14383c0-7aa2-4178-bcba-aaeee1fdd3fa',
  'Perolado',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '28feddc9-a47a-436d-bb53-b7288b37de0e',
  'd14383c0-7aa2-4178-bcba-aaeee1fdd3fa',
  'Dourado',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a71ca35a-7dd3-458f-bbf3-e41c1ac5b094',
  'd14383c0-7aa2-4178-bcba-aaeee1fdd3fa',
  'Champagne',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4dfb2442-cb0e-4791-96a8-1efb8a4977cc',
  'b681a824-83ff-4f3b-a538-29de78aa5dad',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b47fb241-d050-4e5f-9717-1e13c41ff837',
  'b681a824-83ff-4f3b-a538-29de78aa5dad',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '99b0eaed-04ca-47dc-b266-bf85a8477495',
  'b681a824-83ff-4f3b-a538-29de78aa5dad',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2b0e922e-f528-4d3c-b432-d063dc3e4961',
  'b681a824-83ff-4f3b-a538-29de78aa5dad',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b8b647c0-27e4-4a7b-9b7e-5a3f44853c06',
  '6bcc7880-2a89-4227-919b-4661f29ab8f9',
  'Destroyed',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '47b0ae69-0dd4-48f5-be09-d2e4791b9427',
  '6bcc7880-2a89-4227-919b-4661f29ab8f9',
  'Clara',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4d61572c-76a8-4604-bb17-617205cd0d62',
  '6bcc7880-2a89-4227-919b-4661f29ab8f9',
  'Média',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a64e849e-080f-49f6-b719-18ad4f7ce85a',
  '6bcc7880-2a89-4227-919b-4661f29ab8f9',
  'Escura',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3c2d483e-7213-42e5-a63d-4722157f4b74',
  'c710913b-08a1-4c52-803a-7a13f88addc3',
  'Números',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '88ca6fd2-8423-4b53-82f8-ab304e045292',
  'c710913b-08a1-4c52-803a-7a13f88addc3',
  'Alfabetização',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6e42e73b-ae0e-4f6b-b00d-18290aec827b',
  'c710913b-08a1-4c52-803a-7a13f88addc3',
  'Personagens',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0f92cca9-4288-4f28-bf92-ab102ced3fb7',
  'c710913b-08a1-4c52-803a-7a13f88addc3',
  'Animais',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4af0809f-d4d2-495c-ae15-b9f90ba5776d',
  'e8adfbe8-574f-4c4e-89f9-50a85b42d58a',
  'Infantil',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5b093391-97f4-4915-b3e9-20f4b8c91969',
  'e8adfbe8-574f-4c4e-89f9-50a85b42d58a',
  'Família',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6c4e37ba-086d-4491-af11-514ceb644e49',
  'e8adfbe8-574f-4c4e-89f9-50a85b42d58a',
  'Desafio',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7e08dbf9-9d9b-4204-9595-b5ee19bd55be',
  'e8adfbe8-574f-4c4e-89f9-50a85b42d58a',
  'Estratégia',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'aafe9fe0-1764-44aa-974c-85921f4284a2',
  'e99a42ac-a22b-4cd9-9133-a20a14fbc433',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '503f5d41-5885-4b76-a3ef-e84338cba7a9',
  'e99a42ac-a22b-4cd9-9133-a20a14fbc433',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ca0787d2-c152-473f-b25f-f61416d1dc9f',
  'e99a42ac-a22b-4cd9-9133-a20a14fbc433',
  'Neutro',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bdf31421-48a1-4b89-84fa-6e60d2a7d559',
  'e99a42ac-a22b-4cd9-9133-a20a14fbc433',
  'Colorido',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ceb4479f-2a45-4cb5-a3ed-aa3e5a907b55',
  '7bf53011-37fc-4371-96ef-721002c012e4',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f8e10fc8-0536-4b87-9121-853b588f4927',
  '7bf53011-37fc-4371-96ef-721002c012e4',
  'Fashion',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1c6ac8d5-acbe-4ef4-9c8a-4f85eef6fdd7',
  '7bf53011-37fc-4371-96ef-721002c012e4',
  'Delicado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '00105a2c-526e-47b6-a7af-b270f865559b',
  '7bf53011-37fc-4371-96ef-721002c012e4',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '153bab62-6ec4-4128-8dde-c8af0655cc30',
  'b43d61f1-2a65-4a9f-9c81-ebf9c9c19c22',
  'Fresh',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'da38f3eb-6b5b-4927-af82-4f89652035fc',
  'b43d61f1-2a65-4a9f-9c81-ebf9c9c19c22',
  'Floral',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5fe03cf5-1141-4e8e-8d8e-791589384b35',
  'b43d61f1-2a65-4a9f-9c81-ebf9c9c19c22',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e06bd9af-9c37-49ed-9160-a0186357b649',
  'b43d61f1-2a65-4a9f-9c81-ebf9c9c19c22',
  'Relax',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '70494858-9487-4266-8013-4bcd81c17a52',
  'f9a9503d-5a3f-4e4e-957d-c6a4b1d0596a',
  'Preta',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '64661a3c-58d2-4c05-ac0d-859e0e77bc03',
  'f9a9503d-5a3f-4e4e-957d-c6a4b1d0596a',
  'Colorida',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '98586764-7bce-4dbb-a71e-ea9a7f1becff',
  'f9a9503d-5a3f-4e4e-957d-c6a4b1d0596a',
  'Gel',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f93da6f5-c0fa-4567-896b-ea0da5de90a9',
  'f9a9503d-5a3f-4e4e-957d-c6a4b1d0596a',
  'Azul',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'edf0ae67-3fec-46a3-b072-da51482956d6',
  'aef4c77e-373f-453d-b2f4-c9955fa8c09a',
  '5 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6c5b4176-ff46-455a-8196-a5868e88559b',
  'aef4c77e-373f-453d-b2f4-c9955fa8c09a',
  '10 unidades',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8ac1f3ed-1bc5-4d0e-870f-b9ebea4fc6b0',
  'aef4c77e-373f-453d-b2f4-c9955fa8c09a',
  'Pista + carrinhos',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2bc8d1a7-9cf9-4689-ac92-1ad5ee161797',
  'aef4c77e-373f-453d-b2f4-c9955fa8c09a',
  '3 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9386e356-201a-4e33-b326-f99526b3e7ba',
  '2f7238f5-f3cd-40ed-9bba-eda9504b0c45',
  '3 peças',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cb2752cc-1881-4eab-a26b-26a6c3339758',
  '2f7238f5-f3cd-40ed-9bba-eda9504b0c45',
  '5 peças',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c0a46c83-9356-4baa-9699-e678b8012aea',
  '2f7238f5-f3cd-40ed-9bba-eda9504b0c45',
  'Dourado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '93f1b099-f0cc-4837-ba4a-c179d12b44cb',
  '2f7238f5-f3cd-40ed-9bba-eda9504b0c45',
  'Prateado',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c8c8f0ba-c6f5-43de-a8ab-9e6f7ecd0f12',
  '0458edf9-a30c-468c-a19f-a4bf00cc1882',
  'Fundamental',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '51d5887c-a919-4699-89c9-8c5e5f82b3ce',
  '0458edf9-a30c-468c-a19f-a4bf00cc1882',
  'Completo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6aa6cbf5-5f5e-4a7a-89e9-3cda42b3e93b',
  '0458edf9-a30c-468c-a19f-a4bf00cc1882',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '99b6f87a-2729-4416-92b5-4ce5dace7879',
  '0458edf9-a30c-468c-a19f-a4bf00cc1882',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b786554a-f6fd-4cac-92a5-03d0e7c840b9',
  'd04dfd2a-1cbe-4a4a-92ec-f7e6fc8e4949',
  '5 peças',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '46c1eacb-356a-4443-a14f-fd256192a756',
  'd04dfd2a-1cbe-4a4a-92ec-f7e6fc8e4949',
  '10 peças',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2c230bad-5f08-4095-84a3-e40cd72ef5e4',
  'd04dfd2a-1cbe-4a4a-92ec-f7e6fc8e4949',
  '20 peças',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3cc43570-43d4-4650-b81d-496aab479185',
  'd04dfd2a-1cbe-4a4a-92ec-f7e6fc8e4949',
  'Completo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6179151d-1404-470f-809f-6fc11ab9df4b',
  '04c96dec-256d-4b1c-ab6c-677a7beddae2',
  'Família',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '96cd6b66-9286-46e2-847e-54e20f4ade50',
  '04c96dec-256d-4b1c-ab6c-677a7beddae2',
  'Premium',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dce9518a-6362-436a-84e5-ed3b8a6d6c32',
  '04c96dec-256d-4b1c-ab6c-677a7beddae2',
  'Viagem',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd8666560-281d-4e80-84ff-0c49a4984ece',
  '04c96dec-256d-4b1c-ab6c-677a7beddae2',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5449df38-85b0-4f3d-a77d-b4e5cd86fda7',
  '7049cf90-92d5-4e74-8055-2759b1659eac',
  '12 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '980625da-c4c2-477a-90e3-16377ed6e90d',
  '7049cf90-92d5-4e74-8055-2759b1659eac',
  'HB',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '986b258d-d51c-4f1a-b4ac-5ba7a2ceee55',
  '7049cf90-92d5-4e74-8055-2759b1659eac',
  'Colorido',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dd2adde1-3226-4da3-b8fe-d5e13f422adb',
  '7049cf90-92d5-4e74-8055-2759b1659eac',
  '6 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '946ef5f6-9430-44a1-bbea-c450ea3b3c89',
  '933ea6ad-d27f-40ee-b631-831e119d6f80',
  'Completo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '80a1d1b5-427e-488e-830a-d51d62aed8a9',
  '933ea6ad-d27f-40ee-b631-831e119d6f80',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0f1f7132-427a-481d-91f0-e286641a9a8d',
  '933ea6ad-d27f-40ee-b631-831e119d6f80',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '010d7b4e-d999-437d-baca-ca64e42bf763',
  '933ea6ad-d27f-40ee-b631-831e119d6f80',
  'Iniciante',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2486445d-5d94-4fd1-bec5-7b0bef3afd2a',
  '4a8a2b22-7222-439d-ae22-d4dbdc29d4d2',
  '12 cores',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '03462121-9f95-4ab0-ba25-80ab3d54ec0d',
  '4a8a2b22-7222-439d-ae22-d4dbdc29d4d2',
  'Com moldes',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '084e5a3e-44dd-4708-a7aa-be4401da5b94',
  '4a8a2b22-7222-439d-ae22-d4dbdc29d4d2',
  'Completo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8c06d575-4cf4-4afe-8e35-6eb668054c8e',
  '4a8a2b22-7222-439d-ae22-d4dbdc29d4d2',
  '6 cores',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bc2c7b47-25ac-4631-9105-04ce1a199b7c',
  '0a51f92a-03c2-4dd7-b2de-98a6a13d4a0b',
  'Completo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '21561b52-9b6a-4857-ad11-2777535461cc',
  '0a51f92a-03c2-4dd7-b2de-98a6a13d4a0b',
  'Maleta',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f7235386-69d3-470f-a109-ffa593cb3c93',
  '0a51f92a-03c2-4dd7-b2de-98a6a13d4a0b',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '66b56c34-fda6-4278-83d0-2383c9bdd4e7',
  '0a51f92a-03c2-4dd7-b2de-98a6a13d4a0b',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5df1dbc9-68f7-4921-bc36-908d11554c58',
  '76c7f1c1-e717-4676-835b-34b0abdec5e7',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7bee2427-008d-4840-b17f-c93c35f25cb6',
  '76c7f1c1-e717-4676-835b-34b0abdec5e7',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cd4589b1-79bc-4ac6-a4c9-0ee56c3875a0',
  '76c7f1c1-e717-4676-835b-34b0abdec5e7',
  'Intermediário',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '73c9722c-f6ac-4fae-b221-5c360de01e6c',
  '76c7f1c1-e717-4676-835b-34b0abdec5e7',
  'Completo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '996e1af7-d737-429d-887b-09e8d3567696',
  '7844e0d0-7b5d-485c-a7ae-c65bd7bd2d53',
  'Frutado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b919f211-2123-4da1-a9bb-46bf85901561',
  '7844e0d0-7b5d-485c-a7ae-c65bd7bd2d53',
  'Cítrico',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd717d08f-954d-4272-9b75-d34fa8ef3218',
  '7844e0d0-7b5d-485c-a7ae-c65bd7bd2d53',
  'Amadeirado',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '64140562-251c-483e-8760-1793dda2f28c',
  '7844e0d0-7b5d-485c-a7ae-c65bd7bd2d53',
  'Floral',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c75fca5b-dc3b-4699-b117-ee857359d885',
  '5edcbda2-aa44-4402-b6aa-ddd29e50170f',
  'Escolar',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bde6a9f2-6f1e-4d66-9748-1f9c98ba9dcc',
  '5edcbda2-aa44-4402-b6aa-ddd29e50170f',
  'Completo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bf5f2682-795a-481b-8d5b-bdeb192ea04c',
  '5edcbda2-aa44-4402-b6aa-ddd29e50170f',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '13cdc770-03e2-483c-8701-0ad5082b7edb',
  '5edcbda2-aa44-4402-b6aa-ddd29e50170f',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f9d93c5a-4020-41f0-a19d-9fd0e141e1e7',
  '040ed535-041a-4c50-a54d-03b4bcfa8143',
  'Masculino',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f2044a94-c27e-4981-aa42-7d7c8ecd0972',
  '040ed535-041a-4c50-a54d-03b4bcfa8143',
  'Neutro',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '98ba1d17-414b-43d2-9898-99d78871efe4',
  '040ed535-041a-4c50-a54d-03b4bcfa8143',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bfb3d220-068f-4523-b375-b59d824fdbc7',
  '040ed535-041a-4c50-a54d-03b4bcfa8143',
  'Feminino',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b15fa2e1-f09c-437b-bcfc-554674a72d6d',
  '9ad15e74-05a0-4fb6-bf7a-44360d3b5513',
  'Família',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c5bf5e73-b5a3-4849-a52b-4760213aca08',
  '9ad15e74-05a0-4fb6-bf7a-44360d3b5513',
  'Completo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c2c2322d-3837-4404-8670-16bccd3397fc',
  '9ad15e74-05a0-4fb6-bf7a-44360d3b5513',
  'Viagem',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'facb2449-19e4-4c76-9843-fc5eb49aa685',
  '9ad15e74-05a0-4fb6-bf7a-44360d3b5513',
  'Básico',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '94727c87-b2f2-48b6-a95e-5b23907bc0c4',
  '3d318a93-b2f8-4f82-b3fd-d06daacf2b68',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8e5e96b0-a685-4f43-90c7-b77663b18f76',
  '3d318a93-b2f8-4f82-b3fd-d06daacf2b68',
  'Whey + barra',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7160beff-af14-4135-9cd3-9796167ba575',
  '3d318a93-b2f8-4f82-b3fd-d06daacf2b68',
  'Whey + shaker',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '15f8495b-75a4-42e1-bab4-3ca7b896259d',
  '3d318a93-b2f8-4f82-b3fd-d06daacf2b68',
  'Completo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1ba5f3a8-3654-4138-8dcd-48257e2ee391',
  'e08fb32f-dc7d-4e93-8ca3-26b915443ce2',
  'Hidratante',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2fd6745a-b888-4cc9-ba2d-b537cfdf6fdf',
  'e08fb32f-dc7d-4e93-8ca3-26b915443ce2',
  'Premium',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6accec42-9ee7-4164-b54f-53b1d1d67cc8',
  'e08fb32f-dc7d-4e93-8ca3-26b915443ce2',
  'Presente',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b15d645c-7f62-43ab-8f8e-61838c3f03e7',
  'e08fb32f-dc7d-4e93-8ca3-26b915443ce2',
  'Relax',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8ab4f15a-ac05-45bb-add6-8c801d2ce8d0',
  'b624772a-3554-491b-9f9c-7d9b658ece5f',
  '9W',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fa137815-54c7-4ae4-bc04-5ecf121ea429',
  'b624772a-3554-491b-9f9c-7d9b658ece5f',
  '12W',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '297ae976-2ad1-4d33-82a7-4221d6e99420',
  'b624772a-3554-491b-9f9c-7d9b658ece5f',
  '15W',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0b1bc336-9e6c-49f9-bb92-6f0fcfe8ff5f',
  'b624772a-3554-491b-9f9c-7d9b658ece5f',
  '20W',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3f3d144e-342d-4deb-83c8-2419593f11af',
  '8ecd3c08-77d1-43c9-ba82-d85b65fd56de',
  'Branco',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '46fbf498-4cb7-480e-83da-cf6ce6ffd82e',
  '8ecd3c08-77d1-43c9-ba82-d85b65fd56de',
  'Colorido',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '77515e58-2647-4207-aac8-ee00b3c7ce69',
  '8ecd3c08-77d1-43c9-ba82-d85b65fd56de',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '24d87294-20c9-479c-893d-9c7ae67003c4',
  '8ecd3c08-77d1-43c9-ba82-d85b65fd56de',
  'Marrom',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8980873c-d5ee-48d5-b0d3-82b4d4334348',
  '0d05e4ad-07b4-49b9-a0cd-27f5110a453a',
  '2kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f15d37d9-817e-4750-8b0f-0c86d3dae142',
  '0d05e4ad-07b4-49b9-a0cd-27f5110a453a',
  '3kg',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '17c693cd-d974-41de-bf23-03265fb4f266',
  '0d05e4ad-07b4-49b9-a0cd-27f5110a453a',
  'Sacola',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0bac8df6-fcb9-4035-86ea-a5a655b73289',
  '0d05e4ad-07b4-49b9-a0cd-27f5110a453a',
  '1kg',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4b25e7a3-2ce9-4a25-9ddf-14e047b98f36',
  'f3c2a064-970d-49bf-b442-1a1997bfb43b',
  'Frango',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '738fa49e-02e8-402b-a6f1-070ccc810369',
  'f3c2a064-970d-49bf-b442-1a1997bfb43b',
  'Quatro queijos',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ee55bc0a-f7af-4cce-993d-005adb4a432d',
  'f3c2a064-970d-49bf-b442-1a1997bfb43b',
  'Presunto e queijo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'aa586547-4f55-4a4b-a51c-7a6b1bcb1eb7',
  'f3c2a064-970d-49bf-b442-1a1997bfb43b',
  'Bolonhesa',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '21e5c789-a3ba-49ea-b39a-d967849bbfcc',
  'dbaf40ff-a774-4c6e-bb8e-3d9659df4cf8',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cdd02010-367d-4907-9899-4804a1617b63',
  'dbaf40ff-a774-4c6e-bb8e-3d9659df4cf8',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a0b6e85e-896b-41de-a6ae-be2dc61648cc',
  'dbaf40ff-a774-4c6e-bb8e-3d9659df4cf8',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '18a46893-5474-4266-a759-ffe2f2d14412',
  'dbaf40ff-a774-4c6e-bb8e-3d9659df4cf8',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '94bd3b14-39b3-49aa-bafc-aaf0259f754c',
  '909ca402-50e5-4eb2-957c-914bacb08379',
  '80',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2deeb508-832a-40f2-aac9-8d54aa56e0eb',
  '909ca402-50e5-4eb2-957c-914bacb08379',
  '120',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ede1f212-a759-4c8b-bed3-74725ef19a67',
  '909ca402-50e5-4eb2-957c-914bacb08379',
  '180',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c42a35f3-3df9-48a6-ba07-8fc137c5663f',
  '909ca402-50e5-4eb2-957c-914bacb08379',
  '220',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd8a16a7c-5a08-4b51-a2b6-61678908bd8b',
  '123a2b73-4e1b-4748-b8d8-6833cd82a5b4',
  '1kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7872b7ac-d432-4aec-afa5-19d6882908a0',
  '123a2b73-4e1b-4748-b8d8-6833cd82a5b4',
  '2kg',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '46d29f13-dbbf-4f3a-b7e1-532d905d4e59',
  '123a2b73-4e1b-4748-b8d8-6833cd82a5b4',
  'Mix',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '534dd076-ce4f-4a83-a4de-05d16422a97a',
  '123a2b73-4e1b-4748-b8d8-6833cd82a5b4',
  '500g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0900d2f2-4f4a-4ae8-a04e-9e744e77aa44',
  'f0d05eb6-8475-43ff-98d2-a71933d9e3f6',
  'Pastel',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dc5dcc12-85bd-4ee9-aacd-9f66487fe702',
  'f0d05eb6-8475-43ff-98d2-a71933d9e3f6',
  'Neon',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b6d5b0d6-2491-4e1c-adb5-18bd6fd994c3',
  'f0d05eb6-8475-43ff-98d2-a71933d9e3f6',
  'Kit 6 cores',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6149f0ee-f443-4a66-b1c8-8492e17e1a4d',
  'f0d05eb6-8475-43ff-98d2-a71933d9e3f6',
  'Amarelo',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c0049020-9192-40e7-916d-2e8d8b211581',
  'f51f17ed-79b1-4f0b-bffb-cbec58e955d9',
  'Nutrição',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '20932681-c433-4af2-9686-a8927b006cb4',
  'f51f17ed-79b1-4f0b-bffb-cbec58e955d9',
  'Reconstrução',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '714cdc7f-01ea-4d01-94c3-194da8740652',
  'f51f17ed-79b1-4f0b-bffb-cbec58e955d9',
  'Anti-frizz',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1fad3d9c-8bb0-44f9-b77a-e2adc0aa239d',
  'f51f17ed-79b1-4f0b-bffb-cbec58e955d9',
  'Hidratação',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd6dfc2c5-d36d-4ba6-86a3-e1d0462d2ff3',
  'eaacfa92-e354-4f58-8cb1-d8652a295834',
  'Curvadora',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '90b89cd1-5e23-4410-8ad6-3ead082a4564',
  'eaacfa92-e354-4f58-8cb1-d8652a295834',
  'À prova d''água',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e914ca32-e60a-4398-b192-ef19169ecd35',
  'eaacfa92-e354-4f58-8cb1-d8652a295834',
  'Volume',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd181d057-b08d-4903-b89c-1225bc608698',
  'eaacfa92-e354-4f58-8cb1-d8652a295834',
  'Alongadora',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '385fba0b-4166-4172-8651-96b167eeb93b',
  '993eb7c6-0cc3-4530-8adf-c11500ffb4f3',
  'Carvão',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c8b87b07-ec1b-4410-a0b4-828c10478c37',
  '993eb7c6-0cc3-4530-8adf-c11500ffb4f3',
  'Hidratação',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6f21f74b-aa5d-4253-96bc-2826f4574116',
  '993eb7c6-0cc3-4530-8adf-c11500ffb4f3',
  'Vitamina C',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e75816f4-27bc-4fd0-9611-17993676134a',
  '993eb7c6-0cc3-4530-8adf-c11500ffb4f3',
  'Argila',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '010ac1ad-4f9f-4e2d-bc5f-43cdf5b59b65',
  '76107122-6bd5-4387-96cb-ce10ac2d0333',
  'Alho e óleo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '98711ec0-efe4-4764-88b2-bcd00642d4bc',
  '76107122-6bd5-4387-96cb-ce10ac2d0333',
  'Quatro queijos',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9b94d519-2e93-4561-b023-ab0616ec7a11',
  '76107122-6bd5-4387-96cb-ce10ac2d0333',
  'Frango',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a35f8765-a47f-4714-9861-89c3a11ef63d',
  '76107122-6bd5-4387-96cb-ce10ac2d0333',
  'Bolonhesa',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4e467de4-c82b-414b-ad56-3b6cf244734b',
  'b01ddbff-a40c-4a89-bc71-30b1c20af804',
  '1,5kg',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2bd10d8f-580d-408c-a638-b8d821854263',
  'b01ddbff-a40c-4a89-bc71-30b1c20af804',
  '5kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '57b6255d-1d49-4032-8761-fbff59cf7406',
  'b01ddbff-a40c-4a89-bc71-30b1c20af804',
  '10kg',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '70c1feb8-d7b9-4cdc-b5eb-dae8b3467363',
  'b01ddbff-a40c-4a89-bc71-30b1c20af804',
  '25kg',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b3a0262f-8f18-40ef-9bfa-8eba64992cac',
  '6cdefb2c-d6ba-439e-ba60-80af5c90f298',
  'Morango',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ebfe2296-3c3f-4672-b3fc-1374a369f13c',
  '6cdefb2c-d6ba-439e-ba60-80af5c90f298',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b35e907e-8d39-4254-ad2f-668a92abfb34',
  '6cdefb2c-d6ba-439e-ba60-80af5c90f298',
  'Ovomaltine',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a2d273be-cc90-4444-b206-9afc33c2fe49',
  '6cdefb2c-d6ba-439e-ba60-80af5c90f298',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3e090bef-9f09-40b4-baab-be8f3efcb255',
  '2ab5aa65-3c6e-451a-9db5-d3285f923362',
  'Ninho',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '35a70f65-a909-49ec-b81a-8c396d867b57',
  '2ab5aa65-3c6e-451a-9db5-d3285f923362',
  'Red velvet',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dbab78d8-e1fa-410a-a598-6f13c18cfc5e',
  '2ab5aa65-3c6e-451a-9db5-d3285f923362',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3fe73f7b-eec0-4acc-859a-04b133ad6730',
  '2ab5aa65-3c6e-451a-9db5-d3285f923362',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e41d3888-191b-4b99-939c-33d206698de7',
  '84e9e873-a2d2-42b7-9f2e-92b772d6e042',
  'Escrita no Bolo',
  0,
  FALSE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '56ef58b5-62be-4387-bcbd-61a6fdef50c1',
  '31e78861-3da8-46c2-af34-afe6f69990ae',
  '3 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '18efebdc-2d6e-443a-9c31-1c56ad3dbaff',
  '31e78861-3da8-46c2-af34-afe6f69990ae',
  '5 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1c2c7b2a-204e-405e-a4fb-ca9de11888bc',
  '31e78861-3da8-46c2-af34-afe6f69990ae',
  'Peroladas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5f9b5f3b-2773-4228-a93f-251944d8fd1a',
  '31e78861-3da8-46c2-af34-afe6f69990ae',
  'Coloridas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b94e1c86-3431-41a4-978e-e9b393cabcf7',
  '546e84a5-613d-4334-825f-43e1cc02792c',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '22024e44-f481-49e8-a722-a92719bb981e',
  '546e84a5-613d-4334-825f-43e1cc02792c',
  'Marrom',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3f6c755e-dfde-43db-90f2-042fffeb891d',
  '546e84a5-613d-4334-825f-43e1cc02792c',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '40045705-2e3f-4430-9c64-0079f2efa7b9',
  '546e84a5-613d-4334-825f-43e1cc02792c',
  'Bege',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '84124287-4c6c-4676-8f7a-f6336e610893',
  'de9a069f-b884-4144-a74f-ad5894bd3498',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a8bef257-2bd9-444f-aa01-23a66db8defb',
  'de9a069f-b884-4144-a74f-ad5894bd3498',
  'Chocolate branco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '68d64bf2-d30d-4173-8376-295c840eedeb',
  'de9a069f-b884-4144-a74f-ad5894bd3498',
  'Avelã',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '15264c7c-f38f-4c5a-b85b-5d164625d9f7',
  'de9a069f-b884-4144-a74f-ad5894bd3498',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '66a640ca-3feb-4bd7-bd88-c2e4e521c58f',
  'c63b2de7-b29e-43a7-8985-0e21ba464f21',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4516b43c-d245-4150-99be-10ac0afba569',
  'c63b2de7-b29e-43a7-8985-0e21ba464f21',
  'Cinza',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8fdc4c62-1bd2-4242-9c15-19012b17d968',
  'c63b2de7-b29e-43a7-8985-0e21ba464f21',
  'Bege',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bcd1e1e0-c034-45ab-86c3-46f592e6671d',
  'c63b2de7-b29e-43a7-8985-0e21ba464f21',
  'Marinho',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd26a18ed-1445-4f1a-b38a-ce459cdde470',
  '8e4f07a1-58b9-48ee-a7c5-c113b2fcb102',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b03caf68-c3fb-4b45-884c-be954e83252a',
  '8e4f07a1-58b9-48ee-a7c5-c113b2fcb102',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '358e8a48-8e3a-4042-b08e-4b9805f58329',
  '8e4f07a1-58b9-48ee-a7c5-c113b2fcb102',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '56b4c92f-f949-4eed-a684-9e9d75be8730',
  '8e4f07a1-58b9-48ee-a7c5-c113b2fcb102',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c11cefb1-176a-4395-888f-12e6e60c7d42',
  '5001e83b-9bd7-4cc1-bc41-9457426446a2',
  '500g',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5db011d3-dc4c-474f-a538-81a75302982b',
  '5001e83b-9bd7-4cc1-bc41-9457426446a2',
  '1kg',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '387095ab-74aa-42f2-a136-2d7266acb63c',
  '5001e83b-9bd7-4cc1-bc41-9457426446a2',
  'Bandeja premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8d4ad7e6-2058-4004-883e-6f6010354b78',
  '5001e83b-9bd7-4cc1-bc41-9457426446a2',
  '250g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '35d87a11-f7b7-446f-acef-7a531f7db377',
  'db3259f9-05c5-467c-8924-e963a2b7ce02',
  'Duplo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9d3445e3-de47-4273-b38f-f87d72ef6b8f',
  'db3259f9-05c5-467c-8924-e963a2b7ce02',
  'Premium',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd94f0598-6a11-4d3c-a395-c52ba3b02552',
  'db3259f9-05c5-467c-8924-e963a2b7ce02',
  'Combo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd5eea661-0176-4f38-84a8-2d7720c161c0',
  'db3259f9-05c5-467c-8924-e963a2b7ce02',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f652f9c0-1090-49d9-b4fe-63e322859b07',
  '64fd74c0-e44f-4db2-834d-b02fff936963',
  'Coco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '199a08ea-48f0-4fca-aa12-348cf1982006',
  '64fd74c0-e44f-4db2-834d-b02fff936963',
  'Lavanda',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '583f5884-2ae0-4e10-9b45-8f04ac383875',
  '64fd74c0-e44f-4db2-834d-b02fff936963',
  'Floral',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ecb94346-e36e-4b40-b133-c056f86ca33a',
  '64fd74c0-e44f-4db2-834d-b02fff936963',
  'Amêndoas',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '38ed0b84-9e71-4990-9143-793a8802587f',
  '2fcecc8c-5330-4105-bfef-71d0b42b34fe',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fbc66975-101f-450a-b5ad-c98ddabfe647',
  '2fcecc8c-5330-4105-bfef-71d0b42b34fe',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bbeaff7a-48bb-4dd3-ac1d-11c368c21897',
  '2fcecc8c-5330-4105-bfef-71d0b42b34fe',
  'Combo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd0c980b9-16a5-4892-a548-90bb19b0c1f6',
  '2fcecc8c-5330-4105-bfef-71d0b42b34fe',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '98c9d504-22f2-4c11-8b06-0b7ce6b5e700',
  '8f4edb8b-390d-494e-8d51-5c1baae394fc',
  'Neutra',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '00b790fb-9439-4cdb-b0e7-7ac87dcf8b99',
  '8f4edb8b-390d-494e-8d51-5c1baae394fc',
  'Smoky',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cdbc8cc2-ab28-4bbc-b6ca-792a33a80d1f',
  '8f4edb8b-390d-494e-8d51-5c1baae394fc',
  'Nude',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1d6394ad-fca7-4c75-b1f8-fbb26a7ec037',
  '8f4edb8b-390d-494e-8d51-5c1baae394fc',
  'Colorida',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '39ffa0ab-7a54-46e2-bce7-c6f0909fa4a3',
  '1181eb90-a404-49fe-8d3d-178657dbd0b9',
  'Tradicional',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f915c610-5e3c-4570-9395-10e4cf1ba530',
  '1181eb90-a404-49fe-8d3d-178657dbd0b9',
  '5 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '800252d3-2808-49e3-a4b5-2eddd268def2',
  '1181eb90-a404-49fe-8d3d-178657dbd0b9',
  '10 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e51960cf-7d1e-4f44-9eeb-8ccd07beebf5',
  '1181eb90-a404-49fe-8d3d-178657dbd0b9',
  'Integral',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '96346d29-82bf-48dd-9413-013c75ff9dff',
  'd4caef5d-d92c-4f3c-aeb7-3d3173f1b4c5',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2d35a59f-8b7d-4025-917c-fdedeb9a2ebf',
  'd4caef5d-d92c-4f3c-aeb7-3d3173f1b4c5',
  'Recheado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b60c7f73-5cee-4bf0-a7a5-5c4bbb8eef30',
  'd4caef5d-d92c-4f3c-aeb7-3d3173f1b4c5',
  'Grande',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a299eff3-49af-4b4a-9181-c90df8bc193c',
  'd4caef5d-d92c-4f3c-aeb7-3d3173f1b4c5',
  'Mini',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dbf9372e-88f6-4bc2-a4a4-7851002b9cb5',
  '63b9d131-9862-4e83-bca2-cbc589a7eb6f',
  'Mini',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '289ed0b3-c852-4349-bb4d-f715b7e78877',
  '63b9d131-9862-4e83-bca2-cbc589a7eb6f',
  '6 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4c6e159a-2016-40c8-8aa1-f99ec04eb209',
  '63b9d131-9862-4e83-bca2-cbc589a7eb6f',
  '12 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3a78eaf0-b0e8-4f21-b7f1-56bd1b47ec67',
  '63b9d131-9862-4e83-bca2-cbc589a7eb6f',
  'Recheado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dc065418-585c-4221-8520-b67bd1014941',
  '1d1c7912-3247-493e-bb47-eed5e58763c3',
  '30 unidades',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '72eff591-fb49-4f27-bca0-3eae823ce100',
  '1d1c7912-3247-493e-bb47-eed5e58763c3',
  '5 unidades',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bcc5f465-3027-49a1-a305-ef30c7853926',
  '1d1c7912-3247-493e-bb47-eed5e58763c3',
  '10 unidades',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8185c4b7-0916-4e62-878a-4c68cf22cffc',
  '1d1c7912-3247-493e-bb47-eed5e58763c3',
  '20 unidades',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c027534b-b5bd-46dc-8454-6dc957e0aa50',
  '8ac92a5b-64e8-462a-a99c-3dcdc1ac7f08',
  'Multigrãos',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '10a67575-e8ff-49c9-9ceb-a5c8802972d9',
  '8ac92a5b-64e8-462a-a99c-3dcdc1ac7f08',
  'Pequeno',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ca78fa74-5f5a-4066-8850-b82ee865011a',
  '8ac92a5b-64e8-462a-a99c-3dcdc1ac7f08',
  'Grande',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0c62e69e-9313-44e0-9f78-1c876a1bb621',
  '8ac92a5b-64e8-462a-a99c-3dcdc1ac7f08',
  'Fatiado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '20bd266a-b045-489d-854a-b9bafd73e004',
  'c17039e2-4f63-457e-8428-0cf33ba45832',
  '250 folhas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '424b050e-6b6d-4766-ab45-db9692d8b53c',
  'c17039e2-4f63-457e-8428-0cf33ba45832',
  '500 folhas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'eaf255e7-de08-4287-9923-50f44505d2af',
  'c17039e2-4f63-457e-8428-0cf33ba45832',
  'A4',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd55e3fd0-855a-4b21-b822-660ac186dc38',
  'c17039e2-4f63-457e-8428-0cf33ba45832',
  '100 folhas',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3ce73e3f-563d-4b39-a892-f1989dae91e0',
  'b7676e05-bdc7-40eb-ae6c-bb409d31f77d',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3a7986d1-2f7d-42ee-84c4-44da8134e9bc',
  'b7676e05-bdc7-40eb-ae6c-bb409d31f77d',
  'Bege',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '26632e6e-b390-4584-a13f-8725a1ec1c31',
  'b7676e05-bdc7-40eb-ae6c-bb409d31f77d',
  'Branco',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f965a019-c5ba-41d8-8cd1-071cb6f31504',
  'b7676e05-bdc7-40eb-ae6c-bb409d31f77d',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0dc333f4-dec9-4583-a820-c00bb6c20e57',
  'e5f103e7-e242-4ac2-a332-a7c01f6862f1',
  'Carne',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fd1a8c1a-f6f4-42ab-b258-8f7512dec93e',
  'e5f103e7-e242-4ac2-a332-a7c01f6862f1',
  'Berinjela',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f02efb42-74d9-4025-8288-4b5c5289edde',
  'e5f103e7-e242-4ac2-a332-a7c01f6862f1',
  'Completa',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3eb5cec6-8308-4719-803c-7ed335712588',
  'e5f103e7-e242-4ac2-a332-a7c01f6862f1',
  'Frango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3db715df-a030-4117-bf23-c822ad8d5940',
  '2d0d4aaa-ca6a-439d-a77e-c52089840842',
  'Coco',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd6754b37-8cc6-4167-af4b-c039c71799e6',
  '2d0d4aaa-ca6a-439d-a77e-c52089840842',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '861d9cae-37d6-4189-b362-6a09258e4a71',
  '2d0d4aaa-ca6a-439d-a77e-c52089840842',
  'Crocante',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '23361db4-2806-4bda-a15c-c33e97d4e9cf',
  '2d0d4aaa-ca6a-439d-a77e-c52089840842',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e95892f7-9524-49ab-bfaa-e1ea2f72d0bd',
  '244feacd-c5a8-4776-a780-5941b043fdee',
  'A3',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7fea4a37-aab4-444a-993a-a0bff56644a5',
  '244feacd-c5a8-4776-a780-5941b043fdee',
  'Com elástico',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e846c01c-2936-4d88-9b89-1d6fb44068ca',
  '244feacd-c5a8-4776-a780-5941b043fdee',
  'Com divisórias',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5e33f401-75e0-44f2-8fe8-f18d83fbb394',
  '244feacd-c5a8-4776-a780-5941b043fdee',
  'A4',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '182acd04-88d9-4ad3-8690-56b6ec35b53f',
  '49d5619e-be09-40cf-9b6d-7908d99d466e',
  'Coelho',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '896c5968-17fe-4e5a-a0ee-6df3219d72a9',
  '49d5619e-be09-40cf-9b6d-7908d99d466e',
  'Gato',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fb867185-2475-4787-ac42-bd26012a6fc5',
  '49d5619e-be09-40cf-9b6d-7908d99d466e',
  'Dinossauro',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6dad6130-7f2e-481b-aa79-b44c178ac7ab',
  '49d5619e-be09-40cf-9b6d-7908d99d466e',
  'Urso',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2452a4ae-cce3-409e-bb3d-cededf90dd47',
  'c34fe1ee-c948-4950-8547-b0347a0d3581',
  '50ml',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3865fd3a-9f08-4659-87fc-f6a0ece7f3e0',
  'c34fe1ee-c948-4950-8547-b0347a0d3581',
  '100ml',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '86ee25ed-36a0-4388-aab2-f4aa5dc0022e',
  'c34fe1ee-c948-4950-8547-b0347a0d3581',
  'Premium',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '816eaada-8d3a-4017-84f0-1624b54a779c',
  'c34fe1ee-c948-4950-8547-b0347a0d3581',
  '30ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '84de1b94-b79b-436e-a7a6-5493a68069a9',
  '54907a75-9b6d-4770-a89a-2254f39daba4',
  '50ml',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '31fb6285-7678-495e-b952-bfa1272a4d82',
  '54907a75-9b6d-4770-a89a-2254f39daba4',
  '100ml',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b2428e06-b1b0-4903-86a5-8bf1c78a984b',
  '54907a75-9b6d-4770-a89a-2254f39daba4',
  'Kit',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd04c50da-4279-4234-a8b5-cd5932b4f4c9',
  '54907a75-9b6d-4770-a89a-2254f39daba4',
  '30ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1343cf83-ad28-4069-8ddb-79b726dfbe90',
  '63562b0d-ea3c-4f7c-9804-209767027dfb',
  '50ml',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2599d9ba-8e79-41a5-872d-543ff4f493dc',
  '63562b0d-ea3c-4f7c-9804-209767027dfb',
  '100ml',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dd82f525-a275-4e26-8c05-4c5dbd16cb83',
  '63562b0d-ea3c-4f7c-9804-209767027dfb',
  'Kit',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b63938f0-5718-44e7-b9ce-b5c3fccd659a',
  '63562b0d-ea3c-4f7c-9804-209767027dfb',
  '30ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2e5aec41-90c5-4aea-89ab-95705f6ba158',
  'e3141d11-2ff1-42f7-aa6c-3a7d519cc77e',
  'Translúcido',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8098c30c-5b71-4537-90a4-2c5f56a47180',
  'e3141d11-2ff1-42f7-aa6c-3a7d519cc77e',
  'Claro',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bbe563a3-c9ea-4a40-a9bd-460433dd00a2',
  'e3141d11-2ff1-42f7-aa6c-3a7d519cc77e',
  'Médio',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dfb4244d-7c87-4dba-9c7c-d355037929a9',
  'e3141d11-2ff1-42f7-aa6c-3a7d519cc77e',
  'Escuro',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dd038655-deb8-4de3-8a2a-0c1be4c8d8af',
  '27366150-03f8-4558-b220-a0f98974eda6',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '584949e3-d628-4b83-a0f8-53040b5d0173',
  '27366150-03f8-4558-b220-a0f98974eda6',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '824d3712-18b2-48e1-8997-b924b9462b65',
  '27366150-03f8-4558-b220-a0f98974eda6',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '88ae590b-b70b-4853-834b-af9dc3f88e4b',
  '27366150-03f8-4558-b220-a0f98974eda6',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'df933a83-219a-4191-8ba8-4c1c23ff12e7',
  '6badd9c9-c47c-41b7-9a3f-3716d5754855',
  'Preto',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '12fcad0b-b7ec-4d7e-bf2e-78c61a7a42ab',
  '6badd9c9-c47c-41b7-9a3f-3716d5754855',
  'Azul',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7ea4650a-e31b-4b52-96f4-dfe98ded662c',
  '6badd9c9-c47c-41b7-9a3f-3716d5754855',
  'Verde',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '54bb5ad0-b5be-42a5-bb6f-1b43e50ff697',
  '6badd9c9-c47c-41b7-9a3f-3716d5754855',
  'Branco',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '97e63848-8dde-471d-b79b-3dca5498dc02',
  '413668c6-6943-41dc-bb0c-7d902c176347',
  'Carne',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '712cc95f-fc80-496e-b79e-7f55630cfc42',
  '413668c6-6943-41dc-bb0c-7d902c176347',
  'Bife acebolado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '78ef2675-12f5-4a31-9b25-d48466b387ed',
  '413668c6-6943-41dc-bb0c-7d902c176347',
  'Parmegiana',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '19522823-64f8-4f97-b697-7aacdb69554e',
  '413668c6-6943-41dc-bb0c-7d902c176347',
  'Frango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bdb8d808-faf6-47ec-bbe6-709308f60b6b',
  'aa9e5f58-507e-4184-83b8-42f5fd7a5a46',
  'Tangerina',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f95a901b-2a34-4414-854a-fc30a3732003',
  'aa9e5f58-507e-4184-83b8-42f5fd7a5a46',
  'Limão',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b009f39a-f541-4377-8eee-a94bd3be1889',
  'aa9e5f58-507e-4184-83b8-42f5fd7a5a46',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '850b2fcf-d5bb-4336-ae44-459d9b4ee760',
  'aa9e5f58-507e-4184-83b8-42f5fd7a5a46',
  'Uva',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c2a4916b-2fe5-42f9-ac77-021385d879d2',
  '09253cf9-5639-4944-aa6f-9b602fedbf94',
  'Morango',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b71ee63f-04de-4bb7-8c8e-f63cd96d29b6',
  '09253cf9-5639-4944-aa6f-9b602fedbf94',
  'Menta',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0ee03e55-35b7-4a0a-814e-20e1103e7f19',
  '09253cf9-5639-4944-aa6f-9b602fedbf94',
  'FPS',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9844fafc-441f-48f8-a3b5-0d13cca2dd1c',
  '09253cf9-5639-4944-aa6f-9b602fedbf94',
  'Neutro',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '16c3dc5a-21d7-4895-99f2-d65f5a2ee523',
  'ca361106-8782-466d-852e-b4cf4a37558c',
  'FPS 50',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fe5d5324-0023-417f-bf65-c8b6e5be4daa',
  'ca361106-8782-466d-852e-b4cf4a37558c',
  'Com cor',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2d546209-642e-4d51-8805-647092fd1561',
  'ca361106-8782-466d-852e-b4cf4a37558c',
  'Oil free',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a2d3b02e-65db-4c35-8cc4-5d5c8dcf0a94',
  'ca361106-8782-466d-852e-b4cf4a37558c',
  'FPS 30',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '288b8dbd-0454-429b-afa2-43cd4f0d2d4a',
  '862fb762-3887-414e-9a81-08adf1dc08de',
  'Coco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '27fbaec0-e65b-4e47-be45-64fe72106631',
  '862fb762-3887-414e-9a81-08adf1dc08de',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '06b5772b-31aa-42cf-8ae2-7d7e0a2a8a3f',
  '862fb762-3887-414e-9a81-08adf1dc08de',
  'Leite ninho',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cd08c049-7d0c-495e-929c-97d0ba0287a7',
  '862fb762-3887-414e-9a81-08adf1dc08de',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '154c7f94-4132-45dd-870c-13fcf5515092',
  '06d7cdf8-b315-4456-bdef-9f0af1c26f6e',
  'Dourada',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9ff2d1e1-4e14-450b-aa8a-ba7a83f1187d',
  '06d7cdf8-b315-4456-bdef-9f0af1c26f6e',
  'Prateada',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '459f8907-61dd-49c0-b58e-926f8300fec7',
  '06d7cdf8-b315-4456-bdef-9f0af1c26f6e',
  'Rosé',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '572b3102-0d30-4ce6-8d50-50c20db822c0',
  '06d7cdf8-b315-4456-bdef-9f0af1c26f6e',
  'Colorida',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bde985ba-64b7-4cfc-bc5c-994b40db8183',
  'f1d2d3b8-4076-4986-956f-eb592016f8a3',
  '60 peças',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b94a7a71-3908-44e5-bdc0-d56c29c23c44',
  'f1d2d3b8-4076-4986-956f-eb592016f8a3',
  '100 peças',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f7c9bffb-f293-48b9-aa0c-a96fad51d032',
  'f1d2d3b8-4076-4986-956f-eb592016f8a3',
  '200 peças',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '68000dab-2e7c-4240-9ac1-b62d9d23a7ba',
  'f1d2d3b8-4076-4986-956f-eb592016f8a3',
  '30 peças',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2cd2abe7-28ab-4160-92cd-4e62e41a1c74',
  'af83c79d-2d24-42e2-a43b-92b9f4bfffc1',
  'Nude',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '90f94f40-dca6-4574-a201-b0a5a94a185c',
  'af83c79d-2d24-42e2-a43b-92b9f4bfffc1',
  'Preto',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '521b127e-3f7d-4c8e-8204-a0c5750fc5cf',
  'af83c79d-2d24-42e2-a43b-92b9f4bfffc1',
  'Dourado',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3bf572aa-70a1-419a-9a84-792f526568e8',
  'af83c79d-2d24-42e2-a43b-92b9f4bfffc1',
  'Prata',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f26b5f8d-aad0-410a-9596-529e41b17837',
  '696a9546-6d4b-4181-9218-f3a3b7a77c3e',
  'Guaraná',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2e4b5e49-2704-4e15-b157-54b264acb8aa',
  '696a9546-6d4b-4181-9218-f3a3b7a77c3e',
  'Laranja',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2b506cd7-5a53-4c36-af03-1360625dfc3c',
  '696a9546-6d4b-4181-9218-f3a3b7a77c3e',
  'Limão',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '316f6bc4-4019-4e2c-9fa4-d8313262375a',
  '696a9546-6d4b-4181-9218-f3a3b7a77c3e',
  'Cola',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '39fd7fc1-608b-41e6-9a6c-ad12b0a348b5',
  '332f5a8d-c1ef-42e0-886a-3aea6554b6a4',
  'Guaraná',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '74ae02f8-63e5-4705-9d32-a2ef0c971a5a',
  '332f5a8d-c1ef-42e0-886a-3aea6554b6a4',
  'Laranja',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b50f1c6a-7fb4-48b1-b186-fd65a2f44df1',
  '332f5a8d-c1ef-42e0-886a-3aea6554b6a4',
  'Limão',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cdc1caae-c658-4e72-8f0d-e13de07837b1',
  '332f5a8d-c1ef-42e0-886a-3aea6554b6a4',
  'Cola',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b828569f-c3dd-4230-930f-573e031ee92b',
  '98497543-e664-4904-bf7c-1c67459f7423',
  'Branco',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '40f9c9d5-8deb-470a-857d-f68e81b97b8d',
  '98497543-e664-4904-bf7c-1c67459f7423',
  'Cinza',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '33eaa992-6be3-4567-bd58-d639f6cea365',
  '98497543-e664-4904-bf7c-1c67459f7423',
  'Bege',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c16464ab-05dc-48a6-b341-683e819554c2',
  '98497543-e664-4904-bf7c-1c67459f7423',
  'Preto',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4f782851-b08c-4c7e-9b27-f98a5ad8af7e',
  '72c50bee-721e-4dbd-9292-bb0265973c05',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '359793b7-5d8a-4cbd-9776-753b6c6998de',
  '72c50bee-721e-4dbd-9292-bb0265973c05',
  'Canela',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cd3f31d7-04f7-448a-9874-a09e3c314c24',
  '72c50bee-721e-4dbd-9292-bb0265973c05',
  'Goiabada',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f15657d9-bbc0-45ea-a314-7dc56a2e7079',
  '72c50bee-721e-4dbd-9292-bb0265973c05',
  'Coco',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e373055d-5816-4c2d-b5a1-d2dddd3dca6f',
  '3e18c776-9640-430b-bb95-29aa4e0d07e8',
  'Frutado',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6ba18676-6a4f-480d-bab7-c9e30c959589',
  '3e18c776-9640-430b-bb95-29aa4e0d07e8',
  'Neutro',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '614b1e97-fe6b-4342-99fa-103be9dbe4cf',
  '3e18c776-9640-430b-bb95-29aa4e0d07e8',
  'Esfoliante',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '24c78f2f-92e9-4196-bf9a-8ddab0198c1c',
  '3e18c776-9640-430b-bb95-29aa4e0d07e8',
  'Floral',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9137c5d5-9d6d-4090-83b8-26e0170df665',
  'f6ab5491-8738-463a-9edb-3bb674cb5f53',
  'Pele oleosa',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8d2432d8-9ca2-42a6-82c0-fc782ce50eb1',
  'f6ab5491-8738-463a-9edb-3bb674cb5f53',
  'Sensível',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fee3b9af-68e8-4b2f-8074-3ee1f120c84f',
  'f6ab5491-8738-463a-9edb-3bb674cb5f53',
  'Detox',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '51e54d5c-bcb8-4364-b29d-2e8053718eca',
  'f6ab5491-8738-463a-9edb-3bb674cb5f53',
  'Pele seca',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b3391411-f336-4119-9cea-f2a5b5b9379e',
  '69df37cc-f52a-4828-8447-7ee7bb9ba08f',
  'Atum',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'efe9f805-b1eb-4256-a372-0a891d7c6d7d',
  '69df37cc-f52a-4828-8447-7ee7bb9ba08f',
  'Ovo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '674bd3ad-ab97-49ce-936b-b7532d3de9c2',
  '69df37cc-f52a-4828-8447-7ee7bb9ba08f',
  'Vegetariana',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '10b88d7d-3bd6-426e-851d-e183c1c675ab',
  '69df37cc-f52a-4828-8447-7ee7bb9ba08f',
  'Frango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '55c93c82-e2c9-4308-b2fa-172b2a734513',
  '5a42167a-b620-4eb3-a02f-8c03561d4896',
  'Nude',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b9fc5842-c57a-41d3-ae0c-0b9d04fc96b1',
  '5a42167a-b620-4eb3-a02f-8c03561d4896',
  'Preto',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'cc356cd4-23dc-4bd0-93ab-bdce16b54e37',
  '5a42167a-b620-4eb3-a02f-8c03561d4896',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7f00ecd4-6ef7-449b-b8c5-2500a3bed017',
  '5a42167a-b620-4eb3-a02f-8c03561d4896',
  'Dourado',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c132f911-1206-4202-ac2e-9d5208417fe1',
  '2d83722c-0124-45c2-b248-94c52f13bf3f',
  'Preta',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'af5ddb1b-d41d-4b98-8d68-4a51f360939a',
  '2d83722c-0124-45c2-b248-94c52f13bf3f',
  'Marrom',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '58fabc42-5825-494c-a925-7f9fe250d95f',
  '2d83722c-0124-45c2-b248-94c52f13bf3f',
  'Caramelo',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd0260039-c99b-4e8a-bec2-f7f0abb86e23',
  '2d83722c-0124-45c2-b248-94c52f13bf3f',
  'Azul',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7679adcf-c810-4e67-8b3a-98d1e61cc724',
  'bde413ad-fb36-42b0-99df-993b70ba0e75',
  'Preta',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6caff219-9be1-4e65-8d02-2025d204357c',
  'bde413ad-fb36-42b0-99df-993b70ba0e75',
  'Nude',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e198b2a3-b9ec-45de-905d-df83c2c56aa0',
  'bde413ad-fb36-42b0-99df-993b70ba0e75',
  'Vermelha',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '26b67617-3ca2-4e52-9c49-f3190c6215c3',
  'bde413ad-fb36-42b0-99df-993b70ba0e75',
  'Metalizada',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8f8d39a6-332b-44f3-b691-18e98bf660e3',
  '9610dd9d-10e5-4190-83e0-27fdb1cb9312',
  'Ácido hialurônico',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8c398fce-c3fc-484c-8422-b5b6248f39de',
  '9610dd9d-10e5-4190-83e0-27fdb1cb9312',
  'Niacinamida',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ce4d6691-0888-4d39-b805-bce126277970',
  '9610dd9d-10e5-4190-83e0-27fdb1cb9312',
  'Antioxidante',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd662ba3b-a1c5-48cf-ae95-5df402b3b912',
  '9610dd9d-10e5-4190-83e0-27fdb1cb9312',
  'Vitamina C',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0c9beda7-18aa-4c59-ae55-1e1256f65df8',
  '17386d6b-c7ba-4e96-ac45-663312ab89b1',
  '1L',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '006d83ec-b824-4933-af2d-4f7ab1dadebe',
  '17386d6b-c7ba-4e96-ac45-663312ab89b1',
  '500ml',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3a19e0ae-5968-430d-a1db-513f0c63ff3c',
  '17386d6b-c7ba-4e96-ac45-663312ab89b1',
  '600ml',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '15a87cbb-07bd-4e04-a409-f91c12256a82',
  '17386d6b-c7ba-4e96-ac45-663312ab89b1',
  '700ml',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f0acd4fb-aeec-4d73-9572-fe7fe1635938',
  '5973bcbc-2ce9-4be4-81d0-a79a0f45149f',
  'Reconstrução',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '637e5abb-2886-40ba-978a-1aaf26c42c73',
  '5973bcbc-2ce9-4be4-81d0-a79a0f45149f',
  'Cachos',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4d44d095-6557-4b01-ac20-972f661858dc',
  '5973bcbc-2ce9-4be4-81d0-a79a0f45149f',
  'Nutrição',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '97c59931-d4ef-4782-a8a8-0a0f0228b680',
  '5973bcbc-2ce9-4be4-81d0-a79a0f45149f',
  'Hidratação',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'f79c3f1c-c7e9-4629-9e19-784f1f149a8c',
  '77bd2b2d-e547-41f8-93ef-79a2a01bdf6b',
  '42',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c71052de-0bc4-4236-a053-08d022e40fc3',
  '77bd2b2d-e547-41f8-93ef-79a2a01bdf6b',
  '36',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '223446c6-1c71-4b32-86ce-8128d07b9884',
  '77bd2b2d-e547-41f8-93ef-79a2a01bdf6b',
  '38',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bfb68482-c293-4c4b-83c1-1be87b71e78e',
  '77bd2b2d-e547-41f8-93ef-79a2a01bdf6b',
  '40',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5806e97b-a453-4b7b-9f01-44070a921b31',
  'e6650e07-d65f-418a-96d4-1fae807f5a62',
  'Bege',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dbb0c3c2-3a4d-4c1e-bd55-844282965e82',
  'e6650e07-d65f-418a-96d4-1fae807f5a62',
  'Verde',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1f636fc6-2acb-4042-b5ed-5ce799cbb979',
  'e6650e07-d65f-418a-96d4-1fae807f5a62',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '311b315f-9210-49fa-9689-6e4faffd93d8',
  'e6650e07-d65f-418a-96d4-1fae807f5a62',
  'Jeans',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'c2c6ddd2-e9f4-468d-8642-a37f8af7e556',
  '5f4b81f0-bd6e-47eb-8c53-c2b464c3ef3e',
  'Transparente',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '21d6f51e-302d-48dc-ad47-27a8b0c1b795',
  '5f4b81f0-bd6e-47eb-8c53-c2b464c3ef3e',
  'Branco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9aca4716-ef8a-4b1e-b697-71ea28a11420',
  '5f4b81f0-bd6e-47eb-8c53-c2b464c3ef3e',
  'Preto',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bf44f7bd-5c08-4592-9c91-7e106b64b029',
  '5f4b81f0-bd6e-47eb-8c53-c2b464c3ef3e',
  'Cinza',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1d176638-d475-4927-bf33-1a099b3d76b4',
  'eca099f4-6ef9-4e25-83bc-729bee2aacd5',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a26454af-33b1-4e52-ade8-66aa152f3c77',
  'eca099f4-6ef9-4e25-83bc-729bee2aacd5',
  'Branco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9375149d-7b4b-4294-9331-dd88ff989cb0',
  'eca099f4-6ef9-4e25-83bc-729bee2aacd5',
  'Cinza',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '043300b8-32a6-42c8-a377-5748301d690a',
  'eca099f4-6ef9-4e25-83bc-729bee2aacd5',
  'Marinho',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9328be4c-5f87-423e-ab51-ea623740b3fb',
  '4dd34d0d-8e1c-45a4-bf1a-fda0055663bd',
  '2 carnes',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9826ffab-3aa1-4904-bc20-13ccb1b963d5',
  '4dd34d0d-8e1c-45a4-bf1a-fda0055663bd',
  '3 carnes',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e4db5bef-97a5-4c61-921a-c8ea4d2f865b',
  '4dd34d0d-8e1c-45a4-bf1a-fda0055663bd',
  'Combo',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3f768f67-9444-4457-a846-5d83ff5e120c',
  '4dd34d0d-8e1c-45a4-bf1a-fda0055663bd',
  '1 carne',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fb420b07-e550-49a0-b0e5-b9df5dff7dc6',
  '45b1e21c-dcd6-4d69-b8bd-eda94e11912f',
  'Goiabada',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a3902f09-929a-4330-a36c-b205098a1457',
  '45b1e21c-dcd6-4d69-b8bd-eda94e11912f',
  'Creme',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'dd6f31a2-8489-41de-b02f-06ea7345f3ac',
  '45b1e21c-dcd6-4d69-b8bd-eda94e11912f',
  'Doce de leite',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd1b257d6-2b4b-4415-af1a-bea6921691fd',
  '45b1e21c-dcd6-4d69-b8bd-eda94e11912f',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '02e1ab22-80ae-452b-bf27-0f9a6ae07130',
  '8a7239a2-fdb3-4bd6-a35d-31085f955e6b',
  'Carne',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9a51e088-65b9-421d-81e6-3972e5d82eb9',
  '8a7239a2-fdb3-4bd6-a35d-31085f955e6b',
  'Camarão',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1a7324f1-8275-4687-99cd-4a8da71079ad',
  '8a7239a2-fdb3-4bd6-a35d-31085f955e6b',
  'Vegetariano',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a4deb85b-9113-45c6-a460-004199474f3e',
  '8a7239a2-fdb3-4bd6-a35d-31085f955e6b',
  'Frango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '899cdb18-9484-400e-a457-9dd7f1943047',
  '9c328966-83ab-4d86-9724-7449445b8219',
  'Maçã',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'bdf42c9c-f91a-4bf2-ba42-01268d01fa77',
  '9c328966-83ab-4d86-9724-7449445b8219',
  'Laranja',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '4c8180b8-fd56-438e-8db3-ee7868fcdb64',
  '9c328966-83ab-4d86-9724-7449445b8219',
  'Mix de frutas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7bfaf446-b39c-4e98-a9c6-7ec48facc09f',
  '9c328966-83ab-4d86-9724-7449445b8219',
  'Uva',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '86d9bd21-809e-4c28-b307-1841c47935cd',
  '43e870fa-2baf-42f2-b69f-5f98aefd38d7',
  'Laranja',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '18f6249a-2c4d-4d14-8a51-f1a18bb9b16e',
  '43e870fa-2baf-42f2-b69f-5f98aefd38d7',
  'Abacaxi',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '10b71589-f6e3-45f2-b22e-3dafb7aa2cbc',
  '43e870fa-2baf-42f2-b69f-5f98aefd38d7',
  'Morango',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7d23116c-7d9f-4eea-a66e-cf6d5236d922',
  '43e870fa-2baf-42f2-b69f-5f98aefd38d7',
  'Maracujá',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e8d1a8c7-00eb-4408-b2e4-04a710efc8dd',
  '04554e66-80f0-4b88-a8b6-67a6228b60c4',
  'Maracujá',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2b0ee71b-1c47-4a66-9efb-255c11a157d6',
  '04554e66-80f0-4b88-a8b6-67a6228b60c4',
  'Morango',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1f2f0f9b-81aa-443a-a804-385856ceb273',
  '04554e66-80f0-4b88-a8b6-67a6228b60c4',
  'Abacaxi',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7119d1ab-6abf-47a3-9ba5-7c1db5bf4330',
  '04554e66-80f0-4b88-a8b6-67a6228b60c4',
  'Laranja',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1dcf6b17-6051-4346-b269-dc747f4e577a',
  'cc439c42-1d67-4122-a6b1-a884aee5b974',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '99003098-bb8c-4c09-80c3-3331789e0b35',
  'cc439c42-1d67-4122-a6b1-a884aee5b974',
  'Branco',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6b299210-fa23-49eb-89eb-44173e070d9c',
  'cc439c42-1d67-4122-a6b1-a884aee5b974',
  'Cinza',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a83d9428-5fa8-4884-826b-68139721d62a',
  'cc439c42-1d67-4122-a6b1-a884aee5b974',
  'Bege',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3515ecf5-233d-422f-b290-8b76544bcfb6',
  '4be8536e-af19-40cf-9461-1e202d2311ba',
  'Preto',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '793ed3cf-be1f-40c2-9617-8070a4b5c6ae',
  '4be8536e-af19-40cf-9461-1e202d2311ba',
  'Azul',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'adc72f0f-f740-42a5-914b-a3f35789d63a',
  '4be8536e-af19-40cf-9461-1e202d2311ba',
  'Branco',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '805e291a-bf9d-4a41-b5b4-8e4a16e4892f',
  '4be8536e-af19-40cf-9461-1e202d2311ba',
  'Cinza',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5e602335-edba-4aea-8e2a-f6028cf5adcf',
  'cd3524b8-d6d4-4626-b1a3-c1575d067c6c',
  'Azul',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '3466fbfb-a582-4903-a8a0-9d8d990aa9c2',
  'cd3524b8-d6d4-4626-b1a3-c1575d067c6c',
  'Rosa',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '58df74e0-f75e-4267-8006-d691ebf5c9ec',
  'cd3524b8-d6d4-4626-b1a3-c1575d067c6c',
  'Preto',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '9024b3cb-c378-4f65-ab13-759fe87fd590',
  'cd3524b8-d6d4-4626-b1a3-c1575d067c6c',
  'Colorido',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0c596b59-929e-4d2b-8e7e-c39e81f2d8ca',
  'e4b69ee7-6c94-46d7-a001-5165d3352fb4',
  'Infravermelho',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'be0c330d-9100-4e49-b240-4802abce261f',
  'e4b69ee7-6c94-46d7-a001-5165d3352fb4',
  'Infantil',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '59fca19e-0784-4da5-85d0-438f63ad6894',
  'e4b69ee7-6c94-46d7-a001-5165d3352fb4',
  'Kit',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '219ae004-f9d1-4aee-9e1f-7b18072c9e83',
  'e4b69ee7-6c94-46d7-a001-5165d3352fb4',
  'Digital',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1fb278b8-08ae-4075-9e46-5bf1d8834c81',
  '216d5683-5ecf-44db-b496-7f592f8b6fd7',
  'Branco',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0b805a79-628e-4b6a-96c1-17fbff0b53c3',
  '216d5683-5ecf-44db-b496-7f592f8b6fd7',
  'Cinza',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '52cb6882-7f54-485f-9a29-1bbb04407142',
  '216d5683-5ecf-44db-b496-7f592f8b6fd7',
  'Bege',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7e213bcf-b069-4916-83e6-143f9e8c31cb',
  '216d5683-5ecf-44db-b496-7f592f8b6fd7',
  'Cores sob consulta',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '11ade6ef-ddff-49d7-bb43-787ee846ccd8',
  '2e539b93-5669-4f0b-aa2e-bac8a94198f2',
  '10A',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'd5ed823f-0967-4d30-8b46-38c71a893701',
  '2e539b93-5669-4f0b-aa2e-bac8a94198f2',
  '20A',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2a598aea-f8d7-4655-a4e5-9c461bde2476',
  '2e539b93-5669-4f0b-aa2e-bac8a94198f2',
  'Simples',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b680643b-8421-4c63-bcc7-47e8b8121430',
  '2e539b93-5669-4f0b-aa2e-bac8a94198f2',
  'Dupla',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ead61c6f-4dff-4d4f-9424-29ea6b6ec4c7',
  'bee9c3b7-0ead-4bf0-a008-6402054d0fde',
  '1kg',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '6bd9ddcd-7b1b-4d87-b093-309e3be06908',
  'bee9c3b7-0ead-4bf0-a008-6402054d0fde',
  'Cereja',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fa5ce948-dcb1-4586-8f08-7d7611166660',
  'bee9c3b7-0ead-4bf0-a008-6402054d0fde',
  'Italiano',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '2036f6df-5123-44d4-8b20-daf5a25f3502',
  'bee9c3b7-0ead-4bf0-a008-6402054d0fde',
  '500g',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e02b6223-9de2-4d7a-ae97-1e7e32e526d4',
  'f41a3a50-84d8-4b88-ae16-6249137d35af',
  'Parede',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ab90f225-cb9a-41ee-a370-79543eb17ee7',
  'f41a3a50-84d8-4b88-ae16-6249137d35af',
  'Mesa',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '13157368-06fb-4828-be02-570d93219516',
  'f41a3a50-84d8-4b88-ae16-6249137d35af',
  'Metal',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a0c928bb-27d7-41c6-974b-98ae5932d5dc',
  'f41a3a50-84d8-4b88-ae16-6249137d35af',
  'Plástico',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ad96a81d-1575-41b9-b81b-ae4ee648f975',
  'd4f54688-dbec-4bad-b3a9-257df3111713',
  'Corrente',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '77ce4144-ce0e-4756-9756-8035a4314f5a',
  'd4f54688-dbec-4bad-b3a9-257df3111713',
  'Pingente',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '44956a76-488e-438e-b368-436c4f8163dd',
  'd4f54688-dbec-4bad-b3a9-257df3111713',
  'Pérolas',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1afcbb47-7ec0-4e51-b728-41872b3a9825',
  'd4f54688-dbec-4bad-b3a9-257df3111713',
  'Colorida',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '397f867a-0f05-4184-bbae-16cac5f223b7',
  'b9cd2ae3-ce6d-4aa8-9594-53946962aa81',
  'Merengue',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '89be3820-1450-4eaf-9e36-21678195ef54',
  'b9cd2ae3-ce6d-4aa8-9594-53946962aa81',
  'Chocolate',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'b5ffb2da-8697-4fe1-bfcb-b538810d88b7',
  'b9cd2ae3-ce6d-4aa8-9594-53946962aa81',
  'Frutas vermelhas',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a6b0f433-e46e-4c7a-a1cf-9067da066f59',
  'b9cd2ae3-ce6d-4aa8-9594-53946962aa81',
  'Tradicional',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8a7acee1-d2f8-4a83-8735-41e0c0042c78',
  '8dad67d2-457c-4034-86fb-5407e3c53ba7',
  'Presunto e queijo',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '70e9c0a2-1360-4a03-8b49-c141dcd0c235',
  '8dad67d2-457c-4034-86fb-5407e3c53ba7',
  'Palmito',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '20532591-1350-4eb9-b547-8f43981cf833',
  '8dad67d2-457c-4034-86fb-5407e3c53ba7',
  'Legumes',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '834526a6-0f4e-442d-a5ef-3d08e5fed8b6',
  '8dad67d2-457c-4034-86fb-5407e3c53ba7',
  'Frango',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '84b2d840-b9f0-4bc7-8689-ea0cde402407',
  '51d4382d-cfaa-43f4-86e8-04de8acdc764',
  'Roxa',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '44f52673-0cb7-478a-a61a-676194c79acd',
  '51d4382d-cfaa-43f4-86e8-04de8acdc764',
  'Sem semente',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ceed2512-1898-424a-b2d3-3c5d52bd9182',
  '51d4382d-cfaa-43f4-86e8-04de8acdc764',
  'Mix',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'a60ba631-6050-401a-9fda-71a7236cff17',
  '51d4382d-cfaa-43f4-86e8-04de8acdc764',
  'Verde',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '31482afe-e783-487b-a7b6-41dc2847635e',
  '8cd36bac-a103-4219-9f56-fd9ff4231454',
  'GG',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '782bc17c-7777-4ad6-bd83-9466c09e9a97',
  '8cd36bac-a103-4219-9f56-fd9ff4231454',
  'P',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'fafa8f2d-afa7-4874-98c8-3c002655cbac',
  '8cd36bac-a103-4219-9f56-fd9ff4231454',
  'M',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '5ddbdbbd-2200-4dbd-af71-b05785904cbe',
  '8cd36bac-a103-4219-9f56-fd9ff4231454',
  'G',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '54a13a72-df80-4015-9b0b-b25b3bc83f2d',
  'dc589a7f-8531-4cc8-8827-d6bf22d83067',
  'Vermelho',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ef8fdb8c-f576-4b71-bbb1-48e0b82513f1',
  'dc589a7f-8531-4cc8-8827-d6bf22d83067',
  'Bege',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'edb53c12-5545-460c-a855-5281d5f80185',
  'dc589a7f-8531-4cc8-8827-d6bf22d83067',
  'Floral',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '7b362d16-6f99-452c-8ebd-0cb7c0c4aa3f',
  'dc589a7f-8531-4cc8-8827-d6bf22d83067',
  'Preto',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ed5a78b7-3cf5-4151-b68f-d945c7d9906b',
  '7a59b638-21cd-42a4-b963-c57f334e3e1f',
  'Morango',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '836fbae4-8ba6-4216-9594-ae6937fc8c0e',
  '7a59b638-21cd-42a4-b963-c57f334e3e1f',
  'Abacate',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '0eac8469-6e06-4fb4-b24b-901611ab539e',
  '7a59b638-21cd-42a4-b963-c57f334e3e1f',
  'Mix',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '1201abb9-6924-4af9-843b-b8dfe57e242e',
  '7a59b638-21cd-42a4-b963-c57f334e3e1f',
  'Banana',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '57bdfffa-679c-4692-ac30-1b2534c2e99a',
  'c0f0c881-8607-44a4-b71c-548448ba6e31',
  'Cookies',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '45d7cef6-de9e-4e36-a5a8-62cb2b624ea6',
  'c0f0c881-8607-44a4-b71c-548448ba6e31',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'ff23d719-06fc-4c1b-907a-f230446b6353',
  'c0f0c881-8607-44a4-b71c-548448ba6e31',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '8ae08753-5b21-43ed-a739-675a843add01',
  'c0f0c881-8607-44a4-b71c-548448ba6e31',
  'Morango',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '986f755c-f49e-4d3a-8f03-5dc81ea2ec03',
  'b8050945-a511-4c4b-a182-a47b26a15a6e',
  'Cookies',
  0,
  FALSE,
  TRUE,
  3,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '93ec8b68-28f2-4758-87ff-933bc2616a5d',
  'b8050945-a511-4c4b-a182-a47b26a15a6e',
  'Chocolate',
  0,
  TRUE,
  TRUE,
  0,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  '48a2f244-e813-4692-83fe-69b724dcf448',
  'b8050945-a511-4c4b-a182-a47b26a15a6e',
  'Baunilha',
  0,
  FALSE,
  TRUE,
  1,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

INSERT INTO public.product_option_item (
  id, group_id, name, price_delta, default_selected, active, sort_order, photo_url
)
VALUES (
  'e18513cb-837b-4e39-a1b4-a6e60269a8b6',
  'b8050945-a511-4c4b-a182-a47b26a15a6e',
  'Morango',
  0,
  FALSE,
  TRUE,
  2,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  price_delta = EXCLUDED.price_delta,
  default_selected = EXCLUDED.default_selected,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  photo_url = EXCLUDED.photo_url;

COMMIT;
