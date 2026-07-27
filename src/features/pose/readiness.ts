import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";
import { POSE_LANDMARKS } from "@/features/exercise-engine/core/landmarks";

export type ReadinessStatus = "no-body" | "too-close" | "too-far" | "side-cut" | "ready";

export interface ReadinessResult {
  status: ReadinessStatus;
  message: string;
  visibleLandmarks: number;
}

const MIN_CONFIDENCE = 0.5;

/**
 * Camera-readiness check (FR-032/033/034). Pure: takes a frame's landmarks
 * and returns whether the body is sufficiently visible to start scoring.
 */
export function checkReadiness(
  landmarks: NormalizedLandmark[] | undefined,
): ReadinessResult {
  if (!landmarks || landmarks.length < 33) {
    return {
      status: "no-body",
      message: "Tubuh belum terdeteksi. Masuk ke dalam frame kamera.",
      visibleLandmarks: 0,
    };
  }

  const visible = (idx: number) =>
    landmarks[idx] !== undefined && (landmarks[idx]?.visibility ?? 0) >= MIN_CONFIDENCE;

  // Key joints must be visible on at least one side.
  const required = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
  ];
  const requiredVisible = required.filter(visible).length;
  if (requiredVisible < 3) {
    return {
      status: "no-body",
      message: "Posisikan tubuh bagian atas terlihat jelas di kamera.",
      visibleLandmarks: requiredVisible,
    };
  }

  const leftLeg = visible(POSE_LANDMARKS.LEFT_KNEE) && visible(POSE_LANDMARKS.LEFT_ANKLE);
  const rightLeg = visible(POSE_LANDMARKS.RIGHT_KNEE) && visible(POSE_LANDMARKS.RIGHT_ANKLE);
  if (!leftLeg && !rightLeg) {
    return {
      status: "side-cut",
      message: "Kaki belum terlihat lengkap. Mundur sedikit agar seluruh tubuh masuk.",
      visibleLandmarks: requiredVisible,
    };
  }

  // Framing: torso vertical span should be a reasonable fraction of the frame.
  const shoulderY =
    ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER]?.y ?? 0) +
      (landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]?.y ?? 0)) /
    2;
  const ankleY = leftLeg
    ? (landmarks[POSE_LANDMARKS.LEFT_ANKLE]?.y ?? 0)
    : (landmarks[POSE_LANDMARKS.RIGHT_ANKLE]?.y ?? 0);
  const bodyHeight = Math.abs(ankleY - shoulderY);

  if (bodyHeight < 0.3) {
    return {
      status: "too-far",
      message: "Terlalu jauh dari kamera. Mendekatlah agar tubuh memenuhi frame.",
      visibleLandmarks: requiredVisible,
    };
  }
  if (bodyHeight > 0.95) {
    return {
      status: "too-close",
      message: "Terlalu dekat. Mundur agar kepala dan kaki tetap terlihat.",
      visibleLandmarks: requiredVisible,
    };
  }

  return { status: "ready", message: "Posisi sudah baik. Mulai latihan.", visibleLandmarks: requiredVisible };
}
