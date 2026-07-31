"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceOrientation } from "./use-device-orientation";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

export type CameraFacingMode = "user" | "environment";

export interface UseCamera {
  status: CameraStatus;
  error: string | null;
  facingMode: CameraFacingMode;
  isMirrored: boolean;
  frameSize: { width: number; height: number } | null;
  frameAspectRatio: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: (mode?: CameraFacingMode, orientation?: DeviceOrientation) => Promise<boolean>;
  selectFacingMode: (mode: CameraFacingMode, orientation?: DeviceOrientation) => Promise<boolean>;
  reconfigure: (orientation: DeviceOrientation) => Promise<boolean>;
  stop: () => void;
}

/**
 * Camera permission + stream management (FR-030/031/035/036).
 *
 * Frames remain local. Changing cameras releases the old stream before opening
 * the requested lens so mobile Safari does not keep both cameras locked.
 */
export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestGenerationRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    requestGenerationRef.current += 1;
    releaseStream();
    setFrameSize(null);
    setStatus("idle");
  }, [releaseStream]);

  const start = useCallback(async (
    requestedMode: CameraFacingMode = facingMode,
    orientation: DeviceOrientation = readDeviceOrientation(),
  ) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("Kamera tidak didukung di perangkat ini.");
      return false;
    }

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    releaseStream();
    setFrameSize(null);
    setStatus("requesting");
    setError(null);
    try {
      const stream = await requestCameraStream(requestedMode, orientation);
      if (generation !== requestGenerationRef.current) {
        stopStream(stream);
        return false;
      }
      streamRef.current = stream;
      setFacingMode(requestedMode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await waitForVideoMetadata(videoRef.current);
        await videoRef.current.play().catch(() => undefined);
        if (generation !== requestGenerationRef.current) {
          stopStream(stream);
          return false;
        }
        const trackSettings = stream.getVideoTracks()[0]?.getSettings?.();
        const width = videoRef.current.videoWidth || trackSettings?.width || 0;
        const height = videoRef.current.videoHeight || trackSettings?.height || 0;
        if (width > 0 && height > 0) setFrameSize({ width, height });
      }
      setStatus("ready");
      return true;
    } catch (cause) {
      if (generation !== requestGenerationRef.current) return false;
      const cameraError = describeCameraError(cause, requestedMode);
      setStatus(cameraError.status);
      setError(cameraError.message);
      return false;
    }
  }, [facingMode, releaseStream]);

  const selectFacingMode = useCallback(async (
    mode: CameraFacingMode,
    orientation: DeviceOrientation = readDeviceOrientation(),
  ) => {
    if (mode === facingMode && status === "ready") return true;
    if (status === "ready" || status === "requesting" || status === "error") {
      return start(mode, orientation);
    }
    setFacingMode(mode);
    setError(null);
    return true;
  }, [facingMode, start, status]);

  const reconfigure = useCallback(
    (orientation: DeviceOrientation) => start(facingMode, orientation),
    [facingMode, start],
  );

  useEffect(() => releaseStream, [releaseStream]);

  return {
    status,
    error,
    facingMode,
    isMirrored: facingMode === "user",
    frameSize,
    frameAspectRatio: frameSize ? frameSize.width / frameSize.height : null,
    videoRef,
    start,
    selectFacingMode,
    reconfigure,
    stop,
  };
}

async function requestCameraStream(
  mode: CameraFacingMode,
  orientation: DeviceOrientation,
): Promise<MediaStream> {
  const mediaDevices = navigator.mediaDevices;
  const isLandscape = orientation === "landscape";
  const base: MediaTrackConstraints = {
    width: { ideal: isLandscape ? 1280 : 960 },
    height: { ideal: isLandscape ? 960 : 1280 },
    aspectRatio: { ideal: isLandscape ? 4 / 3 : 3 / 4 },
    frameRate: { ideal: 30, max: 30 },
  };
  const supported = mediaDevices.getSupportedConstraints?.() as
    | (MediaTrackSupportedConstraints & { resizeMode?: boolean })
    | undefined;
  if (supported?.resizeMode) {
    (base as MediaTrackConstraints & { resizeMode?: "none" }).resizeMode = "none";
  }

  try {
    return await mediaDevices.getUserMedia({
      video: { ...base, facingMode: { exact: mode } },
      audio: false,
    });
  } catch (cause) {
    if (!isConstraintFallbackError(cause)) throw cause;
  }

  const deviceId = await findCameraDeviceId(mode);
  if (deviceId) {
    return mediaDevices.getUserMedia({
      video: { ...base, deviceId: { exact: deviceId } },
      audio: false,
    });
  }

  if (mode === "environment") {
    throw new DOMException("Rear camera unavailable", "NotFoundError");
  }

  return mediaDevices.getUserMedia({
    video: { ...base, facingMode: { ideal: "user" } },
    audio: false,
  });
}

async function findCameraDeviceId(mode: CameraFacingMode): Promise<string | null> {
  if (!navigator.mediaDevices.enumerateDevices) return null;
  const devices = (await navigator.mediaDevices.enumerateDevices())
    .filter((device) => device.kind === "videoinput");
  const pattern = mode === "environment"
    ? /(back|rear|environment|belakang|wide)/i
    : /(front|user|depan|facetime)/i;
  return devices.find((device) => pattern.test(device.label))?.deviceId ?? null;
}

function readDeviceOrientation(): DeviceOrientation {
  if (typeof window === "undefined") return "portrait";
  return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return;
  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(done, 1_500);
    function done() {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("resize", done);
      resolve();
    }
    video.addEventListener("loadedmetadata", done, { once: true });
    video.addEventListener("resize", done, { once: true });
  });
}

function isConstraintFallbackError(cause: unknown): boolean {
  const name = (cause as DOMException | undefined)?.name;
  return name === "OverconstrainedError"
    || name === "ConstraintNotSatisfiedError"
    || name === "NotFoundError";
}

function describeCameraError(
  cause: unknown,
  mode: CameraFacingMode,
): { status: CameraStatus; message: string } {
  const name = (cause as DOMException | undefined)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      status: "denied",
      message: "Izin kamera ditolak. Aktifkan kamera melalui pengaturan browser.",
    };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return {
      status: "error",
      message: mode === "environment"
        ? "Kamera belakang tidak tersedia di perangkat ini. Gunakan kamera depan."
        : "Kamera depan tidak tersedia di perangkat ini.",
    };
  }
  return {
    status: "error",
    message: "Tidak dapat mengakses kamera. Tutup aplikasi kamera lain lalu coba lagi.",
  };
}
