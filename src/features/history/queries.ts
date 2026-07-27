import { getSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutRepetitionRow = Database["public"]["Tables"]["workout_repetitions"]["Row"];
export type SessionFeedbackRow = Database["public"]["Tables"]["session_feedback"]["Row"];

export interface SessionListItem extends WorkoutSessionRow {
  exercises?: { name: string; slug: string } | null;
}

export interface SessionDetail extends WorkoutSessionRow {
  exercises?: { name: string; slug: string } | null;
  repetitions: WorkoutRepetitionRow[];
  feedback: SessionFeedbackRow[];
}

export async function listSessions(opts?: {
  exerciseSlug?: string;
  limit?: number;
}): Promise<SessionListItem[]> {
  const supabase = await getSupabaseServer();
  let query = supabase
    .from("workout_sessions")
    .select("*, exercises!inner(name, slug)")
    .order("completed_at", { ascending: false });
  if (opts?.exerciseSlug) {
    query = query.eq("exercises.slug", opts.exerciseSlug);
  }
  const { data } = await query.limit(opts?.limit ?? 50);
  return (data ?? []) as SessionListItem[];
}

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const supabase = await getSupabaseServer();
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*, exercises!inner(name, slug)")
    .eq("id", sessionId)
    .single();
  if (!session) return null;

  const [{ data: reps }, { data: feedback }] = await Promise.all([
    supabase
      .from("workout_repetitions")
      .select("*")
      .eq("session_id", sessionId)
      .order("rep_number", { ascending: true }),
    supabase
      .from("session_feedback")
      .select("*")
      .eq("session_id", sessionId)
      .order("occurrence_count", { ascending: false }),
  ]);

  return {
    ...(session as SessionDetail),
    repetitions: reps ?? [],
    feedback: feedback ?? [],
  };
}

export interface TrendPoint {
  date: string;
  score: number;
  reps: number;
}

/** Simple recent trend: last N sessions by completed date (FR-093). */
export async function getTrend(limit = 10): Promise<TrendPoint[]> {
  const sessions = await listSessions({ limit });
  return sessions
    .filter((s) => s.completed_at && s.final_score != null)
    .map((s) => ({
      date: s.completed_at!.slice(0, 10),
      score: Number(s.final_score ?? 0),
      reps: s.valid_reps,
    }))
    .reverse();
}
