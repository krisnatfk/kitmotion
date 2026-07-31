import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDeviceOrientation } from "./use-device-orientation";

describe("useDeviceOrientation", () => {
  it("updates when the device rotates", () => {
    vi.useFakeTimers();
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    const listeners = new Set<() => void>();
    const media = {
      matches: false,
      media: "(orientation: landscape)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, listener: () => void) => listeners.add(listener)),
      removeEventListener: vi.fn((_event: string, listener: () => void) => listeners.delete(listener)),
      dispatchEvent: vi.fn(),
    };
    vi.spyOn(window, "matchMedia").mockReturnValue(media);
    const { result, unmount } = renderHook(() => useDeviceOrientation());

    expect(result.current).toBe("portrait");
    act(() => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 844 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 390 });
      media.matches = true;
      listeners.forEach((listener) => listener());
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe("landscape");

    unmount();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
