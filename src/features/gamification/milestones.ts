import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { levelForXp, levelWithMilestoneGate, type LevelDefinition } from "./level";

type ServiceClient = SupabaseClient<Database>;

export type MilestoneAttemptInput = {
  sessionId: string;
  userId: string;
  milestoneLevel: number;
  validReps: number;
  invalidReps: number;
  finalScore: number;
  trackingLossCount: number;
  completedAt: string;
};

export type MilestoneAttemptResult = {
  attempted: boolean;
  success: boolean;
  xpAwarded: number;
  newLevel: number;
  message: string;
};

export type MilestoneRequirements = {
  targetReps: number;
  minimumScore: number;
  maxFormErrors: number;
  requireTrackingContinuity: boolean;
};

export function milestoneRequirementsMet(
  requirements: MilestoneRequirements,
  result: { validReps: number; finalScore: number; invalidReps: number; trackingLossCount: number },
): boolean {
  return result.validReps >= requirements.targetReps
    && result.finalScore >= requirements.minimumScore
    && result.invalidReps <= requirements.maxFormErrors
    && (!requirements.requireTrackingContinuity || result.trackingLossCount === 0);
}

export async function applyMilestoneAttempt(
  supabase: ServiceClient,
  input: MilestoneAttemptInput,
): Promise<MilestoneAttemptResult> {
  const [{ data: challenge }, { data: state }, { data: progress }] = await Promise.all([
    supabase.from("milestone_challenges").select("id, target_reps, minimum_score, max_form_errors, require_tracking_continuity, xp_reward").eq("milestone_level", input.milestoneLevel).eq("is_active", true).single(),
    supabase.from("user_milestones").select("status, attempt_count").eq("user_id", input.userId).eq("milestone_level", input.milestoneLevel).single(),
    supabase.from("user_progress").select("*").eq("user_id", input.userId).single(),
  ]);
  if (!challenge || state?.status !== "available" || !progress) {
    return { attempted: false, success: false, xpAwarded: 0, newLevel: progress?.current_level ?? 1, message: "Challenge belum tersedia." };
  }

  const success = milestoneRequirementsMet({
    targetReps: challenge.target_reps,
    minimumScore: Number(challenge.minimum_score),
    maxFormErrors: challenge.max_form_errors,
    requireTrackingContinuity: challenge.require_tracking_continuity,
  }, input);

  const { error: attemptError } = await supabase.from("milestone_attempts").insert({
    user_id: input.userId,
    milestone_level: input.milestoneLevel,
    session_id: input.sessionId,
    success,
    achieved_reps: input.validReps,
    achieved_score: input.finalScore,
    form_errors: input.invalidReps,
    tracking_loss_count: input.trackingLossCount,
    attempted_at: input.completedAt,
  });
  if (attemptError && /duplicate|unique/i.test(attemptError.message)) {
    return { attempted: false, success: false, xpAwarded: 0, newLevel: progress.current_level, message: "Hasil challenge sudah tersimpan." };
  }
  if (attemptError) throw new Error(`Gagal menyimpan percobaan milestone: ${attemptError.message}`);

  if (!success) {
    await supabase.from("user_milestones").update({ attempt_count: state.attempt_count + 1 }).eq("user_id", input.userId).eq("milestone_level", input.milestoneLevel);
    return { attempted: true, success: false, xpAwarded: 0, newLevel: progress.current_level, message: "Syarat challenge belum terpenuhi. Kamu dapat mencoba lagi." };
  }

  const { error: xpError } = await supabase.from("xp_events").insert({
    user_id: input.userId,
    source: "challenge",
    source_id: challenge.id,
    idempotency_key: `milestone:${input.milestoneLevel}`,
    xp_amount: challenge.xp_reward,
    description: `Challenge level ${input.milestoneLevel} selesai`,
  });
  const duplicateReward = !!xpError && /duplicate|unique/i.test(xpError.message);
  if (xpError && !duplicateReward) throw new Error(`Gagal mencatat reward milestone: ${xpError.message}`);
  const xpAwarded = duplicateReward ? 0 : challenge.xp_reward;
  const totalXp = progress.total_xp + xpAwarded;
  const maxUnlockedLevel = Math.max(progress.max_unlocked_level, input.milestoneLevel + 10);
  const { data: levelRows } = await supabase.from("level_definitions").select("level, name, min_total_xp").order("min_total_xp", { ascending: true });
  const levels: LevelDefinition[] = (levelRows ?? []).map((row) => ({ level: row.level, name: row.name, minTotalXp: row.min_total_xp }));
  const newLevel = levelWithMilestoneGate(levelForXp(totalXp, levels), maxUnlockedLevel);

  await Promise.all([
    supabase.from("user_milestones").update({
      status: "completed",
      attempt_count: state.attempt_count + 1,
      completed_at: input.completedAt,
      reward_claimed_at: input.completedAt,
    }).eq("user_id", input.userId).eq("milestone_level", input.milestoneLevel),
    supabase.from("user_progress").update({
      total_xp: totalXp,
      current_level: newLevel,
      max_unlocked_level: maxUnlockedLevel,
    }).eq("user_id", input.userId),
  ]);
  return { attempted: true, success: true, xpAwarded, newLevel, message: `Challenge level ${input.milestoneLevel} berhasil.` };
}
