import { describe, expect, it } from "vitest";
import { checkReadiness } from "./readiness";
import { toPoseFrame } from "./normalize";
import { POSE_LANDMARKS } from "@/features/exercise-engine/core/landmarks";
import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";
import { pullUpFrame } from "@/features/exercise-engine/pull-up/test-frames";

function fullBody(visibility = 0.9): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility }));
}

function setLandmark(lm: NormalizedLandmark[], idx: number, x: number, y: number, v = 0.9) {
  lm[idx] = { x, y, z: 0, visibility: v };
}

describe("checkReadiness", () => {
  it("returns no-body when no landmarks are provided", () => {
    expect(checkReadiness(undefined).status).toBe("no-body");
    expect(checkReadiness([]).status).toBe("no-body");
  });

  it("returns ready when the full body is visible and well-framed", () => {
    const lm = fullBody(0.9);
    setLandmark(lm, POSE_LANDMARKS.LEFT_SHOULDER, 0.45, 0.1);
    setLandmark(lm, POSE_LANDMARKS.RIGHT_SHOULDER, 0.55, 0.1);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ANKLE, 0.45, 0.85);
    setLandmark(lm, POSE_LANDMARKS.RIGHT_ANKLE, 0.55, 0.85);
    setLandmark(lm, POSE_LANDMARKS.LEFT_KNEE, 0.45, 0.6);
    setLandmark(lm, POSE_LANDMARKS.RIGHT_KNEE, 0.55, 0.6);
    expect(checkReadiness(lm).status).toBe("ready");
  });

  it("returns side-cut when legs are not visible", () => {
    const lm = fullBody(0.9);
    setLandmark(lm, POSE_LANDMARKS.LEFT_SHOULDER, 0.45, 0.1);
    setLandmark(lm, POSE_LANDMARKS.RIGHT_SHOULDER, 0.55, 0.1);
    // Knees/ankles below confidence
    setLandmark(lm, POSE_LANDMARKS.LEFT_KNEE, 0.45, 0.6, 0.1);
    setLandmark(lm, POSE_LANDMARKS.RIGHT_KNEE, 0.55, 0.6, 0.1);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ANKLE, 0.45, 0.85, 0.1);
    setLandmark(lm, POSE_LANDMARKS.RIGHT_ANKLE, 0.55, 0.85, 0.1);
    expect(checkReadiness(lm).status).toBe("side-cut");
  });

  it("accepts a side-on top plank for push-up", () => {
    const lm = fullBody(0.1);
    setLandmark(lm, POSE_LANDMARKS.LEFT_SHOULDER, 0.2, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ELBOW, 0.3, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_WRIST, 0.4, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_HIP, 0.48, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_KNEE, 0.64, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ANKLE, 0.8, 0.5);
    expect(checkReadiness(lm, "push-up").status).toBe("ready");
  });

  it("rejects a standing pose as push-up readiness", () => {
    const lm = fullBody(0.1);
    setLandmark(lm, POSE_LANDMARKS.LEFT_SHOULDER, 0.5, 0.2);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ELBOW, 0.5, 0.3);
    setLandmark(lm, POSE_LANDMARKS.LEFT_WRIST, 0.5, 0.4);
    setLandmark(lm, POSE_LANDMARKS.LEFT_HIP, 0.5, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_KNEE, 0.5, 0.7);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ANKLE, 0.5, 0.9);
    expect(checkReadiness(lm, "push-up").status).toBe("wrong-pose");
  });

  it("accepts a front-facing top plank using world-space depth", () => {
    const { landmarks, worldLandmarks } = frontPushUpPose(false);
    const result = checkReadiness(landmarks, "push-up", worldLandmarks);
    expect(result.status).toBe("ready");
    expect(result.cameraMode).toBe("front");
  });

  it("accepts the photographed front stance when legs overlap in perspective", () => {
    const { landmarks } = frontPushUpPose(false);
    for (const index of [
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_ANKLE,
    ]) {
      landmarks[index] = { ...landmarks[index]!, visibility: 0.1 };
    }
    const result = checkReadiness(landmarks, "push-up");
    expect(result.status).toBe("ready");
    expect(result.cameraMode).toBe("front");
  });

  it("does not mistake a front-facing standing pose for a plank", () => {
    const { landmarks, worldLandmarks } = frontPushUpPose(true);
    expect(checkReadiness(landmarks, "push-up", worldLandmarks).status).toBe("wrong-pose");
  });

  it("rejects a side-facing knee push-up as the standard starting plank", () => {
    const lm = fullBody(0.1);
    setLandmark(lm, POSE_LANDMARKS.LEFT_SHOULDER, 0.2, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ELBOW, 0.3, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_WRIST, 0.4, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_HIP, 0.48, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_KNEE, 0.64, 0.7);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ANKLE, 0.8, 0.5);
    expect(checkReadiness(lm, "push-up").status).toBe("wrong-pose");
  });

  it("rejects a side view whose hand is cut by the frame edge", () => {
    const lm = fullBody(0.1);
    setLandmark(lm, POSE_LANDMARKS.LEFT_SHOULDER, 0.2, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ELBOW, 0.5, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_WRIST, 0.98, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_HIP, 0.48, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_KNEE, 0.64, 0.5);
    setLandmark(lm, POSE_LANDMARKS.LEFT_ANKLE, 0.8, 0.5);
    expect(checkReadiness(lm, "push-up").status).toBe("side-cut");
  });

  it("accepts the required lying start position for sit-up", () => {
    const lm = fullBody(0.1);
    for (const [index, x, y] of [
      [POSE_LANDMARKS.LEFT_EAR, 0.15, 0.6],
      [POSE_LANDMARKS.LEFT_SHOULDER, 0.25, 0.6],
      [POSE_LANDMARKS.LEFT_HIP, 0.5, 0.6],
      [POSE_LANDMARKS.LEFT_KNEE, 0.75, 0.6],
      [POSE_LANDMARKS.LEFT_ANKLE, 0.75, 0.85],
    ] as const) setLandmark(lm, index, x, y);
    const result = checkReadiness(lm, "sit-up");
    expect(result.status).toBe("ready");
    expect(result.cameraMode).toBe("side");
  });

  it("requires a straight-arm hang before starting pull-up", () => {
    expect(checkReadiness(pullUpFrame("hang", 1000).landmarks, "pull-up").status).toBe("ready");
    expect(checkReadiness(pullUpFrame("mid", 1000).landmarks, "pull-up").status).toBe("wrong-pose");
  });

  it("requires the chin-above-bar hold before starting chinning-up", () => {
    expect(checkReadiness(pullUpFrame("top", 1000).landmarks, "chinning-up").status).toBe("ready");
    expect(checkReadiness(pullUpFrame("mid", 1000).landmarks, "chinning-up").status).toBe("wrong-pose");
  });
});

