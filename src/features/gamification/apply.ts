import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { computeWorkoutXp, workoutXpIdempotencyKey } from "./xp";
import { levelForXp, levelWithMilestoneGate, pendingMilestoneLevel, type LevelDefinition } from "./level";

type ServiceClient = SupabaseClient<Database>;

export interface SessionRewardInput {
  sessionId: string;
  userId: string;
  exerciseSlug: string;
  finalScore: number;
  validReps: number;
  durationSeconds: number;
  validDurationSeconds: number;
  targetReps: number | null;
  targetSeconds: number | null;
  startedAt: string | null;
  completedAt: string;
}

export interface RewardResult {
  xpAwarded: number;
  newLevel: number;
  newBadges: { code: string; name: string }[];
  challengesCompleted: { code: string; title: string }[];
}

/**
 * Apply all post-session rewards server-side, idempotently.
 *
 * - XP: inserted via xp_events with idempotency_key `workout:{sessionId}`. The
 *   unique constraint guarantees one award per session even on replay.
 * - Level: recomputed from the new total XP.
 * - Badges: criteria evaluated against the updated progress; awarded via
 *   user_badges unique(user_id, badge_id).
 * - Challenges: matching criteria progress updated; XP on completion via
 *   idempotency_key `challenge:{challengeId}`.
 *
 * All writes use the service-role client (bypass RLS) — never the client.
 */
