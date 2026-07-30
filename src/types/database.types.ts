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

export type UserRole = "student" | "teacher" | "admin";
export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";
export type WorkoutStatus = "created" | "active" | "completed" | "cancelled" | "failed";
export type FeedbackSeverity = "info" | "warning" | "critical";
export type RewardSource = "workout" | "run" | "challenge" | "badge" | "admin_adjustment";
export type ChallengePeriod = "daily" | "weekly" | "custom";
export type SensorSource = "none" | "iot_necklace";
export type MembershipStatus = "pending" | "active" | "rejected" | "left" | "removed";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";
export type MilestoneStatus = "locked" | "available" | "completed";

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
          // Runtime authorization is enforced by RLS/revoked grants. Server-side
          // service-role actions still need the column represented accurately.
          role?: UserRole;
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

      ai_insights: {
        Row: {
          id: string;
          owner_user_id: string;
          kind: string;
          cache_key: string;
          session_id: string | null;
          classroom_id: string | null;
          content: Json;
          source: string;
          provider: string | null;
          model: string | null;
          prompt_version: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          kind: string;
          cache_key: string;
          session_id?: string | null;
          classroom_id?: string | null;
          content: Json;
          source?: string;
          provider?: string | null;
          model?: string | null;
          prompt_version: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_insights"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "ai_insights_owner_user_id_fkey"; columns: ["owner_user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "ai_insights_session_id_fkey"; columns: ["session_id"]; referencedRelation: "workout_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "ai_insights_classroom_id_fkey"; columns: ["classroom_id"]; referencedRelation: "classrooms"; referencedColumns: ["id"] },
        ];
      };

      ai_providers: {
        Row: {
          id: string;
          name: string;
          base_url: string;
          api_key_encrypted: string;
          model: string;
          response_format: "json_schema" | "json_object";
          priority: number;
          is_active: boolean;
          health_status: "unchecked" | "healthy" | "degraded" | "unhealthy";
          consecutive_failures: number;
          last_checked_at: string | null;
          last_success_at: string | null;
          last_latency_ms: number | null;
          last_error: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          base_url: string;
          api_key_encrypted: string;
          model: string;
          response_format?: "json_schema" | "json_object";
          priority?: number;
          is_active?: boolean;
          health_status?: "unchecked" | "healthy" | "degraded" | "unhealthy";
          consecutive_failures?: number;
          last_checked_at?: string | null;
          last_success_at?: string | null;
          last_latency_ms?: number | null;
          last_error?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_providers"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "ai_providers_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      user_progress: {
        Row: {
          user_id: string;
          total_xp: number;
          current_level: number;
          max_unlocked_level: number;
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
          max_unlocked_level?: number;
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

      exercise_tutorials: {
        Row: {
          exercise_id: string;
          start_position: string;
          steps: Json;
          common_mistakes: Json;
          safety_tips: Json;
          animation_url: string | null;
          updated_at: string;
        };
        Insert: {
          exercise_id: string;
          start_position: string;
          steps?: Json;
          common_mistakes?: Json;
          safety_tips?: Json;
          animation_url?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_tutorials"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "exercise_tutorials_exercise_id_fkey"; columns: ["exercise_id"]; referencedRelation: "exercises"; referencedColumns: ["id"] },
        ];
      };

      level_difficulty_configs: {
        Row: { level: number; target_multiplier: number; minimum_score: number; tolerance_multiplier: number; created_at: string };
        Insert: { level: number; target_multiplier?: number; minimum_score?: number; tolerance_multiplier?: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["level_difficulty_configs"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "level_difficulty_configs_level_fkey"; columns: ["level"]; referencedRelation: "level_definitions"; referencedColumns: ["level"] },
        ];
      };

      milestone_challenges: {
        Row: {
          id: string;
          milestone_level: number;
          exercise_id: string;
          title: string;
          description: string;
          target_reps: number;
          minimum_score: number;
          max_form_errors: number;
          require_tracking_continuity: boolean;
          xp_reward: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          milestone_level: number;
          exercise_id: string;
          title: string;
          description: string;
          target_reps: number;
          minimum_score: number;
          max_form_errors?: number;
          require_tracking_continuity?: boolean;
          xp_reward?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["milestone_challenges"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "milestone_challenges_exercise_id_fkey"; columns: ["exercise_id"]; referencedRelation: "exercises"; referencedColumns: ["id"] },
        ];
      };

      user_milestones: {
        Row: {
          user_id: string;
          milestone_level: number;
          status: MilestoneStatus;
          attempt_count: number;
          completed_at: string | null;
          reward_claimed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          milestone_level: number;
          status?: MilestoneStatus;
          attempt_count?: number;
          completed_at?: string | null;
          reward_claimed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_milestones"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "user_milestones_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "user_milestones_milestone_level_fkey"; columns: ["milestone_level"]; referencedRelation: "milestone_challenges"; referencedColumns: ["milestone_level"] },
        ];
      };

      milestone_attempts: {
        Row: {
          id: string;
          user_id: string;
          milestone_level: number;
          session_id: string;
          success: boolean;
          achieved_reps: number;
          achieved_score: number;
          form_errors: number;
          tracking_loss_count: number;
          attempted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          milestone_level: number;
          session_id: string;
          success: boolean;
          achieved_reps: number;
          achieved_score: number;
          form_errors: number;
          tracking_loss_count?: number;
          attempted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["milestone_attempts"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "milestone_attempts_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "milestone_attempts_milestone_level_fkey"; columns: ["milestone_level"]; referencedRelation: "milestone_challenges"; referencedColumns: ["milestone_level"] },
          { foreignKeyName: "milestone_attempts_session_id_fkey"; columns: ["session_id"]; referencedRelation: "workout_sessions"; referencedColumns: ["id"] },
        ];
      };

      classrooms: {
        Row: { id: string; teacher_id: string; name: string; school_year: string | null; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; teacher_id: string; name: string; school_year?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["classrooms"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "classrooms_teacher_id_fkey"; columns: ["teacher_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      class_join_codes: {
        Row: { id: string; classroom_id: string; code: string; expires_at: string | null; is_active: boolean; created_at: string };
        Insert: { id?: string; classroom_id: string; code: string; expires_at?: string | null; is_active?: boolean; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["class_join_codes"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "class_join_codes_classroom_id_fkey"; columns: ["classroom_id"]; referencedRelation: "classrooms"; referencedColumns: ["id"] },
        ];
      };

      class_invitations: {
        Row: { id: string; classroom_id: string; student_id: string; code_used: string; status: InvitationStatus; consented_at: string | null; responded_at: string | null; expires_at: string | null; created_at: string };
        Insert: { id?: string; classroom_id: string; student_id: string; code_used: string; status?: InvitationStatus; consented_at?: string | null; responded_at?: string | null; expires_at?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["class_invitations"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "class_invitations_classroom_id_fkey"; columns: ["classroom_id"]; referencedRelation: "classrooms"; referencedColumns: ["id"] },
          { foreignKeyName: "class_invitations_student_id_fkey"; columns: ["student_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };

      class_memberships: {
        Row: { id: string; classroom_id: string; student_id: string; invitation_id: string | null; status: MembershipStatus; consented_at: string | null; joined_at: string | null; ended_at: string | null; updated_at: string };
        Insert: { id?: string; classroom_id: string; student_id: string; invitation_id?: string | null; status?: MembershipStatus; consented_at?: string | null; joined_at?: string | null; ended_at?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["class_memberships"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "class_memberships_classroom_id_fkey"; columns: ["classroom_id"]; referencedRelation: "classrooms"; referencedColumns: ["id"] },
          { foreignKeyName: "class_memberships_student_id_fkey"; columns: ["student_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "class_memberships_invitation_id_fkey"; columns: ["invitation_id"]; referencedRelation: "class_invitations"; referencedColumns: ["id"] },
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
      is_teacher: { Args: Record<string, never>; Returns: boolean };
      teacher_has_active_student: { Args: { target_student: string }; Returns: boolean };
      teacher_can_view_student_session: { Args: { target_student: string; session_completed_at: string }; Returns: boolean };
      owns_classroom: { Args: { target_classroom: string }; Returns: boolean };
      belongs_to_classroom: { Args: { target_classroom: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      exercise_difficulty: ExerciseDifficulty;
      workout_status: WorkoutStatus;
      feedback_severity: FeedbackSeverity;
      reward_source: RewardSource;
      challenge_period: ChallengePeriod;
      sensor_source: SensorSource;
      membership_status: MembershipStatus;
      invitation_status: InvitationStatus;
      milestone_status: MilestoneStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Schema = Database[Extract<keyof Database, "public">];
