import { describe, expect, it } from "vitest";
import { angleBetweenDegrees, leanFromVerticalDegrees, midpoint, scoreFromRange } from "./angles";
import type { NormalizedLandmark } from "./types";

function lm(x: number, y: number, v = 1): NormalizedLandmark {
  return { x, y, z: 0, visibility: v };
}

describe("angleBetweenDegrees", () => {
  it("returns 180 for a straight line", () => {
    const a = lm(0, 0);
    const b = lm(0.5, 0.5);
    const c = lm(1, 1);
    expect(angleBetweenDegrees(a, b, c)).toBeCloseTo(180, 0);
  });

  it("returns 90 for a right angle", () => {
    // b at origin, a up, c right -> 90°
    const a = lm(0.5, 0);
    const b = lm(0.5, 0.5);
    const c = lm(1, 0.5);
    expect(angleBetweenDegrees(a, b, c)).toBeCloseTo(90, 0);
  });

  it("returns 0 for collapsed points", () => {
    const a = lm(0.5, 0.5);
    const b = lm(0.5, 0.5);
    const c = lm(1, 0.5);
    expect(angleBetweenDegrees(a, b, c)).toBeCloseTo(0, 0);
  });

  it("always returns a value in [0, 180]", () => {
    const a = lm(0.2, 0.1);
    const b = lm(0.5, 0.6);
    const c = lm(0.9, 0.3);
    const angle = angleBetweenDegrees(a, b, c);
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThanOrEqual(180);
  });
});

describe("midpoint", () => {
  it("averages two points", () => {
    expect(midpoint(lm(0, 0), lm(1, 1))).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("leanFromVerticalDegrees", () => {
  it("returns 0 when upright", () => {
    expect(leanFromVerticalDegrees({ x: 0.5, y: 0.4 }, { x: 0.5, y: 0.8 })).toBeCloseTo(0, 0);
  });

  it("returns a positive angle when leaning", () => {
    const lean = leanFromVerticalDegrees({ x: 0.5, y: 0.4 }, { x: 0.8, y: 0.8 });
    expect(lean).toBeGreaterThan(0);
  });
});

describe("scoreFromRange", () => {
  it("maps the good range to 0..100", () => {
    expect(scoreFromRange(0, 0, 100)).toBeCloseTo(0, 0);
    expect(scoreFromRange(100, 0, 100)).toBeCloseTo(100, 0);
    expect(scoreFromRange(50, 0, 100)).toBeCloseTo(50, 0);
  });

  it("clamps outside the range", () => {
    expect(scoreFromRange(150, 0, 100)).toBeCloseTo(100, 0);
    expect(scoreFromRange(-50, 0, 100)).toBeCloseTo(0, 0);
  });

  it("supports inverted mapping (lower is better)", () => {
    expect(scoreFromRange(0, 0, 100, true)).toBeCloseTo(100, 0);
    expect(scoreFromRange(100, 0, 100, true)).toBeCloseTo(0, 0);
  });
});
