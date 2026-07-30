import type { ExerciseConfig } from "../core/types";

export const JUMPING_JACK_ENGINE_KEY = "jumping-jack";
export const JUMPING_JACK_SCORING_VERSION = "cam-v3";

export interface JumpingJackConfig {
  /** Minimum hip-shoulder-wrist angle for both arms in the overhead position. */
  armOpenMinAngle: number;
  /** Maximum hip-shoulder-wrist angle for both arms in the closed position. */
  armClosedMaxAngle: number;
  /** Wrist-distance / shoulder-width ratio at which arms count as "open". */
  armOpenMinRatio: number;
  /** Minimum wrist height above shoulders, normalized to torso height. */
  armHeightMinRatio: number;
  /** Ankle-distance / hip-width ratio at which legs count as "open". */
  legOpenMinRatio: number;
  /** Maximum ankle-distance / hip-width ratio in the closed position. */
  legClosedMaxRatio: number;
  /** Max delta between left/right arm heights (normalized) before "asymmetry". */
  symmetryMaxDelta: number;
  /** Maximum normalized arm/leg phase mismatch before coordination feedback. */
  coordinationMaxDelta: number;
  debounceFrames: number;
  minConfidence: number;
  tempoFastMs: number;
  tempoSlowMs: number;
}

/** Defaults mirror the latest active jumping-jack scoring migration. */
export const JUMPING_JACK_DEFAULT_CONFIG: JumpingJackConfig = {
  armOpenMinAngle: 150,
  armClosedMaxAngle: 35,
  armOpenMinRatio: 1.5,
  armHeightMinRatio: 0.3,
  legOpenMinRatio: 1.25,
  legClosedMaxRatio: 1.1,
  symmetryMaxDelta: 0.15,
  coordinationMaxDelta: 0.35,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 350,
  tempoSlowMs: 2500,
};

export function parseJumpingJackConfig(config: ExerciseConfig): JumpingJackConfig {
  const c = config as Partial<JumpingJackConfig>;
  return { ...JUMPING_JACK_DEFAULT_CONFIG, ...c };
}
