import type { NormalizedLandmark, PoseFrame } from "@/features/exercise-engine/core/types";

const DEFAULT_CURRENT_WEIGHT = 0.72;
const MIN_SMOOTHING_VISIBILITY = 0.35;

export function smoothPoseFrame(
  frame: PoseFrame,
  previous: NormalizedLandmark[] | null,
  currentWeight = DEFAULT_CURRENT_WEIGHT,
): PoseFrame {
  if (frame.landmarks.length === 0 || !previous) return frame;
  const weight = Math.max(0, Math.min(1, currentWeight));
  return {
    ...frame,
    landmarks: frame.landmarks.map((landmark, index) => {
      const old = previous[index];
      if (!old || landmark.visibility < MIN_SMOOTHING_VISIBILITY) return landmark;
      return {
        x: landmark.x * weight + old.x * (1 - weight),
        y: landmark.y * weight + old.y * (1 - weight),
        z: landmark.z * weight + old.z * (1 - weight),
        visibility: landmark.visibility,
      };
    }),
  };
}
