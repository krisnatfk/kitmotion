"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

export interface UseCamera {
  status: CameraStatus;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Camera permission + stream management (FR-030/031/035/036).
 *
 * The stream is attached to a <video> element via the returned ref. Frames are
 * NEVER captured, stored, or uploaded — the video is read locally by the pose
 * loop and discarded. Tracks are stopped on stop()/unmount.
 */
export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("Kamera tidak didukung di perangkat ini.");
      return;
    }
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("ready");
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError("Izin kamera ditolak. Aktifkan di pengaturan browser.");
      } else {
        setStatus("error");
        setError("Tidak dapat mengakses kamera. Coba lagi.");
      }
    }
  }, []);

  // Cleanup on unmount — guarantees the camera is released (FR-035).
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { status, error, videoRef, start, stop };
}
