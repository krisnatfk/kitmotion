import type { ExerciseConfig } from "../core/types";

export const PUSH_UP_ENGINE_KEY = "push-up";
export const PUSH_UP_SCORING_VERSION = "cam-v6";

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
  /** Front-view average elbow angle required at the bottom. */
  frontElbowDownMax: number;
  /** Front-view maximum angle allowed for either elbow at the bottom. */
  frontElbowIndividualDownMax: number;
  /** Front-view average elbow angle required at the top. */
  frontElbowUpMin: number;
  /** Front-view left/right elbow tolerance. */
  frontElbowSymmetryMaxDelta: number;
  /** Minimum horizontal component of the shoulder-to-ankle body line (0..1). */
  bodyHorizontalMinRatio: number;
  /** Minimum hip-knee-ankle angle for a standard side-view plank. */
  kneeStraightMin: number;
  debounceFrames: number;
  /** Consecutive missing frames tolerated before an incomplete rep is discarded. */
  trackingGraceFrames: number;
  minConfidence: number;
  tempoFastMs: number;
  tempoSlowMs: number;
}

/** Defaults mirror the latest active push-up scoring migration. */
export const PUSH_UP_DEFAULT_CONFIG: PushUpConfig = {
  elbowDownMax: 90,
  elbowUpMin: 160,
  hipSagMaxDrop: 0.12,
  hipRiseMaxRise: 0.12,
  elbowSymmetryMaxDelta: 18,
  frontElbowDownMax: 105,
  frontElbowIndividualDownMax: 115,
  frontElbowUpMin: 150,
  frontElbowSymmetryMaxDelta: 30,
  bodyHorizontalMinRatio: 0.65,
  kneeStraightMin: 145,
  debounceFrames: 3,
  trackingGraceFrames: 8,
  minConfidence: 0.5,
  tempoFastMs: 400,
  tempoSlowMs: 3000,
};

export function parsePushUpConfig(config: ExerciseConfig): PushUpConfig {
  const c = config as Partial<PushUpConfig>;
  return { ...PUSH_UP_DEFAULT_CONFIG, ...c };
}
