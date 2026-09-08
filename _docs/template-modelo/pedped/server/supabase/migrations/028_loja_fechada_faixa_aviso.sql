-- Migration 028: Add mostrar_faixa_fechada to config_loja_fechada
--
-- When mostrar_pagina_fechada is false, the catalog remains visible but a narrow
-- warning banner can be shown below the category bar. mostrar_faixa_fechada controls
-- whether that banner is displayed. Defaults to true.

ALTER TABLE loja
  ALTER COLUMN config_loja_fechada SET DEFAULT '{
    "titulo": "",
    "mensagem_custom": "",
    "mostrar_horarios": true,
    "mostrar_whatsapp": true,
    "mostrar_endereco": false,
    "mostrar_pagina_fechada": true,
    "mostrar_faixa_fechada": true
  }'::jsonb;

UPDATE loja
SET config_loja_fechada = config_loja_fechada || '{"mostrar_faixa_fechada": true}'::jsonb
WHERE config_loja_fechada IS NOT NULL
  AND NOT (config_loja_fechada ? 'mostrar_faixa_fechada');

NOTIFY pgrst, 'reload schema';
