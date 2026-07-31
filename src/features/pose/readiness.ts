import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";
import { angleBetweenDegrees, angleBetweenDegrees3D } from "@/features/exercise-engine/core/angles";
import { POSE_LANDMARKS } from "@/features/exercise-engine/core/landmarks";

export type ReadinessStatus = "no-body" | "too-close" | "too-far" | "side-cut" | "wrong-pose" | "ready";

export interface ReadinessResult {
  status: ReadinessStatus;
  message: string;
  visibleLandmarks: number;
  cameraMode?: "side" | "front";
}

const MIN_CONFIDENCE = 0.5;

/**
 * Camera-readiness check (FR-032/033/034). Pure: takes a frame's landmarks
 * and returns whether the body is sufficiently visible to start scoring.
 */
export function checkReadiness(
  landmarks: NormalizedLandmark[] | undefined,
  exerciseSlug?: string,
  worldLandmarks?: NormalizedLandmark[],
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
    return checkPushUpReadiness(landmarks, worldLandmarks, visible);
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
  worldLandmarks: NormalizedLandmark[] | undefined,
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
  const completeSides = sides.filter((candidate) => Object.values(candidate).every(visible));
  const side = completeSides
    .map((candidate) => {
      const shoulder = landmarks[candidate.shoulder]!;
      const ankle = landmarks[candidate.ankle]!;
      const bodyLength = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y);
      return {
        candidate,
        horizontalRatio: Math.abs(ankle.x - shoulder.x) / Math.max(bodyLength, 0.001),
      };
    })
    .sort((a, b) => b.horizontalRatio - a.horizontalRatio)[0];

  // A side view exposes body length in image space and remains the most precise
  // mode for evaluating the shoulder-hip-ankle line.
  if (side && side.horizontalRatio >= 0.65) {
    return checkSidePushUpReadiness(landmarks, side.candidate);
  }

  // In a front view the shoulder-to-ankle line points into camera depth. Use
  // MediaPipe world coordinates so a real plank is not mistaken for standing.
  const front = checkFrontPushUpReadiness(landmarks, worldLandmarks, visible);
  if (front) return front;

  if (!side) {
    return {
      status: "side-cut",
      message: "Pastikan bahu, kedua lengan, pinggul, lutut, dan kaki terlihat. Kamera boleh di depan atau di samping.",
      visibleLandmarks: sides.reduce(
        (best, candidate) => Math.max(best, Object.values(candidate).filter(visible).length),
        0,
      ),
    };
  }

  return {
    status: "wrong-pose",
    message: "Ambil posisi plank atas. Tubuh harus memanjang sejajar lantai, bukan berdiri atau berlutut.",
    visibleLandmarks: 6,
  };
}

function checkSidePushUpReadiness(
  landmarks: NormalizedLandmark[],
  side: { shoulder: number; elbow: number; wrist: number; hip: number; knee: number; ankle: number },
): ReadinessResult {

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
    message: "Plank atas terbaca dari samping. Tahan sebentar untuk mulai otomatis.",
    visibleLandmarks: 6,
    cameraMode: "side",
  };
}

