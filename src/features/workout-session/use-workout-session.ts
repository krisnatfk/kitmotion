"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ExerciseConfig,
  ExerciseFrameResult,
  ExerciseSessionMetrics,
  PoseFrame,
} from "@/features/exercise-engine/core/types";
import { createEngine } from "@/features/exercise-engine/registry";
import { NoopSensorProvider } from "@/features/sensor-integration";
import type { SensorSessionSummary } from "@/features/sensor-integration";
import type { FinalizeSessionInput, RepPayload, FeedbackPayload } from "./schema";
import { createClientSessionId, toNonnegativeMilliseconds } from "./payload";

export type WorkoutStatus = "idle" | "ready" | "active" | "paused" | "finished";

export interface LiveState {
  status: WorkoutStatus;
  phase: string;
  repCount: number;
  validReps: number;
  invalidReps: number;
  feedback: ExerciseFrameResult["feedback"];
  trackingValid: boolean;
  liveMetric?: { label: string; value: number };
  elapsedMs: number;
}

export interface UseWorkoutSessionArgs {
  engineKey: string;
  config: ExerciseConfig;
  exerciseSlug: string;
  targetReps: number | null;
  targetSeconds: number | null;
  milestoneLevel: number | null;
}

/**
 * Workout session controller (architecture.md §12).
 *
 * Wires an ExerciseEngine with a SensorProvider (always NoopSensorProvider
 * today) and exposes live state for the UI. Pose frames are fed in via
 * `processFrame`. On `finish`, produces a server-ready FinalizeSessionInput
 * payload. Finalize itself is idempotent on the server (client_session_id).
 */
export function useWorkoutSession({
  engineKey,
  config,
  exerciseSlug,
  targetReps,
  targetSeconds,
  milestoneLevel,
}: UseWorkoutSessionArgs) {
  const engine = useMemo(() => createEngine(engineKey), [engineKey]);
  const sensorProvider = useMemo(() => new NoopSensorProvider(), []);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const sensorSummaryRef = useRef<SensorSessionSummary | null>(null);
  const trackingLossCountRef = useRef(0);
  const previousTrackingValidRef = useRef(true);

  const [live, setLive] = useState<LiveState>({
    status: "idle",
    phase: "ready",
    repCount: 0,
    validReps: 0,
    invalidReps: 0,
    feedback: [],
    trackingValid: false,
    elapsedMs: 0,
  });

  useEffect(() => {
    if (engine) engine.initialize(config);
  }, [engine, config]);

  // Timer tick.
  useEffect(() => {
    if (live.status !== "active") return;
    timerRef.current = window.setInterval(() => {
      setLive((s) => ({ ...s, elapsedMs: Date.now() - startedAtRef.current }));
    }, 250);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [live.status]);

  const start = useCallback(async () => {
    if (!engine) return;
    engine.reset();
    startedAtRef.current = Date.now();
    await sensorProvider.startSession();
    sensorSummaryRef.current = null;
    trackingLossCountRef.current = 0;
    previousTrackingValidRef.current = true;
    setLive({
      status: "active",
      phase: "ready",
      repCount: 0,
      validReps: 0,
      invalidReps: 0,
      feedback: [],
      trackingValid: true,
      elapsedMs: 0,
    });
  }, [engine, sensorProvider]);

  const setReady = useCallback((ready: boolean) => {
    setLive((s) => ({
      ...s,
      status: ready ? "ready" : "idle",
      trackingValid: ready,
    }));
  }, []);

  const processFrame = useCallback(
    (frame: PoseFrame) => {
      if (!engine || live.status !== "active") return;
      const result = engine.processFrame(frame);
      if (previousTrackingValidRef.current && !result.trackingValid) trackingLossCountRef.current += 1;
      previousTrackingValidRef.current = result.trackingValid;
      setLive((s) => ({
        ...s,
        phase: result.phase,
        repCount: result.repCount,
        validReps: result.validReps,
        invalidReps: result.invalidReps,
        feedback: result.feedback,
        trackingValid: result.trackingValid,
        liveMetric: result.liveMetric,
      }));
    },
    [engine, live.status],
  );

  const finish = useCallback(async (): Promise<FinalizeSessionInput | null> => {
    if (!engine) return null;
    const metrics: ExerciseSessionMetrics = engine.finalize();
    const summary = await sensorProvider.stopSession();
    sensorSummaryRef.current = summary;

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const elapsedMs = live.status === "active" ? Date.now() - startedAtRef.current : live.elapsedMs;
    setLive((s) => ({ ...s, status: "finished", elapsedMs }));

    const repetitions: RepPayload[] = metrics.repetitions.map((r) => ({
      repNumber: r.repNumber,
      startedOffsetMs: toNonnegativeMilliseconds(r.startedOffsetMs),
      completedOffsetMs: toNonnegativeMilliseconds(r.completedOffsetMs),
      isValid: r.isValid,
      formScore: roundOrNull(r.metrics.formScore),
      rangeScore: roundOrNull(r.metrics.rangeScore),
      tempoScore: null, // tempo is derived at finalize; not stored per rep
      stabilityScore: roundOrNull(r.metrics.stabilityScore),
      metrics: {
        tempoMs: r.metrics.tempoMs,
        issueCodes: r.metrics.issueCodes,
      },
      issueCodes: r.metrics.issueCodes,
    }));

    const feedback: FeedbackPayload[] = metrics.feedbackSummary.map((f) => ({
      code: f.code,
      severity: f.severity,
      message: f.message,
      occurrenceCount: f.occurrenceCount,
      firstOffsetMs: toNonnegativeMilliseconds(f.firstOffsetMs),
      lastOffsetMs: toNonnegativeMilliseconds(f.lastOffsetMs),
    }));

    // clientSessionId is generated per session attempt; idempotency key for the server.
    const clientSessionId = createClientSessionId();

    return {
      clientSessionId,
      exerciseSlug,
      durationSeconds: Math.max(0, Math.round(elapsedMs / 1000)),
      targetReps,
      targetSeconds,
      milestoneLevel,
      trackingLossCount: trackingLossCountRef.current,
      totalReps: metrics.totalReps,
      validReps: metrics.validReps,
      invalidReps: metrics.invalidReps,
      subScores: {
        formScore: metrics.formScore,
        rangeScore: metrics.rangeScore,
        consistencyScore: metrics.consistencyScore,
        tempoScore: metrics.tempoScore,
        stabilityScore: metrics.stabilityScore,
      },
      repetitions,
      feedback,
      sensorSummary: summary.source === "none" ? null : summary,
    };
  }, [engine, sensorProvider, live.status, live.elapsedMs, exerciseSlug, targetReps, targetSeconds, milestoneLevel]);

  // Cleanup sensor on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      sensorProvider.stopSession().catch(() => {});
    };
  }, [sensorProvider]);

  return { live, start, setReady, processFrame, finish };
}

function roundOrNull(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}
