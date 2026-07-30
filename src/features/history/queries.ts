import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
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

async function currentHistoryActor() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, admin: getSupabaseServiceRole() };
}

export async function listSessions(opts?: {
  exerciseSlug?: string;
  limit?: number;
}): Promise<SessionListItem[]> {
  const actor = await currentHistoryActor();
  if (!actor) return [];

  let query = actor.admin
    .from("workout_sessions")
    .select("*, exercises!inner(name, slug)")
    .eq("user_id", actor.user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  if (opts?.exerciseSlug) {
    query = query.eq("exercises.slug", opts.exerciseSlug);
  }
  const { data, error } = await query.limit(opts?.limit ?? 50);
  if (error) throw new Error("Riwayat latihan gagal dimuat.");
  return (data ?? []) as SessionListItem[];
}

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const actor = await currentHistoryActor();
  if (!actor) return null;

  const { data: session, error: sessionError } = await actor.admin
    .from("workout_sessions")
    .select("*, exercises!inner(name, slug)")
    .eq("id", sessionId)
    .eq("user_id", actor.user.id)
    .eq("status", "completed")
    .single();
  if (sessionError || !session) return null;

  const [{ data: reps, error: repsError }, { data: feedback, error: feedbackError }] = await Promise.all([
    actor.admin
      .from("workout_repetitions")
      .select("*")
      .eq("session_id", sessionId)
      .order("rep_number", { ascending: true }),
    actor.admin
      .from("session_feedback")
      .select("*")
      .eq("session_id", sessionId)
      .order("occurrence_count", { ascending: false }),
  ]);
  if (repsError || feedbackError) throw new Error("Detail riwayat latihan gagal dimuat.");

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
