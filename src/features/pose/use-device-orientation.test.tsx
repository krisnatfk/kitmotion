import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDeviceOrientation } from "./use-device-orientation";

describe("useDeviceOrientation", () => {
  it("updates when the device rotates", () => {
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
      media.matches = true;
      listeners.forEach((listener) => listener());
    });
    expect(result.current).toBe("landscape");

    unmount();
    vi.restoreAllMocks();
  });
});
