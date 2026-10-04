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
      admin_preview_audit: {
        Row: {
          admin_user_id: string
          created_at: string
          enrolment_id: string | null
          id: string
          preview_type: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          enrolment_id?: string | null
          id?: string
          preview_type: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          enrolment_id?: string | null
          id?: string
          preview_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_preview_audit_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors: {
        Row: {
          active: boolean
          code: string
          created_at: string
          email: string | null
          id: string
          name: string
          source: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          source?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      cohorts: {
        Row: {
          course: string
          course_id: string
          created_at: string
          early_bird_deadline: string | null
          early_bird_enabled: boolean
          early_bird_price: number
          end_date: string | null
          headline: string | null
          id: string
          instalment_amount: number
          instalment_copy: string | null
          instalment_count: number
          is_published: boolean
          name: string
          offer_label: string | null
          outright_copy: string | null
          outright_price: number
          start_date: string | null
          status: string
          updated_at: string
          whatsapp_link: string | null
        }
        Insert: {
          course?: string
          course_id: string
          created_at?: string
          early_bird_deadline?: string | null
          early_bird_enabled?: boolean
          early_bird_price?: number
          end_date?: string | null
          headline?: string | null
          id?: string
          instalment_amount?: number
          instalment_copy?: string | null
          instalment_count?: number
          is_published?: boolean
          name: string
          offer_label?: string | null
          outright_copy?: string | null
          outright_price?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          whatsapp_link?: string | null
        }
        Update: {
          course?: string
          course_id?: string
          created_at?: string
          early_bird_deadline?: string | null
          early_bird_enabled?: boolean
          early_bird_price?: number
          end_date?: string | null
          headline?: string | null
          id?: string
          instalment_amount?: number
          instalment_copy?: string | null
          instalment_count?: number
          is_published?: boolean
          name?: string
          offer_label?: string | null
          outright_copy?: string | null
          outright_price?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          mode: string
          note: string | null
          paid_by: string | null
          referral_code: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mode?: string
          note?: string | null
          paid_by?: string | null
          referral_code: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mode?: string
          note?: string | null
          paid_by?: string | null
          referral_code?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrolments: {
        Row: {
          admin_notes: string | null
          amount: number
          cohort_id: string | null
          country: string | null
          created_at: string
          currency: string
          email: string
          email_sent_at: string | null
          flw_transaction_id: string | null
          id: string
          instalment_month: string | null
          kind: string
          mode: string
          name: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          persona: string | null
          phone: string | null
          plan: string | null
          referral_code: string | null
          source: string | null
          source_type: string
          status: string
          tx_ref: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          cohort_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email: string
          email_sent_at?: string | null
          flw_transaction_id?: string | null
          id?: string
          instalment_month?: string | null
          kind?: string
          mode?: string
          name: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          persona?: string | null
          phone?: string | null
          plan?: string | null
          referral_code?: string | null
          source?: string | null
          source_type?: string
          status?: string
          tx_ref?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          cohort_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string
          email_sent_at?: string | null
          flw_transaction_id?: string | null
          id?: string
          instalment_month?: string | null
          kind?: string
          mode?: string
          name?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          persona?: string | null
          phone?: string | null
          plan?: string | null
          referral_code?: string | null
          source?: string | null
          source_type?: string
          status?: string
          tx_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      instalment_reminders: {
        Row: {
          created_at: string
          email: string
          id: string
          mode: string
          month: string
          sent_by: string | null
          stage: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          mode?: string
          month: string
          sent_by?: string | null
          stage: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mode?: string
          month?: string
          sent_by?: string | null
          stage?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          mode: string
          phone: string
          source: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          mode?: string
          phone: string
          source?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          mode?: string
          phone?: string
          source?: string | null
        }
        Relationships: []
      }
      private_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_super_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin"
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
    Enums: {
      app_role: ["super_admin", "admin"],
    },
  },
} as const
