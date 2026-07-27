import { describe, expect, it } from "vitest";
import { JumpingJackEngine } from "./engine";
import { JUMPING_JACK_DEFAULT_CONFIG } from "./config";
import { JumpingJackPhase } from "./phases";
import type { NormalizedLandmark, PoseFrame } from "../core/types";
import { POSE_LANDMARKS } from "../core/landmarks";

/**
 * Build a front-facing jack frame. `armOpen`/`legOpen` are spread ratios
 * (1 = neutral/together, >1 = apart). We place wrists and ankles at the
 * right horizontal distance to produce those spreads.
 */
function jackFrame(armOpen: number, legOpen: number, tsMs: number, visibility = 1): PoseFrame {
  const shoulderWidth = 0.2;
  const hipWidth = 0.16;
  const cx = 0.5;

  const lm: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5, y: 0.5, z: 0, visibility: 0,
  }));
  const set = (idx: number, x: number, y: number) => {
    lm[idx] = { x, y, z: 0, visibility };
  };

  set(POSE_LANDMARKS.LEFT_SHOULDER, cx - shoulderWidth / 2, 0.3);
  set(POSE_LANDMARKS.RIGHT_SHOULDER, cx + shoulderWidth / 2, 0.3);
  set(POSE_LANDMARKS.LEFT_HIP, cx - hipWidth / 2, 0.55);
  set(POSE_LANDMARKS.RIGHT_HIP, cx + hipWidth / 2, 0.55);
  // Wrist spread = armOpen * shoulderWidth
  set(POSE_LANDMARKS.LEFT_WRIST, cx - (armOpen * shoulderWidth) / 2, 0.2);
  set(POSE_LANDMARKS.RIGHT_WRIST, cx + (armOpen * shoulderWidth) / 2, 0.2);
  // Ankle spread = legOpen * hipWidth
  set(POSE_LANDMARKS.LEFT_ANKLE, cx - (legOpen * hipWidth) / 2, 0.9);
  set(POSE_LANDMARKS.RIGHT_ANKLE, cx + (legOpen * hipWidth) / 2, 0.9);

  return { landmarks: lm, timestampMs: tsMs };
}

function driveOneJack(engine: JumpingJackEngine, startMs: number): number {
  const cfg = JUMPING_JACK_DEFAULT_CONFIG;
  let ts = startMs;
  const confirm = (arm: number, leg: number) => {
    for (let i = 0; i < cfg.debounceFrames + 1; i++) {
      engine.processFrame(jackFrame(arm, leg, ts));
      ts += 100;
    }
  };
  confirm(1, 1); // CLOSED
  confirm(cfg.armOpenMinRatio - 0.2, cfg.legOpenMinRatio - 0.1); // OPENING
  confirm(cfg.armOpenMinRatio, cfg.legOpenMinRatio); // OPEN
  confirm(cfg.armOpenMinRatio - 0.2, cfg.legOpenMinRatio - 0.1); // CLOSING
  confirm(1, 1); // COMPLETE -> CLOSED
  return ts;
}

describe("JumpingJackEngine", () => {
  it("starts CLOSED with zero reps", () => {
    const engine = new JumpingJackEngine();
    engine.initialize({});
    const r = engine.processFrame(jackFrame(1, 1, 0));
    expect(r.phase).toBe(JumpingJackPhase.CLOSED);
    expect(r.repCount).toBe(0);
  });

  it("counts one rep after a full open-close cycle", () => {
    const engine = new JumpingJackEngine();
    engine.initialize({});
    const end = driveOneJack(engine, 0);
    const r = engine.processFrame(jackFrame(1, 1, end));
    expect(r.repCount).toBe(1);
    expect(r.validReps).toBe(1);
  });

  it("counts multiple reps", () => {
    const engine = new JumpingJackEngine();
    engine.initialize({});
    let ts = 0;
    ts = driveOneJack(engine, ts);
    ts = driveOneJack(engine, ts);
    const r = engine.processFrame(jackFrame(1, 1, ts));
    expect(r.repCount).toBe(2);
  });

  it("marks a rep invalid when arms never open enough", () => {
    const engine = new JumpingJackEngine();
    engine.initialize({});
    const cfg = JUMPING_JACK_DEFAULT_CONFIG;
    let ts = 0;
    const confirm = (arm: number, leg: number) => {
      for (let i = 0; i < cfg.debounceFrames + 1; i++) {
        engine.processFrame(jackFrame(arm, leg, ts));
        ts += 100;
      }
    };
    confirm(1, 1); // CLOSED
    confirm(cfg.armOpenMinRatio - 0.4, cfg.legOpenMinRatio); // OPENING (arms low)
    confirm(cfg.armOpenMinRatio - 0.4, cfg.legOpenMinRatio); // never reaches OPEN
    confirm(cfg.armOpenMinRatio - 0.4, cfg.legOpenMinRatio); // CLOSING
    confirm(1, 1); // COMPLETE (invalid)
    const r = engine.processFrame(jackFrame(1, 1, ts));
    expect(r.repCount).toBe(1);
    expect(r.invalidReps).toBe(1);
    expect(r.validReps).toBe(0);
  });

  it("pauses scoring when tracking is lost", () => {
    const engine = new JumpingJackEngine();
    engine.initialize({});
    const empty: PoseFrame = {
      landmarks: Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 })),
      timestampMs: 0,
    };
    expect(engine.processFrame(empty).trackingValid).toBe(false);
  });

  it("finalize returns scores in [0,100]", () => {
    const engine = new JumpingJackEngine();
    engine.initialize({});
    const end = driveOneJack(engine, 0);
    engine.processFrame(jackFrame(1, 1, end));
    const m = engine.finalize();
    expect(m.totalReps).toBe(1);
    for (const s of [m.formScore, m.rangeScore, m.consistencyScore, m.tempoScore, m.stabilityScore]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
