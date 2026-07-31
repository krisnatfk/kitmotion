import type { NormalizedLandmark, PoseFrame } from "@/features/exercise-engine/core/types";

/**
 * Convert a MediaPipe PoseLandmarker result into the engine's PoseFrame.
 *
 * MediaPipe returns `result.landmarks` as an array (one entry per detected pose)
 * of `{ x, y, z, visibility? }` already normalized to [0,1] image coordinates.
 * We take the first pose and fill missing visibility with 0.
 *
 * Coordinates stay in the camera source space. Mirroring belongs to the
 * presentation layer because the exercise engine must keep MediaPipe's real
 * left/right landmark identity, while the overlay mirrors exactly once to
 * match the selfie video.
 */
export function toPoseFrame(
  mpLandmarks: { x: number; y: number; z: number; visibility?: number }[] | undefined,
  timestampMs: number,
  mirror = false,
  mpWorldLandmarks?: { x: number; y: number; z: number; visibility?: number }[],
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
  const worldLandmarks = mpWorldLandmarks?.map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility ?? 0,
  }));
  return { landmarks, worldLandmarks, timestampMs };
}
