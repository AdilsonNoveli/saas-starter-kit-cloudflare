-- Migration 050: Add descricao and icone_url to categorias table
-- Context: Fase 6 introduced category details (description, icon, color) but
-- descricao and icone_url columns were never added to the database schema.
-- This migration adds the missing columns to match the application layer.

ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS icone_url text;
