import type { ExerciseConfig } from "../core/types";

export const PULL_UP_ENGINE_KEY = "pull-up";
export const PULL_UP_SCORING_VERSION = "cam-v1";

export interface PullUpConfig {
  elbowHangMin: number;
  elbowTopMax: number;
  chinAboveHandsMarginRatio: number;
  handsAboveShoulderMinRatio: number;
  elbowSymmetryMaxDelta: number;
  bodySwingMaxRatio: number;
  debounceFrames: number;
  minConfidence: number;
  tempoFastMs: number;
  tempoSlowMs: number;
}

export const PULL_UP_DEFAULT_CONFIG: PullUpConfig = {
  elbowHangMin: 155,
  elbowTopMax: 105,
  chinAboveHandsMarginRatio: 0,
  handsAboveShoulderMinRatio: 0.45,
  elbowSymmetryMaxDelta: 20,
  bodySwingMaxRatio: 0.28,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 500,
  tempoSlowMs: 5000,
};

export function parsePullUpConfig(config: ExerciseConfig): PullUpConfig {
  return { ...PULL_UP_DEFAULT_CONFIG, ...(config as Partial<PullUpConfig>) };
}
