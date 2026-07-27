import { describe, expect, it } from "vitest";
import { NoopSensorProvider } from "./noop-sensor-provider";
import { featureFlags } from "./feature-flags";

describe("NoopSensorProvider", () => {
  it("reports disabled status and never connected", () => {
    const provider = new NoopSensorProvider();
    expect(provider.getStatus()).toBe("disabled");
  });

  it("startSession resolves without side effects", async () => {
    const provider = new NoopSensorProvider();
    await expect(provider.startSession()).resolves.toBeUndefined();
  });

  it("stopSession returns a none-source empty summary", async () => {
    const provider = new NoopSensorProvider();
    const summary = await provider.stopSession();
    expect(summary).toEqual({
      source: "none",
      sampleCount: 0,
      connectedDurationMs: 0,
    });
    // No sensor-derived metrics leak into the camera-only scoring path.
    expect(summary.stabilityIndex).toBeUndefined();
    expect(summary.tempoVariability).toBeUndefined();
  });

  it("subscribe returns a no-op unsubscribe and never calls the listener", () => {
    const provider = new NoopSensorProvider();
    let calls = 0;
    const unsubscribe = provider.subscribe(() => {
      calls += 1;
    });
    expect(typeof unsubscribe).toBe("function");
    expect(calls).toBe(0);
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe("featureFlags", () => {
  it("iotIntegrationEnabled is false for the application-first MVP", () => {
    expect(featureFlags.iotIntegrationEnabled).toBe(false);
  });
});
