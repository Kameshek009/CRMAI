export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          clerk_user_id: string;
          email: string | null;
          name: string | null;
          tier: "free" | "pro" | "max" | "enterprise";
          token_limit: number;
          tokens_used: number;
          billing_cycle_start: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          email?: string | null;
          name?: string | null;
          tier?: "free" | "pro" | "max" | "enterprise";
          token_limit?: number;
          tokens_used?: number;
          billing_cycle_start?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          email?: string | null;
          name?: string | null;
          tier?: "free" | "pro" | "max" | "enterprise";
          token_limit?: number;
          tokens_used?: number;
          billing_cycle_start?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      usage_records: {
        Row: {
          id: string;
          account_id: string;
          session_id: string | null;
          tokens_consumed: number;
          action_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          session_id?: string | null;
          tokens_consumed: number;
          action_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          session_id?: string | null;
          tokens_consumed?: number;
          action_type?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          account_id: string;
          started_at: string;
          ended_at: string | null;
          tokens_used: number;
          status: "active" | "completed" | "error";
          summary: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          started_at?: string;
          ended_at?: string | null;
          tokens_used?: number;
          status?: "active" | "completed" | "error";
          summary?: string | null;
        };
        Update: {
          id?: string;
          account_id?: string;
          started_at?: string;
          ended_at?: string | null;
          tokens_used?: number;
          status?: "active" | "completed" | "error";
          summary?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          account_id: string;
          session_id: string | null;
          event_type: string;
          message: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          session_id?: string | null;
          event_type: string;
          message: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          session_id?: string | null;
          event_type?: string;
          message?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      desktop_sessions: {
        Row: {
          id: string;
          account_id: string;
          refresh_token: string;
          device_name: string | null;
          device_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          last_used_at: string;
          expires_at: string | null;
          revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          refresh_token: string;
          device_name?: string | null;
          device_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          last_used_at?: string;
          expires_at?: string | null;
          revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          refresh_token?: string;
          device_name?: string | null;
          device_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          last_used_at?: string;
          expires_at?: string | null;
          revoked?: boolean;
          created_at?: string;
        };
      };
      desktop_auth_codes: {
        Row: {
          id: string;
          code: string;
          clerk_user_id: string;
          state: string;
          device_name: string | null;
          device_id: string | null;
          used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          clerk_user_id: string;
          state: string;
          device_name?: string | null;
          device_id?: string | null;
          used?: boolean;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          clerk_user_id?: string;
          state?: string;
          device_name?: string | null;
          device_id?: string | null;
          used?: boolean;
          expires_at?: string;
          created_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          account_id: string;
          title: string | null;
          mode: "chat" | "agent" | "auto";
          vision_board_id: string | null;
          device_origin: string | null;
          last_synced_at: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          title?: string | null;
          mode?: "chat" | "agent" | "auto";
          vision_board_id?: string | null;
          device_origin?: string | null;
          last_synced_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          title?: string | null;
          mode?: "chat" | "agent" | "auto";
          vision_board_id?: string | null;
          device_origin?: string | null;
          last_synced_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata: Json;
          message_type: "text" | "plan" | "action" | "result" | "error";
          tokens_used: number;
          local_id: string | null;
          device_origin: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata?: Json;
          message_type?: "text" | "plan" | "action" | "result" | "error";
          tokens_used?: number;
          local_id?: string | null;
          device_origin?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          metadata?: Json;
          message_type?: "text" | "plan" | "action" | "result" | "error";
          tokens_used?: number;
          local_id?: string | null;
          device_origin?: string | null;
          created_at?: string;
        };
      };
      vision_boards: {
        Row: {
          id: string;
          account_id: string;
          chat_id: string | null;
          title: string;
          status: "pending" | "active" | "paused" | "completed" | "failed" | "cancelled";
          board_data: Json;
          total_steps: number;
          completed_steps: number;
          current_phase: string | null;
          current_task: string | null;
          device_origin: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          chat_id?: string | null;
          title: string;
          status?: "pending" | "active" | "paused" | "completed" | "failed" | "cancelled";
          board_data?: Json;
          total_steps?: number;
          completed_steps?: number;
          current_phase?: string | null;
          current_task?: string | null;
          device_origin?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          account_id?: string;
          chat_id?: string | null;
          title?: string;
          status?: "pending" | "active" | "paused" | "completed" | "failed" | "cancelled";
          board_data?: Json;
          total_steps?: number;
          completed_steps?: number;
          current_phase?: string | null;
          current_task?: string | null;
          device_origin?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      sync_log: {
        Row: {
          id: string;
          entity_type: "chat" | "message" | "vision_board";
          entity_id: string;
          account_id: string;
          action: "create" | "update" | "delete" | "restore";
          device_id: string;
          device_type: "desktop" | "mobile" | "web";
          previous_data: Json | null;
          new_data: Json | null;
          vector_clock: Json;
          conflict_detected: boolean;
          resolved: boolean;
          resolution_strategy: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: "chat" | "message" | "vision_board";
          entity_id: string;
          account_id: string;
          action: "create" | "update" | "delete" | "restore";
          device_id: string;
          device_type: "desktop" | "mobile" | "web";
          previous_data?: Json | null;
          new_data?: Json | null;
          vector_clock?: Json;
          conflict_detected?: boolean;
          resolved?: boolean;
          resolution_strategy?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: "chat" | "message" | "vision_board";
          entity_id?: string;
          account_id?: string;
          action?: "create" | "update" | "delete" | "restore";
          device_id?: string;
          device_type?: "desktop" | "mobile" | "web";
          previous_data?: Json | null;
          new_data?: Json | null;
          vector_clock?: Json;
          conflict_detected?: boolean;
          resolved?: boolean;
          resolution_strategy?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      soft_delete_chat: {
        Args: { chat_uuid: string };
        Returns: undefined;
      };
      restore_chat: {
        Args: { chat_uuid: string };
        Returns: undefined;
      };
      generate_chat_title: {
        Args: { chat_uuid: string };
        Returns: string;
      };
      get_chat_with_stats: {
        Args: { chat_uuid: string };
        Returns: {
          id: string;
          title: string;
          mode: string;
          message_count: number;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      subscription_tier: "free" | "pro" | "max" | "enterprise";
      session_status: "active" | "completed" | "error";
      chat_mode: "chat" | "agent" | "auto";
      message_role: "user" | "assistant" | "system";
      message_type: "text" | "plan" | "action" | "result" | "error";
      vision_board_status: "pending" | "active" | "paused" | "completed" | "failed" | "cancelled";
      sync_action: "create" | "update" | "delete" | "restore";
      device_type: "desktop" | "mobile" | "web";
      entity_type: "chat" | "message" | "vision_board";
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience types for existing tables
export type Account = Tables<"accounts">;
export type UsageRecord = Tables<"usage_records">;
export type Session = Tables<"sessions">;
export type ActivityLog = Tables<"activity_logs">;
export type DesktopSession = Tables<"desktop_sessions">;
export type DesktopAuthCode = Tables<"desktop_auth_codes">;

// Convenience types for chat system
export type Chat = Tables<"chats">;
export type Message = Tables<"messages">;
export type VisionBoard = Tables<"vision_boards">;
export type SyncLog = Tables<"sync_log">;

export type InsertChat = InsertTables<"chats">;
export type InsertMessage = InsertTables<"messages">;
export type InsertVisionBoard = InsertTables<"vision_boards">;

export type UpdateChat = UpdateTables<"chats">;
export type UpdateMessage = UpdateTables<"messages">;
export type UpdateVisionBoard = UpdateTables<"vision_boards">;

// Chat with related data
export interface ChatWithMessages extends Chat {
  messages: Message[];
}

export interface ChatWithStats extends Chat {
  message_count: number;
  last_message_at: string | null;
}