export async function applySessionRewards(
  supabase: ServiceClient,
  input: SessionRewardInput,
): Promise<RewardResult> {
  const targetMet = isTargetMet(input);
  const xp = computeWorkoutXp(input.finalScore, targetMet);

  // 1. Insert XP (idempotent). If it already exists (replay), the unique
  //    constraint rejects the insert and we treat the session as already rewarded.
  const { error: xpError } = await supabase.from("xp_events").insert({
    user_id: input.userId,
    source: "workout",
    source_id: input.sessionId,
    idempotency_key: workoutXpIdempotencyKey(input.sessionId),
    xp_amount: xp.total,
    description: `Latihan ${input.exerciseSlug} — skor ${input.finalScore}`,
  });

  const alreadyRewarded = !!xpError && /duplicate|unique/i.test(xpError.message);
  if (xpError && !alreadyRewarded) {
    throw new Error(`Gagal mencatat XP: ${xpError.message}`);
  }

  // 2. Read current progress (or create it).
  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", input.userId)
    .single();

  const prev = progress ?? {
    user_id: input.userId,
    total_xp: 0,
    current_level: 1,
    max_unlocked_level: 10,
    total_sessions: 0,
    total_valid_reps: 0,
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
  };

  // A replay must be a true no-op. Without this guard, a transient client
  // retry could increment sessions, repetitions, streaks, and challenges even
  // though the workout XP event was correctly rejected as a duplicate.
  if (alreadyRewarded) {
    return {
      xpAwarded: 0,
      newLevel: prev.current_level,
      newBadges: [],
      challengesCompleted: [],
    };
  }

  // Streak: increment if activity is on a new day vs last_activity_date.
  const today = input.completedAt.slice(0, 10);
  const lastDate = prev.last_activity_date ? String(prev.last_activity_date).slice(0, 10) : null;
  let currentStreak = prev.current_streak;
  if (lastDate !== today) {
    const yesterday = dayBefore(today);
    currentStreak = lastDate === yesterday ? prev.current_streak + 1 : 1;
  }

  const newTotalXp = prev.total_xp + xp.total;
  const newTotalSessions = prev.total_sessions + 1;
  const newTotalValidReps = prev.total_valid_reps + input.validReps;
  const newLongestStreak = Math.max(prev.longest_streak, currentStreak);

  // Fetch level definitions to recompute level.
  const { data: levelRows } = await supabase
    .from("level_definitions")
    .select("level, name, min_total_xp")
    .order("min_total_xp", { ascending: true });
  const levelDefs: LevelDefinition[] = (levelRows ?? []).map((r) => ({
    level: r.level,
    name: r.name,
    minTotalXp: r.min_total_xp,
  }));
  const maxUnlockedLevel = prev.max_unlocked_level ?? 10;
  const earnedLevel = levelForXp(newTotalXp, levelDefs);
  const newLevel = levelWithMilestoneGate(earnedLevel, maxUnlockedLevel);

  const { error: upError } = await supabase
    .from("user_progress")
    .upsert({
      user_id: input.userId,
      total_xp: newTotalXp,
      current_level: newLevel,
      max_unlocked_level: maxUnlockedLevel,
      total_sessions: newTotalSessions,
      total_valid_reps: newTotalValidReps,
      current_streak: currentStreak,
      longest_streak: newLongestStreak,
      last_activity_date: today,
    });

  if (upError) throw new Error(`Gagal memperbarui progres: ${upError.message}`);

  // 3. Badges: evaluate active badges against the new progress.
  const badgeRewards = await awardBadges(supabase, input.userId, {
    totalSessions: newTotalSessions,
    totalValidReps: newTotalValidReps,
    longestStreak: newLongestStreak,
    maxScore: input.finalScore,
  });

  // 4. Challenges: update progress for matching challenges.
  const challengeRewards = await updateChallenges(supabase, input);

  // Badge and challenge rewards are separate idempotent XP events. Fold them
  // back into the progress aggregate so the dashboard and level update now,
  // not one workout later.
  const bonusRewardXp = badgeRewards.xpAwarded + challengeRewards.xpAwarded;
  const finalTotalXp = newTotalXp + bonusRewardXp;
  const finalEarnedLevel = levelForXp(finalTotalXp, levelDefs);
  const finalLevel = levelWithMilestoneGate(finalEarnedLevel, maxUnlockedLevel);
  if (bonusRewardXp > 0) {
    const { error: rewardProgressError } = await supabase.from("user_progress").upsert({
      user_id: input.userId,
      total_xp: finalTotalXp,
      current_level: finalLevel,
      max_unlocked_level: maxUnlockedLevel,
      total_sessions: newTotalSessions,
      total_valid_reps: newTotalValidReps,
      current_streak: currentStreak,
      longest_streak: newLongestStreak,
      last_activity_date: today,
    });
    if (rewardProgressError) throw new Error(`Gagal menyinkronkan reward: ${rewardProgressError.message}`);
  }

  const pendingMilestone = pendingMilestoneLevel(finalEarnedLevel, maxUnlockedLevel);
  if (pendingMilestone != null) {
    await supabase.from("user_milestones").upsert({
      user_id: input.userId,
      milestone_level: pendingMilestone,
      status: "available",
    }, { onConflict: "user_id,milestone_level", ignoreDuplicates: true });
  }

  return {
    xpAwarded: xp.total + bonusRewardXp,
    newLevel: finalLevel,
    newBadges: badgeRewards.badges,
    challengesCompleted: challengeRewards.challenges,
  };
}

function isTargetMet(input: SessionRewardInput): boolean {
  if (input.targetReps != null && input.targetReps > 0) {
    return input.validReps >= input.targetReps;
  }
  if (input.targetSeconds != null && input.targetSeconds > 0) {
    return input.validDurationSeconds >= input.targetSeconds;
  }
  return false;
}

async function awardBadges(
  supabase: ServiceClient,
  userId: string,
  stats: { totalSessions: number; totalValidReps: number; longestStreak: number; maxScore: number },
): Promise<{ badges: { code: string; name: string }[]; xpAwarded: number }> {
  const { data: existingRows } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);
  const existingBadgeIds = new Set((existingRows ?? []).map((row) => row.badge_id));

  const { data: badges } = await supabase
    .from("badges")
    .select("id, code, name, criteria, xp_reward")
    .eq("is_active", true);

  if (!badges || badges.length === 0) return { badges: [], xpAwarded: 0 };

  const awarded: { code: string; name: string }[] = [];
  let xpAwarded = 0;
  for (const badge of badges) {
    if (!meetsCriteria(badge.criteria, stats)) continue;
    if (existingBadgeIds.has(badge.id)) continue;
    const { error } = await supabase.from("user_badges").insert({
      user_id: userId,
      badge_id: badge.id,
      awarded_for_id: null,
    });
    if (error) continue;

    const badgeXp = badge.xp_reward ?? 0;
    const { error: xpError } = await supabase.from("xp_events").insert({
      user_id: userId,
      source: "badge",
      source_id: badge.id,
      idempotency_key: `badge:${badge.id}`,
      xp_amount: badgeXp,
      description: `Badge diraih: ${badge.name}`,
    });
    const xpWasRecorded = !xpError;
    awarded.push({ code: badge.code, name: badge.name });
    existingBadgeIds.add(badge.id);
    if (xpWasRecorded) xpAwarded += badgeXp;
  }
  return { badges: awarded, xpAwarded };
}

