import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCamera } from "./use-camera";

function mediaStream(label: string) {
  const stop = vi.fn();
  const track = {
    label,
    stop,
    getSettings: () => ({}),
  };
  return {
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
    stop,
  };
}

describe("useCamera", () => {
  const getUserMedia = vi.fn();
  const enumerateDevices = vi.fn();

  beforeEach(() => {
    getUserMedia.mockReset();
    enumerateDevices.mockReset();
    enumerateDevices.mockResolvedValue([]);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia, enumerateDevices },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the mirrored front camera by default", async () => {
    const front = mediaStream("front");
    getUserMedia.mockResolvedValue(front.stream);
    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      expect(await result.current.start()).toBe(true);
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.facingMode).toBe("user");
    expect(result.current.isMirrored).toBe(true);
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({
      video: expect.objectContaining({ facingMode: { exact: "user" } }),
      audio: false,
    }));
    unmount();
  });

  it("releases the old stream and removes mirroring for the rear camera", async () => {
    const front = mediaStream("front");
    const rear = mediaStream("rear");
    getUserMedia
      .mockResolvedValueOnce(front.stream)
      .mockResolvedValueOnce(rear.stream);
    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      expect(await result.current.selectFacingMode("environment")).toBe(true);
    });

    expect(front.stop).toHaveBeenCalledTimes(1);
    expect(result.current.facingMode).toBe("environment");
    expect(result.current.isMirrored).toBe(false);
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({
      video: expect.objectContaining({ facingMode: { exact: "environment" } }),
    }));
    unmount();
  });

  it("falls back to a labeled rear device when facingMode exact is unavailable", async () => {
    const rear = mediaStream("rear");
    getUserMedia
      .mockRejectedValueOnce(new DOMException("constraint", "OverconstrainedError"))
      .mockResolvedValueOnce(rear.stream);
    enumerateDevices.mockResolvedValue([
      { kind: "videoinput", deviceId: "rear-id", label: "Back Camera" },
    ]);
    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      expect(await result.current.start("environment")).toBe(true);
    });

    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({
      video: expect.objectContaining({ deviceId: { exact: "rear-id" } }),
    }));
    expect(result.current.facingMode).toBe("environment");
    unmount();
  });

  it("reports denied camera permission", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      expect(await result.current.start()).toBe(false);
    });

    expect(result.current.status).toBe("denied");
    expect(result.current.error).toContain("Izin kamera ditolak");
  });
});
