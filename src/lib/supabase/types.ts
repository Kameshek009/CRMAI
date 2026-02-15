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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          billing_cycle_start: string
          clerk_user_id: string
          created_at: string
          current_team_id: string | null
          desktop_agent_last_seen: string | null
          desktop_agent_mode: string | null
          desktop_agent_online: boolean | null
          desktop_agent_version: string | null
          email: string | null
          id: string
          name: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          token_credits: number
          token_limit: number
          tokens_used: number
          updated_at: string
          week_start_date: string
          weekly_tokens_used: number
        }
        Insert: {
          billing_cycle_start?: string
          clerk_user_id: string
          created_at?: string
          current_team_id?: string | null
          desktop_agent_last_seen?: string | null
          desktop_agent_mode?: string | null
          desktop_agent_online?: boolean | null
          desktop_agent_version?: string | null
          email?: string | null
          id?: string
          name?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          token_credits?: number
          token_limit?: number
          tokens_used?: number
          updated_at?: string
          week_start_date?: string
          weekly_tokens_used?: number
        }
        Update: {
          billing_cycle_start?: string
          clerk_user_id?: string
          created_at?: string
          current_team_id?: string | null
          desktop_agent_last_seen?: string | null
          desktop_agent_mode?: string | null
          desktop_agent_online?: boolean | null
          desktop_agent_version?: string | null
          email?: string | null
          id?: string
          name?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          token_credits?: number
          token_limit?: number
          tokens_used?: number
          updated_at?: string
          week_start_date?: string
          weekly_tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_permissions: {
        Row: {
          can_create_contacts: boolean
          can_create_deals: boolean
          can_create_tasks: boolean
          created_at: string
          id: string
          max_assignable_role_priority: number
          max_task_priority: number
          permission_level: number
          team_id: string
          updated_at: string
        }
        Insert: {
          can_create_contacts?: boolean
          can_create_deals?: boolean
          can_create_tasks?: boolean
          created_at?: string
          id?: string
          max_assignable_role_priority?: number
          max_task_priority?: number
          permission_level?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          can_create_contacts?: boolean
          can_create_deals?: boolean
          can_create_tasks?: boolean
          created_at?: string
          id?: string
          max_assignable_role_priority?: number
          max_task_priority?: number
          permission_level?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          account_id: string
          created_at: string | null
          deleted_at: string | null
          device_origin: string | null
          id: string
          is_deleted: boolean | null
          last_synced_at: string | null
          mode: string
          title: string | null
          updated_at: string | null
          vision_board_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          deleted_at?: string | null
          device_origin?: string | null
          id?: string
          is_deleted?: boolean | null
          last_synced_at?: string | null
          mode?: string
          title?: string | null
          updated_at?: string | null
          vision_board_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          deleted_at?: string | null
          device_origin?: string | null
          id?: string
          is_deleted?: boolean | null
          last_synced_at?: string | null
          mode?: string
          title?: string | null
          updated_at?: string | null
          vision_board_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_id: string
          address: string | null
          ai_health_score: number | null
          created_at: string | null
          description: string | null
          domain: string | null
          email: string | null
          id: string
          industry: string | null
          is_deleted: boolean | null
          metadata: Json | null
          name: string
          phone: string | null
          size: string | null
          tags: string[] | null
          team_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          account_id: string
          address?: string | null
          ai_health_score?: number | null
          created_at?: string | null
          description?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean | null
          metadata?: Json | null
          name: string
          phone?: string | null
          size?: string | null
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          account_id?: string
          address?: string | null
          ai_health_score?: number | null
          created_at?: string | null
          description?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_deleted?: boolean | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          size?: string | null
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string
          ai_sentiment: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          engagement_score: number | null
          first_name: string
          id: string
          is_deleted: boolean | null
          last_contacted_at: string | null
          last_name: string | null
          metadata: Json | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"] | null
          tags: string[] | null
          team_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          ai_sentiment?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          engagement_score?: number | null
          first_name: string
          id?: string
          is_deleted?: boolean | null
          last_contacted_at?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          tags?: string[] | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          ai_sentiment?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          engagement_score?: number | null
          first_name?: string
          id?: string
          is_deleted?: boolean | null
          last_contacted_at?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          tags?: string[] | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          created_at: string
          display_name: string
          id: string
          price_cents: number
          stripe_price_id: string | null
          token_amount: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          price_cents: number
          stripe_price_id?: string | null
          token_amount: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          price_cents?: number
          stripe_price_id?: string | null
          token_amount?: number
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          account_id: string
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          team_id: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          account_id: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          team_id?: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          account_id?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          team_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          account_id: string
          company_id: string | null
          contact_id: string | null
          content: string
          created_at: string | null
          deal_id: string | null
          id: string
          is_deleted: boolean | null
          is_pinned: boolean | null
          metadata: Json | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          company_id?: string | null
          contact_id?: string | null
          content: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          metadata?: Json | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          company_id?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          metadata?: Json | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          account_id: string
          assigned_to: string | null
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          is_ai_generated: boolean | null
          is_deleted: boolean | null
          metadata: Json | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          team_id: string | null
          title: string
          type: Database["public"]["Enums"]["task_type"] | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_deleted?: boolean | null
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          team_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_deleted?: boolean | null
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          team_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          account_id: string
          color: string | null
          created_at: string | null
          id: string
          is_lost: boolean | null
          is_won: boolean | null
          name: string
          position: number
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name: string
          position?: number
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name?: string
          position?: number
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string
          actual_close_date: string | null
          ai_win_probability: number | null
          assigned_to: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          is_deleted: boolean | null
          metadata: Json | null
          stage_id: string
          status: Database["public"]["Enums"]["deal_status"] | null
          tags: string[] | null
          team_id: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          account_id: string
          actual_close_date?: string | null
          ai_win_probability?: number | null
          assigned_to?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_deleted?: boolean | null
          metadata?: Json | null
          stage_id: string
          status?: Database["public"]["Enums"]["deal_status"] | null
          tags?: string[] | null
          team_id?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          account_id?: string
          actual_close_date?: string | null
          ai_win_probability?: number | null
          assigned_to?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_deleted?: boolean | null
          metadata?: Json | null
          stage_id?: string
          status?: Database["public"]["Enums"]["deal_status"] | null
          tags?: string[] | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      desktop_sessions: {
        Row: {
          account_id: string
          created_at: string
          device_id: string | null
          device_name: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          last_used_at: string
          refresh_token: string
          revoked: boolean
          user_agent: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_used_at?: string
          refresh_token: string
          revoked?: boolean
          user_agent?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_used_at?: string
          refresh_token?: string
          revoked?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desktop_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          device_origin: string | null
          id: string
          local_id: string | null
          message_type: string | null
          metadata: Json | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          device_origin?: string | null
          id?: string
          local_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          device_origin?: string | null
          id?: string
          local_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats_with_user"
            referencedColumns: ["chat_id"]
          },
        ]
      }
      payment_history: {
        Row: {
          account_id: string
          amount_cents: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          payment_type: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          tier_or_package: string | null
        }
        Insert: {
          account_id: string
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_type: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          tier_or_package?: string | null
        }
        Update: {
          account_id?: string
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_type?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          tier_or_package?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          account_id: string
          action: string
          conflict_detected: boolean | null
          created_at: string | null
          device_id: string
          device_type: string
          entity_id: string
          entity_type: string
          id: string
          new_data: Json | null
          previous_data: Json | null
          resolution_strategy: string | null
          resolved: boolean | null
          vector_clock: Json | null
        }
        Insert: {
          account_id: string
          action: string
          conflict_detected?: boolean | null
          created_at?: string | null
          device_id: string
          device_type: string
          entity_id: string
          entity_type: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          resolution_strategy?: string | null
          resolved?: boolean | null
          vector_clock?: Json | null
        }
        Update: {
          account_id?: string
          action?: string
          conflict_detected?: boolean | null
          created_at?: string | null
          device_id?: string
          device_type?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          resolution_strategy?: string | null
          resolved?: boolean | null
          vector_clock?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_connections: {
        Row: {
          connection_code: string | null
          created_at: string
          id: string
          requester_team_id: string
          shared_resources: Json
          status: Database["public"]["Enums"]["team_connection_status"]
          target_team_id: string
          updated_at: string
        }
        Insert: {
          connection_code?: string | null
          created_at?: string
          id?: string
          requester_team_id: string
          shared_resources?: Json
          status?: Database["public"]["Enums"]["team_connection_status"]
          target_team_id: string
          updated_at?: string
        }
        Update: {
          connection_code?: string | null
          created_at?: string
          id?: string
          requester_team_id?: string
          shared_resources?: Json
          status?: Database["public"]["Enums"]["team_connection_status"]
          target_team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_connections_requester_team_id_fkey"
            columns: ["requester_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_connections_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string | null
          role_id: string | null
          status: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          role_id?: string | null
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          role_id?: string | null
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_director: boolean
          joined_at: string
          role_id: string
          status: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_director?: boolean
          joined_at?: string
          role_id: string
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_director?: boolean
          joined_at?: string
          role_id?: string
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          color: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          permissions: Json
          priority: number
          team_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          priority?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          priority?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string
          max_members: number
          name: string
          owner_account_id: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          max_members?: number
          name: string
          owner_account_id: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          max_members?: number
          name?: string
          owner_account_id?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_account_id_fkey"
            columns: ["owner_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_limits: {
        Row: {
          created_at: string
          features: Json
          monthly_token_limit: number
          price_monthly_cents: number
          stripe_price_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          weekly_token_limit: number | null
        }
        Insert: {
          created_at?: string
          features?: Json
          monthly_token_limit: number
          price_monthly_cents?: number
          stripe_price_id?: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          weekly_token_limit?: number | null
        }
        Update: {
          created_at?: string
          features?: Json
          monthly_token_limit?: number
          price_monthly_cents?: number
          stripe_price_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          weekly_token_limit?: number | null
        }
        Relationships: []
      }
      vision_boards: {
        Row: {
          account_id: string
          board_data: Json
          chat_id: string | null
          completed_at: string | null
          completed_steps: number | null
          created_at: string | null
          current_phase: string | null
          current_task: string | null
          device_origin: string | null
          id: string
          last_synced_at: string | null
          status: string
          title: string
          total_steps: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          board_data?: Json
          chat_id?: string | null
          completed_at?: string | null
          completed_steps?: number | null
          created_at?: string | null
          current_phase?: string | null
          current_task?: string | null
          device_origin?: string | null
          id?: string
          last_synced_at?: string | null
          status?: string
          title: string
          total_steps?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          board_data?: Json
          chat_id?: string | null
          completed_at?: string | null
          completed_steps?: number | null
          created_at?: string | null
          current_phase?: string | null
          current_task?: string | null
          device_origin?: string | null
          id?: string
          last_synced_at?: string | null
          status?: string
          title?: string
          total_steps?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_boards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_boards_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_boards_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats_with_user"
            referencedColumns: ["chat_id"]
          },
        ]
      }
    }
    Views: {
      chats_with_user: {
        Row: {
          account_id: string | null
          chat_id: string | null
          created_at: string | null
          device_origin: string | null
          is_deleted: boolean | null
          last_message: string | null
          last_synced_at: string | null
          message_count: number | null
          mode: string | null
          title: string | null
          updated_at: string | null
          user_email: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_team_with_defaults: {
        Args: { p_account_id: string; p_team_name?: string }
        Returns: string
      }
      generate_chat_title: { Args: { chat_uuid: string }; Returns: string }
      get_chat_with_stats: {
        Args: { chat_uuid: string }
        Returns: {
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          mode: string
          title: string
          updated_at: string
        }[]
      }
      restore_chat: { Args: { chat_uuid: string }; Returns: undefined }
      seed_default_deal_stages: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      soft_delete_chat: { Args: { chat_uuid: string }; Returns: undefined }
    }
    Enums: {
      activity_type:
        | "note"
        | "call"
        | "email"
        | "meeting"
        | "deal_created"
        | "deal_stage_changed"
        | "deal_won"
        | "deal_lost"
        | "contact_created"
        | "task_completed"
        | "import"
      contact_status: "lead" | "active" | "inactive" | "churned"
      deal_status: "open" | "won" | "lost"
      subscription_tier: "free" | "pro" | "max" | "enterprise"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done" | "cancelled"
      task_type: "call" | "email" | "meeting" | "follow_up" | "other"
      team_connection_status: "pending" | "accepted" | "rejected"
      team_invite_status: "pending" | "accepted" | "expired" | "revoked"
      team_member_status: "active" | "invited" | "suspended"
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
      activity_type: [
        "note",
        "call",
        "email",
        "meeting",
        "deal_created",
        "deal_stage_changed",
        "deal_won",
        "deal_lost",
        "contact_created",
        "task_completed",
        "import",
      ],
      contact_status: ["lead", "active", "inactive", "churned"],
      deal_status: ["open", "won", "lost"],
      subscription_tier: ["free", "pro", "max", "enterprise"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done", "cancelled"],
      task_type: ["call", "email", "meeting", "follow_up", "other"],
      team_connection_status: ["pending", "accepted", "rejected"],
      team_invite_status: ["pending", "accepted", "expired", "revoked"],
      team_member_status: ["active", "invited", "suspended"],
    },
  },
} as const

// Type aliases used across the app
export type Chat = Tables<"chats">;
export type Message = Tables<"messages">;
export type VisionBoard = Tables<"vision_boards">;
