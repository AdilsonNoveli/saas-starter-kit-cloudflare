-- Migration 025: configuração da página "loja fechada"
ALTER TABLE public.loja
  ADD COLUMN IF NOT EXISTS config_loja_fechada JSONB NOT NULL DEFAULT '{
    "titulo": "",
    "mensagem_custom": "",
    "mostrar_horarios": true,
    "mostrar_whatsapp": true,
    "mostrar_endereco": false
  }'::jsonb;

NOTIFY pgrst, 'reload schema';
