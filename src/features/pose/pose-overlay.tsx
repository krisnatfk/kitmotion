"use client";

import { useEffect, useRef } from "react";
import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";
import { POSE_LANDMARKS } from "@/features/exercise-engine/core/landmarks";

/** Minimal pose skeleton connections (subset relevant to squat/jack/push-up). */
const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
];

const MIN_VISIBILITY = 0.5;

/**
 * Canvas overlay drawn over the camera <video>. Landmarks are in normalized
 * [0,1] image coords; the canvas matches the video's displayed size and is
 * mirrored to match the selfie view. No frame data is stored.
 */
export function PoseOverlay({
  landmarks,
  mirror = true,
}: {
  landmarks: NormalizedLandmark[] | null;
  mirror?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length === 0) return;

    const px = (lm: NormalizedLandmark | undefined) =>
      lm && lm.visibility >= MIN_VISIBILITY
        ? { x: (mirror ? 1 - lm.x : lm.x) * width, y: lm.y * height }
        : null;

    // Connections
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const [a, b] of CONNECTIONS) {
      const pa = px(landmarks[a]);
      const pb = px(landmarks[b]);
      if (pa && pb) {
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }

    // Joints
    ctx.fillStyle = "#111111";
    for (const lm of landmarks) {
      if (lm.visibility < MIN_VISIBILITY) continue;
      const p = px(lm);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks, mirror]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
