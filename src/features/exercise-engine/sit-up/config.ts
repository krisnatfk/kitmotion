import type { ExerciseConfig } from "../core/types";

export const SIT_UP_ENGINE_KEY = "sit-up";
export const SIT_UP_SCORING_VERSION = "cam-v1";

export interface SitUpConfig {
  hipDownMin: number;
  hipTopMax: number;
  chestKneeMaxRatio: number;
  backStraightMin: number;
  kneeBentMin: number;
  kneeBentMax: number;
  debounceFrames: number;
  minConfidence: number;
  tempoFastMs: number;
  tempoSlowMs: number;
}

export const SIT_UP_DEFAULT_CONFIG: SitUpConfig = {
  hipDownMin: 120,
  hipTopMax: 90,
  chestKneeMaxRatio: 0.85,
  backStraightMin: 130,
  kneeBentMin: 45,
  kneeBentMax: 135,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 500,
  tempoSlowMs: 4000,
};

export function parseSitUpConfig(config: ExerciseConfig): SitUpConfig {
  return { ...SIT_UP_DEFAULT_CONFIG, ...(config as Partial<SitUpConfig>) };
}
