import { describe, expect, it, vi } from "vitest";
import { withTimeoutFallback } from "./async";

describe("withTimeoutFallback", () => {
  it("returns the operation result when it resolves", async () => {
    await expect(withTimeoutFallback(Promise.resolve("ready"), "fallback", 50)).resolves.toBe("ready");
  });

  it("returns the fallback when the operation rejects", async () => {
    await expect(withTimeoutFallback(Promise.reject(new Error("offline")), "fallback", 50)).resolves.toBe("fallback");
  });

  it("returns the fallback when the operation exceeds its deadline", async () => {
    vi.useFakeTimers();
    const result = withTimeoutFallback(new Promise<string>(() => undefined), "fallback", 50);
    await vi.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toBe("fallback");
    vi.useRealTimers();
  });
});
