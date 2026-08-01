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
  hipDownMin: 145,
  hipTopMax: 75,
  chestKneeMaxRatio: 0.72,
  backStraightMin: 150,
  kneeBentMin: 65,
  kneeBentMax: 115,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 500,
  tempoSlowMs: 4000,
};

export function parseSitUpConfig(config: ExerciseConfig): SitUpConfig {
  return { ...SIT_UP_DEFAULT_CONFIG, ...(config as Partial<SitUpConfig>) };
}
