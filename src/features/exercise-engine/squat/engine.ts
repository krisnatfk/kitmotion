import type {
  ExerciseConfig,
  ExerciseEngine,
  ExerciseFrameResult,
  ExerciseSessionMetrics,
  FrameFeedback,
  NormalizedLandmark,
  PoseFrame,
  RepRecord,
  RepMetrics,
  FeedbackSummary,
} from "../core/types";
import { angleBetweenDegrees, leanFromVerticalDegrees, midpoint, scoreFromRange } from "../core/angles";
import { POSE_LANDMARKS } from "../core/landmarks";
import { SquatPhase } from "./phases";
import { SQUAT_FEEDBACK } from "./feedback";
import {
  parseSquatConfig,
  SQUAT_DEFAULT_CONFIG,
  type SquatConfig,
} from "./config";

interface SquatRep {
  startedAtMs: number;
  completedAtMs: number;
  minKneeAngle: number; // depth reached
  maxLean: number;
  maxCavein: number;
  issueCodes: Set<string>;
  valid: boolean;
}

/**
 * Squat repetition counter.
 *
 * State machine: READY -> DESCENDING -> BOTTOM -> ASCENDING -> COMPLETE (rep++).
 * Debounce: a transition must be confirmed by `debounceFrames` consecutive
 * frames before it commits (anti-jitter). Reps are only counted once the full
 * cycle completes and the bottom depth reached `kneeBottomMax`.
 *
 * Pure: no React/DOM/Supabase/IoT.
 */
export class SquatEngine implements ExerciseEngine {
  private config: SquatConfig = SQUAT_DEFAULT_CONFIG;
  private phase: SquatPhase = SquatPhase.READY;
  private repCount = 0;
  private validReps = 0;
  private invalidReps = 0;
  private repetitions: RepRecord[] = [];
  private feedbackCounts = new Map<string, { count: number; first: number; last: number }>();
  private currentRep: SquatRep | null = null;
  private pendingPhase: SquatPhase | null = null;
  private pendingCount = 0;
  private startMs = 0;
  private lastFrameMs = 0;

  initialize(config: ExerciseConfig): void {
    this.config = parseSquatConfig(config);
    this.reset();
  }

  reset(): void {
    this.phase = SquatPhase.READY;
    this.repCount = 0;
    this.validReps = 0;
    this.invalidReps = 0;
    this.repetitions = [];
    this.feedbackCounts.clear();
    this.currentRep = null;
    this.pendingPhase = null;
    this.pendingCount = 0;
    this.startMs = 0;
    this.lastFrameMs = 0;
  }

  processFrame(frame: PoseFrame): ExerciseFrameResult {
    if (this.startMs === 0) this.startMs = frame.timestampMs;
    this.lastFrameMs = frame.timestampMs;

    const { trackingValid, kneeAngle, lean, cavein } = this.readKinematics(
      frame.landmarks,
    );

    if (!trackingValid) {
      // Pause scoring while body tracking is poor (FR-044/064). Keep phase.
      return this.result([], false, kneeAngle);
    }

    // Track per-rep kinematic extremes.
    if (this.currentRep) {
      this.currentRep.minKneeAngle = Math.min(this.currentRep.minKneeAngle, kneeAngle);
      this.currentRep.maxLean = Math.max(this.currentRep.maxLean, lean);
      this.currentRep.maxCavein = Math.max(this.currentRep.maxCavein, cavein);
    }

    const feedback: FrameFeedback[] = [];
    const issueCodes = this.evaluateIssues(kneeAngle, lean, cavein, feedback);

    // Advance the state machine with debounce.
    this.advance(kneeAngle, frame.timestampMs);

    // If a rep just completed, fold its issues into the rep record.
    if (this.currentRep === null && this.phase === SquatPhase.READY) {
      // (rep completion handled inside advance)
    }

    return this.result(feedback, true, kneeAngle, issueCodes);
  }

  finalize(): ExerciseSessionMetrics {
    const cfg = this.config;
    const reps = this.repetitions;
    const valid = reps.filter((r) => r.isValid);

    const formScore = avg(valid.map((r) => r.metrics.formScore));
    const rangeScore = avg(valid.map((r) => r.metrics.rangeScore));
    const tempoScore = avg(
      valid.map((r) => tempoScoreFor(r.metrics.tempoMs, cfg.tempoFastMs, cfg.tempoSlowMs)),
    );
    const stabilityScore = avg(valid.map((r) => r.metrics.stabilityScore));
    const consistencyScore = computeConsistency(valid);

    return {
      totalReps: this.repCount,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      repetitions: reps,
      feedbackSummary: this.buildFeedbackSummary(),
      formScore: round(formScore),
      rangeScore: round(rangeScore),
      consistencyScore: round(consistencyScore),
      tempoScore: round(tempoScore),
      stabilityScore: round(stabilityScore),
      durationMs: this.startMs ? this.lastFrameMs - this.startMs : 0,
    };
  }

  // ---------------------------------------------------------------------------