type BadgeCriteria = { type?: string; target?: number };

function meetsCriteria(criteria: unknown, stats: { totalSessions: number; totalValidReps: number; longestStreak: number; maxScore: number }): boolean {
  const c = (criteria ?? {}) as BadgeCriteria;
  switch (c.type) {
    case "total_sessions":
      return stats.totalSessions >= (c.target ?? Infinity);
    case "max_score":
      return stats.maxScore >= (c.target ?? Infinity);
    case "total_valid_reps":
      return stats.totalValidReps >= (c.target ?? Infinity);
    case "longest_streak":
      return stats.longestStreak >= (c.target ?? Infinity);
    default:
      return false;
  }
}

async function updateChallenges(
  supabase: ServiceClient,
  input: SessionRewardInput,
): Promise<{ challenges: { code: string; title: string }[]; xpAwarded: number }> {
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, code, title, criteria, xp_reward")
    .eq("is_active", true)
    .lte("starts_at", input.completedAt)
    .gte("ends_at", input.completedAt);

  if (!challenges || challenges.length === 0) return { challenges: [], xpAwarded: 0 };

  const completed: { code: string; title: string }[] = [];
  let xpAwarded = 0;
  for (const ch of challenges) {
    const c = (ch.criteria ?? {}) as { type?: string; exercise_slug?: string; target?: number };
    if (c.type !== "session_reps") continue;
    if (c.exercise_slug && c.exercise_slug !== input.exerciseSlug) continue;

    const target = c.target ?? 0;
    const { data: existing } = await supabase
      .from("challenge_progress")
      .select("id, progress_value, completed_at, reward_claimed_at")
      .eq("challenge_id", ch.id)
      .eq("user_id", input.userId)
      .single();

    const prevProgress = Number(existing?.progress_value ?? 0);
    const newProgress = prevProgress + input.validReps;
    const nowCompleted = newProgress >= target;

    const { error } = await supabase.from("challenge_progress").upsert(
      {
        challenge_id: ch.id,
        user_id: input.userId,
        progress_value: newProgress,
        target_value: target,
        completed_at: nowCompleted ? input.completedAt : existing?.completed_at ?? null,
        reward_claimed_at: existing?.reward_claimed_at ?? null,
      },
      { onConflict: "challenge_id,user_id", ignoreDuplicates: false },
    );
    if (error) continue;

    if (nowCompleted && !existing?.reward_claimed_at) {
      const { error: rewardError } = await supabase.from("xp_events").insert({
        user_id: input.userId,
        source: "challenge",
        source_id: ch.id,
        idempotency_key: `challenge:${ch.id}`,
        xp_amount: ch.xp_reward ?? 0,
        description: `Challenge selesai: ${ch.title}`,
      });
      const duplicateReward = !!rewardError && /duplicate|unique/i.test(rewardError.message);
      if (!rewardError || duplicateReward) {
        await supabase
          .from("challenge_progress")
          .update({ reward_claimed_at: input.completedAt })
          .eq("challenge_id", ch.id)
          .eq("user_id", input.userId);
        completed.push({ code: ch.code, title: ch.title });
        if (!duplicateReward) xpAwarded += ch.xp_reward ?? 0;
      }
    }
  }
  return { challenges: completed, xpAwarded };
}

/** Previous calendar day (YYYY-MM-DD). Naive; sufficient for streak heuristics. */
function dayBefore(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}
