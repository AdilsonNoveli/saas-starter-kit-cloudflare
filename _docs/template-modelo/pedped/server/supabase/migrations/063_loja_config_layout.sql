-- Migration: Adicionar coluna config_layout à tabela loja para customização visual do catálogo

ALTER TABLE public.loja 
ADD COLUMN IF NOT EXISTS config_layout jsonb NOT NULL DEFAULT '{}'::jsonb;
