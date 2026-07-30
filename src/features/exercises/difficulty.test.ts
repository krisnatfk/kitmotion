import { describe, expect, it } from "vitest";
import { exerciseConfigForLevel, targetRepsForLevel } from "./difficulty";

describe("level-based exercise difficulty", () => {
  it("raises repetition targets gradually", () => {
    expect(targetRepsForLevel(12, 1)).toBe(12);
    expect(targetRepsForLevel(12, 10)).toBe(20);
    expect(targetRepsForLevel(null, 20)).toBeNull();
  });

  it("tightens push-up and jumping-jack tolerances at higher tiers", () => {
    const push = exerciseConfigForLevel("push-up", { hipSagMaxDrop: 0.12 }, 20);
    const jack = exerciseConfigForLevel("jumping-jack", { symmetryMaxDelta: 0.15 }, 20);
    expect(Number(push.hipSagMaxDrop)).toBeLessThan(0.12);
    expect(Number(jack.symmetryMaxDelta)).toBeLessThan(0.15);
  });
});
