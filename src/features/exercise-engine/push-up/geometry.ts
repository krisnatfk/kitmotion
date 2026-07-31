import { angleBetweenDegrees } from "../core/angles";
import { POSE_LANDMARKS } from "../core/landmarks";
import type { NormalizedLandmark } from "../core/types";

export interface FrontArmGeometry {
  leftElbowAngle: number;
  rightElbowAngle: number;
  elbowAngle: number;
  elbowAsymmetry: number;
  shoulderWidth: number;
  wristWidth: number;
  wristDropRatio: number;
  shoulderLevelRatio: number;
  wristLevelRatio: number;
  trackingValid: boolean;
  stanceValid: boolean;
}

/**
 * Reads a front-facing push-up from the six arm landmarks that remain reliable
 * when the legs overlap in perspective. A side view has almost no shoulder
 * width, so it cannot accidentally enter this mode.
 */
export function readFrontArmGeometry(
  landmarks: NormalizedLandmark[],
  minConfidence: number,
): FrontArmGeometry | null {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const required = [
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftWrist,
    rightWrist,
  ];
  if (required.some((landmark) => !landmark || landmark.visibility < minConfidence)) return null;

  const shoulderWidth = Math.abs(rightShoulder!.x - leftShoulder!.x);
  const wristWidth = Math.abs(rightWrist!.x - leftWrist!.x);
  if (shoulderWidth < 0.08) return null;

  const shoulderY = (leftShoulder!.y + rightShoulder!.y) / 2;
  const wristY = (leftWrist!.y + rightWrist!.y) / 2;
  const wristDropRatio = (wristY - shoulderY) / shoulderWidth;
  const shoulderLevelRatio = Math.abs(leftShoulder!.y - rightShoulder!.y) / shoulderWidth;
  const wristLevelRatio = Math.abs(leftWrist!.y - rightWrist!.y) / shoulderWidth;
  const leftElbowAngle = angleBetweenDegrees(leftShoulder!, leftElbow!, leftWrist!);
  const rightElbowAngle = angleBetweenDegrees(rightShoulder!, rightElbow!, rightWrist!);

  return {
    leftElbowAngle,
    rightElbowAngle,
    elbowAngle: (leftElbowAngle + rightElbowAngle) / 2,
    elbowAsymmetry: Math.abs(leftElbowAngle - rightElbowAngle),
    shoulderWidth,
    wristWidth,
    wristDropRatio,
    shoulderLevelRatio,
    wristLevelRatio,
    trackingValid:
      wristWidth >= shoulderWidth * 0.95
      && shoulderLevelRatio <= 0.5
      && wristLevelRatio <= 0.65,
    stanceValid:
      wristWidth >= shoulderWidth * 1.12
      && wristDropRatio >= 0.7
      && shoulderLevelRatio <= 0.35
      && wristLevelRatio <= 0.5,
  };
}
