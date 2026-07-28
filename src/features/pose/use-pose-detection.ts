"use client";

import { useEffect, useRef } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseFrame } from "@/features/exercise-engine/core/types";
import { toPoseFrame } from "./normalize";

export interface UsePoseDetectionArgs {
  video: HTMLVideoElement | null;
  landmarker: PoseLandmarker | null;
  active: boolean;
  onFrame: (frame: PoseFrame) => void;
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
}: UsePoseDetectionArgs): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(-1);
  const previousLandmarksRef = useRef<PoseFrame["landmarks"] | null>(null);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

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
            const previous = previousLandmarksRef.current;
            const landmarks = frame.landmarks.map((landmark, index) => {
              const old = previous?.[index];
              if (!old || landmark.visibility < 0.35) return landmark;
              // Give the current frame more weight to avoid visible lag while
              // still removing the small landmark jitter common on phones.
              const currentWeight = 0.72;
              return {
                x: landmark.x * currentWeight + old.x * (1 - currentWeight),
                y: landmark.y * currentWeight + old.y * (1 - currentWeight),
                z: landmark.z * currentWeight + old.z * (1 - currentWeight),
                visibility: landmark.visibility,
              };
            });
            previousLandmarksRef.current = landmarks;
            onFrameRef.current({ ...frame, landmarks });
          }
        } catch {
          // Inference can throw transiently on the first frames; skip silently.
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
