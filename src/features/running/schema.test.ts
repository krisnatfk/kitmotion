import { describe, expect, it } from "vitest";
import { finalizeRunSchema } from "./schema";

const base = {
  clientSessionId: "4cf155e6-7598-4873-882b-4ce96f214e2f",
  startedAt: "2026-07-28T08:00:00.000Z",
  durationSeconds: 120,
  route: [
    { lat: -6.2, lng: 106.8, timestamp: 1000, elapsedSeconds: 0, accuracy: 8, altitude: null, segment: 0 },
    { lat: -6.2, lng: 106.801, timestamp: 2000, elapsedSeconds: 1, accuracy: 8, altitude: null, segment: 0 },
  ],
};

describe("finalizeRunSchema", () => {
  it("accepts an ordered GPS route", () => {
    expect(finalizeRunSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a route whose timestamps move backwards", () => {
    const value = structuredClone(base);
    value.route[1]!.timestamp = 500;
    expect(finalizeRunSchema.safeParse(value).success).toBe(false);
  });

  it("rejects impossible coordinates", () => {
    const value = structuredClone(base);
    value.route[0]!.lat = 120;
    expect(finalizeRunSchema.safeParse(value).success).toBe(false);
  });
});
