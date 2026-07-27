import { getSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type ExerciseVersion = Database["public"]["Tables"]["exercise_versions"]["Row"];

export async function listExercises(): Promise<Exercise[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getExerciseBySlug(slug: string): Promise<Exercise | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data ?? null;
}

export async function getActiveVersion(
  exerciseId: string,
): Promise<ExerciseVersion | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("exercise_versions")
    .select("*")
    .eq("exercise_id", exerciseId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}
