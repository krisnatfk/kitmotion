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
import { angleBetweenDegrees, scoreFromRange } from "../core/angles";
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
  maxArmAngle: number;
  maxArmHeight: number;
  maxLegSpread: number;
  maxAsymmetry: number;
  maxCoordinationDelta: number;
  coordinationTotal: number;
  coordinationSamples: number;
  reachedOpen: boolean;
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

  interruptTracking(): void {
    this.abortIncompleteRep();
  }

  processFrame(frame: PoseFrame): ExerciseFrameResult {
    if (this.startMs === 0) this.startMs = frame.timestampMs;
    this.lastFrameMs = frame.timestampMs;

    const { trackingValid, armSpread, armAngle, armHeight, legSpread, asymmetry, coordinationDelta } = this.readKinematics(
      frame.landmarks,
    );

    if (!trackingValid) {
      this.abortIncompleteRep();
      return this.result([], false);
    }

    if (this.currentRep) {
      this.currentRep.maxArmSpread = Math.max(this.currentRep.maxArmSpread, armSpread);
      this.currentRep.maxArmAngle = Math.max(this.currentRep.maxArmAngle, armAngle);
      this.currentRep.maxArmHeight = Math.max(this.currentRep.maxArmHeight, armHeight);
      this.currentRep.maxLegSpread = Math.max(this.currentRep.maxLegSpread, legSpread);
      this.currentRep.maxAsymmetry = Math.max(this.currentRep.maxAsymmetry, asymmetry);
      this.currentRep.maxCoordinationDelta = Math.max(this.currentRep.maxCoordinationDelta, coordinationDelta);
      this.currentRep.coordinationTotal += coordinationDelta;
      this.currentRep.coordinationSamples += 1;
    }

    const feedback: FrameFeedback[] = [];
    this.evaluateIssues(armAngle, armHeight, legSpread, asymmetry, coordinationDelta, feedback);
    const repetitionsBefore = this.repetitions.length;
    this.advance(armAngle, armHeight, legSpread, frame.timestampMs);
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
      return { trackingValid: false, armSpread: 0, armAngle: 0, armHeight: 0, legSpread: 0, asymmetry: 0, coordinationDelta: 0 };
    }

    const shoulderWidth = Math.abs(lShoulder!.x - rShoulder!.x) || 1;
    const hipWidth = Math.abs(lHip!.x - rHip!.x) || 1;

    const armSpread = Math.abs(lWrist!.x - rWrist!.x) / shoulderWidth;
    const legSpread = Math.abs(lAnkle!.x - rAnkle!.x) / hipWidth;
    const leftArmAngle = angleBetweenDegrees(lHip!, lShoulder!, lWrist!);
    const rightArmAngle = angleBetweenDegrees(rHip!, rShoulder!, rWrist!);
    const armAngle = Math.min(leftArmAngle, rightArmAngle);
    const shoulderY = (lShoulder!.y + rShoulder!.y) / 2;
    const hipY = (lHip!.y + rHip!.y) / 2;
    const wristY = (lWrist!.y + rWrist!.y) / 2;
    const torsoHeight = Math.abs(hipY - shoulderY) || shoulderWidth;
    const armHeight = (shoulderY - wristY) / torsoHeight;

    // Asymmetry: difference in wrist height (normalized to shoulder width).
    const asymmetry = Math.max(
      Math.abs(lWrist!.y - rWrist!.y) / shoulderWidth,
      Math.abs(leftArmAngle - rightArmAngle) / 180,
    );
    const armProgress = clamp01(
      (armAngle - cfg.armClosedMaxAngle) /
      Math.max(1, cfg.armOpenMinAngle - cfg.armClosedMaxAngle),
    );
    const legProgress = clamp01(
      (legSpread - cfg.legClosedMaxRatio) /
      Math.max(0.01, cfg.legOpenMinRatio - cfg.legClosedMaxRatio),
    );
    const coordinationDelta = Math.abs(armProgress - legProgress);

    return { trackingValid: true, armSpread, armAngle, armHeight, legSpread, asymmetry, coordinationDelta };
  }

  private evaluateIssues(
    armAngle: number,
    armHeight: number,
    legSpread: number,
    asymmetry: number,
    coordinationDelta: number,
    feedback: FrameFeedback[],
  ): void {
    const cfg = this.config;
    const codes: string[] = [];

    if (this.phase === JumpingJackPhase.OPEN || this.phase === JumpingJackPhase.OPENING) {
      if (armAngle < cfg.armOpenMinAngle || armHeight < cfg.armHeightMinRatio) push(codes, feedback, "arms-too-low", JUMPING_JACK_FEEDBACK);
      if (legSpread < cfg.legOpenMinRatio) push(codes, feedback, "legs-too-narrow", JUMPING_JACK_FEEDBACK);
    }
    if (asymmetry > cfg.symmetryMaxDelta) push(codes, feedback, "asymmetry", JUMPING_JACK_FEEDBACK);
    if (coordinationDelta > cfg.coordinationMaxDelta) push(codes, feedback, "arms-legs-out-of-sync", JUMPING_JACK_FEEDBACK);

    if (codes.length === 0 && this.phase === JumpingJackPhase.OPEN) {
      push(codes, feedback, "good", JUMPING_JACK_FEEDBACK);
    }

    if (this.currentRep) {
      for (const code of codes) this.currentRep.issueCodes.add(code);
    }
  }

  private advance(armAngle: number, armHeight: number, legSpread: number, ts: number): void {
    const cfg = this.config;
    const isOpen = armAngle >= cfg.armOpenMinAngle && armHeight >= cfg.armHeightMinRatio && legSpread >= cfg.legOpenMinRatio;
    const isClosed = armAngle <= cfg.armClosedMaxAngle && legSpread <= cfg.legClosedMaxRatio;

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
        // A shallow open-close motion is noise, not a repetition.
        if (isClosed) return JumpingJackPhase.CLOSED;
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
        maxArmAngle: 0,
        maxArmHeight: 0,
        maxLegSpread: 0,
        maxAsymmetry: 0,
        maxCoordinationDelta: 0,
        coordinationTotal: 0,
        coordinationSamples: 0,
        reachedOpen: false,
        issueCodes: new Set<string>(),
        valid: false,
      };
    }

    if (to === JumpingJackPhase.OPEN && this.currentRep) {
      this.currentRep.reachedOpen = true;
    }

    if (from === JumpingJackPhase.OPENING && to === JumpingJackPhase.CLOSED) {
      this.currentRep = null;
    }

    if (to === JumpingJackPhase.COMPLETE) {
      if (this.currentRep?.reachedOpen) this.completeRep(ts);
      else this.currentRep = null;
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
      rep.maxArmAngle >= cfg.armOpenMinAngle
      && rep.maxArmHeight >= cfg.armHeightMinRatio
      && rep.maxLegSpread >= cfg.legOpenMinRatio;
    const symmetrical = rep.maxAsymmetry <= cfg.symmetryMaxDelta;
    const averageCoordinationDelta = rep.coordinationSamples > 0
      ? rep.coordinationTotal / rep.coordinationSamples
      : 1;
    const coordinated = averageCoordinationDelta <= cfg.coordinationMaxDelta;
    rep.valid = reachedOpen && symmetrical && coordinated && tempoMs >= cfg.tempoFastMs;

    if (rep.valid) {
      this.validReps += 1;
    } else {
      this.invalidReps += 1;
      if (!reachedOpen) {
        if (rep.maxArmAngle < cfg.armOpenMinAngle || rep.maxArmHeight < cfg.armHeightMinRatio) rep.issueCodes.add("arms-too-low");
        if (rep.maxLegSpread < cfg.legOpenMinRatio) rep.issueCodes.add("legs-too-narrow");
      }
      if (!symmetrical) rep.issueCodes.add("asymmetry");
      if (!coordinated) rep.issueCodes.add("arms-legs-out-of-sync");
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
          (scoreFromRange(rep.maxArmAngle, 90, cfg.armOpenMinAngle) +
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

  private abortIncompleteRep(): void {
    this.currentRep = null;
    this.phase = JumpingJackPhase.CLOSED;
    this.pendingPhase = null;
    this.pendingCount = 0;
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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
