import { describe, expect, it } from "vitest";
import { calculateKilometerSplits, formatDuration, formatPace, haversineDistanceMeters, routeDistanceMeters } from "./metrics";
import type { RunPoint } from "./types";

const point = (lat: number, lng: number, segment = 0): RunPoint => ({
  lat,
  lng,
  segment,
  timestamp: 0,
  elapsedSeconds: 0,
  accuracy: 5,
  altitude: null,
});

describe("running metrics", () => {
  it("computes geographic distance using haversine", () => {
    expect(haversineDistanceMeters(point(0, 0), point(0, 0.008993))).toBeCloseTo(1000, -1);
  });

  it("does not connect separate pause/resume segments", () => {
    expect(routeDistanceMeters([point(0, 0, 0), point(0, 0.001, 0), point(0, 1, 1)])).toBeLessThan(120);
  });

  it("formats activity values", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatPace(305)).toBe("5:05");
  });

  it("interpolates the exact kilometer crossing for splits", () => {
    const route = [
      { ...point(0, 0), elapsedSeconds: 0 },
      { ...point(0, 0.0108), elapsedSeconds: 360 },
    ];
    const splits = calculateKilometerSplits(route);
    expect(splits).toHaveLength(1);
    expect(splits[0]?.paceSeconds).toBeGreaterThan(295);
    expect(splits[0]?.paceSeconds).toBeLessThan(305);
  });
});
