import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseVersion = Database["public"]["Tables"]["exercise_versions"]["Row"];
type Badge = Database["public"]["Tables"]["badges"]["Row"];
type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
type RunningSession = Database["public"]["Tables"]["running_sessions"]["Row"];

export async function adminListExercises(): Promise<Exercise[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function adminGetExercise(id: string): Promise<Exercise | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("exercises").select("*").eq("id", id).single();
  return data ?? null;
}

export async function adminListVersions(exerciseId: string): Promise<ExerciseVersion[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("exercise_versions")
    .select("*")
    .eq("exercise_id", exerciseId)
    .order("version", { ascending: false });
  return data ?? [];
}

export async function adminListBadges(): Promise<Badge[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("badges").select("*").order("code");
  return data ?? [];
}

export async function adminListChallenges(): Promise<Challenge[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("challenges")
    .select("*")
    .order("ends_at", { ascending: false });
  return data ?? [];
}

export interface AdminSessionRow extends WorkoutSession {
  profiles?: { full_name: string } | null;
  exercises?: { name: string; slug: string } | null;
}

export async function adminListSessions(limit = 50): Promise<AdminSessionRow[]> {
  // Admin pages are DB-role guarded by their layout. Service role is required
  // here because workout RLS intentionally exposes only the current user's rows.
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from("workout_sessions")
    .select("*, profiles(full_name), exercises(name, slug)")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminSessionRow[];
}

export interface AdminRunRow extends RunningSession {
  profiles?: { full_name: string } | null;
}

export async function adminListRuns(limit = 50): Promise<AdminRunRow[]> {
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from("running_sessions")
    .select("*, profiles(full_name)")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminRunRow[];
}

export async function adminActivityCounts(): Promise<{ workouts: number; runs: number }> {
  const supabase = getSupabaseServiceRole();
  const [workouts, runs] = await Promise.all([
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }),
    supabase.from("running_sessions").select("id", { count: "exact", head: true }),
  ]);
  return { workouts: workouts.count ?? 0, runs: runs.count ?? 0 };
}
