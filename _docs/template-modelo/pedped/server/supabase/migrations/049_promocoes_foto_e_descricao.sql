-- Migration 049: Add foto_url, imagens and descricao to promocoes table
ALTER TABLE public.promocoes ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE public.promocoes ADD COLUMN IF NOT EXISTS imagens text[] DEFAULT '{}';
ALTER TABLE public.promocoes ADD COLUMN IF NOT EXISTS descricao text;