  private readKinematics(landmarks: NormalizedLandmark[]) {
    const cfg = this.config;
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    const leftOk =
      visible(lShoulder, cfg.minConfidence) &&
      visible(lHip, cfg.minConfidence) &&
      visible(lKnee, cfg.minConfidence) &&
      visible(lAnkle, cfg.minConfidence);
    const rightOk =
      visible(rShoulder, cfg.minConfidence) &&
      visible(rHip, cfg.minConfidence) &&
      visible(rKnee, cfg.minConfidence) &&
      visible(rAnkle, cfg.minConfidence);

    if (!leftOk && !rightOk) {
      return { trackingValid: false, kneeAngle: 180, lean: 0, cavein: 0 };
    }

    // Prefer the complete left side; fall back to the right.
    const useLeft = leftOk;
    const shoulder = useLeft ? lShoulder! : rShoulder!;
    const hip = useLeft ? lHip! : rHip!;
    const knee = useLeft ? lKnee! : rKnee!;
    const ankle = useLeft ? lAnkle! : rAnkle!;

    const kneeAngle = angleBetweenDegrees(hip, knee, ankle);

    const shoulderMid = midpoint(shoulder, hip);
    const hipMid = midpoint(hip, useLeft ? (rHip ?? hip) : (lHip ?? hip));
    const lean = leanFromVerticalDegrees(shoulderMid, hipMid);

    // Knee cave-in: horizontal offset of knee from ankle, normalized by hip width.
    const otherHip = useLeft ? rHip : lHip;
    const hipWidth = otherHip ? Math.abs(hip.x - otherHip.x) || 1 : 1;
    const cavein = Math.abs((knee.x - ankle.x) / hipWidth);

    return { trackingValid: true, kneeAngle, lean, cavein };
  }

  private evaluateIssues(
    kneeAngle: number,
    lean: number,
    cavein: number,
    feedback: FrameFeedback[],
  ): string[] {
    const cfg = this.config;
    const codes: string[] = [];

    if (lean > cfg.hipBackLeanMax) push(codes, feedback, "back-bend", SQUAT_FEEDBACK);
    if (
      this.phase === SquatPhase.BOTTOM &&
      this.currentRep &&
      this.currentRep.minKneeAngle > cfg.kneeBottomMax
    ) {
      push(codes, feedback, "shallow-depth", SQUAT_FEEDBACK);
    }
    if (cavein > cfg.kneeCaveinRatio) push(codes, feedback, "knee-cavein", SQUAT_FEEDBACK);

    if (codes.length === 0 && this.phase === SquatPhase.READY) {
      push(codes, feedback, "good", SQUAT_FEEDBACK);
    }

    if (this.currentRep) {
      for (const code of codes) this.currentRep.issueCodes.add(code);
    }
    return codes;
  }

  private advance(kneeAngle: number, ts: number): void {
    const cfg = this.config;
    const target = this.nextPhaseFor(kneeAngle);
    if (target === this.phase) {
      this.pendingPhase = null;
      this.pendingCount = 0;
      return;
    }
    if (target !== this.pendingPhase) {
      this.pendingPhase = target;
      this.pendingCount = 1;
      return;
    }
    this.pendingCount += 1;
    if (this.pendingCount < cfg.debounceFrames) return;

    // Confirmed transition.
    this.commitTransition(this.pendingPhase, kneeAngle, ts);
    this.pendingPhase = null;
    this.pendingCount = 0;
  }

  private nextPhaseFor(kneeAngle: number): SquatPhase {
    const cfg = this.config;
    switch (this.phase) {
      case SquatPhase.READY:
        return kneeAngle < cfg.kneeStandMin - 10 ? SquatPhase.DESCENDING : SquatPhase.READY;
      case SquatPhase.DESCENDING:
        if (kneeAngle <= cfg.kneeBottomMax) return SquatPhase.BOTTOM;
        // Rising from a shallow dip without reaching depth -> counts as an
        // invalid rep (shallow) once the user stands back up.
        if (this.currentRep && kneeAngle > this.currentRep.minKneeAngle + 20) {
          return SquatPhase.ASCENDING;
        }
        return SquatPhase.DESCENDING;
      case SquatPhase.BOTTOM:
        return kneeAngle > cfg.kneeBottomMax + 15 ? SquatPhase.ASCENDING : SquatPhase.BOTTOM;
      case SquatPhase.ASCENDING:
        return kneeAngle >= cfg.kneeStandMin ? SquatPhase.COMPLETE : SquatPhase.ASCENDING;
      case SquatPhase.COMPLETE:
        return SquatPhase.READY;
      default:
        return SquatPhase.READY;
    }
  }

  private commitTransition(to: SquatPhase, kneeAngle: number, ts: number): void {
    const from = this.phase;
    this.phase = to;

    if (from === SquatPhase.READY && to === SquatPhase.DESCENDING) {
      this.currentRep = {
        startedAtMs: ts,
        completedAtMs: ts,
        minKneeAngle: kneeAngle,
        maxLean: 0,
        maxCavein: 0,
        issueCodes: new Set<string>(),
        valid: false,
      };
    }

    if (to === SquatPhase.COMPLETE) {
      this.completeRep(ts);
      this.phase = SquatPhase.READY; // immediately ready for the next rep
    }
  }

