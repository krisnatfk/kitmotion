"use client";

import { FilesetResolver, PoseLandmarker, type PoseLandmarkerOptions } from "@mediapipe/tasks-vision";
import { env } from "@/lib/env";

/**
 * Lazily create a singleton PoseLandmarker. The model + WASM are fetched from
 * CDN only when this is first called — i.e. only on /workout routes (FR-045).
 *
 * Never invoked on the server: this module is client-only ("use client") and
 * callers guard on a running video element.
 */
let landmarkerPromise: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(env.mediapipeWasmPath);
    const options: PoseLandmarkerOptions = {
      baseOptions: {
        modelAssetPath: env.mediapipeModelPath,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    const landmarker = await PoseLandmarker.createFromOptions(vision, options);
    return landmarker;
  })();

  // If creation fails, clear the cache so the next attempt can retry.
  landmarkerPromise.catch(() => {
    landmarkerPromise = null;
  });

  return landmarkerPromise;
}

/** Release the landmarker (call on workout exit). */
export function releasePoseLandmarker(): void {
  landmarkerPromise?.then((l) => l.close()).catch(() => {});
  landmarkerPromise = null;
}
