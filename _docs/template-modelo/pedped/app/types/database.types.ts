export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agente_avaliacao: {
        Row: {
          achados: Json | null
          avaliado_em: string
          cliente_id: string | null
          id: string
          janela: Json
          modelo_avaliador: string
          origem: string
          persona: string | null
          run_id: string | null
          status: string
          tokens_avaliacao: number | null
          uso_id: string | null
          veredicto: string | null
        }
        Insert: {
          achados?: Json | null
          avaliado_em?: string
          cliente_id?: string | null
          id?: string
          janela: Json
          modelo_avaliador: string
          origem: string
          persona?: string | null
          run_id?: string | null
          status?: string
          tokens_avaliacao?: number | null
          uso_id?: string | null
          veredicto?: string | null
        }
        Update: {
          achados?: Json | null
          avaliado_em?: string
          cliente_id?: string | null
          id?: string
          janela?: Json
          modelo_avaliador?: string
          origem?: string
          persona?: string | null
          run_id?: string | null
          status?: string
          tokens_avaliacao?: number | null
          uso_id?: string | null
          veredicto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agente_avaliacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agente_avaliacao_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agente_teste_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agente_avaliacao_uso_id_fkey"
            columns: ["uso_id"]
            isOneToOne: false
            referencedRelation: "agente_uso_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      agente_teste_run: {
        Row: {
          erro: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          score: number | null
          status: string
        }
        Insert: {
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          score?: number | null
          status?: string
        }
        Update: {
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          score?: number | null
          status?: string
        }
        Relationships: []
      }
      agente_uso_tokens: {
        Row: {
          avaliacao_pendente: boolean
          cliente_id: string | null
          completion_tokens: number
          criado_em: string
          id: string
          latencia_ms: number | null
          modelo: string
          prompt_tokens: number
          rounds: number | null
          seq: number | null
          tool_trace: Json | null
        }
        Insert: {
          avaliacao_pendente?: boolean
          cliente_id?: string | null
          completion_tokens: number
          criado_em?: string
          id?: string
          latencia_ms?: number | null
          modelo: string
          prompt_tokens: number
          rounds?: number | null
          seq?: number | null
          tool_trace?: Json | null
        }
        Update: {
          avaliacao_pendente?: boolean
          cliente_id?: string | null
          completion_tokens?: number
          criado_em?: string
          id?: string
          latencia_ms?: number | null
          modelo?: string
          prompt_tokens?: number
          rounds?: number | null
          seq?: number | null
          tool_trace?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agente_uso_tokens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          address_id: string | null
          atualizado_em: string
          criado_em: string
          delivery_mode: string | null
          id: string
          observacao: string | null
          opcoes_assinatura: string
          produto_id: string
          quantidade: number
          sessao_id: string
          target_date: string | null
        }
        Insert: {
          address_id?: string | null
          atualizado_em?: string
          criado_em?: string
          delivery_mode?: string | null
          id?: string
          observacao?: string | null
          opcoes_assinatura?: string
          produto_id: string
          quantidade: number
          sessao_id: string
          target_date?: string | null
        }
        Update: {
          address_id?: string | null
          atualizado_em?: string
          criado_em?: string
          delivery_mode?: string | null
          id?: string
          observacao?: string | null
          opcoes_assinatura?: string
          produto_id?: string
          quantidade?: number
          sessao_id?: string
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "enderecos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items_opcoes: {
        Row: {
          cart_item_id: string
          criado_em: string
          id: string
          nome_congelado: string
          opcao_item_id: string | null
          preco_delta_congelado: number
        }
        Insert: {
          cart_item_id: string
          criado_em?: string
          id?: string
          nome_congelado: string
          opcao_item_id?: string | null
          preco_delta_congelado?: number
        }
        Update: {
          cart_item_id?: string
          criado_em?: string
          id?: string
          nome_congelado?: string
          opcao_item_id?: string | null
          preco_delta_congelado?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_opcoes_cart_item_id_fkey"
            columns: ["cart_item_id"]
            isOneToOne: false
            referencedRelation: "cart_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_opcoes_opcao_item_id_fkey"
            columns: ["opcao_item_id"]
            isOneToOne: false
            referencedRelation: "produto_opcao_item"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativa: boolean | null
          cor: string | null
          descricao: string | null
          icone_url: string | null
          id: string
          nome: string
          ordem: number | null
          principal: boolean
        }
        Insert: {
          ativa?: boolean | null
          cor?: string | null
          descricao?: string | null
          icone_url?: string | null
          id?: string
          nome: string
          ordem?: number | null
          principal?: boolean
        }
        Update: {
          ativa?: boolean | null
          cor?: string | null
          descricao?: string | null
          icone_url?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          principal?: boolean
        }
        Relationships: []
      }
      clientes: {
        Row: {
          atualizado_em: string | null
          bairro_frequente: string | null
          canal_preferido: string | null
          cliente_desde: string | null
          contexto_resumo: string | null
          criado_em: string | null
          data_nascimento: string | null
          descricao_pendencia: string | null
          e_teste_laboratorio: boolean
          foto_url: string | null
          frequencia_compra: string | null
          id: string
          is_visitante: boolean | null
          nome: string
          observacoes_internas: string | null
          pausado_ate: string | null
          pausado_motivo: string | null
          possui_pendencias: boolean | null
          preferencias: string | null
          status: Database["public"]["Enums"]["status_cliente_enum"] | null
          telefone_whatsapp: string | null
          tem_contexto: boolean | null
          ticket_medio: number | null
          total_cancelamentos: number | null
          total_pedidos: number | null
          ultima_conversa: string | null
          ultimo_pedido_em: string | null
          valor_gasto_acumulado: number | null
          whatsapp_lid: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bairro_frequente?: string | null
          canal_preferido?: string | null
          cliente_desde?: string | null
          contexto_resumo?: string | null
          criado_em?: string | null
          data_nascimento?: string | null
          descricao_pendencia?: string | null
          e_teste_laboratorio?: boolean
          foto_url?: string | null
          frequencia_compra?: string | null
          id?: string
          is_visitante?: boolean | null
          nome: string
          observacoes_internas?: string | null
          pausado_ate?: string | null
          pausado_motivo?: string | null
          possui_pendencias?: boolean | null
          preferencias?: string | null
          status?: Database["public"]["Enums"]["status_cliente_enum"] | null
          telefone_whatsapp?: string | null
          tem_contexto?: boolean | null
          ticket_medio?: number | null
          total_cancelamentos?: number | null
          total_pedidos?: number | null
          ultima_conversa?: string | null
          ultimo_pedido_em?: string | null
          valor_gasto_acumulado?: number | null
          whatsapp_lid?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bairro_frequente?: string | null
          canal_preferido?: string | null
          cliente_desde?: string | null
          contexto_resumo?: string | null
          criado_em?: string | null
          data_nascimento?: string | null
          descricao_pendencia?: string | null
          e_teste_laboratorio?: boolean
          foto_url?: string | null
          frequencia_compra?: string | null
          id?: string
          is_visitante?: boolean | null
          nome?: string
          observacoes_internas?: string | null
          pausado_ate?: string | null
          pausado_motivo?: string | null
          possui_pendencias?: boolean | null
          preferencias?: string | null
          status?: Database["public"]["Enums"]["status_cliente_enum"] | null
          telefone_whatsapp?: string | null
          tem_contexto?: boolean | null
          ticket_medio?: number | null
          total_cancelamentos?: number | null
          total_pedidos?: number | null
          ultima_conversa?: string | null
          ultimo_pedido_em?: string | null
          valor_gasto_acumulado?: number | null
          whatsapp_lid?: string | null
        }
        Relationships: []
      }
      cupons: {
        Row: {
          ativo: boolean
          codigo: string
          criado_em: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          tipo_desconto: string
          uso_atual: number
          uso_maximo: number | null
          valor: number
          valor_minimo: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          tipo_desconto?: string
          uso_atual?: number
          uso_maximo?: number | null
          valor: number
          valor_minimo?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          tipo_desconto?: string
          uso_atual?: number
          uso_maximo?: number | null
          valor?: number
          valor_minimo?: number
        }
        Relationships: []
      }
      enderecos_cliente: {
        Row: {
          apelido: Database["public"]["Enums"]["apelido_endereco_enum"] | null
          bairro: string
          cep: string | null
          cidade: string | null
          cliente_id: string | null
          complemento: string | null
          criado_em: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          numero: string
          padrao: boolean | null
          rua: string
        }
        Insert: {
          apelido?: Database["public"]["Enums"]["apelido_endereco_enum"] | null
          bairro: string
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          complemento?: string | null
          criado_em?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          numero: string
          padrao?: boolean | null
          rua: string
        }
        Update: {
          apelido?: Database["public"]["Enums"]["apelido_endereco_enum"] | null
          bairro?: string
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          complemento?: string | null
          criado_em?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          numero?: string
          padrao?: boolean | null
          rua?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentacoes: {
        Row: {
          criado_em: string
          entidade_id: string
          id: string
          motivo: string | null
          pedido_id: string | null
          quantidade: number
          tipo_entidade: string
          tipo_movimento: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          entidade_id: string
          id?: string
          motivo?: string | null
          pedido_id?: string | null
          quantidade: number
          tipo_entidade: string
          tipo_movimento: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          entidade_id?: string
          id?: string
          motivo?: string | null
          pedido_id?: string | null
          quantidade?: number
          tipo_entidade?: string
          tipo_movimento?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_rastreamento: {
        Row: {
          criado_em: string
          entidade: string | null
          entidade_id: string | null
          id: string
          metadata: Json
          sessao_id: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          metadata?: Json
          sessao_id?: string | null
          tipo: string
        }
        Update: {
          criado_em?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          metadata?: Json
          sessao_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_rastreamento_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          estoque_atual: number
          estoque_minimo: number | null
          id: string
          nome: string
          unidade_medida: Database["public"]["Enums"]["unidade_medida_enum"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          estoque_atual?: number
          estoque_minimo?: number | null
          id?: string
          nome: string
          unidade_medida?: Database["public"]["Enums"]["unidade_medida_enum"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          estoque_atual?: number
          estoque_minimo?: number | null
          id?: string
          nome?: string
          unidade_medida?: Database["public"]["Enums"]["unidade_medida_enum"]
        }
        Relationships: []
      }
      integration_idempotency: {
        Row: {
          criado_em: string
          expires_at: string
          id: string
          key: string
          payload: Json | null
          status: string
        }
        Insert: {
          criado_em?: string
          expires_at?: string
          id?: string
          key: string
          payload?: Json | null
          status?: string
        }
        Update: {
          criado_em?: string
          expires_at?: string
          id?: string
          key?: string
          payload?: Json | null
          status?: string
        }
        Relationships: []
      }
      itens_pedido: {
        Row: {
          delivery_mode: string | null
          endereco_id: string | null
          id: string
          nome_produto_congelado: string | null
          pedido_id: string | null
          preco_unitario_congelado: number | null
          produto_id: string | null
          quantidade: number
          subtotal: number | null
        }
        Insert: {
          delivery_mode?: string | null
          endereco_id?: string | null
          id?: string
          nome_produto_congelado?: string | null
          pedido_id?: string | null
          preco_unitario_congelado?: number | null
          produto_id?: string | null
          quantidade?: number
          subtotal?: number | null
        }
        Update: {
          delivery_mode?: string | null
          endereco_id?: string | null
          id?: string
          nome_produto_congelado?: string | null
          pedido_id?: string | null
          preco_unitario_congelado?: number | null
          produto_id?: string | null
          quantidade?: number
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido_opcoes: {
        Row: {
          criado_em: string
          id: string
          item_pedido_id: string
          nome_congelado: string
          opcao_item_id: string | null
          preco_delta_congelado: number
        }
        Insert: {
          criado_em?: string
          id?: string
          item_pedido_id: string
          nome_congelado: string
          opcao_item_id?: string | null
          preco_delta_congelado?: number
        }
        Update: {
          criado_em?: string
          id?: string
          item_pedido_id?: string
          nome_congelado?: string
          opcao_item_id?: string | null
          preco_delta_congelado?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_opcoes_item_pedido_id_fkey"
            columns: ["item_pedido_id"]
            isOneToOne: false
            referencedRelation: "itens_pedido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_opcoes_opcao_item_id_fkey"
            columns: ["opcao_item_id"]
            isOneToOne: false
            referencedRelation: "produto_opcao_item"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_coluna: {
        Row: {
          atualizado_em: string
          chave: string
          cor: string
          is_cancelled: boolean
          is_delivered: boolean
          is_delivery_dispatch: boolean
          is_open: boolean
          is_out_for_delivery: boolean
          is_revenue_trigger: boolean
          is_sistema: boolean
          label: string
          ordem: number
          visivel: boolean
        }
        Insert: {
          atualizado_em?: string
          chave: string
          cor?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_delivery_dispatch?: boolean
          is_open?: boolean
          is_out_for_delivery?: boolean
          is_revenue_trigger?: boolean
          is_sistema?: boolean
          label: string
          ordem?: number
          visivel?: boolean
        }
        Update: {
          atualizado_em?: string
          chave?: string
          cor?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_delivery_dispatch?: boolean
          is_open?: boolean
          is_out_for_delivery?: boolean
          is_revenue_trigger?: boolean
          is_sistema?: boolean
          label?: string
          ordem?: number
          visivel?: boolean
        }
        Relationships: []
      }
      kit_itens: {
        Row: {
          id: string
          kit_id: string | null
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          id?: string
          kit_id?: string | null
          produto_id?: string | null
          quantidade?: number
        }
        Update: {
          id?: string
          kit_id?: string | null
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_itens_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          categoria_id: string | null
          criado_em: string | null
          descricao: string | null
          disponivel: boolean | null
          etiqueta: string
          foto_url: string | null
          id: string
          imagens: string[]
          mostrar_no_checkout: boolean
          nome: string
          preco_fixo: number | null
        }
        Insert: {
          categoria_id?: string | null
          criado_em?: string | null
          descricao?: string | null
          disponivel?: boolean | null
          etiqueta?: string
          foto_url?: string | null
          id?: string
          imagens?: string[]
          mostrar_no_checkout?: boolean
          nome: string
          preco_fixo?: number | null
        }
        Update: {
          categoria_id?: string | null
          criado_em?: string | null
          descricao?: string | null
          disponivel?: boolean | null
          etiqueta?: string
          foto_url?: string | null
          id?: string
          imagens?: string[]
          mostrar_no_checkout?: boolean
          nome?: string
          preco_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kits_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      loja: {
        Row: {
          agente_ativo: boolean
          agente_audio_habilitado: boolean
          agente_imagem_habilitado: boolean
          agente_instrucoes_extra: string | null
          agente_modelo: string
          agente_modelo_avaliador: string
          agente_modelo_transcricao: string
          agente_modelo_visao: string
          agente_nome: string | null
          agente_openai_key_id: string | null
          agente_openai_key_mascara: string | null
          agente_pausa_humana_ativo: boolean
          agente_pausa_humana_minutos: number
          agente_saudacao: string | null
          agente_tools_habilitadas: Json
          chave_pix: string | null
          cnpj: string | null
          config_horarios: Json | null
          config_layout: Json
          config_loja_fechada: Json
          config_pedidos: Json | null
          config_promocoes: Json | null
          criado_em: string
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          endereco_uf: string | null
          id: string
          latitude_origem: number | null
          logomarca: string | null
          logomarca_dark: string | null
          longitude_origem: number | null
          nome_fantasia: string
          permite_retirada: boolean
          raio_atendimento_km: number | null
          status_conta: string
          status_operacao: string
          status_override_data: string | null
          taxa_entrega_padrao: number
          tema_catalogo: string | null
          uazapi_instance_name: string | null
          uazapi_instance_token: string | null
          webhook_ativo: boolean
          webhook_signing_secret_id: string | null
          webhook_signing_secret_mascara: string | null
          webhook_token_id: string | null
          webhook_token_mascara: string | null
          webhook_url: string | null
          whatsapp_api_base_url: string
          whatsapp_api_key_id: string | null
          whatsapp_api_key_mascara: string | null
          whatsapp_atendimento: string | null
          whatsapp_provedor_nome: string
        }
        Insert: {
          agente_ativo?: boolean
          agente_audio_habilitado?: boolean
          agente_imagem_habilitado?: boolean
          agente_instrucoes_extra?: string | null
          agente_modelo?: string
          agente_modelo_avaliador?: string
          agente_modelo_transcricao?: string
          agente_modelo_visao?: string
          agente_nome?: string | null
          agente_openai_key_id?: string | null
          agente_openai_key_mascara?: string | null
          agente_pausa_humana_ativo?: boolean
          agente_pausa_humana_minutos?: number
          agente_saudacao?: string | null
          agente_tools_habilitadas?: Json
          chave_pix?: string | null
          cnpj?: string | null
          config_horarios?: Json | null
          config_layout?: Json
          config_loja_fechada?: Json
          config_pedidos?: Json | null
          config_promocoes?: Json | null
          criado_em?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          endereco_uf?: string | null
          id?: string
          latitude_origem?: number | null
          logomarca?: string | null
          logomarca_dark?: string | null
          longitude_origem?: number | null
          nome_fantasia: string
          permite_retirada?: boolean
          raio_atendimento_km?: number | null
          status_conta?: string
          status_operacao?: string
          status_override_data?: string | null
          taxa_entrega_padrao?: number
          tema_catalogo?: string | null
          uazapi_instance_name?: string | null
          uazapi_instance_token?: string | null
          webhook_ativo?: boolean
          webhook_signing_secret_id?: string | null
          webhook_signing_secret_mascara?: string | null
          webhook_token_id?: string | null
          webhook_token_mascara?: string | null
          webhook_url?: string | null
          whatsapp_api_base_url?: string
          whatsapp_api_key_id?: string | null
          whatsapp_api_key_mascara?: string | null
          whatsapp_atendimento?: string | null
          whatsapp_provedor_nome?: string
        }
        Update: {
          agente_ativo?: boolean
          agente_audio_habilitado?: boolean
          agente_imagem_habilitado?: boolean
          agente_instrucoes_extra?: string | null
          agente_modelo?: string
          agente_modelo_avaliador?: string
          agente_modelo_transcricao?: string
          agente_modelo_visao?: string
          agente_nome?: string | null
          agente_openai_key_id?: string | null
          agente_openai_key_mascara?: string | null
          agente_pausa_humana_ativo?: boolean
          agente_pausa_humana_minutos?: number
          agente_saudacao?: string | null
          agente_tools_habilitadas?: Json
          chave_pix?: string | null
          cnpj?: string | null
          config_horarios?: Json | null
          config_layout?: Json
          config_loja_fechada?: Json
          config_pedidos?: Json | null
          config_promocoes?: Json | null
          criado_em?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          endereco_uf?: string | null
          id?: string
          latitude_origem?: number | null
          logomarca?: string | null
          logomarca_dark?: string | null
          longitude_origem?: number | null
          nome_fantasia?: string
          permite_retirada?: boolean
          raio_atendimento_km?: number | null
          status_conta?: string
          status_operacao?: string
          status_override_data?: string | null
          taxa_entrega_padrao?: number
          tema_catalogo?: string | null
          uazapi_instance_name?: string | null
          uazapi_instance_token?: string | null
          webhook_ativo?: boolean
          webhook_signing_secret_id?: string | null
          webhook_signing_secret_mascara?: string | null
          webhook_token_id?: string | null
          webhook_token_mascara?: string | null
          webhook_url?: string | null
          whatsapp_api_base_url?: string
          whatsapp_api_key_id?: string | null
          whatsapp_api_key_mascara?: string | null
          whatsapp_atendimento?: string | null
          whatsapp_provedor_nome?: string
        }
        Relationships: []
      }
      paginas: {
        Row: {
          atualizado_em: string
          conteudo: string
          criado_em: string
          slug: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          conteudo: string
          criado_em?: string
          slug: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          conteudo?: string
          criado_em?: string
          slug?: string
          titulo?: string
        }
        Relationships: []
      }
      pedido_status_historico: {
        Row: {
          alterado_por: string | null
          criado_em: string
          id: string
          origem: string
          pedido_id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          alterado_por?: string | null
          criado_em?: string
          id?: string
          origem?: string
          pedido_id: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          alterado_por?: string | null
          criado_em?: string
          id?: string
          origem?: string
          pedido_id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_status_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_status_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          arquivado: boolean | null
          arquivado_em: string | null
          atribuido_em: string | null
          atualizado_em: string | null
          cliente_id: string | null
          criado_em: string | null
          desconto_aplicado: number | null
          endereco_id: string | null
          entregador_id: string | null
          entregue_em: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento_enum"]
          frete_gratis_aplicado: boolean | null
          id: string
          nota_atendimento: string | null
          nota_operacional: string | null
          observacoes: string | null
          sessao_id: string | null
          short_id: number | null
          status: string | null
          tempo_entrega_minutos: number | null
          tipo_entrega: Database["public"]["Enums"]["tipo_entrega_enum"]
          troco_para: number | null
          valor_desconto: number | null
          valor_entrega: number | null
          valor_frete: number | null
          valor_subtotal: number | null
          valor_total: number | null
        }
        Insert: {
          arquivado?: boolean | null
          arquivado_em?: string | null
          atribuido_em?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          desconto_aplicado?: number | null
          endereco_id?: string | null
          entregador_id?: string | null
          entregue_em?: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento_enum"]
          frete_gratis_aplicado?: boolean | null
          id?: string
          nota_atendimento?: string | null
          nota_operacional?: string | null
          observacoes?: string | null
          sessao_id?: string | null
          short_id?: number | null
          status?: string | null
          tempo_entrega_minutos?: number | null
          tipo_entrega: Database["public"]["Enums"]["tipo_entrega_enum"]
          troco_para?: number | null
          valor_desconto?: number | null
          valor_entrega?: number | null
          valor_frete?: number | null
          valor_subtotal?: number | null
          valor_total?: number | null
        }
        Update: {
          arquivado?: boolean | null
          arquivado_em?: string | null
          atribuido_em?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          desconto_aplicado?: number | null
          endereco_id?: string | null
          entregador_id?: string | null
          entregue_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento_enum"]
          frete_gratis_aplicado?: boolean | null
          id?: string
          nota_atendimento?: string | null
          nota_operacional?: string | null
          observacoes?: string | null
          sessao_id?: string | null
          short_id?: number | null
          status?: string | null
          tempo_entrega_minutos?: number | null
          tipo_entrega?: Database["public"]["Enums"]["tipo_entrega_enum"]
          troco_para?: number | null
          valor_desconto?: number | null
          valor_entrega?: number | null
          valor_frete?: number | null
          valor_subtotal?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "kanban_coluna"
            referencedColumns: ["chave"]
          },
        ]
      }
      preorder_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          product_id: string | null
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          product_id?: string | null
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          product_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preorder_blocked_dates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      preorders: {
        Row: {
          created_at: string
          delivery_date: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          rules_snapshot: Json
          unit: string
        }
        Insert: {
          created_at?: string
          delivery_date: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          rules_snapshot: Json
          unit: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          rules_snapshot?: Json
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "preorders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preorders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_insumos: {
        Row: {
          insumo_id: string
          produto_id: string
          quantidade_por_unidade: number
        }
        Insert: {
          insumo_id: string
          produto_id: string
          quantidade_por_unidade: number
        }
        Update: {
          insumo_id?: string
          produto_id?: string
          quantidade_por_unidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "produto_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_insumos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_opcao_grupo: {
        Row: {
          criado_em: string
          id: string
          max_selecoes: number
          min_selecoes: number
          nome: string
          obrigatorio: boolean
          ordem: number
          produto_id: string
          tipo: Database["public"]["Enums"]["tipo_opcao_grupo_enum"]
        }
        Insert: {
          criado_em?: string
          id?: string
          max_selecoes?: number
          min_selecoes?: number
          nome: string
          obrigatorio?: boolean
          ordem?: number
          produto_id: string
          tipo?: Database["public"]["Enums"]["tipo_opcao_grupo_enum"]
        }
        Update: {
          criado_em?: string
          id?: string
          max_selecoes?: number
          min_selecoes?: number
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          produto_id?: string
          tipo?: Database["public"]["Enums"]["tipo_opcao_grupo_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "produto_opcao_grupo_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_opcao_item: {
        Row: {
          ativo: boolean
          criado_em: string
          foto_url: string | null
          grupo_id: string
          id: string
          nome: string
          ordem: number
          preco_delta: number
          selecionado_padrao: boolean
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          grupo_id: string
          id?: string
          nome: string
          ordem?: number
          preco_delta?: number
          selecionado_padrao?: boolean
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          grupo_id?: string
          id?: string
          nome?: string
          ordem?: number
          preco_delta?: number
          selecionado_padrao?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "produto_opcao_item_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "produto_opcao_grupo"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_relacionados: {
        Row: {
          ordem: number
          produto_id: string
          produto_relacionado_id: string
        }
        Insert: {
          ordem?: number
          produto_id: string
          produto_relacionado_id: string
        }
        Update: {
          ordem?: number
          produto_id?: string
          produto_relacionado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_relacionados_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_relacionados_produto_relacionado_id_fkey"
            columns: ["produto_relacionado_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria_id: string | null
          controle_estoque: string
          criado_em: string | null
          descricao: string | null
          disponivel: boolean | null
          estoque_atual: number | null
          estoque_minimo: number | null
          foto_url: string | null
          id: string
          imagens: string[]
          margem_lucro: number
          nome: string
          permite_fracionamento: boolean | null
          preco_custo: number
          preco_promocional: number | null
          preco_venda: number | null
          preorder_config: Json | null
          producao_diaria_limite: number | null
          product_type: string
          rank_aleatorio: number
          requirements: Json
          sinonimos: string[]
          unidade_medida:
            | Database["public"]["Enums"]["unidade_medida_enum"]
            | null
        }
        Insert: {
          categoria_id?: string | null
          controle_estoque?: string
          criado_em?: string | null
          descricao?: string | null
          disponivel?: boolean | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          imagens?: string[]
          margem_lucro?: number
          nome: string
          permite_fracionamento?: boolean | null
          preco_custo?: number
          preco_promocional?: number | null
          preco_venda?: number | null
          preorder_config?: Json | null
          producao_diaria_limite?: number | null
          product_type?: string
          rank_aleatorio?: number
          requirements?: Json
          sinonimos?: string[]
          unidade_medida?:
            | Database["public"]["Enums"]["unidade_medida_enum"]
            | null
        }
        Update: {
          categoria_id?: string | null
          controle_estoque?: string
          criado_em?: string | null
          descricao?: string | null
          disponivel?: boolean | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          imagens?: string[]
          margem_lucro?: number
          nome?: string
          permite_fracionamento?: boolean | null
          preco_custo?: number
          preco_promocional?: number | null
          preco_venda?: number | null
          preorder_config?: Json | null
          producao_diaria_limite?: number | null
          product_type?: string
          rank_aleatorio?: number
          requirements?: Json
          sinonimos?: string[]
          unidade_medida?:
            | Database["public"]["Enums"]["unidade_medida_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      promocao_produtos: {
        Row: {
          id: string
          produto_id: string | null
          promocao_id: string | null
        }
        Insert: {
          id?: string
          produto_id?: string | null
          promocao_id?: string | null
        }
        Update: {
          id?: string
          produto_id?: string | null
          promocao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promocao_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocao_produtos_promocao_id_fkey"
            columns: ["promocao_id"]
            isOneToOne: false
            referencedRelation: "promocoes"
            referencedColumns: ["id"]
          },
        ]
      }
      promocoes: {
        Row: {
          ativa: boolean | null
          categoria_id: string | null
          categorias_ids: string[] | null
          configuracao: Json
          criado_em: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          foto_url: string | null
          id: string
          imagens: string[] | null
          nome: string
          posicao_exibicao: string | null
          tipo: Database["public"]["Enums"]["tipo_promocao_enum"]
        }
        Insert: {
          ativa?: boolean | null
          categoria_id?: string | null
          categorias_ids?: string[] | null
          configuracao: Json
          criado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          foto_url?: string | null
          id?: string
          imagens?: string[] | null
          nome: string
          posicao_exibicao?: string | null
          tipo: Database["public"]["Enums"]["tipo_promocao_enum"]
        }
        Update: {
          ativa?: boolean | null
          categoria_id?: string | null
          categorias_ids?: string[] | null
          configuracao?: Json
          criado_em?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          foto_url?: string | null
          id?: string
          imagens?: string[] | null
          nome?: string
          posicao_exibicao?: string | null
          tipo?: Database["public"]["Enums"]["tipo_promocao_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_frete_distancia: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          distancia_max_km: number
          distancia_min_km: number
          id: string
          ordem: number
          valor_frete: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          distancia_max_km: number
          distancia_min_km: number
          id?: string
          ordem: number
          valor_frete: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          distancia_max_km?: number
          distancia_min_km?: number
          id?: string
          ordem?: number
          valor_frete?: number
        }
        Relationships: []
      }
      sessoes: {
        Row: {
          address_id: string | null
          canal: string | null
          cliente_id: string | null
          criado_em: string | null
          delivery_mode: string | null
          expira_em: string | null
          id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["status_sessao_enum"] | null
        }
        Insert: {
          address_id?: string | null
          canal?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          delivery_mode?: string | null
          expira_em?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["status_sessao_enum"] | null
        }
        Update: {
          address_id?: string | null
          canal?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          delivery_mode?: string | null
          expira_em?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["status_sessao_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "enderecos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          atualizado_em: string
          avatar_url: string | null
          criado_em: string
          id: string
          nome: string | null
          role: Database["public"]["Enums"]["role_usuario_enum"]
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          id: string
          nome?: string | null
          role?: Database["public"]["Enums"]["role_usuario_enum"]
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["role_usuario_enum"]
          whatsapp?: string | null
        }
        Relationships: []
      }
      webhook_outbox: {
        Row: {
          criado_em: string
          destino_url: string
          enviado_em: string | null
          event_id: string
          evento: string
          http_status: number | null
          id: string
          max_tentativas: number
          payload: Json
          proxima_tentativa_em: string
          status: Database["public"]["Enums"]["webhook_outbox_status_enum"]
          tentativas: number
          ultimo_erro: string | null
        }
        Insert: {
          criado_em?: string
          destino_url: string
          enviado_em?: string | null
          event_id: string
          evento: string
          http_status?: number | null
          id?: string
          max_tentativas?: number
          payload: Json
          proxima_tentativa_em?: string
          status?: Database["public"]["Enums"]["webhook_outbox_status_enum"]
          tentativas?: number
          ultimo_erro?: string | null
        }
        Update: {
          criado_em?: string
          destino_url?: string
          enviado_em?: string | null
          event_id?: string
          evento?: string
          http_status?: number | null
          id?: string
          max_tentativas?: number
          payload?: Json
          proxima_tentativa_em?: string
          status?: Database["public"]["Enums"]["webhook_outbox_status_enum"]
          tentativas?: number
          ultimo_erro?: string | null
        }
        Relationships: []
      }
      webhook_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          event: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number
          next_retry_at: string
          payload: Json
          status: string
          webhook_url: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          event: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload: Json
          status?: string
          webhook_url: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          event?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload?: Json
          status?: string
          webhook_url?: string
        }
        Relationships: []
      }
      whatsapp_conversas: {
        Row: {
          cliente_id: string
          content: string
          criado_em: string
          id: string
          role: string
          seq: number
        }
        Insert: {
          cliente_id: string
          content: string
          criado_em?: string
          id?: string
          role: string
          seq?: number
        }
        Update: {
          cliente_id?: string
          content?: string
          criado_em?: string
          id?: string
          role?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_midia: {
        Row: {
          atualizado_em: string
          criado_em: string
          duracao_ms: number | null
          erro: string | null
          media_id: string
          mime_type: string | null
          modelo: string | null
          nome_contato: string | null
          status: string
          tamanho_bytes: number | null
          telefone: string | null
          tentativas: number
          texto: string | null
          tipo: string
          wamid: string
          whatsapp_lid: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          media_id: string
          mime_type?: string | null
          modelo?: string | null
          nome_contato?: string | null
          status?: string
          tamanho_bytes?: number | null
          telefone?: string | null
          tentativas?: number
          texto?: string | null
          tipo: string
          wamid: string
          whatsapp_lid?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          media_id?: string
          mime_type?: string | null
          modelo?: string | null
          nome_contato?: string | null
          status?: string
          tamanho_bytes?: number | null
          telefone?: string | null
          tentativas?: number
          texto?: string | null
          tipo?: string
          wamid?: string
          whatsapp_lid?: string | null
        }
        Relationships: []
      }
      whatsapp_mensagens_recebidas: {
        Row: {
          recebido_em: string
          wamid: string
        }
        Insert: {
          recebido_em?: string
          wamid: string
        }
        Update: {
          recebido_em?: string
          wamid?: string
        }
        Relationships: []
      }
      whatsapp_turno_buffer: {
        Row: {
          atualizado_em: string
          chave: string
          telefone: string | null
          textos: Json
          ultima_msg_id: string
          whatsapp_lid: string | null
        }
        Insert: {
          atualizado_em?: string
          chave: string
          telefone?: string | null
          textos?: Json
          ultima_msg_id: string
          whatsapp_lid?: string | null
        }
        Update: {
          atualizado_em?: string
          chave?: string
          telefone?: string | null
          textos?: Json
          ultima_msg_id?: string
          whatsapp_lid?: string | null
        }
        Relationships: []
      }
      customer_intelligence: {
        Row: {
          atualizado_em: string
          avg_ticket: number | null
          churn_risk: string
          computed_at: string
          customer_id: string
          cycle_sample_size: number
          delivered_orders: number
          delivery_mode: string | null
          delivery_share: number | null
          median_cycle_days: number | null
          payment_method: string | null
          payment_share: number | null
          peak_hour: number | null
          peak_share: number | null
          peak_weekday: number | null
          preferences: Json
          rfm_frequency_q: number | null
          rfm_monetary_q: number | null
          rfm_recency_q: number | null
          rfm_segment: string | null
          top_products: Json
        }
        Insert: {
          atualizado_em?: string
          avg_ticket?: number | null
          churn_risk?: string
          computed_at?: string
          customer_id: string
          cycle_sample_size?: number
          delivered_orders?: number
          delivery_mode?: string | null
          delivery_share?: number | null
          median_cycle_days?: number | null
          payment_method?: string | null
          payment_share?: number | null
          peak_hour?: number | null
          peak_share?: number | null
          peak_weekday?: number | null
          preferences?: Json
          rfm_frequency_q?: number | null
          rfm_monetary_q?: number | null
          rfm_recency_q?: number | null
          rfm_segment?: string | null
          top_products?: Json
        }
        Update: {
          atualizado_em?: string
          avg_ticket?: number | null
          churn_risk?: string
          computed_at?: string
          customer_id?: string
          cycle_sample_size?: number
          delivered_orders?: number
          delivery_mode?: string | null
          delivery_share?: number | null
          median_cycle_days?: number | null
          payment_method?: string | null
          payment_share?: number | null
          peak_hour?: number | null
          peak_share?: number | null
          peak_weekday?: number | null
          preferences?: Json
          rfm_frequency_q?: number | null
          rfm_monetary_q?: number | null
          rfm_recency_q?: number | null
          rfm_segment?: string | null
          top_products?: Json
        }
        Relationships: [
          {
            foreignKeyName: "customer_intelligence_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recompute_customer_intelligence: { Args: never; Returns: undefined }
      recompute_rfm_segments: { Args: never; Returns: undefined }
      purge_agent_memory: { Args: never; Returns: Json }
      whatsapp_midia_claim: {
        Args: {
          p_wamid: string
          p_max_tentativas: number
        }
        Returns: {
          media_id: string
          mime_type: string | null
          nome_contato: string | null
          tamanho_bytes: number | null
          telefone: string | null
          tentativas: number
          tipo: string
          wamid: string
          whatsapp_lid: string | null
        }[]
      }
      agente_openai_key_delete: { Args: never; Returns: boolean }
      agente_openai_key_get: { Args: never; Returns: string }
      agente_openai_key_set: { Args: { p_key: string }; Returns: string }
      whatsapp_api_key_delete: { Args: never; Returns: boolean }
      whatsapp_api_key_get: { Args: never; Returns: string }
      whatsapp_api_key_set: { Args: { p_key: string }; Returns: string }
      webhook_secret_get: { Args: { p_tipo: string }; Returns: string | null }
      webhook_secret_set: { Args: { p_tipo: string; p_valor: string }; Returns: undefined }
      webhook_secret_delete: { Args: { p_tipo: string }; Returns: boolean }
      assign_order_driver: { Args: { p_pedido_id: string }; Returns: string }
      calcular_frete_por_distancia: {
        Args: { p_distancia_km: number }
        Returns: number
      }
      calculate_frequencia_compra: {
        Args: { p_cliente_id: string }
        Returns: string
      }
      catalog_products_page: {
        Args: {
          p_categoria?: string
          p_cursor_id?: string
          p_cursor_rank?: number
          p_limit?: number
          p_pivot: number
          p_wrapped?: boolean
        }
        Returns: {
          categoria_id: string
          criado_em: string
          descricao: string
          disponivel: boolean
          estoque_atual: number
          foto_url: string
          id: string
          imagens: string[]
          nome: string
          permite_fracionamento: boolean
          preco_promocional: number
          preco_venda: number
          preorder_config: Json
          product_type: string
          rank_aleatorio: number
          tem_opcoes: boolean
          unidade_medida: Database["public"]["Enums"]["unidade_medida_enum"]
          wrapped: boolean
        }[]
      }
      claim_cupom_atomico: {
        Args: { p_codigo: string; p_subtotal: number }
        Returns: {
          cupom_id: string
          desconto: number
        }[]
      }
      cleanup_expired_sessions: {
        Args: never
        Returns: {
          execution_time: string
          total_expired: number
        }[]
      }
      confirm_delivery_inbound: {
        Args: { p_pedido_id: string; p_whatsapp: string }
        Returns: boolean
      }
      consumir_estoque_pedido: {
        Args: { p_itens: Json; p_pedido_id: string }
        Returns: undefined
      }
      create_integration_order: {
        Args: {
          p_cliente_id: string
          p_desconto_aplicado?: number
          p_endereco_id?: string
          p_endereco_novo?: Json
          p_forma_pagamento: Database["public"]["Enums"]["forma_pagamento_enum"]
          p_frete_gratis?: boolean
          p_idempotency_key: string
          p_itens: Json
          p_nota_operacional?: string
          p_observacoes?: string
          p_preorder_items?: Json
          p_sessao_id?: string
          p_status: string
          p_tipo_entrega: Database["public"]["Enums"]["tipo_entrega_enum"]
          p_valor_entrega?: number
        }
        Returns: Json
      }
      decrement_cupom_uso: { Args: { p_cupom_id: string }; Returns: undefined }
      estornar_estoque_pedido: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      f_array_to_string: { Args: { arr: string[] }; Returns: string }
      f_unaccent: { Args: { txt: string }; Returns: string }
      get_dashboard_counts: {
        Args: { p_date_end: string; p_date_start: string }
        Returns: {
          cancelados: number
          clientes_novos: number
          em_aberto: number
          leads: number
          produtos_ativos: number
        }[]
      }
      get_dashboard_metrics: {
        Args: { p_date_end?: string; p_date_start?: string }
        Returns: {
          faturamento: number
          ticket_medio: number
          total_pedidos: number
        }[]
      }
      get_funil_conversao: {
        Args: { p_date_end?: string; p_date_start?: string }
        Returns: {
          etapa: string
          total: number
        }[]
      }
      get_top_categorias: {
        Args: { p_horas?: number; p_limit?: number }
        Returns: {
          categoria_nome: string
          total: number
        }[]
      }
      get_top_cliques: {
        Args: { p_horas?: number; p_limit?: number }
        Returns: {
          rotulo: string
          total: number
        }[]
      }
      get_top_paginas: {
        Args: { p_horas?: number; p_limit?: number }
        Returns: {
          pagina: string
          total: number
        }[]
      }
      get_top_produtos: {
        Args: { p_date_end: string; p_date_start: string; p_limit?: number }
        Returns: {
          nome: string
          produto_id: string
          qtde: number
        }[]
      }
      get_top_produtos_click: {
        Args: { p_horas?: number; p_limit?: number }
        Returns: {
          nome: string
          produto_id: string
          total: number
        }[]
      }
      increment_cupom_uso: { Args: { p_cupom_id: string }; Returns: undefined }
      is_within_delivery_radius: {
        Args: { clat: number; clng: number }
        Returns: boolean
      }
      reevaluate_delivery_queue: { Args: never; Returns: string }
      reserve_preorders: {
        Args: { p_items: Json; p_order_id: string }
        Returns: undefined
      }
      search_admin_products: {
        Args: {
          p_categoria_id?: string
          p_disponivel?: boolean
          p_lim?: number
          p_off?: number
          p_product_type?: string
          p_term?: string
        }
        Returns: {
          categoria_id: string
          categoria_nome: string
          criado_em: string
          descricao: string
          disponivel: boolean
          estoque_atual: number
          foto_url: string
          id: string
          imagens: string[]
          margem_lucro: number
          nome: string
          permite_fracionamento: boolean
          preco_custo: number
          preco_promocional: number
          preco_venda: number
          preorder_config: Json
          product_type: string
          sinonimos: string[]
          tem_opcoes: boolean
          total_count: number
          unidade_medida: string
        }[]
      }
      search_products: {
        Args: { p_lim?: number; p_off?: number; p_term: string }
        Returns: {
          categoria_nome: string
          descricao: string
          id: string
          nome: string
          preco_promocional: number
          preco_venda: number
          tem_opcoes: boolean
          unidade_medida: string
        }[]
      }
      set_revenue_status: { Args: { p_chave: string }; Returns: undefined }
      trigger_archive_orders: { Args: never; Returns: undefined }
      whatsapp_buffer_append: {
        Args: { p_lid?: string; p_msg_id: string; p_telefone: string | null; p_texto: string }
        Returns: string
      }
    }
    Enums: {
      apelido_endereco_enum: "casa" | "trabalho" | "outro"
      forma_pagamento_enum: "pix" | "dinheiro" | "cartao"
      role_usuario_enum:
        | "entregador"
        | "atendente"
        | "producao"
        | "gerente"
        | "administrador"
        | "proprietario"
      status_cliente_enum:
        | "Novo"
        | "Ocasional"
        | "Frequente"
        | "VIP"
        | "Inativo"
      status_conta_enum: "ativo" | "pausado" | "bloqueado" | "cancelado"
      status_operacao_enum: "aberta" | "fechada" | "pausada"
      status_sessao_enum: "ativa" | "expirada" | "convertida"
      tipo_entrega_enum: "entrega" | "retirada"
      tipo_opcao_grupo_enum: "single" | "multiple" | "toggle"
      tipo_promocao_enum:
        | "leve_pague"
        | "progressivo"
        | "desconto_carrinho"
        | "destaque"
      unidade_medida_enum: "kg" | "litro" | "metro" | "caixa" | "unidade"
      webhook_outbox_status_enum:
        | "pendente"
        | "enviando"
        | "enviado"
        | "falha"
        | "morto"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      apelido_endereco_enum: ["casa", "trabalho", "outro"],
      forma_pagamento_enum: ["pix", "dinheiro", "cartao"],
      role_usuario_enum: [
        "entregador",
        "atendente",
        "producao",
        "gerente",
        "administrador",
        "proprietario",
      ],
      status_cliente_enum: ["Novo", "Ocasional", "Frequente", "VIP", "Inativo"],
      status_conta_enum: ["ativo", "pausado", "bloqueado", "cancelado"],
      status_operacao_enum: ["aberta", "fechada", "pausada"],
      status_sessao_enum: ["ativa", "expirada", "convertida"],
      tipo_entrega_enum: ["entrega", "retirada"],
      tipo_opcao_grupo_enum: ["single", "multiple", "toggle"],
      tipo_promocao_enum: [
        "leve_pague",
        "progressivo",
        "desconto_carrinho",
        "destaque",
      ],
      unidade_medida_enum: ["kg", "litro", "metro", "caixa", "unidade"],
      webhook_outbox_status_enum: [
        "pendente",
        "enviando",
        "enviado",
        "falha",
        "morto",
      ],
    },
  },
} as const