  private completeRep(ts: number): void {
    const rep = this.currentRep;
    if (!rep) return;
    rep.completedAtMs = ts;
    this.repCount += 1;

    const cfg = this.config;
    const tempoMs = rep.completedAtMs - rep.startedAtMs;
    const deepEnough = rep.minKneeAngle <= cfg.kneeBottomMax + 5;
    rep.valid = deepEnough && tempoMs >= cfg.tempoFastMs;

    if (rep.valid) {
      this.validReps += 1;
    } else {
      this.invalidReps += 1;
      if (!deepEnough) rep.issueCodes.add("shallow-depth");
      if (tempoMs < cfg.tempoFastMs) rep.issueCodes.add("tempo-fast");
      if (tempoMs > cfg.tempoSlowMs) rep.issueCodes.add("tempo-slow");
    }

    const metrics = this.metricsFor(rep, tempoMs);
    this.repetitions.push({
      repNumber: this.repCount,
      startedOffsetMs: rep.startedAtMs - this.startMs,
      completedOffsetMs: rep.completedAtMs - this.startMs,
      isValid: rep.valid,
      metrics,
    });

    for (const code of rep.issueCodes) {
      const entry = this.feedbackCounts.get(code);
      if (entry) {
        entry.count += 1;
        entry.last = rep.completedAtMs - this.startMs;
      } else {
        this.feedbackCounts.set(code, {
          count: 1,
          first: rep.startedAtMs - this.startMs,
          last: rep.completedAtMs - this.startMs,
        });
      }
    }

    this.currentRep = null;
  }

  private metricsFor(rep: SquatRep, tempoMs: number): RepMetrics {
    const cfg = this.config;
    // Form: less lean is better. lean 0 -> 100, hipBackLeanMax -> 50, beyond -> lower.
    const formScore = scoreFromRange(rep.maxLean, cfg.hipBackLeanMax, 0, true);
    // Range: deeper squat (lower knee angle) is better, down to ~70°.
    const rangeScore = scoreFromRange(rep.minKneeAngle, 90, cfg.kneeBottomMax, true);
    // Stability: less knee cave-in is better. (Tempo score is derived from
    // tempoMs at finalize time, not stored per rep.)
    const stabilityScore = scoreFromRange(rep.maxCavein, cfg.kneeCaveinRatio, 0, true);

    return {
      formScore: round(formScore),
      rangeScore: round(rangeScore),
      tempoMs,
      stabilityScore: round(stabilityScore),
      issueCodes: [...rep.issueCodes],
    };
  }

  private buildFeedbackSummary(): FeedbackSummary[] {
    return [...this.feedbackCounts.entries()].map(([code, entry]) => {
      const meta = SQUAT_FEEDBACK[code] ?? { severity: "info" as const, message: code };
      return {
        code,
        severity: meta.severity,
        message: meta.message,
        occurrenceCount: entry.count,
        firstOffsetMs: entry.first,
        lastOffsetMs: entry.last,
      };
    });
  }

  private result(
    feedback: FrameFeedback[],
    trackingValid: boolean,
    kneeAngle: number,
    issueCodes?: string[],
  ): ExerciseFrameResult {
    void issueCodes;
    return {
      phase: this.phase,
      repCount: this.repCount,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      feedback,
      trackingValid,
      liveMetric: { label: "Sudut lutut", value: round(kneeAngle) },
    };
  }
}

// ---- helpers ----

function visible(lm: NormalizedLandmark | undefined, min: number): boolean {
  return !!lm && lm.visibility >= min;
}

function push(
  codes: string[],
  feedback: FrameFeedback[],
  code: string,
  map: Record<string, { severity: "info" | "warning" | "critical"; message: string }>,
): void {
  codes.push(code);
  const meta = map[code];
  if (meta) feedback.push({ code, severity: meta.severity, message: meta.message });
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function tempoScoreFor(tempoMs: number, fastMs: number, slowMs: number): number {
  // Ideal window [fastMs*2, slowMs]; taper outside.
  const idealMin = fastMs * 2;
  const idealMax = slowMs;
  if (tempoMs >= idealMin && tempoMs <= idealMax) return 100;
  if (tempoMs < idealMin) {
    return scoreFromRange(tempoMs, fastMs, idealMin);
  }
  return scoreFromRange(tempoMs, idealMax, slowMs, true);
}

function computeConsistency(valid: RepRecord[]): number {
  if (valid.length < 2) return valid.length === 1 ? 100 : 0;
  const scores = valid.map((r) => r.metrics.formScore);
  const mean = avg(scores);
  const variance = avg(scores.map((s) => (s - mean) ** 2));
  const std = Math.sqrt(variance);
  // Lower std -> higher consistency. Map std 0 -> 100, std 30 -> 0.
  return scoreFromRange(std, 0, 30, true);
}
