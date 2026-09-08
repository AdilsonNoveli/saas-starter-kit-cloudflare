-- Migration 027: Add mostrar_pagina_fechada to config_loja_fechada default and backfill existing rows
--
-- When mostrar_pagina_fechada is false, the store-closed page is not shown;
-- the catalog remains accessible but order finalization is blocked server-side.
-- Default is true to preserve existing behavior.

-- Update the column default to include the new flag
ALTER TABLE loja
  ALTER COLUMN config_loja_fechada SET DEFAULT '{
    "titulo": "",
    "mensagem_custom": "",
    "mostrar_horarios": true,
    "mostrar_whatsapp": true,
    "mostrar_endereco": false,
    "mostrar_pagina_fechada": true
  }'::jsonb;

-- Backfill existing rows that are missing the key
UPDATE loja
SET config_loja_fechada = config_loja_fechada || '{"mostrar_pagina_fechada": true}'::jsonb
WHERE config_loja_fechada IS NOT NULL
  AND NOT (config_loja_fechada ? 'mostrar_pagina_fechada');

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
