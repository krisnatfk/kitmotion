import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";
import { angleBetweenDegrees } from "@/features/exercise-engine/core/angles";
import { POSE_LANDMARKS } from "@/features/exercise-engine/core/landmarks";

export type ReadinessStatus = "no-body" | "too-close" | "too-far" | "side-cut" | "wrong-pose" | "ready";

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
  exerciseSlug?: string,
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

  if (exerciseSlug === "push-up") {
    return checkPushUpReadiness(landmarks, visible);
  }

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

function checkPushUpReadiness(
  landmarks: NormalizedLandmark[],
  visible: (index: number) => boolean,
): ReadinessResult {
  const sides = [
    {
      shoulder: POSE_LANDMARKS.LEFT_SHOULDER,
      elbow: POSE_LANDMARKS.LEFT_ELBOW,
      wrist: POSE_LANDMARKS.LEFT_WRIST,
      hip: POSE_LANDMARKS.LEFT_HIP,
      knee: POSE_LANDMARKS.LEFT_KNEE,
      ankle: POSE_LANDMARKS.LEFT_ANKLE,
    },
    {
      shoulder: POSE_LANDMARKS.RIGHT_SHOULDER,
      elbow: POSE_LANDMARKS.RIGHT_ELBOW,
      wrist: POSE_LANDMARKS.RIGHT_WRIST,
      hip: POSE_LANDMARKS.RIGHT_HIP,
      knee: POSE_LANDMARKS.RIGHT_KNEE,
      ankle: POSE_LANDMARKS.RIGHT_ANKLE,
    },
  ];
  const side = sides.find((candidate) => Object.values(candidate).every(visible));
  if (!side) {
    return {
      status: "side-cut",
      message: "Posisikan kamera menyamping agar bahu, siku, tangan, pinggul, lutut, dan kaki terlihat lengkap.",
      visibleLandmarks: sides.reduce(
        (best, candidate) => Math.max(best, Object.values(candidate).filter(visible).length),
        0,
      ),
    };
  }

  const shoulder = landmarks[side.shoulder]!;
  const elbow = landmarks[side.elbow]!;
  const wrist = landmarks[side.wrist]!;
  const hip = landmarks[side.hip]!;
  const ankle = landmarks[side.ankle]!;
  const bodyLength = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y);

  if (bodyLength < 0.38) {
    return {
      status: "too-far",
      message: "Tubuh terlalu kecil di kamera. Dekatkan kamera tanpa memotong kepala atau kaki.",
      visibleLandmarks: 6,
    };
  }
  if (bodyLength > 1.08) {
    return {
      status: "too-close",
      message: "Tubuh terlalu dekat. Jauhkan kamera agar posisi plank terlihat penuh.",
      visibleLandmarks: 6,
    };
  }

  const horizontalRatio = Math.abs(ankle.x - shoulder.x) / Math.max(bodyLength, 0.001);
  if (horizontalRatio < 0.65) {
    return {
      status: "wrong-pose",
      message: "Ambil posisi plank menyamping. Bahu, pinggul, dan kaki harus memanjang sejajar lantai.",
      visibleLandmarks: 6,
    };
  }

  const hipDeviation = pointLineDistanceRatio(hip, shoulder, ankle);
  if (hipDeviation > 0.18) {
    return {
      status: "wrong-pose",
      message: "Luruskan posisi plank. Jangan biarkan pinggul terlalu naik atau turun.",
      visibleLandmarks: 6,
    };
  }

  if (angleBetweenDegrees(shoulder, elbow, wrist) < 145) {
    return {
      status: "wrong-pose",
      message: "Mulai dari plank atas: luruskan siku dan tahan tubuh sebelum turun.",
      visibleLandmarks: 6,
    };
  }

  return {
    status: "ready",
    message: "Posisi plank atas sudah terbaca. Tahan sebentar untuk mulai otomatis.",
    visibleLandmarks: 6,
  };
}

function pointLineDistanceRatio(
  point: NormalizedLandmark,
  start: NormalizedLandmark,
  end: NormalizedLandmark,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / (length * length);
}
