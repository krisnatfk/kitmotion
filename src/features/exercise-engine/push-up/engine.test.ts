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
function pushUpFrame(elbowAngleDeg: number, tsMs: number, visibility = 1, hipOffsetY = 0): PoseFrame {
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
  set(POSE_LANDMARKS.RIGHT_HIP, sx + thigh * 0.5, sy + hipOffsetY);
  set(POSE_LANDMARKS.LEFT_HIP, sx + thigh * 0.5, sy + hipOffsetY);
  set(POSE_LANDMARKS.RIGHT_KNEE, kneeX, kneeY);
  set(POSE_LANDMARKS.LEFT_KNEE, kneeX, kneeY);
  set(POSE_LANDMARKS.RIGHT_ANKLE, kneeX + 0.15, kneeY);
  set(POSE_LANDMARKS.LEFT_ANKLE, kneeX + 0.15, kneeY);

  return { landmarks: lm, timestampMs: tsMs };
}

function driveOnePushUp(engine: PushUpEngine, startMs: number, bottomAngle = 80, hipOffsetY = 0): number {
  const cfg = PUSH_UP_DEFAULT_CONFIG;
  let ts = startMs;
  const confirm = (angle: number, offset = hipOffsetY) => {
    for (let i = 0; i < cfg.debounceFrames + 1; i++) {
      engine.processFrame(pushUpFrame(angle, ts, 1, offset));
      ts += 100;
    }
  };
  confirm(cfg.elbowUpMin, 0); // stable top plank arms the engine
  confirm(cfg.elbowUpMin - 30); // DESCENDING
  confirm(bottomAngle); // DOWN
  confirm(bottomAngle + 30); // ASCENDING
  confirm(cfg.elbowUpMin); // COMPLETE -> UP
  return ts;
}

describe("PushUpEngine", () => {
  it("starts in setup and requires a stable top plank", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    expect(engine.processFrame(pushUpFrame(170, 0)).phase).toBe(PushUpPhase.SETUP);
    let result = engine.processFrame(pushUpFrame(170, 100));
    result = engine.processFrame(pushUpFrame(170, 200));
    expect(result.phase).toBe(PushUpPhase.UP);
    expect(result.repCount).toBe(0);
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

  it("does not count a shallow arm movement as a repetition", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    const end = driveOnePushUp(engine, 0, PUSH_UP_DEFAULT_CONFIG.elbowDownMax + 25);
    const r = engine.processFrame(pushUpFrame(170, end));
    expect(r.repCount).toBe(0);
    expect(r.validReps).toBe(0);
    expect(r.invalidReps).toBe(0);
  });

  it("does not arm or count while the body is standing", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    let ts = 0;
    for (const angle of [170, 130, 80, 120, 170]) {
      for (let index = 0; index < PUSH_UP_DEFAULT_CONFIG.debounceFrames + 1; index += 1) {
        const frame = pushUpFrame(angle, ts);
        for (const side of [
          [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_ANKLE],
          [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_ANKLE],
        ]) {
          frame.landmarks[side[0]!] = { x: 0.5, y: 0.7, z: 0, visibility: 1 };
          frame.landmarks[side[1]!] = { x: 0.5, y: 0.95, z: 0, visibility: 1 };
        }
        engine.processFrame(frame);
        ts += 100;
      }
    }
    expect(engine.finalize().totalReps).toBe(0);
  });

  it("marks a full cycle invalid when the hips sag", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    driveOnePushUp(engine, 0, 80, 0.07);
    const metrics = engine.finalize();
    expect(metrics.totalReps).toBe(1);
    expect(metrics.validReps).toBe(0);
    expect(metrics.invalidReps).toBe(1);
    expect(metrics.repetitions[0]?.metrics.issueCodes).toContain("hips-too-low");
  });

  it("cancels an incomplete repetition when tracking is lost", () => {
    const engine = new PushUpEngine();
    engine.initialize({});
    const cfg = PUSH_UP_DEFAULT_CONFIG;
    let ts = 0;
    for (let index = 0; index < cfg.debounceFrames + 1; index += 1) {
      engine.processFrame(pushUpFrame(cfg.elbowUpMin - 30, ts));
      ts += 100;
    }
    engine.processFrame(pushUpFrame(80, ts, 0));
    ts += 100;
    for (let index = 0; index < cfg.debounceFrames + 2; index += 1) {
      engine.processFrame(pushUpFrame(cfg.elbowUpMin, ts));
      ts += 100;
    }
    expect(engine.finalize().totalReps).toBe(0);
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
