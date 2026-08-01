import { POSE_LANDMARKS } from "../core/landmarks";
import type { NormalizedLandmark, PoseFrame } from "../core/types";

function pose(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 }));
}

function set(landmarks: NormalizedLandmark[], index: number, x: number, y: number) {
  landmarks[index] = { x, y, z: 0, visibility: 0.95 };
}

export function pullUpFrame(
  position: "hang" | "mid" | "top",
  timestampMs: number,
  hipOffset = 0,
): PoseFrame {
  const landmarks = pose();
  const shoulderY = position === "top" ? 0.32 : position === "mid" ? 0.35 : 0.38;
  const elbowY = position === "top" ? 0.21 : position === "mid" ? 0.2 : 0.22;
  const elbowOffset = position === "hang" ? 0 : position === "mid" ? 0.06 : 0.1;
  set(landmarks, POSE_LANDMARKS.LEFT_SHOULDER, 0.42, shoulderY);
  set(landmarks, POSE_LANDMARKS.RIGHT_SHOULDER, 0.58, shoulderY);
  set(landmarks, POSE_LANDMARKS.LEFT_ELBOW, 0.42 - elbowOffset, elbowY);
  set(landmarks, POSE_LANDMARKS.RIGHT_ELBOW, 0.58 + elbowOffset, elbowY);
  set(landmarks, POSE_LANDMARKS.LEFT_WRIST, 0.42, 0.06);
  set(landmarks, POSE_LANDMARKS.RIGHT_WRIST, 0.58, 0.06);
  const mouthY = position === "top" ? 0.03 : position === "mid" ? 0.14 : 0.24;
  set(landmarks, POSE_LANDMARKS.MOUTH_LEFT, 0.48, mouthY);
  set(landmarks, POSE_LANDMARKS.MOUTH_RIGHT, 0.52, mouthY);
  set(landmarks, POSE_LANDMARKS.LEFT_HIP, 0.46 + hipOffset, 0.58);
  set(landmarks, POSE_LANDMARKS.RIGHT_HIP, 0.54 + hipOffset, 0.58);
  set(landmarks, POSE_LANDMARKS.LEFT_ANKLE, 0.47, 0.9);
  set(landmarks, POSE_LANDMARKS.RIGHT_ANKLE, 0.53, 0.9);
  return { landmarks, timestampMs };
}
