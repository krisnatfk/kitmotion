import { describe, expect, it } from "vitest";
import { eligibleDailyExercises, fallbackDailyRecommendation } from "./recommendation";

const exercises = [
  { slug: "squat", name: "Squat" },
  { slug: "jumping-jack", name: "Jumping Jack" },
  { slug: "push-up", name: "Push-up" },
];

describe("daily recommendation rotation", () => {
  it("does not repeat the latest workout or previous recommendation when another option exists", () => {
    const eligible = eligibleDailyExercises(exercises, [
      { exerciseSlug: "squat", score: 72 },
      { exerciseSlug: "jumping-jack", score: 50 },
    ], "jumping-jack");
    expect(eligible.map((item) => item.slug)).toEqual(["push-up"]);
  });

  it("prioritizes an untrained exercise instead of repeatedly selecting squat", () => {
    const recommendation = fallbackDailyRecommendation(exercises, [
      { exerciseSlug: "squat", score: 72 },
      { exerciseSlug: "jumping-jack", score: 0 },
      { exerciseSlug: "squat", score: 65 },
      { exerciseSlug: "squat", score: 65 },
    ], "squat", "user:2026-07-31");
    expect(recommendation.exerciseSlug).toBe("push-up");
  });

  it("keeps at least one candidate when only two exercises exist", () => {
    const eligible = eligibleDailyExercises(exercises.slice(0, 2), [
      { exerciseSlug: "squat", score: 72 },
    ], "jumping-jack");
    expect(eligible.map((item) => item.slug)).toEqual(["jumping-jack"]);
  });
});
