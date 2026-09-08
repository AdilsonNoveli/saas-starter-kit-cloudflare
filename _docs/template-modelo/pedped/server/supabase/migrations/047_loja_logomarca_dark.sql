-- Migration 047: Add logomarca_dark to loja table for theme-aware branding
ALTER TABLE public.loja ADD COLUMN IF NOT EXISTS logomarca_dark text;
