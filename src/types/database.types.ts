/**
 * Hand-written Supabase database types matching supabase/migrations/0001_init.sql.
 *
 * When a live Supabase project is available, regenerate from the DB instead:
 *   npm run db:types
 * (runs `supabase gen types typescript --local --schema public > this file`).
 *
 * Kept in sync manually until then. Mirrors schema.md.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "student" | "admin";
export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";
export type WorkoutStatus = "created" | "active" | "completed" | "cancelled" | "failed";
export type FeedbackSeverity = "info" | "warning" | "critical";
export type RewardSource = "workout" | "run" | "challenge" | "badge" | "admin_adjustment";
export type ChallengePeriod = "daily" | "weekly" | "custom";
export type SensorSource = "none" | "iot_necklace";

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          province: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city?: string | null;
          province?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string | null;
          province?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          school_id: string | null;
          class_name: string | null;
          avatar_path: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          school_id?: string | null;
          class_name?: string | null;
          avatar_path?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          // role intentionally omitted: column is not client-writable (RLS revoke).
          full_name?: string;
          school_id?: string | null;
          class_name?: string | null;
          avatar_path?: string | null;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "profiles_id_fkey"; columns: ["id"]; referencedRelation: "users"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_school_id_fkey"; columns: ["school_id"]; referencedRelation: "schools"; referencedColumns: ["id"] },
        ];
      };

      exercises: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          difficulty: ExerciseDifficulty;
          tutorial_media_url: string | null;
          thumbnail_url: string | null;
          camera_position: string;
          default_target_reps: number | null;
          default_target_seconds: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          difficulty: ExerciseDifficulty;
          tutorial_media_url?: string | null;
          thumbnail_url?: string | null;
          camera_position: string;
          default_target_reps?: number | null;
          default_target_seconds?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };

      exercise_versions: {
        Row: {
          id: string;
          exercise_id: string;
          version: number;
          engine_key: string;
          scoring_version: string;
          config: Json;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          version: number;
          engine_key: string;
          scoring_version: string;
          config?: Json;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_versions"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "exercise_versions_exercise_id_fkey"; columns: ["exercise_id"]; referencedRelation: "exercises"; referencedColumns: ["id"] },
        ];
      };

      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          exercise_version_id: string | null;
          client_session_id: string;
          status: WorkoutStatus;
          started_at: string | null;
          completed_at: string | null;
          duration_seconds: number;
          target_reps: number | null;
          target_seconds: number | null;
          total_reps: number;
          valid_reps: number;
          invalid_reps: number;
          form_score: number | null;
          range_score: number | null;
          consistency_score: number | null;
          tempo_score: number | null;
          stability_score: number | null;
          final_score: number | null;
          grade: string | null;
          used_camera: boolean;
          sensor_source: SensorSource;
          sensor_summary: Json | null;
          app_version: string | null;
          scoring_version: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          exercise_version_id?: string | null;
          client_session_id: string;
          status?: WorkoutStatus;
          started_at?: string | null;
          completed_at?: string | null;
          duration_seconds?: number;
          target_reps?: number | null;
          target_seconds?: number | null;
          total_reps?: number;
          valid_reps?: number;
          invalid_reps?: number;
          form_score?: number | null;
          range_score?: number | null;
          consistency_score?: number | null;
          tempo_score?: number | null;
          stability_score?: number | null;
          final_score?: number | null;
          grade?: string | null;
          used_camera?: boolean;
          sensor_source?: SensorSource;
          sensor_summary?: Json | null;
          app_version?: string | null;
          scoring_version?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "workout_sessions_exercise_id_fkey"; columns: ["exercise_id"]; referencedRelation: "exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_sessions_exercise_version_id_fkey"; columns: ["exercise_version_id"]; referencedRelation: "exercise_versions"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_sessions_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      running_sessions: {
        Row: {
          id: string;
          user_id: string;
          client_session_id: string;
          status: WorkoutStatus;
          started_at: string;
          completed_at: string;
          duration_seconds: number;
          distance_meters: number;
          average_pace_seconds_per_km: number | null;
          best_pace_seconds_per_km: number | null;
          elevation_gain_meters: number;
          calories_estimate: number;
          route: Json;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_session_id: string;
          status?: WorkoutStatus;
          started_at: string;
          completed_at: string;
          duration_seconds: number;
          distance_meters: number;
          average_pace_seconds_per_km?: number | null;
          best_pace_seconds_per_km?: number | null;
          elevation_gain_meters?: number;
          calories_estimate?: number;
          route?: Json;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["running_sessions"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "running_sessions_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      workout_repetitions: {
        Row: {
          id: string;
          session_id: string;
          rep_number: number;
          started_offset_ms: number;
          completed_offset_ms: number;
          is_valid: boolean;
          form_score: number | null;
          range_score: number | null;
          tempo_score: number | null;
          stability_score: number | null;
          metrics: Json;
          issue_codes: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          rep_number: number;
          started_offset_ms: number;
          completed_offset_ms: number;
          is_valid: boolean;
          form_score?: number | null;
          range_score?: number | null;
          tempo_score?: number | null;
          stability_score?: number | null;
          metrics?: Json;
          issue_codes?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_repetitions"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "workout_repetitions_session_id_fkey"; columns: ["session_id"]; referencedRelation: "workout_sessions"; referencedColumns: ["id"] },
        ];
      };

      session_feedback: {
        Row: {
          id: string;
          session_id: string;
          repetition_id: string | null;
          code: string;
          severity: FeedbackSeverity;
          message: string;
          occurrence_count: number;
          first_offset_ms: number | null;
          last_offset_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          repetition_id?: string | null;
          code: string;
          severity: FeedbackSeverity;
          message: string;
          occurrence_count?: number;
          first_offset_ms?: number | null;
          last_offset_ms?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["session_feedback"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "session_feedback_session_id_fkey"; columns: ["session_id"]; referencedRelation: "workout_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "session_feedback_repetition_id_fkey"; columns: ["repetition_id"]; referencedRelation: "workout_repetitions"; referencedColumns: ["id"] },
        ];
      };

      user_progress: {
        Row: {
          user_id: string;
          total_xp: number;
          current_level: number;
          total_sessions: number;
          total_valid_reps: number;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          current_level?: number;
          total_sessions?: number;
          total_valid_reps?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_progress"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "user_progress_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      xp_events: {
        Row: {
          id: string;
          user_id: string;
          source: RewardSource;
          source_id: string | null;
          idempotency_key: string;
          xp_amount: number;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: RewardSource;
          source_id?: string | null;
          idempotency_key: string;
          xp_amount: number;
          description: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["xp_events"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "xp_events_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      level_definitions: {
        Row: {
          level: number;
          name: string;
          min_total_xp: number;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          level: number;
          name: string;
          min_total_xp: number;
          icon?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["level_definitions"]["Insert"]>;
        Relationships: [];
      };

      badges: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          icon_url: string | null;
          criteria: Json;
          xp_reward: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          icon_url?: string | null;
          criteria: Json;
          xp_reward?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
        Relationships: [];
      };

      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          awarded_for_id: string | null;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          awarded_for_id?: string | null;
          awarded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_badges"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "user_badges_badge_id_fkey"; columns: ["badge_id"]; referencedRelation: "badges"; referencedColumns: ["id"] },
          { foreignKeyName: "user_badges_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      challenges: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string;
          period: ChallengePeriod;
          starts_at: string;
          ends_at: string;
          criteria: Json;
          xp_reward: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          description: string;
          period: ChallengePeriod;
          starts_at: string;
          ends_at: string;
          criteria: Json;
          xp_reward?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["challenges"]["Insert"]>;
        Relationships: [];
      };

      challenge_progress: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          progress_value: number;
          target_value: number;
          completed_at: string | null;
          reward_claimed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          progress_value?: number;
          target_value: number;
          completed_at?: string | null;
          reward_claimed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["challenge_progress"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "challenge_progress_challenge_id_fkey"; columns: ["challenge_id"]; referencedRelation: "challenges"; referencedColumns: ["id"] },
          { foreignKeyName: "challenge_progress_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      admin_audit_logs: {
        Row: {
          id: string;
          admin_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_audit_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    // No views exist in the application-first MVP. `Record<string, never> & {}`
    // still narrows values to `never`, which fails GenericSchema's
    // `Record<string, GenericView>`; use a permissive empty record instead.
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      handle_new_user: { Args: Record<string, unknown>; Returns: unknown };
      handle_new_profile: { Args: Record<string, unknown>; Returns: unknown };
      set_updated_at: { Args: Record<string, unknown>; Returns: unknown };
    };
    Enums: {
      user_role: UserRole;
      exercise_difficulty: ExerciseDifficulty;
      workout_status: WorkoutStatus;
      feedback_severity: FeedbackSeverity;
      reward_source: RewardSource;
      challenge_period: ChallengePeriod;
      sensor_source: SensorSource;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Schema = Database[Extract<keyof Database, "public">];
