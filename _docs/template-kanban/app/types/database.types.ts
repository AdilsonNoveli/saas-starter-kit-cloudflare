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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_evaluation: {
        Row: {
          customer_id: string | null
          eval_window: Json
          evaluated_at: string
          evaluation_tokens: number | null
          evaluator_model: string
          findings: Json | null
          id: string
          persona: string | null
          run_id: string | null
          source: string
          status: string
          usage_id: string | null
          verdict: string | null
        }
        Insert: {
          customer_id?: string | null
          eval_window: Json
          evaluated_at?: string
          evaluation_tokens?: number | null
          evaluator_model: string
          findings?: Json | null
          id?: string
          persona?: string | null
          run_id?: string | null
          source: string
          status?: string
          usage_id?: string | null
          verdict?: string | null
        }
        Update: {
          customer_id?: string | null
          eval_window?: Json
          evaluated_at?: string
          evaluation_tokens?: number | null
          evaluator_model?: string
          findings?: Json | null
          id?: string
          persona?: string | null
          run_id?: string | null
          source?: string
          status?: string
          usage_id?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_evaluation_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_evaluation_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_test_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_evaluation_usage_id_fkey"
            columns: ["usage_id"]
            isOneToOne: false
            referencedRelation: "agent_token_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_quick_responses: {
        Row: {
          active: boolean
          created_at: string
          customer_statuses:
            | Database["public"]["Enums"]["customer_status_enum"][]
            | null
          id: string
          kanban_stage_key: string | null
          keywords: string[] | null
          name: string
          reply_text: string
          sort_order: number
          trigger_count: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_statuses?:
            | Database["public"]["Enums"]["customer_status_enum"][]
            | null
          id?: string
          kanban_stage_key?: string | null
          keywords?: string[] | null
          name: string
          reply_text: string
          sort_order: number
          trigger_count?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_statuses?:
            | Database["public"]["Enums"]["customer_status_enum"][]
            | null
          id?: string
          kanban_stage_key?: string | null
          keywords?: string[] | null
          name?: string
          reply_text?: string
          sort_order?: number
          trigger_count?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_quick_responses_kanban_stage_key_fkey"
            columns: ["kanban_stage_key"]
            isOneToOne: false
            referencedRelation: "kanban_column"
            referencedColumns: ["key"]
          },
        ]
      }
      agent_test_run: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          score: number | null
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      agent_token_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          customer_id: string | null
          evaluation_pending: boolean
          id: string
          latency_ms: number | null
          model: string
          prompt_tokens: number
          rounds: number | null
          seq: number | null
          tool_trace: Json | null
        }
        Insert: {
          completion_tokens: number
          created_at?: string
          customer_id?: string | null
          evaluation_pending?: boolean
          id?: string
          latency_ms?: number | null
          model: string
          prompt_tokens: number
          rounds?: number | null
          seq?: number | null
          tool_trace?: Json | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          customer_id?: string | null
          evaluation_pending?: boolean
          id?: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number
          rounds?: number | null
          seq?: number | null
          tool_trace?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_token_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_item_options: {
        Row: {
          cart_item_id: string
          created_at: string
          deferred: boolean
          file_url: string | null
          frozen_name: string
          frozen_price_delta: number
          id: string
          option_item_id: string | null
          original_file_name: string | null
          text_value: string | null
        }
        Insert: {
          cart_item_id: string
          created_at?: string
          deferred?: boolean
          file_url?: string | null
          frozen_name: string
          frozen_price_delta?: number
          id?: string
          option_item_id?: string | null
          original_file_name?: string | null
          text_value?: string | null
        }
        Update: {
          cart_item_id?: string
          created_at?: string
          deferred?: boolean
          file_url?: string | null
          frozen_name?: string
          frozen_price_delta?: number
          id?: string
          option_item_id?: string | null
          original_file_name?: string | null
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_item_options_cart_item_id_fkey"
            columns: ["cart_item_id"]
            isOneToOne: false
            referencedRelation: "cart_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_item_options_option_item_id_fkey"
            columns: ["option_item_id"]
            isOneToOne: false
            referencedRelation: "product_option_item"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          address_id: string | null
          created_at: string
          delivery_mode: string | null
          id: string
          note: string | null
          options_signature: string
          product_id: string
          quantity: number
          session_id: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          delivery_mode?: string | null
          id?: string
          note?: string | null
          options_signature?: string
          product_id: string
          quantity: number
          session_id: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          created_at?: string
          delivery_mode?: string | null
          id?: string
          note?: string | null
          options_signature?: string
          product_id?: string
          quantity?: number
          session_id?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          color: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_primary: boolean
          name: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_primary?: boolean
          name: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          amount: number
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          end_date: string | null
          id: string
          max_uses: number | null
          minimum_amount: number
          start_date: string | null
        }
        Insert: {
          active?: boolean
          amount: number
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          end_date?: string | null
          id?: string
          max_uses?: number | null
          minimum_amount?: number
          start_date?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          end_date?: string | null
          id?: string
          max_uses?: number | null
          minimum_amount?: number
          start_date?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_default: boolean | null
          label: Database["public"]["Enums"]["address_label_enum"] | null
          latitude: number | null
          longitude: number | null
          neighborhood: string
          number: string
          state: string | null
          street: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          label?: Database["public"]["Enums"]["address_label_enum"] | null
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          number: string
          state?: string | null
          street: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          label?: Database["public"]["Enums"]["address_label_enum"] | null
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          number?: string
          state?: string | null
          street?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_conversation_summary: {
        Row: {
          customer_id: string
          last_message: string | null
          last_message_actor: string | null
          last_message_at: string | null
          last_message_channel: string | null
          last_message_role: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          customer_id: string
          last_message?: string | null
          last_message_actor?: string | null
          last_message_at?: string | null
          last_message_channel?: string | null
          last_message_role?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          customer_id?: string
          last_message?: string | null
          last_message_actor?: string | null
          last_message_at?: string | null
          last_message_channel?: string | null
          last_message_role?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_conversation_summary_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_intelligence: {
        Row: {
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_intelligence_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          average_ticket: number | null
          birth_date: string | null
          context_summary: string | null
          created_at: string | null
          customer_since: string | null
          frequent_neighborhood: string | null
          has_context: boolean | null
          has_pending_issues: boolean | null
          id: string
          internal_notes: string | null
          is_guest: boolean | null
          is_lab_test: boolean
          last_conversation_at: string | null
          last_order_at: string | null
          name: string
          pause_reason: string | null
          paused_until: string | null
          pending_issue_description: string | null
          photo_url: string | null
          preferences: string | null
          preferred_channel: string | null
          purchase_frequency: string | null
          status: Database["public"]["Enums"]["customer_status_enum"] | null
          total_amount_spent: number | null
          total_cancellations: number | null
          total_orders: number | null
          updated_at: string | null
          whatsapp_lid: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          average_ticket?: number | null
          birth_date?: string | null
          context_summary?: string | null
          created_at?: string | null
          customer_since?: string | null
          frequent_neighborhood?: string | null
          has_context?: boolean | null
          has_pending_issues?: boolean | null
          id?: string
          internal_notes?: string | null
          is_guest?: boolean | null
          is_lab_test?: boolean
          last_conversation_at?: string | null
          last_order_at?: string | null
          name: string
          pause_reason?: string | null
          paused_until?: string | null
          pending_issue_description?: string | null
          photo_url?: string | null
          preferences?: string | null
          preferred_channel?: string | null
          purchase_frequency?: string | null
          status?: Database["public"]["Enums"]["customer_status_enum"] | null
          total_amount_spent?: number | null
          total_cancellations?: number | null
          total_orders?: number | null
          updated_at?: string | null
          whatsapp_lid?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          average_ticket?: number | null
          birth_date?: string | null
          context_summary?: string | null
          created_at?: string | null
          customer_since?: string | null
          frequent_neighborhood?: string | null
          has_context?: boolean | null
          has_pending_issues?: boolean | null
          id?: string
          internal_notes?: string | null
          is_guest?: boolean | null
          is_lab_test?: boolean
          last_conversation_at?: string | null
          last_order_at?: string | null
          name?: string
          pause_reason?: string | null
          paused_until?: string | null
          pending_issue_description?: string | null
          photo_url?: string | null
          preferences?: string | null
          preferred_channel?: string | null
          purchase_frequency?: string | null
          status?: Database["public"]["Enums"]["customer_status_enum"] | null
          total_amount_spent?: number | null
          total_cancellations?: number | null
          total_orders?: number | null
          updated_at?: string | null
          whatsapp_lid?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          active: boolean
          created_at: string
          current_stock: number
          id: string
          minimum_stock: number | null
          name: string
          unit: Database["public"]["Enums"]["unit_enum"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number | null
          name: string
          unit?: Database["public"]["Enums"]["unit_enum"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number | null
          name?: string
          unit?: Database["public"]["Enums"]["unit_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      integration_idempotency: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          payload: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          key: string
          payload?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          payload?: Json | null
          status?: string
        }
        Relationships: []
      }
      kanban_column: {
        Row: {
          color: string
          is_cancelled: boolean
          is_delivered: boolean
          is_delivery_dispatch: boolean
          is_open: boolean
          is_out_for_delivery: boolean
          is_revenue_trigger: boolean
          is_system: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          color?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_delivery_dispatch?: boolean
          is_open?: boolean
          is_out_for_delivery?: boolean
          is_revenue_trigger?: boolean
          is_system?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          color?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_delivery_dispatch?: boolean
          is_open?: boolean
          is_out_for_delivery?: boolean
          is_revenue_trigger?: boolean
          is_system?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      kit_items: {
        Row: {
          id: string
          kit_id: string | null
          product_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          kit_id?: string | null
          product_id?: string | null
          quantity?: number
        }
        Update: {
          id?: string
          kit_id?: string | null
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          available: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          fixed_price: number | null
          id: string
          images: string[]
          label: string
          name: string
          photo_url: string | null
          show_at_checkout: boolean
        }
        Insert: {
          available?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          fixed_price?: number | null
          id?: string
          images?: string[]
          label?: string
          name: string
          photo_url?: string | null
          show_at_checkout?: boolean
        }
        Update: {
          available?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          fixed_price?: number | null
          id?: string
          images?: string[]
          label?: string
          name?: string
          photo_url?: string | null
          show_at_checkout?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "kits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_options: {
        Row: {
          created_at: string
          deferred: boolean
          file_url: string | null
          frozen_name: string
          frozen_price_delta: number
          id: string
          option_item_id: string | null
          order_item_id: string
          original_file_name: string | null
          text_value: string | null
        }
        Insert: {
          created_at?: string
          deferred?: boolean
          file_url?: string | null
          frozen_name: string
          frozen_price_delta?: number
          id?: string
          option_item_id?: string | null
          order_item_id: string
          original_file_name?: string | null
          text_value?: string | null
        }
        Update: {
          created_at?: string
          deferred?: boolean
          file_url?: string | null
          frozen_name?: string
          frozen_price_delta?: number
          id?: string
          option_item_id?: string | null
          order_item_id?: string
          original_file_name?: string | null
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_option_item_id_fkey"
            columns: ["option_item_id"]
            isOneToOne: false
            referencedRelation: "product_option_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          address_id: string | null
          delivery_mode: string | null
          frozen_product_name: string | null
          frozen_unit_price: number | null
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          subtotal: number | null
        }
        Insert: {
          address_id?: string | null
          delivery_mode?: string | null
          frozen_product_name?: string | null
          frozen_unit_price?: number | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          subtotal?: number | null
        }
        Update: {
          address_id?: string | null
          delivery_mode?: string | null
          frozen_product_name?: string | null
          frozen_unit_price?: number | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          order_id: string
          previous_status: string | null
          source: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          order_id: string
          previous_status?: string | null
          source?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          order_id?: string
          previous_status?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          archived: boolean | null
          archived_at: string | null
          assigned_at: string | null
          change_for: number | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          delivery_fee: number | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode_enum"]
          delivery_time_minutes: number | null
          discount_amount: number | null
          discount_applied: number | null
          driver_id: string | null
          free_shipping_applied: boolean | null
          id: string
          notes: string | null
          operational_note: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          service_note: string | null
          session_id: string | null
          shipping_fee: number | null
          short_id: number | null
          status: string | null
          subtotal_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          address_id?: string | null
          archived?: boolean | null
          archived_at?: string | null
          assigned_at?: string | null
          change_for?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode_enum"]
          delivery_time_minutes?: number | null
          discount_amount?: number | null
          discount_applied?: number | null
          driver_id?: string | null
          free_shipping_applied?: boolean | null
          id?: string
          notes?: string | null
          operational_note?: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          service_note?: string | null
          session_id?: string | null
          shipping_fee?: number | null
          short_id?: number | null
          status?: string | null
          subtotal_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          address_id?: string | null
          archived?: boolean | null
          archived_at?: string | null
          assigned_at?: string | null
          change_for?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode_enum"]
          delivery_time_minutes?: number | null
          discount_amount?: number | null
          discount_applied?: number | null
          driver_id?: string | null
          free_shipping_applied?: boolean | null
          id?: string
          notes?: string | null
          operational_note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          service_note?: string | null
          session_id?: string | null
          shipping_fee?: number | null
          short_id?: number | null
          status?: string | null
          subtotal_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "kanban_column"
            referencedColumns: ["key"]
          },
        ]
      }
      pages: {
        Row: {
          content: string
          created_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "products"
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preorders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          ingredient_id: string
          product_id: string
          quantity_per_unit: number
        }
        Insert: {
          ingredient_id: string
          product_id: string
          quantity_per_unit: number
        }
        Update: {
          ingredient_id?: string
          product_id?: string
          quantity_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_group: {
        Row: {
          accepted_file_types: string[] | null
          created_at: string
          id: string
          max_file_size_mb: number | null
          max_selections: number
          max_text_length: number | null
          min_selections: number
          name: string
          product_id: string
          required: boolean
          sort_order: number
          text_placeholder: string | null
          type: Database["public"]["Enums"]["option_group_type_enum"]
        }
        Insert: {
          accepted_file_types?: string[] | null
          created_at?: string
          id?: string
          max_file_size_mb?: number | null
          max_selections?: number
          max_text_length?: number | null
          min_selections?: number
          name: string
          product_id: string
          required?: boolean
          sort_order?: number
          text_placeholder?: string | null
          type?: Database["public"]["Enums"]["option_group_type_enum"]
        }
        Update: {
          accepted_file_types?: string[] | null
          created_at?: string
          id?: string
          max_file_size_mb?: number | null
          max_selections?: number
          max_text_length?: number | null
          min_selections?: number
          name?: string
          product_id?: string
          required?: boolean
          sort_order?: number
          text_placeholder?: string | null
          type?: Database["public"]["Enums"]["option_group_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "product_option_group_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_item: {
        Row: {
          active: boolean
          created_at: string
          default_selected: boolean
          group_id: string
          id: string
          name: string
          photo_url: string | null
          price_delta: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_selected?: boolean
          group_id: string
          id?: string
          name: string
          photo_url?: string | null
          price_delta?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          default_selected?: boolean
          group_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          price_delta?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_option_item_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_option_group"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allows_fractional_sale: boolean | null
          available: boolean | null
          category_id: string | null
          cost_price: number
          created_at: string | null
          current_stock: number | null
          daily_production_limit: number | null
          description: string | null
          id: string
          images: string[]
          minimum_stock: number | null
          name: string
          photo_url: string | null
          preorder_config: Json | null
          product_type: string
          profit_margin: number
          promo_price: number | null
          random_rank: number
          requirements: Json
          sale_price: number | null
          stock_control: string
          synonyms: string[]
          unit: Database["public"]["Enums"]["unit_enum"] | null
        }
        Insert: {
          allows_fractional_sale?: boolean | null
          available?: boolean | null
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          current_stock?: number | null
          daily_production_limit?: number | null
          description?: string | null
          id?: string
          images?: string[]
          minimum_stock?: number | null
          name: string
          photo_url?: string | null
          preorder_config?: Json | null
          product_type?: string
          profit_margin?: number
          promo_price?: number | null
          random_rank?: number
          requirements?: Json
          sale_price?: number | null
          stock_control?: string
          synonyms?: string[]
          unit?: Database["public"]["Enums"]["unit_enum"] | null
        }
        Update: {
          allows_fractional_sale?: boolean | null
          available?: boolean | null
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          current_stock?: number | null
          daily_production_limit?: number | null
          description?: string | null
          id?: string
          images?: string[]
          minimum_stock?: number | null
          name?: string
          photo_url?: string | null
          preorder_config?: Json | null
          product_type?: string
          profit_margin?: number
          promo_price?: number | null
          random_rank?: number
          requirements?: Json
          sale_price?: number | null
          stock_control?: string
          synonyms?: string[]
          unit?: Database["public"]["Enums"]["unit_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_products: {
        Row: {
          id: string
          product_id: string | null
          promotion_id: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          promotion_id?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          promotion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean | null
          category_id: string | null
          category_ids: string[] | null
          config: Json
          created_at: string | null
          description: string | null
          display_position: string | null
          end_date: string | null
          id: string
          images: string[] | null
          name: string
          photo_url: string | null
          start_date: string | null
          type: Database["public"]["Enums"]["promotion_type_enum"]
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          category_ids?: string[] | null
          config: Json
          created_at?: string | null
          description?: string | null
          display_position?: string | null
          end_date?: string | null
          id?: string
          images?: string[] | null
          name: string
          photo_url?: string | null
          start_date?: string | null
          type: Database["public"]["Enums"]["promotion_type_enum"]
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          category_ids?: string[] | null
          config?: Json
          created_at?: string | null
          description?: string | null
          display_position?: string | null
          end_date?: string | null
          id?: string
          images?: string[] | null
          name?: string
          photo_url?: string | null
          start_date?: string | null
          type?: Database["public"]["Enums"]["promotion_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      related_products: {
        Row: {
          product_id: string
          related_product_id: string
          sort_order: number
        }
        Insert: {
          product_id: string
          related_product_id: string
          sort_order?: number
        }
        Update: {
          product_id?: string
          related_product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "related_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_products_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          address_id: string | null
          channel: string | null
          created_at: string | null
          customer_id: string | null
          delivery_mode: string | null
          expires_at: string | null
          id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["session_status_enum"] | null
        }
        Insert: {
          address_id?: string | null
          channel?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_mode?: string | null
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["session_status_enum"] | null
        }
        Update: {
          address_id?: string | null
          channel?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_mode?: string | null
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["session_status_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_distance_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          max_distance_km: number
          min_distance_km: number
          shipping_fee: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          max_distance_km: number
          min_distance_km: number
          shipping_fee: number
          sort_order: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          max_distance_km?: number
          min_distance_km?: number
          shipping_fee?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          movement_type: string
          order_id: string | null
          quantity: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          movement_type: string
          order_id?: string | null
          quantity: number
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          movement_type?: string
          order_id?: string | null
          quantity?: number
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store: {
        Row: {
          account_status: string
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          agent_active: boolean
          agent_audio_enabled: boolean
          agent_enabled_tools: Json
          agent_evaluator_model: string
          agent_extra_instructions: string | null
          agent_greeting: string | null
          agent_human_pause_active: boolean
          agent_human_pause_minutes: number
          agent_image_enabled: boolean
          agent_model: string
          agent_name: string | null
          agent_openai_key_id: string | null
          agent_openai_key_mask: string | null
          agent_transcription_model: string
          agent_vision_model: string
          allows_pickup: boolean
          catalog_theme: string
          chat_sound_alert_active: boolean
          closed_store_config: Json
          cnpj: string | null
          created_at: string
          default_delivery_fee: number
          hours_config: Json | null
          id: string
          layout_config: Json
          logo_url: string | null
          logo_url_dark: string | null
          operation_status: string
          orders_config: Json | null
          origin_latitude: number | null
          origin_longitude: number | null
          pix_key: string | null
          promotions_config: Json | null
          service_radius_km: number | null
          status_override_date: string | null
          support_whatsapp_number: string | null
          trade_name: string
          webhook_active: boolean
          webhook_signing_secret_id: string | null
          webhook_signing_secret_mask: string | null
          webhook_token_id: string | null
          webhook_token_mask: string | null
          webhook_url: string | null
          whatsapp_api_base_url: string
          whatsapp_api_key_id: string | null
          whatsapp_api_key_mask: string | null
          whatsapp_provider_name: string
        }
        Insert: {
          account_status?: string
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          agent_active?: boolean
          agent_audio_enabled?: boolean
          agent_enabled_tools?: Json
          agent_evaluator_model?: string
          agent_extra_instructions?: string | null
          agent_greeting?: string | null
          agent_human_pause_active?: boolean
          agent_human_pause_minutes?: number
          agent_image_enabled?: boolean
          agent_model?: string
          agent_name?: string | null
          agent_openai_key_id?: string | null
          agent_openai_key_mask?: string | null
          agent_transcription_model?: string
          agent_vision_model?: string
          allows_pickup?: boolean
          catalog_theme?: string
          chat_sound_alert_active?: boolean
          closed_store_config?: Json
          cnpj?: string | null
          created_at?: string
          default_delivery_fee?: number
          hours_config?: Json | null
          id?: string
          layout_config?: Json
          logo_url?: string | null
          logo_url_dark?: string | null
          operation_status?: string
          orders_config?: Json | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          pix_key?: string | null
          promotions_config?: Json | null
          service_radius_km?: number | null
          status_override_date?: string | null
          support_whatsapp_number?: string | null
          trade_name: string
          webhook_active?: boolean
          webhook_signing_secret_id?: string | null
          webhook_signing_secret_mask?: string | null
          webhook_token_id?: string | null
          webhook_token_mask?: string | null
          webhook_url?: string | null
          whatsapp_api_base_url?: string
          whatsapp_api_key_id?: string | null
          whatsapp_api_key_mask?: string | null
          whatsapp_provider_name?: string
        }
        Update: {
          account_status?: string
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          agent_active?: boolean
          agent_audio_enabled?: boolean
          agent_enabled_tools?: Json
          agent_evaluator_model?: string
          agent_extra_instructions?: string | null
          agent_greeting?: string | null
          agent_human_pause_active?: boolean
          agent_human_pause_minutes?: number
          agent_image_enabled?: boolean
          agent_model?: string
          agent_name?: string | null
          agent_openai_key_id?: string | null
          agent_openai_key_mask?: string | null
          agent_transcription_model?: string
          agent_vision_model?: string
          allows_pickup?: boolean
          catalog_theme?: string
          chat_sound_alert_active?: boolean
          closed_store_config?: Json
          cnpj?: string | null
          created_at?: string
          default_delivery_fee?: number
          hours_config?: Json | null
          id?: string
          layout_config?: Json
          logo_url?: string | null
          logo_url_dark?: string | null
          operation_status?: string
          orders_config?: Json | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          pix_key?: string | null
          promotions_config?: Json | null
          service_radius_km?: number | null
          status_override_date?: string | null
          support_whatsapp_number?: string | null
          trade_name?: string
          webhook_active?: boolean
          webhook_signing_secret_id?: string | null
          webhook_signing_secret_mask?: string | null
          webhook_token_id?: string | null
          webhook_token_mask?: string | null
          webhook_url?: string | null
          whatsapp_api_base_url?: string
          whatsapp_api_key_id?: string | null
          whatsapp_api_key_mask?: string | null
          whatsapp_provider_name?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          session_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          session_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          session_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role_enum"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      webhook_outbox: {
        Row: {
          attempts: number
          created_at: string
          destination_url: string
          event: string
          event_id: string
          http_status: number | null
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string
          payload: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["webhook_outbox_status_enum"]
        }
        Insert: {
          attempts?: number
          created_at?: string
          destination_url: string
          event: string
          event_id: string
          http_status?: number | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["webhook_outbox_status_enum"]
        }
        Update: {
          attempts?: number
          created_at?: string
          destination_url?: string
          event?: string
          event_id?: string
          http_status?: number | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["webhook_outbox_status_enum"]
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
      whatsapp_conversations: {
        Row: {
          actor: string | null
          channel: string
          content: string
          created_at: string
          customer_id: string
          id: string
          role: string
          seq: number
          status: string
          wamid: string | null
        }
        Insert: {
          actor?: string | null
          channel?: string
          content: string
          created_at?: string
          customer_id: string
          id?: string
          role: string
          seq?: number
          status?: string
          wamid?: string | null
        }
        Update: {
          actor?: string | null
          channel?: string
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          role?: string
          seq?: number
          status?: string
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_media: {
        Row: {
          attempts: number
          contact_name: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          media_id: string
          mime_type: string | null
          model: string | null
          phone: string | null
          size_bytes: number | null
          status: string
          text: string | null
          type: string
          updated_at: string
          wamid: string
          whatsapp_lid: string | null
        }
        Insert: {
          attempts?: number
          contact_name?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          media_id: string
          mime_type?: string | null
          model?: string | null
          phone?: string | null
          size_bytes?: number | null
          status?: string
          text?: string | null
          type: string
          updated_at?: string
          wamid: string
          whatsapp_lid?: string | null
        }
        Update: {
          attempts?: number
          contact_name?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          media_id?: string
          mime_type?: string | null
          model?: string | null
          phone?: string | null
          size_bytes?: number | null
          status?: string
          text?: string | null
          type?: string
          updated_at?: string
          wamid?: string
          whatsapp_lid?: string | null
        }
        Relationships: []
      }
      whatsapp_received_messages: {
        Row: {
          received_at: string
          wamid: string
        }
        Insert: {
          received_at?: string
          wamid: string
        }
        Update: {
          received_at?: string
          wamid?: string
        }
        Relationships: []
      }
      whatsapp_turn_buffer: {
        Row: {
          key: string
          last_message_id: string
          phone: string | null
          texts: Json
          updated_at: string
          whatsapp_lid: string | null
        }
        Insert: {
          key: string
          last_message_id: string
          phone?: string | null
          texts?: Json
          updated_at?: string
          whatsapp_lid?: string | null
        }
        Update: {
          key?: string
          last_message_id?: string
          phone?: string | null
          texts?: Json
          updated_at?: string
          whatsapp_lid?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agent_openai_key_delete: { Args: never; Returns: boolean }
      agent_openai_key_get: { Args: never; Returns: string }
      agent_openai_key_set: { Args: { p_key: string }; Returns: string }
      assign_order_driver: { Args: { p_order_id: string }; Returns: string }
      calculate_purchase_frequency: {
        Args: { p_customer_id: string }
        Returns: string
      }
      calculate_shipping_by_distance: {
        Args: { p_distance_km: number }
        Returns: number
      }
      catalog_products_page: {
        Args: {
          p_category?: string
          p_cursor_id?: string
          p_cursor_rank?: number
          p_limit?: number
          p_pivot: number
          p_wrapped?: boolean
        }
        Returns: {
          allows_fractional_sale: boolean
          available: boolean
          category_id: string
          created_at: string
          current_stock: number
          description: string
          id: string
          images: string[]
          name: string
          photo_url: string
          preorder_config: Json
          product_type: string
          promo_price: number
          random_rank: number
          sale_price: number
          tem_opcoes: boolean
          unit: Database["public"]["Enums"]["unit_enum"]
          wrapped: boolean
        }[]
      }
      claim_coupon_atomic: {
        Args: { p_code: string; p_subtotal: number }
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
        Args: { p_order_id: string; p_whatsapp: string }
        Returns: boolean
      }
      consume_order_stock: {
        Args: { p_items: Json; p_order_id: string }
        Returns: undefined
      }
      create_integration_order: {
        Args: {
          p_address_id?: string
          p_customer_id: string
          p_delivery_fee?: number
          p_delivery_mode: Database["public"]["Enums"]["delivery_mode_enum"]
          p_discount_applied?: number
          p_free_shipping?: boolean
          p_idempotency_key: string
          p_items: Json
          p_new_address?: Json
          p_notes?: string
          p_operational_note?: string
          p_payment_method: Database["public"]["Enums"]["payment_method_enum"]
          p_preorder_items?: Json
          p_session_id?: string
          p_status: string
        }
        Returns: Json
      }
      decrement_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      f_array_to_string: { Args: { arr: string[] }; Returns: string }
      f_unaccent: { Args: { txt: string }; Returns: string }
      get_conversion_funnel: {
        Args: { p_date_end?: string; p_date_start?: string }
        Returns: {
          etapa: string
          total: number
        }[]
      }
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
          average_ticket: number
          faturamento: number
          total_orders: number
        }[]
      }
      get_top_categories: {
        Args: { p_hours?: number; p_limit?: number }
        Returns: {
          categoria_nome: string
          total: number
        }[]
      }
      get_top_clicked_products: {
        Args: { p_hours?: number; p_limit?: number }
        Returns: {
          name: string
          product_id: string
          total: number
        }[]
      }
      get_top_clicks: {
        Args: { p_hours?: number; p_limit?: number }
        Returns: {
          rotulo: string
          total: number
        }[]
      }
      get_top_pages: {
        Args: { p_hours?: number; p_limit?: number }
        Returns: {
          pagina: string
          total: number
        }[]
      }
      get_top_products: {
        Args: { p_date_end: string; p_date_start: string; p_limit?: number }
        Returns: {
          name: string
          product_id: string
          qtde: number
        }[]
      }
      increment_agent_quick_response_usage: {
        Args: { p_rule_id: string }
        Returns: undefined
      }
      increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      is_within_delivery_radius: {
        Args: { clat: number; clng: number }
        Returns: boolean
      }
      purge_agent_memory: { Args: never; Returns: Json }
      recompute_customer_intelligence: { Args: never; Returns: undefined }
      recompute_rfm_segments: { Args: never; Returns: undefined }
      reevaluate_delivery_queue: { Args: never; Returns: string }
      refund_order_stock: { Args: { p_order_id: string }; Returns: undefined }
      reserve_preorders: {
        Args: { p_items: Json; p_order_id: string }
        Returns: undefined
      }
      search_admin_products: {
        Args: {
          p_available?: boolean
          p_category_id?: string
          p_lim?: number
          p_off?: number
          p_product_type?: string
          p_term?: string
        }
        Returns: {
          allows_fractional_sale: boolean
          available: boolean
          categoria_nome: string
          category_id: string
          cost_price: number
          created_at: string
          current_stock: number
          description: string
          id: string
          images: string[]
          name: string
          photo_url: string
          preorder_config: Json
          product_type: string
          profit_margin: number
          promo_price: number
          sale_price: number
          synonyms: string[]
          tem_opcoes: boolean
          total_count: number
          unit: string
        }[]
      }
      search_products: {
        Args: { p_lim?: number; p_off?: number; p_term: string }
        Returns: {
          categoria_nome: string
          description: string
          id: string
          name: string
          promo_price: number
          sale_price: number
          tem_opcoes: boolean
          unit: string
        }[]
      }
      set_revenue_status: { Args: { p_key: string }; Returns: undefined }
      webhook_secret_delete: { Args: { p_type: string }; Returns: boolean }
      webhook_secret_get: { Args: { p_type: string }; Returns: string }
      webhook_secret_name: { Args: { p_type: string }; Returns: string }
      webhook_secret_set: {
        Args: { p_amount: string; p_type: string }
        Returns: undefined
      }
      whatsapp_api_key_delete: { Args: never; Returns: boolean }
      whatsapp_api_key_get: { Args: never; Returns: string }
      whatsapp_api_key_set: { Args: { p_key: string }; Returns: string }
      whatsapp_buffer_append: {
        Args: {
          p_lid?: string
          p_msg_id: string
          p_phone: string
          p_text: string
        }
        Returns: string
      }
      whatsapp_media_claim: {
        Args: { p_max_attempts: number; p_wamid: string }
        Returns: {
          attempts: number
          contact_name: string
          media_id: string
          mime_type: string
          phone: string
          size_bytes: number
          type: string
          wamid: string
          whatsapp_lid: string
        }[]
      }
    }
    Enums: {
      account_status_enum: "ativo" | "pausado" | "bloqueado" | "cancelado"
      address_label_enum: "casa" | "trabalho" | "outro"
      customer_status_enum:
        | "Novo"
        | "Ocasional"
        | "Frequente"
        | "VIP"
        | "Inativo"
      delivery_mode_enum: "entrega" | "retirada"
      operation_status_enum: "aberta" | "fechada" | "pausada"
      option_group_type_enum:
        | "single"
        | "multiple"
        | "toggle"
        | "texto_livre"
        | "upload_arquivo"
      payment_method_enum: "pix" | "dinheiro" | "cartao"
      promotion_type_enum:
        | "leve_pague"
        | "progressivo"
        | "desconto_carrinho"
        | "destaque"
      session_status_enum: "ativa" | "expirada" | "convertida"
      unit_enum: "kg" | "litro" | "metro" | "unidade" | "caixa"
      user_role_enum:
        | "entregador"
        | "atendente"
        | "producao"
        | "gerente"
        | "administrador"
        | "proprietario"
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
      account_status_enum: ["ativo", "pausado", "bloqueado", "cancelado"],
      address_label_enum: ["casa", "trabalho", "outro"],
      customer_status_enum: [
        "Novo",
        "Ocasional",
        "Frequente",
        "VIP",
        "Inativo",
      ],
      delivery_mode_enum: ["entrega", "retirada"],
      operation_status_enum: ["aberta", "fechada", "pausada"],
      option_group_type_enum: [
        "single",
        "multiple",
        "toggle",
        "texto_livre",
        "upload_arquivo",
      ],
      payment_method_enum: ["pix", "dinheiro", "cartao"],
      promotion_type_enum: [
        "leve_pague",
        "progressivo",
        "desconto_carrinho",
        "destaque",
      ],
      session_status_enum: ["ativa", "expirada", "convertida"],
      unit_enum: ["kg", "litro", "metro", "unidade", "caixa"],
      user_role_enum: [
        "entregador",
        "atendente",
        "producao",
        "gerente",
        "administrador",
        "proprietario",
      ],
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
