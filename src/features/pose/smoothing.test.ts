import { describe, expect, it } from "vitest";
import type { PoseFrame } from "@/features/exercise-engine/core/types";
import { smoothPoseFrame } from "./smoothing";

function frame(x: number, visibility = 1): PoseFrame {
  return { landmarks: [{ x, y: x, z: x, visibility }], timestampMs: 100 };
}

describe("smoothPoseFrame", () => {
  it("blends current and previous landmarks with the production weight", () => {
    const result = smoothPoseFrame(frame(1), frame(0).landmarks);
    expect(result.landmarks[0]).toMatchObject({ x: 0.72, y: 0.72, z: 0.72, visibility: 1 });
  });

  it("does not blend a low-visibility current landmark", () => {
    const current = frame(1, 0.2);
    expect(smoothPoseFrame(current, frame(0).landmarks).landmarks[0]).toEqual(current.landmarks[0]);
  });

  it("returns the first frame unchanged", () => {
    const current = frame(0.4);
    expect(smoothPoseFrame(current, null)).toBe(current);
  });

  it("smooths world landmarks independently", () => {
    const current = { ...frame(1), worldLandmarks: frame(1).landmarks };
    const result = smoothPoseFrame(current, frame(0).landmarks, 0.5, frame(0).landmarks);
    expect(result.worldLandmarks?.[0]).toMatchObject({ x: 0.5, y: 0.5, z: 0.5 });
  });
});
