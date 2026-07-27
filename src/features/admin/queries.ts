import { getSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseVersion = Database["public"]["Tables"]["exercise_versions"]["Row"];
type Badge = Database["public"]["Tables"]["badges"]["Row"];
type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];

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
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("workout_sessions")
    .select("*, profiles(full_name), exercises(name, slug)")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminSessionRow[];
}
