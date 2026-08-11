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
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_evidence: {
        Row: {
          actual_result: string | null
          environment: string | null
          executed_at: string
          executed_by: string
          id: string
          notes: string | null
          screenshot_url: string | null
          session_id: string
          test_case_id: string
        }
        Insert: {
          actual_result?: string | null
          environment?: string | null
          executed_at?: string
          executed_by: string
          id?: string
          notes?: string | null
          screenshot_url?: string | null
          session_id: string
          test_case_id: string
        }
        Update: {
          actual_result?: string | null
          environment?: string | null
          executed_at?: string
          executed_by?: string
          id?: string
          notes?: string | null
          screenshot_url?: string | null
          session_id?: string
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_evidence_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      blockers: {
        Row: {
          created_at: string
          created_by: string
          details: string | null
          id: string
          project_id: string | null
          resolved_at: string | null
          session_id: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          details?: string | null
          id?: string
          project_id?: string | null
          resolved_at?: string | null
          session_id?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          details?: string | null
          id?: string
          project_id?: string | null
          resolved_at?: string | null
          session_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_developer: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          details: string | null
          duration_of_impact: string | null
          id: string
          opened_at: string
          owner: string | null
          priority: string | null
          project_id: string | null
          session_id: string | null
          severity: string | null
          status: string
          test_case_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_developer?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          details?: string | null
          duration_of_impact?: string | null
          id?: string
          opened_at?: string
          owner?: string | null
          priority?: string | null
          project_id?: string | null
          session_id?: string | null
          severity?: string | null
          status?: string
          test_case_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_developer?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          details?: string | null
          duration_of_impact?: string | null
          id?: string
          opened_at?: string
          owner?: string | null
          priority?: string | null
          project_id?: string | null
          session_id?: string | null
          severity?: string | null
          status?: string
          test_case_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          content: string
          created_at: string
          created_by: string
          developer_comment: string | null
          id: string
          pm_comment: string | null
          project_id: string | null
          session_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          developer_comment?: string | null
          id?: string
          pm_comment?: string | null
          project_id?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          developer_comment?: string | null
          id?: string
          pm_comment?: string | null
          project_id?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          assigned_tester: string | null
          business_impact: string | null
          business_segment: string | null
          created_at: string
          created_by: string
          delivery_category: string | null
          end_date: string | null
          id: string
          name: string
          overview: string | null
          project_type: string | null
          rejection_reason: string | null
          requested_by: string | null
          stakeholders: Json
          start_date: string | null
          status: string
          target_end_date: string | null
          test_type: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_tester?: string | null
          business_impact?: string | null
          business_segment?: string | null
          created_at?: string
          created_by: string
          delivery_category?: string | null
          end_date?: string | null
          id?: string
          name: string
          overview?: string | null
          project_type?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          stakeholders?: Json
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          test_type?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_tester?: string | null
          business_impact?: string | null
          business_segment?: string | null
          created_at?: string
          created_by?: string
          delivery_category?: string | null
          end_date?: string | null
          id?: string
          name?: string
          overview?: string | null
          project_type?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          stakeholders?: Json
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          test_type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json
          generated_at: string
          generated_by: string
          id: string
          session_id: string
          version: number
          workspace_id: string
        }
        Insert: {
          content: Json
          generated_at?: string
          generated_by: string
          id?: string
          session_id: string
          version?: number
          workspace_id: string
        }
        Update: {
          content?: Json
          generated_at?: string
          generated_by?: string
          id?: string
          session_id?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      session_inputs: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          label: string | null
          session_id: string
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          label?: string | null
          session_id: string
          sort_order?: number
          type: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          label?: string | null
          session_id?: string
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_inputs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          id: string
          project_id: string | null
          requirements_text: string
          screenshot_path: string | null
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          id?: string
          project_id?: string | null
          requirements_text: string
          screenshot_path?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string | null
          requirements_text?: string
          screenshot_path?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          assigned_developer: string | null
          created_at: string
          created_by: string
          executed_at: string | null
          expected_result: string
          feedback: string | null
          id: string
          module: string | null
          preconditions: string | null
          priority: string | null
          session_id: string
          severity: string | null
          sort_order: number
          source_ref: string | null
          status: string
          steps: Json
          submodule: string | null
          test_class: string | null
          test_data: Json | null
          test_environment: string | null
          test_objective: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_developer?: string | null
          created_at?: string
          created_by: string
          executed_at?: string | null
          expected_result: string
          feedback?: string | null
          id?: string
          module?: string | null
          preconditions?: string | null
          priority?: string | null
          session_id: string
          severity?: string | null
          sort_order?: number
          source_ref?: string | null
          status?: string
          steps?: Json
          submodule?: string | null
          test_class?: string | null
          test_data?: Json | null
          test_environment?: string | null
          test_objective?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_developer?: string | null
          created_at?: string
          created_by?: string
          executed_at?: string | null
          expected_result?: string
          feedback?: string | null
          id?: string
          module?: string | null
          preconditions?: string | null
          priority?: string | null
          session_id?: string
          severity?: string | null
          sort_order?: number
          source_ref?: string | null
          status?: string
          steps?: Json
          submodule?: string | null
          test_class?: string | null
          test_data?: Json | null
          test_environment?: string | null
          test_objective?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          invited_at: string
          joined_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_admin: { Args: { workspace_id: string }; Returns: boolean }
      is_workspace_member: { Args: { workspace_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const


export interface Profile extends Tables<'profiles'> {}
export interface Project extends Tables<'projects'> {}
export interface ProjectWithProfiles extends Project {
  assigned_tester_profile?: { id: string; email: string; full_name: string | null } | null
  requested_by_profile?: { id: string; email: string; full_name: string | null } | null
  created_by_profile?: { id: string; email: string; full_name: string | null } | null
}
export interface Workspace extends Tables<'workspaces'> {}
export interface WorkspaceMember extends Tables<'workspace_members'> {
  profiles?: { email: string; full_name: string | null } | null
}
export interface Session extends Tables<'sessions'> {}
export interface SessionInput extends Tables<'session_inputs'> {}
export interface TestCase extends Tables<'test_cases'> {}
export interface ExecutionEvidence extends Tables<'execution_evidence'> {}
export interface Issue extends Tables<'issues'> {
  assigned_developer_profile?: { id: string; email: string; full_name: string | null } | null
  owner_profile?: { id: string; email: string; full_name: string | null } | null
  created_by_profile?: { id: string; email: string; full_name: string | null } | null
  test_case?: { id: string; title: string; source_ref: string | null; status: string } | null
}
export interface Blocker extends Tables<'blockers'> {
  created_by_profile?: { id: string; email: string; full_name: string | null } | null
}
export interface Observation extends Tables<'observations'> {
  created_by_profile?: { id: string; email: string; full_name: string | null } | null
}
export interface Report extends Tables<'reports'> {}
export interface ActivityLog extends Tables<'activity_log'> {
  profiles?: { email: string; full_name: string | null } | null
}

export interface WorkspaceInvitation {
  id: string
  email: string
  role: string
  workspace_id: string
  invited_by: string
  invited_at: string
  workspace_name?: string | null
  profiles?: { email: string; full_name: string | null } | null
}