function frontPushUpPose(standing: boolean) {
  const landmarks = fullBody(0.1);
  const worldLandmarks = fullBody(0.1);
  const imagePoints: [number, number, number][] = [
    [POSE_LANDMARKS.NOSE, 0.5, 0.16],
    [POSE_LANDMARKS.LEFT_SHOULDER, 0.42, 0.3],
    [POSE_LANDMARKS.RIGHT_SHOULDER, 0.58, 0.3],
    [POSE_LANDMARKS.LEFT_ELBOW, 0.32, 0.5],
    [POSE_LANDMARKS.RIGHT_ELBOW, 0.68, 0.5],
    [POSE_LANDMARKS.LEFT_WRIST, 0.2, 0.76],
    [POSE_LANDMARKS.RIGHT_WRIST, 0.8, 0.76],
    [POSE_LANDMARKS.LEFT_HIP, 0.46, 0.5],
    [POSE_LANDMARKS.RIGHT_HIP, 0.54, 0.5],
    [POSE_LANDMARKS.LEFT_KNEE, 0.47, 0.62],
    [POSE_LANDMARKS.RIGHT_KNEE, 0.53, 0.62],
    [POSE_LANDMARKS.LEFT_ANKLE, 0.48, 0.72],
    [POSE_LANDMARKS.RIGHT_ANKLE, 0.52, 0.72],
  ];
  for (const [index, x, y] of imagePoints) setLandmark(landmarks, index, x, y);
  if (standing) {
    setLandmark(landmarks, POSE_LANDMARKS.LEFT_ELBOW, 0.44, 0.5);
    setLandmark(landmarks, POSE_LANDMARKS.RIGHT_ELBOW, 0.56, 0.5);
    setLandmark(landmarks, POSE_LANDMARKS.LEFT_WRIST, 0.46, 0.72);
    setLandmark(landmarks, POSE_LANDMARKS.RIGHT_WRIST, 0.54, 0.72);
  }

  const setWorld = (index: number, x: number, y: number, z: number) => {
    worldLandmarks[index] = { x, y, z, visibility: 0.9 };
  };
  const shoulderY = standing ? -0.6 : 0;
  const hipY = 0;
  const ankleY = standing ? 0.7 : 0;
  const hipZ = standing ? 0 : 0.6;
  const ankleZ = standing ? 0 : 1.2;
  setWorld(POSE_LANDMARKS.LEFT_SHOULDER, -0.2, shoulderY, 0);
  setWorld(POSE_LANDMARKS.RIGHT_SHOULDER, 0.2, shoulderY, 0);
  setWorld(POSE_LANDMARKS.LEFT_ELBOW, -0.2, shoulderY + 0.25, 0);
  setWorld(POSE_LANDMARKS.RIGHT_ELBOW, 0.2, shoulderY + 0.25, 0);
  setWorld(POSE_LANDMARKS.LEFT_WRIST, -0.2, shoulderY + 0.5, 0);
  setWorld(POSE_LANDMARKS.RIGHT_WRIST, 0.2, shoulderY + 0.5, 0);
  setWorld(POSE_LANDMARKS.LEFT_HIP, -0.12, hipY, hipZ);
  setWorld(POSE_LANDMARKS.RIGHT_HIP, 0.12, hipY, hipZ);
  setWorld(POSE_LANDMARKS.LEFT_KNEE, -0.1, (hipY + ankleY) / 2, (hipZ + ankleZ) / 2);
  setWorld(POSE_LANDMARKS.RIGHT_KNEE, 0.1, (hipY + ankleY) / 2, (hipZ + ankleZ) / 2);
  setWorld(POSE_LANDMARKS.LEFT_ANKLE, -0.08, ankleY, ankleZ);
  setWorld(POSE_LANDMARKS.RIGHT_ANKLE, 0.08, ankleY, ankleZ);
  return { landmarks, worldLandmarks };
}

describe("toPoseFrame", () => {
  it("keeps camera coordinates so the overlay can mirror exactly once", () => {
    const frame = toPoseFrame([{ x: 0.2, y: 0.3, z: 0, visibility: 0.9 }], 1000);
    expect(frame.landmarks[0]?.x).toBeCloseTo(0.2, 5);
    expect(frame.landmarks[0]?.visibility).toBe(0.9);
    expect(frame.timestampMs).toBe(1000);
  });

  it("returns empty landmarks for undefined input", () => {
    expect(toPoseFrame(undefined, 0).landmarks).toEqual([]);
  });
});
