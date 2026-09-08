-- Migration 049: Add cor (color) to categorias table for customized category branding
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS cor text;
