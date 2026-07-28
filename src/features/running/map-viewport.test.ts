import { describe, expect, it } from "vitest";
import { selectViewportPoints } from "./map-viewport";
import type { RunPoint } from "./types";

function point(lat: number, accuracy: number): RunPoint {
  return {
    lat,
    lng: 106.8,
    timestamp: 0,
    elapsedSeconds: 0,
    accuracy,
    altitude: null,
    segment: 0,
  };
}

describe("running map viewport", () => {
  it("ignores a coarse acquisition point when accurate fixes are available", () => {
    const route = [point(-6.3, 65), point(-6.2, 8), point(-6.2001, 9), point(-6.2002, 10)];
    expect(selectViewportPoints(route)).toEqual(route.slice(1));
  });

  it("keeps the complete route when too few precise fixes are available", () => {
    const route = [point(-6.3, 55), point(-6.2, 54), point(-6.1, 10)];
    expect(selectViewportPoints(route)).toEqual(route);
  });
});

