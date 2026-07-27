import type { ExerciseConfig } from "../core/types";

export const JUMPING_JACK_ENGINE_KEY = "jumping-jack";
export const JUMPING_JACK_SCORING_VERSION = "cam-v1";

export interface JumpingJackConfig {
  /** Wrist-distance / shoulder-width ratio at which arms count as "open". */
  armOpenMinRatio: number;
  /** Ankle-distance / hip-width ratio at which legs count as "open". */
  legOpenMinRatio: number;
  /** Max delta between left/right arm heights (normalized) before "asymmetry". */
  symmetryMaxDelta: number;
  debounceFrames: number;
  minConfidence: number;
  tempoFastMs: number;
  tempoSlowMs: number;
}

/** Defaults mirror supabase/migrations/0003_seed.sql (jumping-jack config). */
export const JUMPING_JACK_DEFAULT_CONFIG: JumpingJackConfig = {
  armOpenMinRatio: 1.5,
  legOpenMinRatio: 1.25,
  symmetryMaxDelta: 0.15,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 350,
  tempoSlowMs: 2500,
};

export function parseJumpingJackConfig(config: ExerciseConfig): JumpingJackConfig {
  const c = config as Partial<JumpingJackConfig>;
  return { ...JUMPING_JACK_DEFAULT_CONFIG, ...c };
}
