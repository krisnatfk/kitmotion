import type {
  ExerciseConfig,
  ExerciseEngine,
  ExerciseFrameResult,
  ExerciseSessionMetrics,
  FrameFeedback,
  NormalizedLandmark,
  PoseFrame,
  RepRecord,
  FeedbackSummary,
} from "../core/types";
import { scoreFromRange } from "../core/angles";
import { POSE_LANDMARKS } from "../core/landmarks";
import { JumpingJackPhase } from "./phases";
import { JUMPING_JACK_FEEDBACK } from "./feedback";
import {
  JUMPING_JACK_DEFAULT_CONFIG,
  parseJumpingJackConfig,
  type JumpingJackConfig,
} from "./config";

interface JackRep {
  startedAtMs: number;
  completedAtMs: number;
  maxArmSpread: number;
  maxLegSpread: number;
  maxAsymmetry: number;
  issueCodes: Set<string>;
  valid: boolean;
}

/**
 * Jumping jack repetition counter.
 *
 * State machine: CLOSED -> OPENING -> OPEN -> CLOSING -> COMPLETE (rep++).
 * A rep counts when the user reaches the OPEN state (arms + legs apart) and
 * returns to CLOSED. Symmetry and tempo feed per-rep metrics.
 */
export class JumpingJackEngine implements ExerciseEngine {
  private config: JumpingJackConfig = JUMPING_JACK_DEFAULT_CONFIG;
  private phase: JumpingJackPhase = JumpingJackPhase.CLOSED;
  private repCount = 0;
  private validReps = 0;
  private invalidReps = 0;
  private repetitions: RepRecord[] = [];
  private feedbackCounts = new Map<string, { count: number; first: number; last: number }>();
  private currentRep: JackRep | null = null;
  private pendingPhase: JumpingJackPhase | null = null;
  private pendingCount = 0;
  private startMs = 0;
  private lastFrameMs = 0;

  initialize(config: ExerciseConfig): void {
    this.config = parseJumpingJackConfig(config);
    this.reset();
  }

  reset(): void {
    this.phase = JumpingJackPhase.CLOSED;
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

    const { trackingValid, armSpread, legSpread, asymmetry } = this.readKinematics(
      frame.landmarks,
    );

    if (!trackingValid) {
      return this.result([], false);
    }

    if (this.currentRep) {
      this.currentRep.maxArmSpread = Math.max(this.currentRep.maxArmSpread, armSpread);
      this.currentRep.maxLegSpread = Math.max(this.currentRep.maxLegSpread, legSpread);
      this.currentRep.maxAsymmetry = Math.max(this.currentRep.maxAsymmetry, asymmetry);
    }

    const feedback: FrameFeedback[] = [];
    this.evaluateIssues(armSpread, legSpread, asymmetry, feedback);
    const repetitionsBefore = this.repetitions.length;
    this.advance(armSpread, legSpread, frame.timestampMs);
    appendCompletedRepFeedback(this.repetitions, repetitionsBefore, feedback, JUMPING_JACK_FEEDBACK);

    return this.result(feedback, true);
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
    const lWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

    const ok =
      visible(lShoulder, cfg.minConfidence) &&
      visible(rShoulder, cfg.minConfidence) &&
      visible(lHip, cfg.minConfidence) &&
      visible(rHip, cfg.minConfidence) &&
      visible(lAnkle, cfg.minConfidence) &&
      visible(rAnkle, cfg.minConfidence) &&
      visible(lWrist, cfg.minConfidence) &&
      visible(rWrist, cfg.minConfidence);

    if (!ok) {
      return { trackingValid: false, armSpread: 0, legSpread: 0, asymmetry: 0 };
    }

    const shoulderWidth = Math.abs(lShoulder!.x - rShoulder!.x) || 1;
    const hipWidth = Math.abs(lHip!.x - rHip!.x) || 1;

    const armSpread = Math.abs(lWrist!.x - rWrist!.x) / shoulderWidth;
    const legSpread = Math.abs(lAnkle!.x - rAnkle!.x) / hipWidth;

    // Asymmetry: difference in wrist height (normalized to shoulder width).
    const asymmetry = Math.abs(lWrist!.y - rWrist!.y) / shoulderWidth;

    return { trackingValid: true, armSpread, legSpread, asymmetry };
  }

  private evaluateIssues(
    armSpread: number,
    legSpread: number,
    asymmetry: number,
    feedback: FrameFeedback[],
  ): void {
    const cfg = this.config;
    const codes: string[] = [];

    if (this.phase === JumpingJackPhase.OPEN || this.phase === JumpingJackPhase.OPENING) {
      if (armSpread < cfg.armOpenMinRatio) push(codes, feedback, "arms-too-low", JUMPING_JACK_FEEDBACK);
      if (legSpread < cfg.legOpenMinRatio) push(codes, feedback, "legs-too-narrow", JUMPING_JACK_FEEDBACK);
    }
    if (asymmetry > cfg.symmetryMaxDelta) push(codes, feedback, "asymmetry", JUMPING_JACK_FEEDBACK);

    if (codes.length === 0 && this.phase === JumpingJackPhase.OPEN) {
      push(codes, feedback, "good", JUMPING_JACK_FEEDBACK);
    }

    if (this.currentRep) {
      for (const code of codes) this.currentRep.issueCodes.add(code);
    }
  }

  private advance(armSpread: number, legSpread: number, ts: number): void {
    const cfg = this.config;
    const isOpen = armSpread >= cfg.armOpenMinRatio && legSpread >= cfg.legOpenMinRatio;
    const isClosed =
      armSpread < cfg.armOpenMinRatio * 0.85 && legSpread < cfg.legOpenMinRatio * 0.85;

    const target = this.nextPhase(isOpen, isClosed);
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

    this.commitTransition(this.pendingPhase, ts);
    this.pendingPhase = null;
    this.pendingCount = 0;
  }

