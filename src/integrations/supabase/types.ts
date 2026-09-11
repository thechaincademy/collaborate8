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
      audit_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_number_masked: string | null
          account_type: string | null
          consent_status: string
          consent_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          institution_id: string
          institution_name: string
          sort_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          account_number_masked?: string | null
          account_type?: string | null
          consent_status?: string
          consent_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          institution_id: string
          institution_name: string
          sort_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          account_number_masked?: string | null
          account_type?: string | null
          consent_status?: string
          consent_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          institution_id?: string
          institution_name?: string
          sort_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          capabilities: Json | null
          charges_enabled: boolean | null
          created_at: string
          id: string
          onboarding_status: string
          payouts_enabled: boolean | null
          provider: string
          provider_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities?: Json | null
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          onboarding_status?: string
          payouts_enabled?: boolean | null
          provider?: string
          provider_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities?: Json | null
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          onboarding_status?: string
          payouts_enabled?: boolean | null
          provider?: string
          provider_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expense_requests: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          receipt_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          invitee_email: string | null
          inviter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          invitee_email?: string | null
          inviter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          invitee_email?: string | null
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          body: string
          created_at: string
          id: string
          original_body: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          tone_score: number | null
          used_suggestion: boolean
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          body: string
          created_at?: string
          id?: string
          original_body?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          tone_score?: number | null
          used_suggestion?: boolean
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string
          created_at?: string
          id?: string
          original_body?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          tone_score?: number | null
          used_suggestion?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          dispute_status: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          payee_id: string
          payer_id: string
          payout_delay_until: string | null
          provider: string | null
          provider_charge_id: string | null
          provider_consent_token: string | null
          provider_payment_id: string | null
          provider_payout_id: string | null
          provider_transfer_id: string | null
          related_arrangement_id: string | null
          related_expense_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          dispute_status?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          payee_id: string
          payer_id: string
          payout_delay_until?: string | null
          provider?: string | null
          provider_charge_id?: string | null
          provider_consent_token?: string | null
          provider_payment_id?: string | null
          provider_payout_id?: string | null
          provider_transfer_id?: string | null
          related_arrangement_id?: string | null
          related_expense_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          dispute_status?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          payee_id?: string
          payer_id?: string
          payout_delay_until?: string | null
          provider?: string | null
          provider_charge_id?: string | null
          provider_consent_token?: string | null
          provider_payment_id?: string | null
          provider_payout_id?: string | null
          provider_transfer_id?: string | null
          related_arrangement_id?: string | null
          related_expense_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_related_arrangement_id_fkey"
            columns: ["related_arrangement_id"]
            isOneToOne: false
            referencedRelation: "recurring_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_related_expense_id_fkey"
            columns: ["related_expense_id"]
            isOneToOne: false
            referencedRelation: "expense_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          coparent_id: string | null
          created_at: string
          first_name: string | null
          id: string
          invite_code: string | null
          last_name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          coparent_id?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          invite_code?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          coparent_id?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coparent_id_fkey"
            columns: ["coparent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_payments: {
        Row: {
          amount: number
          created_at: string
          day_of_month: number | null
          day_of_week: string | null
          frequency: string
          id: string
          is_active: boolean
          next_due_date: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_price_id: string | null
          provider_subscription_id: string | null
          receiver_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          next_due_date?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_price_id?: string | null
          provider_subscription_id?: string | null
          receiver_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day_of_month?: number | null
          day_of_week?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_due_date?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_price_id?: string | null
          provider_subscription_id?: string | null
          receiver_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payments_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          path: string | null
          tab: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          path?: string | null
          tab?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          tab?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_coparent_invitation: {
        Args: { _invite_code: string }
        Returns: undefined
      }
      admin_usage_summary: { Args: { _days?: number }; Returns: Json }
      get_coparent_id: { Args: { _user_id: string }; Returns: string }
      get_invitation_by_code: {
        Args: { _invite_code: string }
        Returns: {
          id: string
          invitee_email: string
          inviter_id: string
          status: string
        }[]
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
