-- =====================================================================================
-- MIGRATION: Backfill de perfis `usuarios` para auth.users órfãos
-- Versão: 014
-- Fase do Plano: 5.10 (ajuste cirúrgico — item 1)
-- Descrição: Os usuários auth criados ANTES do trigger `on_auth_user_created`
--            (migração 003) não possuem linha em `public.usuarios`. Sem essa
--            linha, `is_staff()`/`has_role()` retornam false e a RLS bloqueia
--            100% das leituras de `pedidos`/`kanban_coluna` — o Kanban aparece
--            vazio mesmo com dados no banco. Este backfill é idempotente e
--            corrige o estado herdado (o trigger cobre apenas INSERTs futuros).
-- =====================================================================================

BEGIN;

-- 1) Backfill genérico: cria perfil mínimo para qualquer auth.user sem linha.
--    Espelha o default do trigger `handle_new_auth_user` (role 'atendente').
--    Não confiamos em `raw_user_meta_data->>'role'` aqui porque valores legados
--    (ex.: 'admin') não pertencem ao enum `role_usuario_enum` e quebrariam o cast.
INSERT INTO public.usuarios (id, nome, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'nome', au.email),
  'atendente'::role_usuario_enum
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 2) Promoção dos administradores conhecidos (bootstrap).
--    Idempotente e seguro em qualquer ambiente: afeta 0 linhas quando o e-mail
--    não existe. Segue a instrução de seed da migração 003 (promover o
--    proprietário inicial manualmente), agora automatizada para os donos reais.
UPDATE public.usuarios u
SET role = 'proprietario'
FROM auth.users au
WHERE au.id = u.id
  AND au.email = 'contato.noveli@gmail.com'
  AND u.role <> 'proprietario';

UPDATE public.usuarios u
SET role = 'administrador'
FROM auth.users au
WHERE au.id = u.id
  AND au.email = 'admin@pedped.com'
  AND u.role <> 'administrador';

COMMIT;
