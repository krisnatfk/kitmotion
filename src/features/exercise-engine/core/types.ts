/**
 * Shared exercise-engine types (architecture.md §11).
 *
 * The engine is pure: no React, no Supabase, no DOM, no IoT. It consumes
 * pose frames and emits phase/rep/feedback/metrics. The workout session wires
 * a real SensorProvider (NoopSensorProvider today) alongside the engine.
 */

/** A single normalized pose landmark (MediaPipe convention, values in [0,1]). */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  /** MediaPipe visibility/presence score in [0,1]. Used for confidence filtering. */
  visibility: number;
}

/** One pose sample delivered to the engine. */
export interface PoseFrame {
  landmarks: NormalizedLandmark[];
  /** MediaPipe metric 3D landmarks. Needed when body depth is hidden by a front camera view. */
  worldLandmarks?: NormalizedLandmark[];
  timestampMs: number;
}

export type FeedbackSeverity = "info" | "warning" | "critical";

export interface FrameFeedback {
  code: string;
  severity: FeedbackSeverity;
  message: string;
}

/** Metrics captured for a single completed repetition. */
export interface RepMetrics {
  formScore: number;
  rangeScore: number;
  tempoMs: number;
  stabilityScore: number;
  issueCodes: string[];
}

export interface RepRecord {
  repNumber: number;
  startedOffsetMs: number;
  completedOffsetMs: number;
  isValid: boolean;
  metrics: RepMetrics;
}

/** Aggregated feedback counts across a session (for session_feedback rows). */
export interface FeedbackSummary {
  code: string;
  severity: FeedbackSeverity;
  message: string;
  occurrenceCount: number;
  firstOffsetMs: number;
  lastOffsetMs: number;
}

/** Result of processing one frame — drives live UI (phase, count, feedback). */
export interface ExerciseFrameResult {
  phase: string;
  repCount: number;
  validReps: number;
  invalidReps: number;
  feedback: FrameFeedback[];
  /** False when tracking is lost — the session pauses scoring. */
  trackingValid: boolean;
  /** Optional live metric for display (e.g. current knee angle). */
  liveMetric?: { label: string; value: number };
}

/** Final aggregate produced by finalize(). */
export interface ExerciseSessionMetrics {
  totalReps: number;
  validReps: number;
  invalidReps: number;
  repetitions: RepRecord[];
  feedbackSummary: FeedbackSummary[];
  formScore: number;
  rangeScore: number;
  consistencyScore: number;
  tempoScore: number;
  stabilityScore: number;
  durationMs: number;
}

/** Tunable per-engine config (stored as jsonb in exercise_versions.config). */
export type ExerciseConfig = Record<string, unknown>;

/**
 * Engine contract (architecture.md §11). Engines must NOT depend on React,
 * Supabase, the DOM, or IoT.
 */
export interface ExerciseEngine {
  initialize(config: ExerciseConfig): void;
  processFrame(frame: PoseFrame): ExerciseFrameResult;
  finalize(): ExerciseSessionMetrics;
  reset(): void;
}
