import { describe, expect, it } from "vitest";
import { createClientSessionId, toNonnegativeMilliseconds } from "./payload";
import { finalizeSessionSchema } from "./schema";

const BASE_PAYLOAD = {
  clientSessionId: "550e8400-e29b-41d4-a716-446655440000",
  exerciseSlug: "squat",
  durationSeconds: 12,
  targetReps: 15,
  targetSeconds: null,
  totalReps: 1,
  validReps: 1,
  invalidReps: 0,
  subScores: {
    formScore: 90,
    rangeScore: 88,
    consistencyScore: 100,
    tempoScore: 85,
    stabilityScore: 92,
  },
  repetitions: [
    {
      repNumber: 1,
      startedOffsetMs: 100.35,
      completedOffsetMs: 1450.78,
      isValid: true,
      formScore: 90,
      rangeScore: 88,
      tempoScore: null,
      stabilityScore: 92,
      metrics: { tempoMs: 1350.43 },
      issueCodes: [],
    },
  ],
  feedback: [
    {
      code: "good",
      severity: "info" as const,
      message: "Gerakan baik.",
      occurrenceCount: 1,
      firstOffsetMs: 100.35,
      lastOffsetMs: 1450.78,
    },
  ],
  sensorSummary: null,
};

describe("finalizeSessionSchema", () => {
  it("normalizes fractional camera timestamps into database-safe integers", () => {
    const result = finalizeSessionSchema.safeParse(BASE_PAYLOAD);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.repetitions[0]?.startedOffsetMs).toBe(100);
    expect(result.data.repetitions[0]?.completedOffsetMs).toBe(1451);
    expect(result.data.feedback[0]?.firstOffsetMs).toBe(100);
    expect(result.data.feedback[0]?.lastOffsetMs).toBe(1451);
  });

  it("still rejects fractional repetition counts", () => {
    const result = finalizeSessionSchema.safeParse({ ...BASE_PAYLOAD, totalReps: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects repetition number zero and empty feedback occurrences", () => {
    const badRep = finalizeSessionSchema.safeParse({
      ...BASE_PAYLOAD,
      repetitions: [{ ...BASE_PAYLOAD.repetitions[0], repNumber: 0 }],
    });
    const badFeedback = finalizeSessionSchema.safeParse({
      ...BASE_PAYLOAD,
      feedback: [{ ...BASE_PAYLOAD.feedback[0], occurrenceCount: 0 }],
    });

    expect(badRep.success).toBe(false);
    expect(badFeedback.success).toBe(false);
  });

  it("accepts only milestone levels in multiples of ten", () => {
    expect(finalizeSessionSchema.safeParse({ ...BASE_PAYLOAD, milestoneLevel: 10, trackingLossCount: 0 }).success).toBe(true);
    expect(finalizeSessionSchema.safeParse({ ...BASE_PAYLOAD, milestoneLevel: 11, trackingLossCount: 0 }).success).toBe(false);
    expect(finalizeSessionSchema.safeParse({ ...BASE_PAYLOAD, milestoneLevel: 10, trackingLossCount: -1 }).success).toBe(false);
  });
});

describe("workout payload helpers", () => {
  it("rounds and clamps millisecond values", () => {
    expect(toNonnegativeMilliseconds(12.6)).toBe(13);
    expect(toNonnegativeMilliseconds(-4)).toBe(0);
    expect(toNonnegativeMilliseconds(Number.NaN)).toBe(0);
  });

  it("always creates a UUID accepted by the session schema", () => {
    const clientSessionId = createClientSessionId();
    const result = finalizeSessionSchema.safeParse({ ...BASE_PAYLOAD, clientSessionId });
    expect(result.success).toBe(true);
  });
});
