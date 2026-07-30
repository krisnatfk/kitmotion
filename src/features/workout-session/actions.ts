"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { computeFinalScore, SCORING_VERSION } from "@/features/scoring/scoring";
import { applySessionRewards } from "@/features/gamification/apply";
import { applyMilestoneAttempt, type MilestoneAttemptResult } from "@/features/gamification/milestones";
import type { Json } from "@/types/database.types";
import { getSessionCoachForUser } from "@/features/ai-coach/insights";
import type { SessionCoachInsight } from "@/features/ai-coach/types";
import { finalizeSessionSchema, type FinalizeSessionInput } from "./schema";

export type FinalizeResult = {
  sessionId: string;
  finalScore: number;
  grade: string;
  xpAwarded: number;
  newLevel: number;
  newBadges: { code: string; name: string }[];
  challengesCompleted: { code: string; title: string }[];
  milestone: MilestoneAttemptResult | null;
  aiCoach: SessionCoachInsight | null;
};

export type FinalizeError = { error: string };

/**
 * Finalize a workout session — server-authoritative and idempotent.
 *
 * The client never writes scores/XP. The server:
 *   1. authenticates the user,
 *   2. validates the payload (Zod),
 *   3. resolves the exercise + active version (verifies engine_key),
 *   4. short-circuits if (user_id, client_session_id) already exists (idempotent),
 *   5. recomputes the final score from the clamped sub-scores,
 *   6. inserts the session + repetitions + feedback (service role),
 *   7. applies XP / level / badges / challenges (service role, idempotent).
 */
