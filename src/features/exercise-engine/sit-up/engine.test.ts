import { describe, expect, it } from "vitest";
import { POSE_LANDMARKS } from "../core/landmarks";
import type { NormalizedLandmark, PoseFrame } from "../core/types";
import { SitUpEngine } from "./engine";

function landmarks(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 }));
}

function set(lm: NormalizedLandmark[], index: number, x: number, y: number) {
  lm[index] = { x, y, z: 0, visibility: 0.95 };
}

function sitUpFrame(position: "down" | "mid" | "top", timestampMs: number, bentBack = false): PoseFrame {
  const lm = landmarks();
  const points = position === "down"
    ? { ear: [0.15, 0.6], shoulder: [0.25, 0.6], hip: [0.5, 0.6], knee: [0.75, 0.6], ankle: [0.75, 0.85] }
    : position === "top"
      ? { ear: bentBack ? [0.65, 0.35] : [0.5, 0.35], shoulder: [0.5, 0.45], hip: [0.5, 0.75], knee: [0.62, 0.62], ankle: [0.75, 0.74] }
      : { ear: [0.37, 0.47], shoulder: [0.38, 0.52], hip: [0.5, 0.68], knee: [0.69, 0.61], ankle: [0.78, 0.83] };
  for (const side of [
    [POSE_LANDMARKS.LEFT_EAR, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    [POSE_LANDMARKS.RIGHT_EAR, POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  ]) {
    const [ear, shoulder, hip, knee, ankle] = side;
    set(lm, ear!, ...points.ear as [number, number]);
    set(lm, shoulder!, ...points.shoulder as [number, number]);
    set(lm, hip!, ...points.hip as [number, number]);
    set(lm, knee!, ...points.knee as [number, number]);
    set(lm, ankle!, ...points.ankle as [number, number]);
  }
  return { landmarks: lm, timestampMs };
}

function repeat(engine: SitUpEngine, pose: "down" | "mid" | "top", start: number, bentBack = false): number {
  let timestamp = start;
  for (let index = 0; index < 4; index += 1) {
    engine.processFrame(sitUpFrame(pose, timestamp, bentBack));
    timestamp += 150;
  }
  return timestamp;
}

describe("SitUpEngine", () => {
  it("counts a full sit-up when the straight back and chest reach the knees", () => {
    const engine = new SitUpEngine();
    engine.initialize({});
    let timestamp = repeat(engine, "down", 1000);
    timestamp = repeat(engine, "mid", timestamp);
    timestamp = repeat(engine, "top", timestamp);
    timestamp = repeat(engine, "mid", timestamp);
    repeat(engine, "down", timestamp);
    const metrics = engine.finalize();
    expect(metrics.totalReps).toBe(1);
    expect(metrics.validReps).toBe(1);
  });

  it("records the repetition as invalid when the back bends at the top", () => {
    const engine = new SitUpEngine();
    engine.initialize({});
    let timestamp = repeat(engine, "down", 1000);
    timestamp = repeat(engine, "mid", timestamp);
    timestamp = repeat(engine, "top", timestamp, true);
    timestamp = repeat(engine, "mid", timestamp);
    repeat(engine, "down", timestamp);
    const metrics = engine.finalize();
    expect(metrics.totalReps).toBe(1);
    expect(metrics.invalidReps).toBe(1);
    expect(metrics.repetitions[0]?.metrics.issueCodes).toContain("back-not-straight");
  });

  it("does not count a shallow rise that never brings the chest to the knees", () => {
    const engine = new SitUpEngine();
    engine.initialize({});
    let timestamp = repeat(engine, "down", 1000);
    timestamp = repeat(engine, "mid", timestamp);
    repeat(engine, "down", timestamp);
    expect(engine.finalize().totalReps).toBe(0);
  });
});
