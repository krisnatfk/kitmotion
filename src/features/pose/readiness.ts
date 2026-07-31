import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";
import { angleBetweenDegrees } from "@/features/exercise-engine/core/angles";
import { POSE_LANDMARKS } from "@/features/exercise-engine/core/landmarks";
import { readFrontArmGeometry } from "@/features/exercise-engine/push-up/geometry";

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
  _worldLandmarks: NormalizedLandmark[] | undefined,
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

  // Prefer the unmistakable two-arm front stance before inspecting a single
  // shoulder-to-ankle projection. Foreshortened legs can otherwise make one
  // front-facing side look diagonal enough to be misclassified as side view.
  const frontGeometry = readFrontArmGeometry(landmarks, MIN_CONFIDENCE);
  if (frontGeometry?.stanceValid) {
    const front = checkFrontPushUpReadiness(landmarks, visible);
    if (front) return front;
  }

  // A side view exposes body length in image space and remains the most precise
  // mode for evaluating the shoulder-hip-ankle line.
  if (side && side.horizontalRatio >= 0.65) {
    return checkSidePushUpReadiness(landmarks, side.candidate);
  }

  // In a front view the shoulder-to-ankle line points into camera depth. Use
  // MediaPipe world coordinates so a real plank is not mistaken for standing.
  const front = checkFrontPushUpReadiness(landmarks, visible);
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
  const knee = landmarks[side.knee]!;
  const ankle = landmarks[side.ankle]!;
  const bodyLength = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y);

  if (
    [shoulder, elbow, wrist, hip, knee, ankle].some((landmark) =>
      isNearFrameEdge(landmark),
    )
  ) {
    return {
      status: "side-cut",
      message: "Tubuh terpotong di tepi kamera. Gunakan posisi depan, atau putar HP ke landscape jika memilih posisi samping.",
      visibleLandmarks: 6,
      cameraMode: "side",
    };
  }
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

  if (angleBetweenDegrees(hip, knee, ankle) < 145) {
    return {
      status: "wrong-pose",
      message: "Luruskan lutut dan bertumpu pada ujung kaki. Posisi berlutut belum dihitung sebagai plank atas.",
      visibleLandmarks: 6,
      cameraMode: "side",
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
  visible: (index: number) => boolean,
): ReadinessResult | null {
  const frontArms = readFrontArmGeometry(landmarks, MIN_CONFIDENCE);
  if (!frontArms) return null;
  if (!visible(POSE_LANDMARKS.NOSE)) {
    return {
      status: "side-cut",
      message: "Kedua lengan terbaca, tetapi kepala keluar frame. Mundur sedikit agar ada ruang saat tubuh turun.",
      visibleLandmarks: 6,
      cameraMode: "front",
    };
  }
  const hasHip = visible(POSE_LANDMARKS.LEFT_HIP) || visible(POSE_LANDMARKS.RIGHT_HIP);
  if (!hasHip) {
    return {
      status: "side-cut",
      message: "Kedua lengan sudah terbaca. Mundur sedikit sampai pinggul juga terlihat untuk mengunci posisi awal.",
      visibleLandmarks: 6,
      cameraMode: "front",
    };
  }
  if (!frontArms.stanceValid) {
    return {
      status: "wrong-pose",
      message: "Letakkan kedua tangan sedikit lebih lebar dari bahu dan sejajar. Arahkan tubuh lurus menjauhi kamera.",
      visibleLandmarks: 7,
      cameraMode: "front",
    };
  }

  const framingIndices = [
    POSE_LANDMARKS.NOSE,
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_ELBOW,
    POSE_LANDMARKS.RIGHT_ELBOW,
    POSE_LANDMARKS.LEFT_WRIST,
    POSE_LANDMARKS.RIGHT_WRIST,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
  ].filter(visible);
  if (framingIndices.some((index) => isNearFrameEdge(landmarks[index]!, 0.07))) {
    return {
      status: "too-close",
      message: "Posisi terlalu dekat dengan tepi frame. Mundur 20-30 cm agar kepala dan tangan tidak terpotong saat bergerak.",
      visibleLandmarks: framingIndices.length,
      cameraMode: "front",
    };
  }
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

  if (Math.min(frontArms.leftElbowAngle, frontArms.rightElbowAngle) < 145) {
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

function isNearFrameEdge(landmark: NormalizedLandmark, margin = 0.04): boolean {
  return landmark.x < margin
    || landmark.x > 1 - margin
    || landmark.y < margin
    || landmark.y > 1 - margin;
}