export async function finalizeSession(
  input: FinalizeSessionInput,
): Promise<FinalizeResult | FinalizeError> {
  const parsed = finalizeSessionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.length ? ` (${issue.path.join(".")})` : "";
    return { error: `Data sesi tidak valid${field}. Silakan coba simpan kembali.` };
  }
  const data = parsed.data;

  // Cross-check rep counts (server validation, FR-066).
  if (data.totalReps !== data.repetitions.length) {
    return { error: "Jumlah repetisi tidak konsisten." };
  }
  if (data.validReps + data.invalidReps !== data.totalReps) {
    return { error: "Hitungan repetisi valid/invalid tidak konsisten." };
  }
  for (const [index, repetition] of data.repetitions.entries()) {
    if (repetition.repNumber !== index + 1) {
      return { error: "Urutan repetisi tidak konsisten." };
    }
    if (repetition.completedOffsetMs < repetition.startedOffsetMs) {
      return { error: `Waktu repetisi ${repetition.repNumber} tidak valid.` };
    }
  }
  for (const feedback of data.feedback) {
    if (feedback.firstOffsetMs != null && feedback.lastOffsetMs != null && feedback.lastOffsetMs < feedback.firstOffsetMs) {
      return { error: "Rentang waktu feedback tidak valid." };
    }
  }
  // sensor_source is always 'none' in this phase (no IoT).
  if (data.sensorSummary && data.sensorSummary.source !== "none") {
    return { error: "Sumber sensor tidak diizinkan pada fase ini." };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Belum masuk." };

  // Resolve exercise + active version.
  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, slug")
    .eq("slug", data.exerciseSlug)
    .eq("is_active", true)
    .single();
  if (!exercise) return { error: "Latihan tidak ditemukan." };

  const { data: version } = await supabase
    .from("exercise_versions")
    .select("id, engine_key, scoring_version")
    .eq("exercise_id", exercise.id)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (!version) return { error: "Versi latihan aktif tidak ditemukan." };

  const admin = getSupabaseServiceRole();

  if (data.milestoneLevel != null) {
    const [{ data: challenge }, { data: milestoneState }] = await Promise.all([
      admin.from("milestone_challenges").select("exercise_id").eq("milestone_level", data.milestoneLevel).eq("is_active", true).single(),
      admin.from("user_milestones").select("status").eq("user_id", user.id).eq("milestone_level", data.milestoneLevel).single(),
    ]);
    if (!challenge || challenge.exercise_id !== exercise.id || milestoneState?.status !== "available") {
      return { error: "Challenge milestone tidak tersedia untuk sesi ini." };
    }
  }

  // Idempotency: if a session with this client_session_id already exists,
  // return its existing result instead of duplicating (FR-066).
  const { data: existing } = await admin
    .from("workout_sessions")
    .select("id, final_score, grade")
    .eq("user_id", user.id)
    .eq("client_session_id", data.clientSessionId)
    .single();
  if (existing) {
    const { data: progress } = await admin
      .from("user_progress")
      .select("current_level")
      .eq("user_id", user.id)
      .single();
    const aiCoach = await getSessionCoachForUser(existing.id, user.id);
    return {
      sessionId: existing.id,
      finalScore: Number(existing.final_score ?? 0),
      grade: existing.grade ?? "E",
      xpAwarded: 0,
      newLevel: progress?.current_level ?? 1,
      newBadges: [],
      challengesCompleted: [],
      milestone: null,
      aiCoach,
    };
  }

  // Server-authoritative score (clamps + weights, FR-072).
  const score = computeFinalScore(data.subScores);
  const completedAt = new Date().toISOString();

  // Insert the session (service role bypasses RLS; client cannot write here).
  const { data: sessionRow, error: sessionErr } = await admin
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      exercise_id: exercise.id,
      exercise_version_id: version.id,
      client_session_id: data.clientSessionId,
      status: "completed",
      started_at: new Date(Date.now() - data.durationSeconds * 1000).toISOString(),
      completed_at: completedAt,
      duration_seconds: data.durationSeconds,
      target_reps: data.targetReps,
      target_seconds: data.targetSeconds,
      total_reps: data.totalReps,
      valid_reps: data.validReps,
      invalid_reps: data.invalidReps,
      form_score: score.formScore,
      range_score: score.rangeScore,
      consistency_score: score.consistencyScore,
      tempo_score: score.tempoScore,
      stability_score: score.stabilityScore,
      final_score: score.finalScore,
      grade: score.grade,
      used_camera: true,
      sensor_source: "none",
      sensor_summary: null,
      app_version: null,
      scoring_version: version.scoring_version ?? SCORING_VERSION,
      metadata: {
        engine_key: version.engine_key,
        tracking_loss_count: data.trackingLossCount,
        milestone_level: data.milestoneLevel,
      },
    })
    .select("id")
    .single();

  if (sessionErr || !sessionRow) {
    return { error: `Gagal menyimpan sesi: ${sessionErr?.message ?? "unknown"}` };
  }
  const sessionId = sessionRow.id;

  const removeIncompleteSession = async () => {
    await admin.from("workout_sessions").delete().eq("id", sessionId);
  };

  // Insert repetitions.
  if (data.repetitions.length > 0) {
    const { error: repetitionsError } = await admin.from("workout_repetitions").insert(
      data.repetitions.map((r) => ({
        session_id: sessionId,
        rep_number: r.repNumber,
        started_offset_ms: r.startedOffsetMs,
        completed_offset_ms: r.completedOffsetMs,
        is_valid: r.isValid,
        form_score: r.formScore,
        range_score: r.rangeScore,
        tempo_score: r.tempoScore,
        stability_score: r.stabilityScore,
        metrics: r.metrics as Json,
        issue_codes: r.issueCodes,
      })),
    );
    if (repetitionsError) {
      await removeIncompleteSession();
      return { error: "Gagal menyimpan detail repetisi. Silakan coba lagi." };
    }
  }

  // Insert feedback summary.
  if (data.feedback.length > 0) {
    const { error: feedbackError } = await admin.from("session_feedback").insert(
      data.feedback.map((f) => ({
        session_id: sessionId,
        repetition_id: null,
        code: f.code,
        severity: f.severity,
        message: f.message,
        occurrence_count: f.occurrenceCount,
        first_offset_ms: f.firstOffsetMs,
        last_offset_ms: f.lastOffsetMs,
      })),
    );
    if (feedbackError) {
      await removeIncompleteSession();
      return { error: "Gagal menyimpan feedback latihan. Silakan coba lagi." };
    }
  }

  // Rewards (XP / level / badges / challenges) — idempotent.
  const rewards = await applySessionRewards(admin, {
    sessionId,
    userId: user.id,
    exerciseSlug: data.exerciseSlug,
    finalScore: score.finalScore,
    validReps: data.validReps,
    durationSeconds: data.durationSeconds,
    targetReps: data.targetReps,
    targetSeconds: data.targetSeconds,
    startedAt: null,
    completedAt,
  });

  const milestone = data.milestoneLevel == null ? null : await applyMilestoneAttempt(admin, {
    sessionId,
    userId: user.id,
    milestoneLevel: data.milestoneLevel,
    validReps: data.validReps,
    invalidReps: data.invalidReps,
    finalScore: score.finalScore,
    trackingLossCount: data.trackingLossCount,
    completedAt,
  });

  revalidatePath("/history");
  revalidatePath("/dashboard");

  const aiCoach = await getSessionCoachForUser(sessionId, user.id);

  return {
    sessionId,
    finalScore: score.finalScore,
    grade: score.grade,
    xpAwarded: rewards.xpAwarded + (milestone?.xpAwarded ?? 0),
    newLevel: milestone?.newLevel ?? rewards.newLevel,
    newBadges: rewards.newBadges,
    challengesCompleted: rewards.challengesCompleted,
    milestone,
    aiCoach,
  };
}
