import { describe, expect, it } from "vitest";
import { toPoseFrame } from "./normalize";

describe("toPoseFrame", () => {
  const landmarks = [{ x: 0.2, y: 0.4, z: -0.1, visibility: 0.9 }];

  it("keeps MediaPipe source coordinates by default", () => {
    expect(toPoseFrame(landmarks, 100).landmarks[0]?.x).toBe(0.2);
  });

  it("can mirror explicitly for non-overlay consumers", () => {
    expect(toPoseFrame(landmarks, 100, true).landmarks[0]?.x).toBe(0.8);
  });
});
