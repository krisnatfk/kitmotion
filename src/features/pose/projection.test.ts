import { describe, expect, it } from "vitest";
import { getContainProjection, getCoverProjection, projectLandmark } from "./projection";

describe("pose overlay projection", () => {
  it("accounts for horizontal crop when a 16:9 camera fills a portrait card", () => {
    const projection = getCoverProjection(300, 400, 1280, 720);
    expect(projection.renderedHeight).toBeCloseTo(400);
    expect(projection.renderedWidth).toBeCloseTo(711.11, 1);
    expect(projection.cropX).toBeLessThan(0);
    expect(projectLandmark({ x: 0.5, y: 0.5 }, projection, false)).toEqual({
      x: 150,
      y: 200,
    });
  });

  it("mirrors a landmark exactly once", () => {
    const projection = getCoverProjection(1600, 900, 1600, 900);
    expect(projectLandmark({ x: 0.2, y: 0.4 }, projection, true)).toEqual({
      x: 1280,
      y: 360,
    });
  });

  it("keeps the full camera frame visible with centered letterboxing", () => {
    const projection = getContainProjection(300, 400, 1280, 720);
    expect(projection.renderedWidth).toBeCloseTo(300);
    expect(projection.renderedHeight).toBeCloseTo(168.75);
    expect(projection.cropX).toBeCloseTo(0);
    expect(projection.cropY).toBeCloseTo(115.625);
    expect(projectLandmark({ x: 0, y: 0 }, projection, false)).toEqual({
      x: 0,
      y: 115.625,
    });
  });
});
