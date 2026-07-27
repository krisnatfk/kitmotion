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
import { PushUpPhase } from "./phases";
import { PUSH_UP_FEEDBACK } from "./feedback";
import {
  PUSH_UP_DEFAULT_CONFIG,
  parsePushUpConfig,
  type PushUpConfig,
} from "./config";

interface PushUpRep {
  startedAtMs: number;
  completedAtMs: number;
  minElbowAngle: number;
  maxHipDeviation: number; // signed: negative = sag, positive = rise
  maxHipAbsDeviation: number;
  issueCodes: Set<string>;
  valid: boolean;
}

/**
 * Push-up repetition counter.
 *
 * State machine: UP -> DESCENDING -> DOWN -> ASCENDING -> COMPLETE (rep++).
 * Elbow angle drives phases; hip deviation (sag/rise) drives form feedback.
 */
export class PushUpEngine implements ExerciseEngine {
  private config: PushUpConfig = PUSH_UP_DEFAULT_CONFIG;
  private phase: PushUpPhase = PushUpPhase.UP;
  private repCount = 0;
  private validReps = 0;
  private invalidReps = 0;
  private repetitions: RepRecord[] = [];
  private feedbackCounts = new Map<string, { count: number; first: number; last: number }>();
  private currentRep: PushUpRep | null = null;
  private pendingPhase: PushUpPhase | null = null;
  private pendingCount = 0;
  private startMs = 0;
  private lastFrameMs = 0;

  initialize(config: ExerciseConfig): void {
    this.config = parsePushUpConfig(config);
    this.reset();
  }

  reset(): void {
    this.phase = PushUpPhase.UP;
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

    const { trackingValid, elbowAngle, hipDeviation } = this.readKinematics(frame.landmarks);

    if (!trackingValid) {
      return this.result([], false);
    }

    if (this.currentRep) {
      this.currentRep.minElbowAngle = Math.min(this.currentRep.minElbowAngle, elbowAngle);
      if (hipDeviation < 0) {
        this.currentRep.maxHipDeviation = Math.min(this.currentRep.maxHipDeviation, hipDeviation);
      } else {
        this.currentRep.maxHipAbsDeviation = Math.max(this.currentRep.maxHipAbsDeviation, hipDeviation);
      }
      this.currentRep.maxHipAbsDeviation = Math.max(this.currentRep.maxHipAbsDeviation, Math.abs(hipDeviation));
    }

    const feedback: FrameFeedback[] = [];
    this.evaluateIssues(elbowAngle, hipDeviation, feedback);
    this.advance(elbowAngle, frame.timestampMs);

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
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const rElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const lWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

    const leftOk =
      visible(lShoulder, cfg.minConfidence) &&
      visible(lElbow, cfg.minConfidence) &&
      visible(lWrist, cfg.minConfidence) &&
      visible(lHip, cfg.minConfidence) &&
      visible(lKnee, cfg.minConfidence);
    const rightOk =
      visible(rShoulder, cfg.minConfidence) &&
      visible(rElbow, cfg.minConfidence) &&
      visible(rWrist, cfg.minConfidence) &&
      visible(rHip, cfg.minConfidence) &&
      visible(rKnee, cfg.minConfidence);

    if (!leftOk && !rightOk) {
      return { trackingValid: false, elbowAngle: 180, hipDeviation: 0 };
    }

    const useLeft = leftOk;
    const shoulder = useLeft ? lShoulder! : rShoulder!;
    const elbow = useLeft ? lElbow! : rElbow!;
    const wrist = useLeft ? lWrist! : rWrist!;
    const hip = useLeft ? lHip! : rHip!;
    const knee = useLeft ? lKnee! : rKnee!;

    const elbowAngle = angleBetweenDegrees(shoulder, elbow, wrist);

    // Hip deviation from the shoulder->knee line (normalized to torso length).
    // Positive = hips above the line (pike), negative = below (sag).
    const torsoLen = Math.hypot(knee.x - shoulder.x, knee.y - shoulder.y) || 1;
    const dx = knee.x - shoulder.x;
    const dy = knee.y - shoulder.y;
    // Project hip onto shoulder->knee; perpendicular distance / torsoLen.
    const t = ((hip.x - shoulder.x) * dx + (hip.y - shoulder.y) * dy) / (torsoLen * torsoLen);
    const projX = shoulder.x + t * dx;
    const projY = shoulder.y + t * dy;
    const perp = Math.hypot(hip.x - projX, hip.y - projY) / torsoLen;
    // Sign: hips below the line (larger y than projection in image space) = sag.
    const hipDeviation = (hip.y > projY ? -perp : perp);

    return { trackingValid: true, elbowAngle, hipDeviation };
  }

