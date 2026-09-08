-- Migration 048: Add tema_catalogo to loja table for global catalog theme control
ALTER TABLE public.loja ADD COLUMN IF NOT EXISTS tema_catalogo text DEFAULT 'system';
ALTER TABLE public.loja ADD CONSTRAINT loja_tema_catalogo_check CHECK (tema_catalogo IN ('light', 'dark', 'system'));
