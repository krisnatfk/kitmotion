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
  elbowHangMin: 140,
  elbowTopMax: 120,
  chinAboveHandsMarginRatio: -0.05,
  handsAboveShoulderMinRatio: 0.30,
  elbowSymmetryMaxDelta: 30,
  bodySwingMaxRatio: 0.35,
  debounceFrames: 3,
  minConfidence: 0.5,
  tempoFastMs: 500,
  tempoSlowMs: 5000,
};

export function parsePullUpConfig(config: ExerciseConfig): PullUpConfig {
  return { ...PULL_UP_DEFAULT_CONFIG, ...(config as Partial<PullUpConfig>) };
}
