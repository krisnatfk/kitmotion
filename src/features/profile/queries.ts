import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];
export type School = Database["public"]["Tables"]["schools"]["Row"];

export interface DashboardBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  awardedAt: string;
}

export interface DashboardChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progressValue: number;
  targetValue: number;
  completed: boolean;
  endsAt: string;
}

export interface DashboardMilestone {
  level: number;
  title: string;
  description: string;
  exerciseSlug: string;
  targetReps: number;
  minimumScore: number;
  maxFormErrors: number;
  requireTrackingContinuity: boolean;
  attemptCount: number;
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (data) return data;

  // The authenticated query can fail during an RLS rollout or Supabase cold
  // start. The user identity still comes from auth; the service client is
  // restricted to that exact user id and never accepts an id from the client.
  if (error) {
    try {
      const service = getSupabaseServiceRole();
      const { data: fallback } = await service
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return fallback;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getCurrentProgress(): Promise<UserProgress | null> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (data) return data;
  if (error) {
    try {
      const service = getSupabaseServiceRole();
      const { data: fallback } = await service
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return fallback;
    } catch {
      return null;
    }
  }
  return null;
}

export async function listSchools(): Promise<School[]> {
  const { supabase } = await getCurrentUser();
  const { data } = await supabase
    .from("schools")
    .select("*")
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getDashboardGamification(): Promise<{ badges: DashboardBadge[]; challenges: DashboardChallenge[]; milestone: DashboardMilestone | null }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { badges: [], challenges: [], milestone: null };
  const now = new Date().toISOString();

  const [badgeResult, challengeResult, progressResult] = await Promise.all([
    supabase
      .from("user_badges")
      .select("id, awarded_at, badges(id, code, name, description)")
      .eq("user_id", user.id)
      .order("awarded_at", { ascending: false })
      .limit(4),
    supabase
      .from("challenges")
      .select("id, title, description, xp_reward, criteria, ends_at")
      .eq("is_active", true)
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("ends_at", { ascending: true })
      .limit(3),
    supabase
      .from("challenge_progress")
      .select("challenge_id, progress_value, target_value, completed_at")
      .eq("user_id", user.id),
  ]);

  type BadgeRow = { id: string; awarded_at: string; badges: { id: string; code: string; name: string; description: string } | { id: string; code: string; name: string; description: string }[] | null };
  const badges = ((badgeResult.data ?? []) as unknown as BadgeRow[]).flatMap((row) => {
    const badge = Array.isArray(row.badges) ? row.badges[0] : row.badges;
    return badge ? [{ id: badge.id, code: badge.code, name: badge.name, description: badge.description, awardedAt: row.awarded_at }] : [];
  });

  const progressMap = new Map((progressResult.data ?? []).map((progress) => [progress.challenge_id, progress]));
  const challenges = (challengeResult.data ?? []).map((challenge) => {
    const progress = progressMap.get(challenge.id);
    const criteria = (challenge.criteria ?? {}) as { target?: number };
    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      xpReward: challenge.xp_reward,
      progressValue: Number(progress?.progress_value ?? 0),
      targetValue: Number(progress?.target_value ?? criteria.target ?? 1),
      completed: Boolean(progress?.completed_at),
      endsAt: challenge.ends_at,
    };
  });

  const { data: milestoneState } = await supabase.from("user_milestones")
    .select("milestone_level, attempt_count")
    .eq("user_id", user.id)
    .eq("status", "available")
    .order("milestone_level", { ascending: true })
    .limit(1)
    .maybeSingle();
  let milestone: DashboardMilestone | null = null;
  if (milestoneState) {
    const { data: challenge } = await supabase.from("milestone_challenges")
      .select("exercise_id, title, description, target_reps, minimum_score, max_form_errors, require_tracking_continuity")
      .eq("milestone_level", milestoneState.milestone_level)
      .eq("is_active", true)
      .single();
    if (challenge) {
      const { data: exercise } = await supabase.from("exercises").select("slug").eq("id", challenge.exercise_id).single();
      if (exercise) milestone = {
        level: milestoneState.milestone_level,
        title: challenge.title,
        description: challenge.description,
        exerciseSlug: exercise.slug,
        targetReps: challenge.target_reps,
        minimumScore: Number(challenge.minimum_score),
        maxFormErrors: challenge.max_form_errors,
        requireTrackingContinuity: challenge.require_tracking_continuity,
        attemptCount: milestoneState.attempt_count,
      };
    }
  }

  return { badges, challenges, milestone };
}
