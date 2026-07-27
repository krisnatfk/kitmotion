import { describe, expect, it } from "vitest";
import {
  computeFinalScore,
  gradeForScore,
  SCORE_WEIGHTS,
  SCORING_VERSION,
} from "./scoring";

describe("computeFinalScore", () => {
  it("weights sub-scores into a 0–100 final", () => {
    const r = computeFinalScore({
      formScore: 100,
      rangeScore: 100,
      consistencyScore: 100,
      tempoScore: 100,
      stabilityScore: 100,
    });
    expect(r.finalScore).toBe(100);
    expect(r.grade).toBe("A");
  });

  it("returns 0 / grade E for empty input", () => {
    const r = computeFinalScore({});
    expect(r.finalScore).toBe(0);
    expect(r.grade).toBe("E");
  });

  it("clamps out-of-range client values to [0,100]", () => {
    const r = computeFinalScore({
      formScore: 150,
      rangeScore: -20,
      consistencyScore: 100,
      tempoScore: 100,
      stabilityScore: 100,
    });
    expect(r.formScore).toBe(100);
    expect(r.rangeScore).toBe(0);
    expect(r.finalScore).toBeLessThanOrEqual(100);
    expect(r.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("applies the documented weights (40/25/15/10/10)", () => {
    expect(SCORE_WEIGHTS.form).toBe(40);
    expect(SCORE_WEIGHTS.range).toBe(25);
    expect(SCORE_WEIGHTS.consistency).toBe(15);
    expect(SCORE_WEIGHTS.tempo).toBe(10);
    expect(SCORE_WEIGHTS.stability).toBe(10);
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("is versioned", () => {
    expect(SCORING_VERSION).toBe("cam-v1");
  });
});

describe("gradeForScore", () => {
  it("maps score ranges to grades A–E", () => {
    expect(gradeForScore(95)).toBe("A");
    expect(gradeForScore(90)).toBe("A");
    expect(gradeForScore(89)).toBe("B");
    expect(gradeForScore(80)).toBe("B");
    expect(gradeForScore(75)).toBe("C");
    expect(gradeForScore(65)).toBe("D");
    expect(gradeForScore(59)).toBe("E");
    expect(gradeForScore(0)).toBe("E");
  });
});
