"use client";

import { useEffect, useRef } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseFrame } from "@/features/exercise-engine/core/types";
import { toPoseFrame } from "./normalize";
import { smoothPoseFrame } from "./smoothing";

export interface UsePoseDetectionArgs {
  video: HTMLVideoElement | null;
  landmarker: PoseLandmarker | null;
  active: boolean;
  onFrame: (frame: PoseFrame) => void;
  onError?: (error: unknown) => void;
}

/**
 * Runs a requestAnimationFrame loop that calls `landmarker.detectForVideo` on
 * each new video frame and forwards a normalized PoseFrame to `onFrame`.
 *
 * - Skips work when the video isn't producing new frames (currentTime unchanged)
 *   to avoid redundant inference.
 * - Stops cleanly on unmount / when `active` is false (FR-035 cleanup).
 */
export function usePoseDetection({
  video,
  landmarker,
  active,
  onFrame,
  onError,
}: UsePoseDetectionArgs): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(-1);
  const previousLandmarksRef = useRef<PoseFrame["landmarks"] | null>(null);
  const onFrameRef = useRef(onFrame);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!active || !video || !landmarker) return;

    const loop = () => {
      const currentTime = video.currentTime;
      if (currentTime !== lastTimeRef.current && video.readyState >= 2) {
        lastTimeRef.current = currentTime;
        try {
          const result = landmarker.detectForVideo(video, performance.now());
          const frame = toPoseFrame(result.landmarks?.[0], performance.now());
          if (frame.landmarks.length === 0) {
            previousLandmarksRef.current = null;
            onFrameRef.current(frame);
          } else {
            const smoothed = smoothPoseFrame(frame, previousLandmarksRef.current);
            previousLandmarksRef.current = smoothed.landmarks;
            onFrameRef.current(smoothed);
          }
        } catch (error) {
          // Inference can throw transiently on the first frames. Workout flows
          // may ignore it, while the calibration tool records the failures.
          onErrorRef.current?.(error);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      previousLandmarksRef.current = null;
      lastTimeRef.current = -1;
    };
  }, [active, video, landmarker]);
}
