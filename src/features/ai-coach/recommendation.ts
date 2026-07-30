import type { DailyRecommendationContent } from "./schemas";

export type RecommendationExercise = {
  slug: string;
  name: string;
};

export type RecommendationHistory = {
  exerciseSlug: string;
  score: number;
};

export function eligibleDailyExercises<T extends RecommendationExercise>(
  exercises: T[],
  history: RecommendationHistory[],
  previousRecommendationSlug: string | null,
): T[] {
  if (exercises.length <= 1) return exercises;
  const excluded = new Set<string>();
  const latestExercise = history[0]?.exerciseSlug;
  if (latestExercise && exercises.some((item) => item.slug === latestExercise)) {
    excluded.add(latestExercise);
  }
  if (previousRecommendationSlug && exercises.some((item) => item.slug === previousRecommendationSlug)) {
    const remaining = exercises.filter((item) => !excluded.has(item.slug) && item.slug !== previousRecommendationSlug);
    if (remaining.length > 0) excluded.add(previousRecommendationSlug);
  }
  const eligible = exercises.filter((item) => !excluded.has(item.slug));
  return eligible.length > 0 ? eligible : exercises;
}

export function fallbackDailyRecommendation<T extends RecommendationExercise>(
  exercises: T[],
  history: RecommendationHistory[],
  previousRecommendationSlug: string | null,
  rotationSeed: string,
): DailyRecommendationContent {
  const eligible = eligibleDailyExercises(exercises, history, previousRecommendationSlug);
  const stats = new Map<string, { count: number; totalScore: number; lastSeenIndex: number }>();
  history.forEach((session, index) => {
    const current = stats.get(session.exerciseSlug) ?? { count: 0, totalScore: 0, lastSeenIndex: index };
    current.count += 1;
    current.totalScore += session.score;
    current.lastSeenIndex = Math.min(current.lastSeenIndex, index);
    stats.set(session.exerciseSlug, current);
  });

  const untrained = eligible.filter((exercise) => !stats.has(exercise.slug));
  const selected = untrained.length > 0
    ? untrained[seedIndex(rotationSeed, untrained.length)]!
    : [...eligible].sort((a, b) => {
        const aStats = stats.get(a.slug)!;
        const bStats = stats.get(b.slug)!;
        if (aStats.count !== bStats.count) return aStats.count - bStats.count;
        if (aStats.lastSeenIndex !== bStats.lastSeenIndex) return bStats.lastSeenIndex - aStats.lastSeenIndex;
        return aStats.totalScore / aStats.count - bStats.totalScore / bStats.count;
      })[0]!;

  return {
    exerciseSlug: selected.slug,
    headline: `${selected.name} untuk hari ini`,
    reason: untrained.some((item) => item.slug === selected.slug)
      ? "Gerakan ini belum muncul pada riwayat terbarumu dan membantu menjaga latihan tetap seimbang."
      : "Gerakan ini dipilih untuk menyeimbangkan frekuensi latihan dan memberi jeda pada gerakan terakhirmu.",
    focus: "Utamakan rentang gerak yang lengkap dan tempo yang stabil.",
  };
}

function seedIndex(seed: string, length: number): number {
  let value = 0;
  for (const character of seed) value = (value * 31 + character.charCodeAt(0)) >>> 0;
  return value % length;
}
