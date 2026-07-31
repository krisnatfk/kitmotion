"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: (mode?: CameraFacingMode) => Promise<boolean>;
  selectFacingMode: (mode: CameraFacingMode) => Promise<boolean>;
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
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    releaseStream();
    setStatus("idle");
  }, [releaseStream]);

  const start = useCallback(async (requestedMode: CameraFacingMode = facingMode) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("Kamera tidak didukung di perangkat ini.");
      return false;
    }

    releaseStream();
    setStatus("requesting");
    setError(null);
    try {
      const stream = await requestCameraStream(requestedMode);
      streamRef.current = stream;
      setFacingMode(requestedMode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus("ready");
      return true;
    } catch (cause) {
      const cameraError = describeCameraError(cause, requestedMode);
      setStatus(cameraError.status);
      setError(cameraError.message);
      return false;
    }
  }, [facingMode, releaseStream]);

  const selectFacingMode = useCallback(async (mode: CameraFacingMode) => {
    if (mode === facingMode && status === "ready") return true;
    if (status === "ready" || status === "requesting" || status === "error") {
      return start(mode);
    }
    setFacingMode(mode);
    setError(null);
    return true;
  }, [facingMode, start, status]);

  useEffect(() => releaseStream, [releaseStream]);

  return {
    status,
    error,
    facingMode,
    isMirrored: facingMode === "user",
    videoRef,
    start,
    selectFacingMode,
    stop,
  };
}

async function requestCameraStream(mode: CameraFacingMode): Promise<MediaStream> {
  const mediaDevices = navigator.mediaDevices;
  const dimensions = preferredDimensions();
  const base = {
    width: { ideal: dimensions.width },
    height: { ideal: dimensions.height },
    aspectRatio: { ideal: dimensions.aspectRatio },
  };

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

function preferredDimensions() {
  const landscape = typeof window !== "undefined"
    && window.matchMedia?.("(orientation: landscape)").matches;
  return landscape
    ? { width: 1280, height: 720, aspectRatio: 16 / 9 }
    : { width: 720, height: 960, aspectRatio: 3 / 4 };
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
