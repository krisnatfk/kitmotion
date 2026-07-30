import type { SupabaseClient } from "@supabase/supabase-js";
import { levelForXp, levelWithMilestoneGate, pendingMilestoneLevel, type LevelDefinition } from "@/features/gamification/level";
import type { Database } from "@/types/database.types";

type ServiceClient = SupabaseClient<Database>;

export async function applyRunRewards(
  supabase: ServiceClient,
  input: {
    runId: string;
    userId: string;
    distanceMeters: number;
    durationSeconds: number;
    completedAt: string;
  },
): Promise<{ xpAwarded: number; newLevel: number }> {
  const distanceKilometers = input.distanceMeters / 1000;
  const xp = Math.min(250, 10 + Math.round(distanceKilometers * 20) + Math.floor(input.durationSeconds / 600) * 5);
  const { error: xpError } = await supabase.from("xp_events").insert({
    user_id: input.userId,
    source: "run",
    source_id: input.runId,
    idempotency_key: `run:${input.runId}`,
    xp_amount: xp,
    description: `Lari ${distanceKilometers.toFixed(2)} km`,
  });

  const duplicate = !!xpError && /duplicate|unique/i.test(xpError.message);
  if (xpError && !duplicate) throw new Error(xpError.message);

  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", input.userId)
    .single();
  const previous = progress ?? {
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
  if (duplicate) return { xpAwarded: 0, newLevel: previous.current_level };

  const today = input.completedAt.slice(0, 10);
  const lastDate = previous.last_activity_date ? String(previous.last_activity_date).slice(0, 10) : null;
  const currentStreak = lastDate === today
    ? previous.current_streak
    : lastDate === previousDate(today)
      ? previous.current_streak + 1
      : 1;
  const totalXp = previous.total_xp + xp;

  const { data: levelRows } = await supabase
    .from("level_definitions")
    .select("level, name, min_total_xp")
    .order("min_total_xp", { ascending: true });
  const levels: LevelDefinition[] = (levelRows ?? []).map((row) => ({
    level: row.level,
    name: row.name,
    minTotalXp: row.min_total_xp,
  }));
  const maxUnlockedLevel = previous.max_unlocked_level ?? 10;
  const earnedLevel = levelForXp(totalXp, levels);
  const newLevel = levelWithMilestoneGate(earnedLevel, maxUnlockedLevel);

  const { error: progressError } = await supabase.from("user_progress").upsert({
    user_id: input.userId,
    total_xp: totalXp,
    current_level: newLevel,
    max_unlocked_level: maxUnlockedLevel,
    total_sessions: previous.total_sessions + 1,
    total_valid_reps: previous.total_valid_reps,
    current_streak: currentStreak,
    longest_streak: Math.max(previous.longest_streak, currentStreak),
    last_activity_date: today,
  });
  if (progressError) throw new Error(progressError.message);

  const pendingMilestone = pendingMilestoneLevel(earnedLevel, maxUnlockedLevel);
  if (pendingMilestone != null) {
    await supabase.from("user_milestones").upsert({ user_id: input.userId, milestone_level: pendingMilestone, status: "available" }, { onConflict: "user_id,milestone_level", ignoreDuplicates: true });
  }

  return { xpAwarded: xp, newLevel };
}

function previousDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return "";
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}