  private evaluateIssues(elbowAngle: number, hipDeviation: number, feedback: FrameFeedback[]): void {
    const cfg = this.config;
    const codes: string[] = [];

    if (hipDeviation < -cfg.hipSagMaxDrop) push(codes, feedback, "hips-too-low", PUSH_UP_FEEDBACK);
    if (hipDeviation > cfg.hipRiseMaxRise) push(codes, feedback, "hips-too-high", PUSH_UP_FEEDBACK);
    if (this.phase === PushUpPhase.DOWN && elbowAngle > cfg.elbowDownMax + 15) {
      push(codes, feedback, "elbows-not-bent", PUSH_UP_FEEDBACK);
    }
    if (Math.abs(hipDeviation) > cfg.hipSagMaxDrop * 1.5) {
      push(codes, feedback, "unstable", PUSH_UP_FEEDBACK);
    }

    if (codes.length === 0 && this.phase === PushUpPhase.UP) {
      push(codes, feedback, "good", PUSH_UP_FEEDBACK);
    }

    if (this.currentRep) {
      for (const code of codes) this.currentRep.issueCodes.add(code);
    }
  }

  private advance(elbowAngle: number, ts: number): void {
    const cfg = this.config;
    const target = this.nextPhase(elbowAngle);
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

    this.commitTransition(this.pendingPhase, elbowAngle, ts);
    this.pendingPhase = null;
    this.pendingCount = 0;
  }

  private nextPhase(elbowAngle: number): PushUpPhase {
    const cfg = this.config;
    switch (this.phase) {
      case PushUpPhase.UP:
        return elbowAngle < cfg.elbowUpMin - 10 ? PushUpPhase.DESCENDING : PushUpPhase.UP;
      case PushUpPhase.DESCENDING:
        if (elbowAngle <= cfg.elbowDownMax) return PushUpPhase.DOWN;
        if (this.currentRep && elbowAngle > this.currentRep.minElbowAngle + 20) return PushUpPhase.ASCENDING;
        return PushUpPhase.DESCENDING;
      case PushUpPhase.DOWN:
        return elbowAngle > cfg.elbowDownMax + 15 ? PushUpPhase.ASCENDING : PushUpPhase.DOWN;
      case PushUpPhase.ASCENDING:
        return elbowAngle >= cfg.elbowUpMin - 1 ? PushUpPhase.COMPLETE : PushUpPhase.ASCENDING;
      case PushUpPhase.COMPLETE:
        return PushUpPhase.UP;
      default:
        return PushUpPhase.UP;
    }
  }

  private commitTransition(to: PushUpPhase, elbowAngle: number, ts: number): void {
    const from = this.phase;
    this.phase = to;

    if (from === PushUpPhase.UP && to === PushUpPhase.DESCENDING) {
      this.currentRep = {
        startedAtMs: ts,
        completedAtMs: ts,
        minElbowAngle: elbowAngle,
        maxHipDeviation: 0,
        maxHipAbsDeviation: 0,
        issueCodes: new Set<string>(),
        valid: false,
      };
    }

    if (to === PushUpPhase.COMPLETE) {
      this.completeRep(ts);
      this.phase = PushUpPhase.UP;
    }
  }

  private completeRep(ts: number): void {
    const rep = this.currentRep;
    if (!rep) return;
    rep.completedAtMs = ts;
    this.repCount += 1;

    const cfg = this.config;
    const tempoMs = rep.completedAtMs - rep.startedAtMs;
    const bentEnough = rep.minElbowAngle <= cfg.elbowDownMax + 5;
    rep.valid = bentEnough && tempoMs >= cfg.tempoFastMs;

    if (rep.valid) {
      this.validReps += 1;
    } else {
      this.invalidReps += 1;
      if (!bentEnough) rep.issueCodes.add("elbows-not-bent");
      if (tempoMs < cfg.tempoFastMs) rep.issueCodes.add("tempo-fast");
      if (tempoMs > cfg.tempoSlowMs) rep.issueCodes.add("tempo-slow");
    }

    this.repetitions.push({
      repNumber: this.repCount,
      startedOffsetMs: rep.startedAtMs - this.startMs,
      completedOffsetMs: rep.completedAtMs - this.startMs,
      isValid: rep.valid,
      metrics: {
        formScore: round(scoreFromRange(rep.maxHipAbsDeviation, cfg.hipSagMaxDrop, 0, true)),
        rangeScore: round(scoreFromRange(rep.minElbowAngle, 90, cfg.elbowDownMax, true)),
        tempoMs,
        stabilityScore: round(scoreFromRange(rep.maxHipAbsDeviation, cfg.hipSagMaxDrop, 0, true)),
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
      const meta = PUSH_UP_FEEDBACK[code] ?? { severity: "info" as const, message: code };
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
