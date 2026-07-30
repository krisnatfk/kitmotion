import { describe, expect, it } from "vitest";
import { milestoneRequirementsMet } from "./milestones";

const requirements = {
  targetReps: 30,
  minimumScore: 80,
  maxFormErrors: 3,
  requireTrackingContinuity: true,
};

describe("milestone requirements", () => {
  it("requires every configured condition", () => {
    expect(milestoneRequirementsMet(requirements, { validReps: 30, finalScore: 80, invalidReps: 3, trackingLossCount: 0 })).toBe(true);
    expect(milestoneRequirementsMet(requirements, { validReps: 29, finalScore: 90, invalidReps: 0, trackingLossCount: 0 })).toBe(false);
    expect(milestoneRequirementsMet(requirements, { validReps: 35, finalScore: 79, invalidReps: 0, trackingLossCount: 0 })).toBe(false);
    expect(milestoneRequirementsMet(requirements, { validReps: 35, finalScore: 90, invalidReps: 4, trackingLossCount: 0 })).toBe(false);
    expect(milestoneRequirementsMet(requirements, { validReps: 35, finalScore: 90, invalidReps: 0, trackingLossCount: 1 })).toBe(false);
  });
});
