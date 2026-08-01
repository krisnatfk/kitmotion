import { describe, expect, it } from "vitest";
import { ChinningUpEngine } from "./engine";
import { pullUpFrame } from "../pull-up/test-frames";

describe("ChinningUpEngine", () => {
  it("accumulates only time held with the chin above the bar", () => {
    const engine = new ChinningUpEngine();
    engine.initialize({});
    for (let index = 0; index <= 10; index += 1) {
      engine.processFrame(pullUpFrame("top", 1000 + index * 100));
    }
    const beforeDrop = engine.finalize().validDurationMs;
    engine.processFrame(pullUpFrame("mid", 2200));
    engine.processFrame(pullUpFrame("mid", 2300));
    const afterDrop = engine.finalize().validDurationMs;
    expect(beforeDrop).toBe(1000);
    expect(afterDrop).toBe(1000);
  });

  it("returns live duration progress for the timed HUD", () => {
    const engine = new ChinningUpEngine();
    engine.initialize({});
    engine.processFrame(pullUpFrame("top", 1000));
    const result = engine.processFrame(pullUpFrame("top", 1250));
    expect(result.phase).toBe("holding");
    expect(result.validDurationMs).toBe(250);
    expect(result.repCount).toBe(0);
  });

  it("pauses valid time while the body swings", () => {
    const engine = new ChinningUpEngine();
    engine.initialize({ bodySwingMaxRatio: 0.04 });
    engine.processFrame(pullUpFrame("top", 1000));
    const result = engine.processFrame(pullUpFrame("top", 1100, 0.18));
    expect(result.phase).toBe("adjust");
    expect(result.feedback.map((item) => item.code)).toContain("swinging");
    expect(result.validDurationMs).toBe(0);
  });
});
