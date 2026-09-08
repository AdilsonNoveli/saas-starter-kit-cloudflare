-- Migration 021: rótulo de exibição do kit no catálogo
ALTER TABLE kits
  ADD COLUMN IF NOT EXISTS etiqueta TEXT NOT NULL DEFAULT 'KIT'
    CHECK (etiqueta IN ('KIT', 'COMBO', 'PACOTE'));

COMMENT ON COLUMN kits.etiqueta IS 'Rótulo exibido no badge do card: KIT, COMBO ou PACOTE.';
