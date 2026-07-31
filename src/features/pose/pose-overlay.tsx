"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";
import { POSE_LANDMARKS as P } from "@/features/exercise-engine/core/landmarks";
import { getContainProjection, getCoverProjection, projectLandmark } from "./projection";

const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [P.LEFT_EAR, P.LEFT_EYE_OUTER], [P.LEFT_EYE_OUTER, P.LEFT_EYE],
  [P.LEFT_EYE, P.NOSE], [P.NOSE, P.RIGHT_EYE],
  [P.RIGHT_EYE, P.RIGHT_EYE_OUTER], [P.RIGHT_EYE_OUTER, P.RIGHT_EAR],
  [P.MOUTH_LEFT, P.MOUTH_RIGHT],
  [P.LEFT_SHOULDER, P.RIGHT_SHOULDER],
  [P.LEFT_SHOULDER, P.LEFT_ELBOW], [P.RIGHT_SHOULDER, P.RIGHT_ELBOW],
  [P.LEFT_ELBOW, P.LEFT_WRIST], [P.RIGHT_ELBOW, P.RIGHT_WRIST],
  [P.LEFT_WRIST, P.LEFT_INDEX], [P.RIGHT_WRIST, P.RIGHT_INDEX],
  [P.LEFT_WRIST, P.LEFT_PINKY], [P.RIGHT_WRIST, P.RIGHT_PINKY],
  [P.LEFT_SHOULDER, P.LEFT_HIP], [P.RIGHT_SHOULDER, P.RIGHT_HIP],
  [P.LEFT_HIP, P.RIGHT_HIP],
  [P.LEFT_HIP, P.LEFT_KNEE], [P.RIGHT_HIP, P.RIGHT_KNEE],
  [P.LEFT_KNEE, P.LEFT_ANKLE], [P.RIGHT_KNEE, P.RIGHT_ANKLE],
  [P.LEFT_ANKLE, P.LEFT_HEEL], [P.RIGHT_ANKLE, P.RIGHT_HEEL],
  [P.LEFT_HEEL, P.LEFT_FOOT_INDEX], [P.RIGHT_HEEL, P.RIGHT_FOOT_INDEX],
  [P.LEFT_ANKLE, P.LEFT_FOOT_INDEX], [P.RIGHT_ANKLE, P.RIGHT_FOOT_INDEX],
];

const MIN_VISIBILITY = 0.5;
const ARM = [P.LEFT_SHOULDER, P.RIGHT_SHOULDER, P.LEFT_ELBOW, P.RIGHT_ELBOW, P.LEFT_WRIST, P.RIGHT_WRIST];
const LEG = [P.LEFT_HIP, P.RIGHT_HIP, P.LEFT_KNEE, P.RIGHT_KNEE, P.LEFT_ANKLE, P.RIGHT_ANKLE];
const TORSO = [P.LEFT_SHOULDER, P.RIGHT_SHOULDER, P.LEFT_HIP, P.RIGHT_HIP];

const ISSUE_LANDMARKS: Record<string, number[]> = {
  "back-bend": TORSO,
  "shallow-depth": LEG,
  "knee-cavein": LEG,
  "arms-too-low": ARM,
  "legs-too-narrow": LEG,
  asymmetry: [...ARM, ...LEG],
  "hips-too-low": [...TORSO, P.LEFT_KNEE, P.RIGHT_KNEE],
  "hips-too-high": [...TORSO, P.LEFT_KNEE, P.RIGHT_KNEE],
  "elbows-not-bent": ARM,
  unstable: [...TORSO, ...ARM, ...LEG],
};

/**
 * Draws landmarks in the exact pixels occupied by the fitted video.
 * MediaPipe coordinates describe the uncropped camera frame, so the overlay
 * must apply the same scale and offset as CSS object-fit before mirroring.
 */
export function PoseOverlay({
  landmarks,
  videoRef,
  mirror = true,
  fit = "cover",
  issueCodes = [],
}: {
  landmarks: NormalizedLandmark[] | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  mirror?: boolean;
  fit?: "cover" | "contain";
  issueCodes?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef<() => void>(() => undefined);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!landmarks?.length) return;

    const sourceWidth = video?.videoWidth || width;
    const sourceHeight = video?.videoHeight || height;
    const projection = fit === "contain"
      ? getContainProjection(width, height, sourceWidth, sourceHeight)
      : getCoverProjection(width, height, sourceWidth, sourceHeight);
    const problemLandmarks = new Set(
      issueCodes.flatMap((code) => ISSUE_LANDMARKS[code] ?? []),
    );

    const point = (landmark: NormalizedLandmark | undefined) => {
      if (!landmark || landmark.visibility < MIN_VISIBILITY) return null;
      return projectLandmark(landmark, projection, mirror);
    };

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [from, to] of CONNECTIONS) {
      const start = point(landmarks[from]);
      const end = point(landmarks[to]);
      if (!start || !end) continue;
      const hasIssue = problemLandmarks.has(from) || problemLandmarks.has(to);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = hasIssue ? "#ff7657" : "rgba(255,255,255,0.92)";
      ctx.lineWidth = hasIssue ? 5 : 3;
      ctx.shadowColor = hasIssue ? "rgba(255,86,48,0.65)" : "rgba(0,0,0,0.45)";
      ctx.shadowBlur = hasIssue ? 12 : 5;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    landmarks.forEach((landmark, index) => {
      const current = point(landmark);
      if (!current) return;
      const hasIssue = problemLandmarks.has(index);
      ctx.beginPath();
      ctx.arc(current.x, current.y, hasIssue ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = hasIssue ? "#ff7657" : "#c8ff2e";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(10,11,10,0.8)";
      ctx.stroke();
    });
  }, [fit, issueCodes, landmarks, mirror, videoRef]);

  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const redraw = () => drawRef.current();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    video?.addEventListener("loadedmetadata", redraw);
    return () => {
      observer.disconnect();
      video?.removeEventListener("loadedmetadata", redraw);
    };
  }, [videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
