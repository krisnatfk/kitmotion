import { describe, expect, it } from "vitest";
import { PushUpEngine } from "./engine";
import { PUSH_UP_DEFAULT_CONFIG } from "./config";
import { PushUpPhase } from "./phases";
import type { NormalizedLandmark, PoseFrame } from "../core/types";
import { POSE_LANDMARKS } from "../core/landmarks";

/**
 * Build a side-on push-up frame at a given elbow angle. The shoulder-elbow-wrist
 * interior angle is set to `elbowAngleDeg`. Hip is kept on the shoulder->knee
 * line (no sag) by default.
 */
function pushUpFrame(elbowAngleDeg: number, tsMs: number, visibility = 1): PoseFrame {
  const sx = 0.5;
  const sy = 0.5;
  const upperArm = 0.12;
  const foreArm = 0.12;
  const thigh = 0.25;
  const a = (elbowAngleDeg * Math.PI) / 180;

  // Shoulder at (sx, sy). Elbow straight down from shoulder. Wrist placed so the
  // interior angle at the elbow equals `a` (shoulder-elbow-wrist).
  const elbowX = sx;
  const elbowY = sy + upperArm;
  // Wrist direction from elbow: rotate the shoulder->elbow vector by `a`.
  const wristX = elbowX + foreArm * Math.sin(a);
  const wristY = elbowY - foreArm * Math.cos(a);

  // Knee along the line through shoulder, away from the elbow (horizontal).
  const kneeX = sx + thigh;
  const kneeY = sy;

  const lm: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0, y: 0, z: 0, visibility: 0,
  }));
  const set = (idx: number, x: number, y: number) => {
    lm[idx] = { x, y, z: 0, visibility };
  };
  set(POSE_LANDMARKS.RIGHT_SHOULDER, sx, sy);
  set(POSE_LANDMARKS.LEFT_SHOULDER, sx, sy);
  set(POSE_LANDMARKS.RIGHT_ELBOW, elbowX, elbowY);
  set(POSE_LANDMARKS.LEFT_ELBOW, elbowX, elbowY);
  set(POSE_LANDMARKS.RIGHT_WRIST, wristX, wristY);
  set(POSE_LANDMARKS.LEFT_WRIST, wristX, wristY);
  set(POSE_LANDMARKS.RIGHT_HIP, sx + thigh * 0.5, sy);
  set(POSE_LANDMARKS.LEFT_HIP, sx + thigh * 0.5, sy);
  set(POSE_LANDMARKS.RIGHT_KNEE, kneeX, kneeY);
  set(POSE_LANDMARKS.LEFT_KNEE, kneeX, kneeY);

  return { landmarks: lm, timestampMs: tsMs };
}

function driveOnePushUp(engine: PushUpEngine, startMs: number, bottomAngle = 80): number {
  const cfg = PUSH_UP_DEFAULT_CONFIG;
  let ts = startMs;
  const confirm = (angle: number) => {
    for (let i = 0; i < cfg.debounceFrames + 1; i++) {
      engine.processFrame(pushUpFrame(angle, ts));
      ts += 100;
    }
  };
  confirm(cfg.elbowUpMin); // UP
  confirm(cfg.elbowUpMin - 30); // DESCENDING
  confirm(bottomAngle); // DOWN
  confirm(bottomAngle + 30); // ASCENDING
  confirm(cfg.elbowUpMin); // COMPLETE -> UP
  return ts;
}

describe("PushUpEngine", () => {
  it("starts UP with zero reps", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    const r = engine.processFrame(pushUpFrame(170, 0));
    expect(r.phase).toBe(PushUpPhase.UP);
    expect(r.repCount).toBe(0);
  });

  it("counts one rep after a full down-up cycle", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    const end = driveOnePushUp(engine, 0, 80);
    const r = engine.processFrame(pushUpFrame(170, end));
    expect(r.repCount).toBe(1);
    expect(r.validReps).toBe(1);
  });

  it("counts multiple reps", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    let ts = 0;
    ts = driveOnePushUp(engine, ts, 80);
    ts = driveOnePushUp(engine, ts, 85);
    const r = engine.processFrame(pushUpFrame(170, ts));
    expect(r.repCount).toBe(2);
    expect(r.validReps).toBe(2);
  });

  it("marks a rep invalid when elbows never bend enough", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    const end = driveOnePushUp(engine, 0, PUSH_UP_DEFAULT_CONFIG.elbowDownMax + 25);
    const r = engine.processFrame(pushUpFrame(170, end));
    expect(r.repCount).toBe(1);
    expect(r.validReps).toBe(0);
    expect(r.invalidReps).toBe(1);
  });

  it("pauses scoring when tracking is lost", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    const empty: PoseFrame = {
      landmarks: Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 })),
      timestampMs: 0,
    };
    expect(engine.processFrame(empty).trackingValid).toBe(false);
  });

  it("finalize returns scores in [0,100]", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    const end = driveOnePushUp(engine, 0, 80);
    engine.processFrame(pushUpFrame(170, end));
    const m = engine.finalize();
    expect(m.totalReps).toBe(1);
    for (const s of [m.formScore, m.rangeScore, m.consistencyScore, m.tempoScore, m.stabilityScore]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
