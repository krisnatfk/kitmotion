import type { ExerciseConfig } from "../core/types";

export const CHINNING_UP_ENGINE_KEY = "chinning-up";
export const CHINNING_UP_SCORING_VERSION = "cam-v1";

export interface ChinningUpConfig {
  elbowHoldMax: number;
  chinAboveHandsMarginRatio: number;
  elbowSymmetryMaxDelta: number;
  bodySwingMaxRatio: number;
  minConfidence: number;
  maximumFrameGapMs: number;
}

export const CHINNING_UP_DEFAULT_CONFIG: ChinningUpConfig = {
  elbowHoldMax: 120,
  chinAboveHandsMarginRatio: -0.05,
  elbowSymmetryMaxDelta: 30,
  bodySwingMaxRatio: 0.35,
  minConfidence: 0.5,
  maximumFrameGapMs: 250,
};

export function parseChinningUpConfig(config: ExerciseConfig): ChinningUpConfig {
  return { ...CHINNING_UP_DEFAULT_CONFIG, ...(config as Partial<ChinningUpConfig>) };
}