function checkFrontPushUpReadiness(
  landmarks: NormalizedLandmark[],
  worldLandmarks: NormalizedLandmark[] | undefined,
  visible: (index: number) => boolean,
): ReadinessResult | null {
  if (!worldLandmarks || worldLandmarks.length < 33) return null;

  const requiredBoth = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_ELBOW,
    POSE_LANDMARKS.RIGHT_ELBOW,
    POSE_LANDMARKS.LEFT_WRIST,
    POSE_LANDMARKS.RIGHT_WRIST,
  ];
  const hasHip = visible(POSE_LANDMARKS.LEFT_HIP) || visible(POSE_LANDMARKS.RIGHT_HIP);
  const hasKnee = visible(POSE_LANDMARKS.LEFT_KNEE) || visible(POSE_LANDMARKS.RIGHT_KNEE);
  const hasAnkle = visible(POSE_LANDMARKS.LEFT_ANKLE) || visible(POSE_LANDMARKS.RIGHT_ANKLE);
  if (!requiredBoth.every(visible) || !hasHip || !hasKnee || !hasAnkle) return null;

  const worldVisible = (index: number) =>
    worldLandmarks[index] !== undefined && (worldLandmarks[index]?.visibility ?? 0) >= MIN_CONFIDENCE;
  if (!requiredBoth.every(worldVisible)) return null;

  const shoulder = pairedPoint(worldLandmarks, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, worldVisible);
  const hip = pairedPoint(worldLandmarks, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP, worldVisible);
  const ankle = pairedPoint(worldLandmarks, POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE, worldVisible);
  if (!shoulder || !hip || !ankle) return null;

  const framingIndices = [
    ...requiredBoth,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE,
    POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.RIGHT_ANKLE,
  ].filter(visible);
  const xs = framingIndices.map((index) => landmarks[index]!.x);
  const ys = framingIndices.map((index) => landmarks[index]!.y);
  const poseExtent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (poseExtent < 0.28) {
    return {
      status: "too-far",
      message: "Tubuh terlalu kecil di kamera. Dekatkan kamera sampai tangan dan kaki terlihat jelas.",
      visibleLandmarks: framingIndices.length,
      cameraMode: "front",
    };
  }
  if (poseExtent > 0.98) {
    return {
      status: "too-close",
      message: "Tubuh terlalu dekat. Jauhkan kamera agar tangan, pinggul, dan kaki tidak terpotong.",
      visibleLandmarks: framingIndices.length,
      cameraMode: "front",
    };
  }

  const bodyLength = distance3D(shoulder, ankle);
  if (bodyLength < 0.35) return null;
  const horizontalRatio = Math.hypot(ankle.x - shoulder.x, ankle.z - shoulder.z) / bodyLength;
  if (horizontalRatio < 0.6) {
    return {
      status: "wrong-pose",
      message: "Ambil posisi plank atas. Tubuh harus memanjang menjauhi kamera dan sejajar lantai.",
      visibleLandmarks: framingIndices.length,
      cameraMode: "front",
    };
  }

  if (pointLineDistanceRatio3D(hip, shoulder, ankle) > 0.2) {
    return {
      status: "wrong-pose",
      message: "Luruskan posisi plank. Jangan biarkan pinggul terlalu naik atau turun.",
      visibleLandmarks: framingIndices.length,
      cameraMode: "front",
    };
  }

  const leftElbow = angleBetweenDegrees3D(
    worldLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]!,
    worldLandmarks[POSE_LANDMARKS.LEFT_ELBOW]!,
    worldLandmarks[POSE_LANDMARKS.LEFT_WRIST]!,
  );
  const rightElbow = angleBetweenDegrees3D(
    worldLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]!,
    worldLandmarks[POSE_LANDMARKS.RIGHT_ELBOW]!,
    worldLandmarks[POSE_LANDMARKS.RIGHT_WRIST]!,
  );
  if (Math.min(leftElbow, rightElbow) < 145) {
    return {
      status: "wrong-pose",
      message: "Mulai dari plank atas: luruskan kedua siku sebelum tubuh diturunkan.",
      visibleLandmarks: framingIndices.length,
      cameraMode: "front",
    };
  }

  return {
    status: "ready",
    message: "Plank atas terbaca dari depan. Tahan sebentar untuk mulai otomatis.",
    visibleLandmarks: framingIndices.length,
    cameraMode: "front",
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

function pairedPoint(
  landmarks: NormalizedLandmark[],
  leftIndex: number,
  rightIndex: number,
  visible: (index: number) => boolean,
): NormalizedLandmark | null {
  const left = visible(leftIndex) ? landmarks[leftIndex] : undefined;
  const right = visible(rightIndex) ? landmarks[rightIndex] : undefined;
  if (left && right) {
    return {
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
      z: (left.z + right.z) / 2,
      visibility: Math.min(left.visibility, right.visibility),
    };
  }
  return left ?? right ?? null;
}

function distance3D(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function pointLineDistanceRatio3D(
  point: NormalizedLandmark,
  start: NormalizedLandmark,
  end: NormalizedLandmark,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  if (lengthSquared === 0) return 1;
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy + (point.z - start.z) * dz) / lengthSquared;
  const projected = {
    x: start.x + t * dx,
    y: start.y + t * dy,
    z: start.z + t * dz,
    visibility: point.visibility,
  };
  return distance3D(point, projected) / Math.sqrt(lengthSquared);
}
