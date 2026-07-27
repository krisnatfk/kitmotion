import { describe, expect, it } from "vitest";
import { SquatEngine } from "./engine";
import { SQUAT_DEFAULT_CONFIG } from "./config";
import { SquatPhase } from "./phases";
import type { NormalizedLandmark, PoseFrame } from "../core/types";
import { POSE_LANDMARKS } from "../core/landmarks";

/** Build a synthetic side-on squat frame at a given knee angle + timestamp.
 *  Geometry is constructed so angleBetweenDegrees(hip, knee, ankle) ≈ kneeAngleDeg. */
function squatFrame(kneeAngleDeg: number, tsMs: number, visibility = 1): PoseFrame {
  const kx = 0.5;
  const ky = 0.55;
  const upperLeg = 0.2;
  const lowerLeg = 0.2;
  const a = (kneeAngleDeg * Math.PI) / 180;

  // Hip directly above the knee; ankle placed so the interior knee angle is `a`.
  const hipX = kx;
  const hipY = ky - upperLeg;
  const ankleX = kx + lowerLeg * Math.sin(a);
  const ankleY = ky - lowerLeg * Math.cos(a);
  const shoulderX = kx;
  const shoulderY = hipY - 0.2;

  const lm: NormalizedLandmark[] = new Array(33).fill(0).map(() => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0,
  }));

  const set = (idx: number, x: number, y: number) => {
    lm[idx] = { x, y, z: 0, visibility };
  };
  set(POSE_LANDMARKS.RIGHT_SHOULDER, shoulderX, shoulderY);
  set(POSE_LANDMARKS.LEFT_SHOULDER, shoulderX, shoulderY);
  set(POSE_LANDMARKS.RIGHT_HIP, hipX, hipY);
  set(POSE_LANDMARKS.LEFT_HIP, hipX, hipY);
  set(POSE_LANDMARKS.RIGHT_KNEE, kx, ky);
  set(POSE_LANDMARKS.LEFT_KNEE, kx, ky);
  set(POSE_LANDMARKS.RIGHT_ANKLE, ankleX, ankleY);
  set(POSE_LANDMARKS.LEFT_ANKLE, ankleX, ankleY);

  return { landmarks: lm, timestampMs: tsMs };
}

/** Drive a single full squat repetition (stand -> descend -> bottom -> stand). */
function driveOneRep(engine: SquatEngine, startMs: number, bottomAngle = 90): number {
  const cfg = SQUAT_DEFAULT_CONFIG;
  let ts = startMs;
  // Need debounceFrames (3) confirming frames per transition.
  const confirm = (angle: number) => {
    for (let i = 0; i < cfg.debounceFrames; i++) {
      engine.processFrame(squatFrame(angle, ts));
      ts += 100;
    }
  };
  confirm(cfg.kneeStandMin); // READY
  confirm(cfg.kneeStandMin - 30); // DESCENDING
  confirm(bottomAngle); // BOTTOM
  confirm(bottomAngle + 30); // ASCENDING
  confirm(cfg.kneeStandMin); // COMPLETE -> rep++
  return ts;
}

describe("SquatEngine", () => {
  it("starts in READY and counts no reps before any movement", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    const r = engine.processFrame(squatFrame(170, 0));
    expect(r.phase).toBe(SquatPhase.READY);
    expect(r.repCount).toBe(0);
  });

  it("counts one valid rep after a full deep squat cycle", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    const end = driveOneRep(engine, 0, 90);
    const r = engine.processFrame(squatFrame(170, end));
    expect(r.repCount).toBe(1);
    expect(r.validReps).toBe(1);
    expect(r.invalidReps).toBe(0);
  });

  it("counts multiple reps without double counting", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    let ts = 0;
    ts = driveOneRep(engine, ts, 90);
    ts = driveOneRep(engine, ts, 95);
    ts = driveOneRep(engine, ts, 88);
    const r = engine.processFrame(squatFrame(170, ts));
    expect(r.repCount).toBe(3);
    expect(r.validReps).toBe(3);
  });

  it("marks a rep invalid when depth is too shallow", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    // Bottom angle above kneeBottomMax+5 -> not deep enough.
    const end = driveOneRep(engine, 0, SQUAT_DEFAULT_CONFIG.kneeBottomMax + 20);
    const r = engine.processFrame(squatFrame(170, end));
    expect(r.repCount).toBe(1);
    expect(r.validReps).toBe(0);
    expect(r.invalidReps).toBe(1);
  });

  it("does not count a rep if the user never reaches the bottom", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    const cfg = SQUAT_DEFAULT_CONFIG;
    let ts = 0;
    const confirm = (angle: number) => {
      for (let i = 0; i < cfg.debounceFrames; i++) {
        engine.processFrame(squatFrame(angle, ts));
        ts += 100;
      }
    };
    confirm(cfg.kneeStandMin); // READY
    confirm(cfg.kneeStandMin - 30); // DESCENDING (partial, not deep)
    confirm(cfg.kneeStandMin - 20); // still above bottom
    confirm(cfg.kneeStandMin); // back to standing (no bottom reached)
    const r = engine.processFrame(squatFrame(170, ts));
    expect(r.repCount).toBe(0);
  });

  it("pauses scoring (trackingValid=false) when key landmarks are missing", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    const empty: PoseFrame = {
      landmarks: new Array(33).fill(0).map(() => ({ x: 0, y: 0, z: 0, visibility: 0 })),
      timestampMs: 0,
    };
    const r = engine.processFrame(empty);
    expect(r.trackingValid).toBe(false);
  });

  it("finalize returns scores in [0,100] and a feedback summary", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    const end = driveOneRep(engine, 0, 90);
    engine.processFrame(squatFrame(170, end));
    const m = engine.finalize();
    expect(m.totalReps).toBe(1);
    expect(m.validReps).toBe(1);
    for (const s of [m.formScore, m.rangeScore, m.consistencyScore, m.tempoScore, m.stabilityScore]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
    expect(Array.isArray(m.feedbackSummary)).toBe(true);
    expect(Array.isArray(m.repetitions)).toBe(true);
    expect(m.repetitions[0]?.repNumber).toBe(1);
  });

  it("reset clears all counters", () => {
    const engine = new SquatEngine();
    engine.initialize({});
    driveOneRep(engine, 0, 90);
    engine.reset();
    const r = engine.processFrame(squatFrame(170, 0));
    expect(r.repCount).toBe(0);
    expect(r.validReps).toBe(0);
  });
});
