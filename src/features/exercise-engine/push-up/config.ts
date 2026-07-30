import type { ExerciseConfig } from "../core/types";

export const PUSH_UP_ENGINE_KEY = "push-up";
export const PUSH_UP_SCORING_VERSION = "cam-v1";

export interface PushUpConfig {
  /** Elbow angle (shoulder-elbow-wrist) at or below which the rep is "down". */
  elbowDownMax: number;
  /** Elbow angle at or above which the body is "up" (ready/complete). */
  elbowUpMin: number;
  /** Max hip sag (normalized drop below the shoulder-ankle line). */
  hipSagMaxDrop: number;
  /** Max hip rise (normalized rise above the shoulder-ankle line). */
  hipRiseMaxRise: number;
  /** Maximum left/right elbow-angle difference when both arms are visible. */
  elbowSymmetryMaxDelta: number;
  debounceFrames: number;
  minConfidence: number;
  tempoFastMs: number;
  tempoSlowMs: number;
}

/** Defaults mirror supabase/migrations/0003_seed.sql (push-up config). */
export const PUSH_UP_DEFAULT_CONFIG: PushUpConfig = {
  elbowDownMax: 90,
  elbowUpMin: 160,
  hipSagMaxDrop: 0.12,
  hipRiseMaxRise: 0.12,
  elbowSymmetryMaxDelta: 18,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 400,
  tempoSlowMs: 3000,
};

export function parsePushUpConfig(config: ExerciseConfig): PushUpConfig {
  const c = config as Partial<PushUpConfig>;
  return { ...PUSH_UP_DEFAULT_CONFIG, ...c };
}