  private nextPhase(isOpen: boolean, isClosed: boolean): JumpingJackPhase {
    switch (this.phase) {
      case JumpingJackPhase.CLOSED:
        return isOpen || !isClosed ? JumpingJackPhase.OPENING : JumpingJackPhase.CLOSED;
      case JumpingJackPhase.OPENING:
        if (isOpen) return JumpingJackPhase.OPEN;
        // Returned to closed without reaching OPEN -> counts as an invalid rep.
        if (isClosed) return JumpingJackPhase.COMPLETE;
        return JumpingJackPhase.OPENING;
      case JumpingJackPhase.OPEN:
        return !isOpen ? JumpingJackPhase.CLOSING : JumpingJackPhase.OPEN;
      case JumpingJackPhase.CLOSING:
        return isClosed ? JumpingJackPhase.COMPLETE : JumpingJackPhase.CLOSING;
      case JumpingJackPhase.COMPLETE:
        return JumpingJackPhase.CLOSED;
      default:
        return JumpingJackPhase.CLOSED;
    }
  }

  private commitTransition(to: JumpingJackPhase, ts: number): void {
    const from = this.phase;
    this.phase = to;

    if (from === JumpingJackPhase.CLOSED && to === JumpingJackPhase.OPENING) {
      this.currentRep = {
        startedAtMs: ts,
        completedAtMs: ts,
        maxArmSpread: 0,
        maxLegSpread: 0,
        maxAsymmetry: 0,
        issueCodes: new Set<string>(),
        valid: false,
      };
    }

    if (to === JumpingJackPhase.COMPLETE) {
      this.completeRep(ts);
      this.phase = JumpingJackPhase.CLOSED;
    }
  }

  private completeRep(ts: number): void {
    const rep = this.currentRep;
    if (!rep) return;
    rep.completedAtMs = ts;
    this.repCount += 1;

    const cfg = this.config;
    const tempoMs = rep.completedAtMs - rep.startedAtMs;
    const reachedOpen =
      rep.maxArmSpread >= cfg.armOpenMinRatio && rep.maxLegSpread >= cfg.legOpenMinRatio;
    rep.valid = reachedOpen && tempoMs >= cfg.tempoFastMs;

    if (rep.valid) {
      this.validReps += 1;
    } else {
      this.invalidReps += 1;
      if (!reachedOpen) {
        if (rep.maxArmSpread < cfg.armOpenMinRatio) rep.issueCodes.add("arms-too-low");
        if (rep.maxLegSpread < cfg.legOpenMinRatio) rep.issueCodes.add("legs-too-narrow");
      }
      if (tempoMs < cfg.tempoFastMs) rep.issueCodes.add("tempo-fast");
      if (tempoMs > cfg.tempoSlowMs) rep.issueCodes.add("tempo-slow");
    }

    this.repetitions.push({
      repNumber: this.repCount,
      startedOffsetMs: rep.startedAtMs - this.startMs,
      completedOffsetMs: rep.completedAtMs - this.startMs,
      isValid: rep.valid,
      metrics: {
        formScore: round(scoreFromRange(rep.maxAsymmetry, cfg.symmetryMaxDelta, 0, true)),
        rangeScore: round(
          (scoreFromRange(rep.maxArmSpread, 1, cfg.armOpenMinRatio) +
            scoreFromRange(rep.maxLegSpread, 1, cfg.legOpenMinRatio)) /
            2,
        ),
        tempoMs,
        stabilityScore: round(scoreFromRange(rep.maxAsymmetry, cfg.symmetryMaxDelta, 0, true)),
        issueCodes: [...rep.issueCodes],
      },
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

  private buildFeedbackSummary(): FeedbackSummary[] {
    return [...this.feedbackCounts.entries()].map(([code, entry]) => {
      const meta = JUMPING_JACK_FEEDBACK[code] ?? { severity: "info" as const, message: code };
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

  private result(feedback: FrameFeedback[], trackingValid: boolean): ExerciseFrameResult {
    return {
      phase: this.phase,
      repCount: this.repCount,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      feedback,
      trackingValid,
    };
  }
}

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

function appendCompletedRepFeedback(
  repetitions: RepRecord[],
  previousLength: number,
  feedback: FrameFeedback[],
  map: Record<string, { severity: "info" | "warning" | "critical"; message: string }>,
): void {
  if (repetitions.length <= previousLength) return;
  const completed = repetitions[repetitions.length - 1];
  if (!completed || completed.isValid) return;
  for (const code of completed.metrics.issueCodes) {
    const meta = map[code];
    if (meta && !feedback.some((item) => item.code === code)) feedback.push({ code, ...meta });
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function tempoScoreFor(tempoMs: number, fastMs: number, slowMs: number): number {
  const idealMin = fastMs * 2;
  const idealMax = slowMs;
  if (tempoMs >= idealMin && tempoMs <= idealMax) return 100;
  if (tempoMs < idealMin) return scoreFromRange(tempoMs, fastMs, idealMin);
  return scoreFromRange(tempoMs, idealMax, slowMs, true);
}

function computeConsistency(valid: RepRecord[]): number {
  if (valid.length < 2) return valid.length === 1 ? 100 : 0;
  const scores = valid.map((r) => r.metrics.formScore);
  const mean = avg(scores);
  const variance = avg(scores.map((s) => (s - mean) ** 2));
  const std = Math.sqrt(variance);
  return scoreFromRange(std, 0, 30, true);
}
