export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      consultations: {
        Row: {
          assigned_designer: string | null;
          budget_range: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          location: string | null;
          message: string | null;
          phone: string | null;
          preferred_date: string | null;
          preferred_time: string | null;
          project_scope: string | null;
          project_type: string | null;
          property_address: string | null;
          service_interest: string | null;
          status: string;
          timeline: string | null;
          updated_at: string;
        };
        Insert: {
          assigned_designer?: string | null;
          budget_range?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          location?: string | null;
          message?: string | null;
          phone?: string | null;
          preferred_date?: string | null;
          preferred_time?: string | null;
          project_scope?: string | null;
          project_type?: string | null;
          property_address?: string | null;
          service_interest?: string | null;
          status?: string;
          timeline?: string | null;
          updated_at?: string;
        };
        Update: {
          assigned_designer?: string | null;
          budget_range?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          location?: string | null;
          message?: string | null;
          phone?: string | null;
          preferred_date?: string | null;
          preferred_time?: string | null;
          project_scope?: string | null;
          project_type?: string | null;
          property_address?: string | null;
          service_interest?: string | null;
          status?: string;
          timeline?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          job_title: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          id: string;
          image_url: string;
          project_id: string;
          sort_order: number;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          image_url: string;
          project_id: string;
          sort_order?: number;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string;
          project_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          category: string;
          cover_image_url: string | null;
          created_at: string;
          description: string | null;
          featured: boolean;
          id: string;
          location: string | null;
          slug: string;
          sort_order: number;
          status: string;
          subtitle: string | null;
          title: string;
          updated_at: string;
          year: string | null;
        };
        Insert: {
          category?: string;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          location?: string | null;
          slug: string;
          sort_order?: number;
          status?: string;
          subtitle?: string | null;
          title: string;
          updated_at?: string;
          year?: string | null;
        };
        Update: {
          category?: string;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          location?: string | null;
          slug?: string;
          sort_order?: number;
          status?: string;
          subtitle?: string | null;
          title?: string;
          updated_at?: string;
          year?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          created_at: string;
          description: string | null;
          details: string | null;
          id: string;
          image_url: string | null;
          number: string;
          sort_order: number;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          details?: string | null;
          id?: string;
          image_url?: string | null;
          number?: string;
          sort_order?: number;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          details?: string | null;
          id?: string;
          image_url?: string | null;
          number?: string;
          sort_order?: number;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          category: string;
          id: string;
          is_public: boolean;
          label: string | null;
          setting_key: string;
          setting_value: string | null;
          updated_at: string;
        };
        Insert: {
          category?: string;
          id?: string;
          is_public?: boolean;
          label?: string | null;
          setting_key: string;
          setting_value?: string | null;
          updated_at?: string;
        };
        Update: {
          category?: string;
          id?: string;
          is_public?: boolean;
          label?: string | null;
          setting_key?: string;
          setting_value?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_content: {
        Row: {
          body: string | null;
          content_key: string;
          heading: string | null;
          id: string;
          image_url: string | null;
          page: string;
          section: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          content_key: string;
          heading?: string | null;
          id?: string;
          image_url?: string | null;
          page?: string;
          section?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          content_key?: string;
          heading?: string | null;
          id?: string;
          image_url?: string | null;
          page?: string;
          section?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_messages: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          message: string;
          priority: string;
          status: string;
          subject: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          message: string;
          priority?: string;
          status?: string;
          subject?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          message?: string;
          priority?: string;
          status?: string;
          subject?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "editor" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "user"],
    },
  },
} as const;
