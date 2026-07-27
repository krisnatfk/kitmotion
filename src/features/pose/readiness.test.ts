import { describe, expect, it } from "vitest";
import { checkReadiness } from "./readiness";
import { toPoseFrame } from "./normalize";
import { POSE_LANDMARKS } from "@/features/exercise-engine/core/landmarks";
import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";

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
});

describe("toPoseFrame", () => {
  it("mirrors x by default (selfie view)", () => {
    const frame = toPoseFrame([{ x: 0.2, y: 0.3, z: 0, visibility: 0.9 }], 1000);
    expect(frame.landmarks[0]?.x).toBeCloseTo(0.8, 5);
    expect(frame.landmarks[0]?.visibility).toBe(0.9);
    expect(frame.timestampMs).toBe(1000);
  });

  it("returns empty landmarks for undefined input", () => {
    expect(toPoseFrame(undefined, 0).landmarks).toEqual([]);
  });
});
