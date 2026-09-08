-- Migration 051: Rename 'peca' to 'unidade' in unidade_medida_enum
-- Context: User requested to change 'peca' to 'unidade' for better readability
-- This migration updates the enum type and existing data

-- Step 1: Add new 'unidade' value to enum
ALTER TYPE public.unidade_medida_enum ADD VALUE IF NOT EXISTS 'unidade';

-- Step 2: Update existing products that use 'peca' to 'unidade'
UPDATE public.produtos 
SET unidade_medida = 'unidade' 
WHERE unidade_medida = 'peca';

-- Step 3: Create new enum without 'peca'
CREATE TYPE public.unidade_medida_enum_new AS ENUM ('kg', 'litro', 'metro', 'unidade', 'caixa');

-- Step 4: Alter column to use new enum
ALTER TABLE public.produtos 
  ALTER COLUMN unidade_medida TYPE public.unidade_medida_enum_new 
  USING unidade_medida::text::public.unidade_medida_enum_new;

-- Step 5: Drop old enum and rename new one
DROP TYPE public.unidade_medida_enum;
ALTER TYPE public.unidade_medida_enum_new RENAME TO unidade_medida_enum;

-- Step 6: Update default value
ALTER TABLE public.produtos 
  ALTER COLUMN unidade_medida SET DEFAULT 'unidade'::public.unidade_medida_enum;
