/** XP computation (prd.md §13). Camera-only — no device bonus. */
export const XP_BASE = 20;
export const XP_TARGET_BONUS = 15;

export interface WorkoutXpBreakdown {
  base: number;
  scoreBonus: number;
  targetBonus: number;
  total: number;
}

export function computeWorkoutXp(finalScore: number, targetMet: boolean): WorkoutXpBreakdown {
  const clamped = Math.max(0, Math.min(100, finalScore));
  const base = XP_BASE;
  const scoreBonus = Math.floor(clamped / 10) * 2;
  const targetBonus = targetMet ? XP_TARGET_BONUS : 0;
  const total = base + scoreBonus + targetBonus;
  return { base, scoreBonus, targetBonus, total };
}

/** Idempotency key for workout XP — one award per session, ever. */
export function workoutXpIdempotencyKey(sessionId: string): string {
  return `workout:${sessionId}`;
}
