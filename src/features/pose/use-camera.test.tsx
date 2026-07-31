import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCamera } from "./use-camera";

function mediaStream(label: string, settings: MediaTrackSettings = {}) {
  const stop = vi.fn();
  const track = {
    label,
    stop,
    getSettings: () => settings,
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
      value: {
        getUserMedia,
        enumerateDevices,
        getSupportedConstraints: () => ({ resizeMode: true }),
      },
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
      video: expect.objectContaining({
        facingMode: { exact: "user" },
        width: { ideal: 1280 },
        height: { ideal: 960 },
        aspectRatio: { ideal: 4 / 3 },
        resizeMode: "none",
      }),
      audio: false,
    }));
    unmount();
  });

  it("reopens the selected camera when orientation changes", async () => {
    const portrait = mediaStream("front-portrait");
    const landscape = mediaStream("front-landscape");
    getUserMedia
      .mockResolvedValueOnce(portrait.stream)
      .mockResolvedValueOnce(landscape.stream);
    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.start("user", "portrait");
    });
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({
      video: expect.objectContaining({
        width: { ideal: 960 },
        height: { ideal: 1280 },
        aspectRatio: { ideal: 3 / 4 },
      }),
    }));
    await act(async () => {
      expect(await result.current.reconfigure("landscape")).toBe(true);
    });

    expect(portrait.stop).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({
      video: expect.objectContaining({
        width: { ideal: 1280 },
        height: { ideal: 960 },
        aspectRatio: { ideal: 4 / 3 },
      }),
    }));
    expect(result.current.status).toBe("ready");
    unmount();
  });

  it("ignores an older stream that resolves after a newer orientation request", async () => {
    const older = mediaStream("older");
    const newer = mediaStream("newer");
    let resolveOlder!: (stream: MediaStream) => void;
    let resolveNewer!: (stream: MediaStream) => void;
    getUserMedia
      .mockImplementationOnce(() => new Promise<MediaStream>((resolve) => {
        resolveOlder = resolve;
      }))
      .mockImplementationOnce(() => new Promise<MediaStream>((resolve) => {
        resolveNewer = resolve;
      }));
    const { result, unmount } = renderHook(() => useCamera());
    let olderRequest!: Promise<boolean>;
    let newerRequest!: Promise<boolean>;

    act(() => {
      olderRequest = result.current.start("user", "portrait");
    });
    act(() => {
      newerRequest = result.current.reconfigure("landscape");
    });
    await act(async () => {
      resolveNewer(newer.stream);
      expect(await newerRequest).toBe(true);
    });
    await act(async () => {
      resolveOlder(older.stream);
      expect(await olderRequest).toBe(false);
    });

    expect(older.stop).toHaveBeenCalledTimes(1);
    expect(newer.stop).not.toHaveBeenCalled();
    expect(result.current.status).toBe("ready");
    unmount();
  });

  it("exposes the actual portrait frame ratio from video metadata", async () => {
    const portrait = mediaStream("front", { width: 960, height: 1280 });
    getUserMedia.mockResolvedValue(portrait.stream);
    const { result, unmount } = renderHook(() => useCamera());
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { configurable: true, value: 960 });
    Object.defineProperty(video, "videoHeight", { configurable: true, value: 1280 });
    video.play = vi.fn().mockResolvedValue(undefined);
    result.current.videoRef.current = video;

    await act(async () => {
      await result.current.start("user", "portrait");
    });

    expect(result.current.frameSize).toEqual({ width: 960, height: 1280 });
    expect(result.current.frameAspectRatio).toBeCloseTo(3 / 4);
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
