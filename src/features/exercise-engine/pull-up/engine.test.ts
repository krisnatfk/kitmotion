import { describe, expect, it } from "vitest";
import { POSE_LANDMARKS } from "../core/landmarks";
import type { NormalizedLandmark, PoseFrame } from "../core/types";
import { PullUpEngine } from "./engine";

function pose(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 }));
}

function set(lm: NormalizedLandmark[], index: number, x: number, y: number) {
  lm[index] = { x, y, z: 0, visibility: 0.95 };
}

export function pullUpFrame(position: "hang" | "mid" | "top", timestampMs: number, hipOffset = 0): PoseFrame {
  const lm = pose();
  const shoulderY = position === "top" ? 0.32 : position === "mid" ? 0.35 : 0.38;
  const elbowY = position === "top" ? 0.21 : position === "mid" ? 0.2 : 0.22;
  const wristY = 0.06;
  const elbowOffset = position === "hang" ? 0 : position === "mid" ? 0.06 : 0.1;
  set(lm, POSE_LANDMARKS.LEFT_SHOULDER, 0.42, shoulderY);
  set(lm, POSE_LANDMARKS.RIGHT_SHOULDER, 0.58, shoulderY);
  set(lm, POSE_LANDMARKS.LEFT_ELBOW, 0.42 - elbowOffset, elbowY);
  set(lm, POSE_LANDMARKS.RIGHT_ELBOW, 0.58 + elbowOffset, elbowY);
  set(lm, POSE_LANDMARKS.LEFT_WRIST, 0.42, wristY);
  set(lm, POSE_LANDMARKS.RIGHT_WRIST, 0.58, wristY);
  const mouthY = position === "top" ? 0.03 : position === "mid" ? 0.14 : 0.24;
  set(lm, POSE_LANDMARKS.MOUTH_LEFT, 0.48, mouthY);
  set(lm, POSE_LANDMARKS.MOUTH_RIGHT, 0.52, mouthY);
  set(lm, POSE_LANDMARKS.LEFT_HIP, 0.46 + hipOffset, 0.58);
  set(lm, POSE_LANDMARKS.RIGHT_HIP, 0.54 + hipOffset, 0.58);
  set(lm, POSE_LANDMARKS.LEFT_ANKLE, 0.47, 0.9);
  set(lm, POSE_LANDMARKS.RIGHT_ANKLE, 0.53, 0.9);
  return { landmarks: lm, timestampMs };
}

function repeat(engine: PullUpEngine, position: "hang" | "mid" | "top", start: number, hipOffset = 0): number {
  let timestamp = start;
  for (let index = 0; index < 4; index += 1) {
    engine.processFrame(pullUpFrame(position, timestamp, hipOffset));
    timestamp += 150;
  }
  return timestamp;
}

describe("PullUpEngine", () => {
  it("counts when the chin clears the bar, then requires straight arms before another rep", () => {
    const engine = new PullUpEngine();
    engine.initialize({});
    let timestamp = repeat(engine, "hang", 1000);
    timestamp = repeat(engine, "mid", timestamp);
    timestamp = repeat(engine, "top", timestamp);
    timestamp = repeat(engine, "mid", timestamp);
    repeat(engine, "hang", timestamp);
    const metrics = engine.finalize();
    expect(metrics.totalReps).toBe(1);
    expect(metrics.validReps).toBe(1);
  });

  it("does not count when the chin never reaches the bar", () => {
    const engine = new PullUpEngine();
    engine.initialize({});
    let timestamp = repeat(engine, "hang", 1000);
    timestamp = repeat(engine, "mid", timestamp);
    repeat(engine, "hang", timestamp);
    expect(engine.finalize().totalReps).toBe(0);
  });

  it("marks a swinging full cycle invalid", () => {
    const engine = new PullUpEngine();
    engine.initialize({ bodySwingMaxRatio: 0.04 });
    let timestamp = repeat(engine, "hang", 1000);
    timestamp = repeat(engine, "mid", timestamp, 0.18);
    timestamp = repeat(engine, "top", timestamp, 0.18);
    timestamp = repeat(engine, "mid", timestamp, 0.18);
    repeat(engine, "hang", timestamp);
    const metrics = engine.finalize();
    expect(metrics.totalReps).toBe(1);
    expect(metrics.invalidReps).toBe(1);
    expect(metrics.repetitions[0]?.metrics.issueCodes).toContain("swinging");
  });
});
