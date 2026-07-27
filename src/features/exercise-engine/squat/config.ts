import type { ExerciseConfig } from "../core/types";

/** Squat engine version (stored in exercise_versions.scoring_version). */
export const SQUAT_ENGINE_KEY = "squat";
export const SQUAT_SCORING_VERSION = "cam-v1";

export interface SquatConfig {
  /** Knee angle (hip-knee-ankle) at or below which the rep is "deep enough" (bottom). */
  kneeBottomMax: number;
  /** Knee angle at or above which the body is considered standing (ready/complete). */
  kneeStandMin: number;
  /** Max torso lean (degrees from vertical) before "back bend" feedback. */
  hipBackLeanMax: number;
  /** Consecutive confirming frames required for a phase transition (anti-jitter). */
  debounceFrames: number;
  /** Minimum landmark visibility to consider tracking valid. */
  minConfidence: number;
  /** Rep tempo faster than this (ms) triggers tempo-fast. */
  tempoFastMs: number;
  /** Rep tempo slower than this (ms) triggers tempo-slow. */
  tempoSlowMs: number;
  /** Knee-inward ratio (knee offset / hip width) above which triggers knee-cavein. */
  kneeCaveinRatio: number;
}

/** Defaults mirror supabase/migrations/0003_seed.sql (squat config). */
export const SQUAT_DEFAULT_CONFIG: SquatConfig = {
  kneeBottomMax: 100,
  kneeStandMin: 160,
  hipBackLeanMax: 70,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 400,
  tempoSlowMs: 3000,
  kneeCaveinRatio: 0.55,
};

/** Parse a jsonb config into a typed SquatConfig, falling back to defaults. */
export function parseSquatConfig(config: ExerciseConfig): SquatConfig {
  const c = config as Partial<SquatConfig>;
  return { ...SQUAT_DEFAULT_CONFIG, ...c };
}
