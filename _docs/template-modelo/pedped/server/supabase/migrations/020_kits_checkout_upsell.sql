-- Migration 020: flag para exibir kit como upsell no checkout
ALTER TABLE kits
  ADD COLUMN IF NOT EXISTS mostrar_no_checkout BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN kits.mostrar_no_checkout IS
  'Quando true, o kit aparece como upsell na tela de checkout do catálogo.';
