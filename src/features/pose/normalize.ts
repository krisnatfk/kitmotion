import type { NormalizedLandmark, PoseFrame } from "@/features/exercise-engine/core/types";

/**
 * Convert a MediaPipe PoseLandmarker result into the engine's PoseFrame.
 *
 * MediaPipe returns `result.landmarks` as an array (one entry per detected pose)
 * of `{ x, y, z, visibility? }` already normalized to [0,1] image coordinates.
 * We take the first pose and fill missing visibility with 0.
 *
 * x is mirrored for a selfie-style front camera so left/right match the user.
 */
export function toPoseFrame(
  mpLandmarks: { x: number; y: number; z: number; visibility?: number }[] | undefined,
  timestampMs: number,
  mirror = true,
): PoseFrame {
  if (!mpLandmarks || mpLandmarks.length === 0) {
    return { landmarks: [], timestampMs };
  }
  const landmarks: NormalizedLandmark[] = mpLandmarks.map((lm) => ({
    x: mirror ? 1 - lm.x : lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility ?? 0,
  }));
  return { landmarks, timestampMs };
}
