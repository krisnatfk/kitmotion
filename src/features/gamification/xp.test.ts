import { describe, expect, it } from "vitest";
import { computeWorkoutXp, workoutXpIdempotencyKey, XP_BASE, XP_TARGET_BONUS } from "./xp";
import { levelForXp, type LevelDefinition } from "./level";

const LEVELS: LevelDefinition[] = [
  { level: 1, name: "Beginner", minTotalXp: 0 },
  { level: 2, name: "Active Starter", minTotalXp: 100 },
  { level: 3, name: "Intermediate", minTotalXp: 300 },
];

describe("computeWorkoutXp", () => {
  it("applies base + score bonus + target bonus", () => {
    const xp = computeWorkoutXp(90, true);
    // base 20 + floor(90/10)*2 = 18 + target 15 = 53
    expect(xp.base).toBe(XP_BASE);
    expect(xp.scoreBonus).toBe(18);
    expect(xp.targetBonus).toBe(XP_TARGET_BONUS);
    expect(xp.total).toBe(53);
  });

  it("gives no target bonus when the target was not met", () => {
    const xp = computeWorkoutXp(90, false);
    expect(xp.targetBonus).toBe(0);
    expect(xp.total).toBe(38);
  });

  it("clamps score to [0,100] before computing", () => {
    const xp = computeWorkoutXp(150, true);
    expect(xp.scoreBonus).toBe(20); // floor(100/10)*2
  });
});

describe("workoutXpIdempotencyKey", () => {
  it("is stable per session id", () => {
    expect(workoutXpIdempotencyKey("abc")).toBe("workout:abc");
    expect(workoutXpIdempotencyKey("abc")).toBe(workoutXpIdempotencyKey("abc"));
  });
});

describe("levelForXp", () => {
  it("returns level 1 at zero xp", () => {
    expect(levelForXp(0, LEVELS)).toBe(1);
  });
  it("returns level 2 at 100 xp", () => {
    expect(levelForXp(100, LEVELS)).toBe(2);
  });
  it("returns level 3 at 300+ xp", () => {
    expect(levelForXp(500, LEVELS)).toBe(3);
  });
  it("returns 1 when no levels are defined", () => {
    expect(levelForXp(999, [])).toBe(1);
  });
});
