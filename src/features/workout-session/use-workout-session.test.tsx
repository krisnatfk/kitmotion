import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SQUAT_DEFAULT_CONFIG, SQUAT_ENGINE_KEY } from "@/features/exercise-engine/squat/config";
import { useWorkoutSession } from "./use-workout-session";

describe("useWorkoutSession", () => {
  it("resets a completed attempt to a clean preparation state", async () => {
    const { result } = renderHook(() => useWorkoutSession({
      engineKey: SQUAT_ENGINE_KEY,
      config: { ...SQUAT_DEFAULT_CONFIG },
      exerciseSlug: "squat",
      targetReps: 12,
      targetSeconds: null,
      milestoneLevel: null,
    }));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.live.status).toBe("active");

    act(() => {
      result.current.reset();
    });

    expect(result.current.live).toMatchObject({
      status: "idle",
      phase: "ready",
      repCount: 0,
      validReps: 0,
      invalidReps: 0,
      feedback: [],
      trackingValid: false,
      elapsedMs: 0,
    });
  });
});
