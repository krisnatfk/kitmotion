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
import { angleBetweenDegrees, angleBetweenDegrees3D, scoreFromRange } from "../core/angles";
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
  maxHipSag: number;
  maxHipRise: number;
  maxHipAbsDeviation: number;
  minBodyHorizontalMargin: number;
  maxElbowAsymmetry: number;
  reachedDown: boolean;
  issueCodes: Set<string>;
  valid: boolean;
}

interface PushUpKinematics {
  trackingValid: boolean;
  elbowAngle: number;
  hipDeviation: number;
  elbowAsymmetry: number;
  bodyHorizontalRatio: number;
  requiredHorizontalRatio: number;
}

/**
 * Push-up repetition counter.
 *
 * State machine: UP -> DESCENDING -> DOWN -> ASCENDING -> COMPLETE (rep++).
 * Elbow angle drives phases; hip deviation (sag/rise) drives form feedback.
 */
export class PushUpEngine implements ExerciseEngine {
  private config: PushUpConfig = PUSH_UP_DEFAULT_CONFIG;
  private phase: PushUpPhase = PushUpPhase.SETUP;
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
  private orientationLossFrames = 0;

  initialize(config: ExerciseConfig): void {
    this.config = parsePushUpConfig(config);
    this.reset();
  }

  reset(): void {
    this.phase = PushUpPhase.SETUP;
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
    this.orientationLossFrames = 0;
  }

  processFrame(frame: PoseFrame): ExerciseFrameResult {
    if (this.startMs === 0) this.startMs = frame.timestampMs;
    this.lastFrameMs = frame.timestampMs;

    const {
      trackingValid,
      elbowAngle,
      hipDeviation,
      elbowAsymmetry,
      bodyHorizontalRatio,
      requiredHorizontalRatio,
    } = this.readKinematics(frame);

    if (!trackingValid) {
      this.abortIncompleteRep();
      return this.result([], false, elbowAngle);
    }

    const bodyHorizontal = bodyHorizontalRatio >= requiredHorizontalRatio;
    const plankReady = bodyHorizontal
      && hipDeviation >= -this.config.hipSagMaxDrop
      && hipDeviation <= this.config.hipRiseMaxRise
      && elbowAngle >= this.config.elbowUpMin - 5;
    const feedback: FrameFeedback[] = [];
    this.evaluateIssues(elbowAngle, hipDeviation, elbowAsymmetry, bodyHorizontal, feedback);

    if (this.phase === PushUpPhase.SETUP) {
      this.advance(elbowAngle, plankReady, frame.timestampMs);
      return this.result(feedback, true, elbowAngle);
    }

    if (!bodyHorizontal) {
      this.orientationLossFrames += 1;
      if (this.orientationLossFrames >= this.config.debounceFrames) this.abortIncompleteRep();
      return this.result(feedback, true, elbowAngle);
    }
    this.orientationLossFrames = 0;

    if (this.currentRep) {
      this.currentRep.minElbowAngle = Math.min(this.currentRep.minElbowAngle, elbowAngle);
      this.currentRep.maxHipSag = Math.max(this.currentRep.maxHipSag, Math.max(0, -hipDeviation));
      this.currentRep.maxHipRise = Math.max(this.currentRep.maxHipRise, Math.max(0, hipDeviation));
      this.currentRep.maxHipAbsDeviation = Math.max(this.currentRep.maxHipAbsDeviation, Math.abs(hipDeviation));
      this.currentRep.maxElbowAsymmetry = Math.max(this.currentRep.maxElbowAsymmetry, elbowAsymmetry);
      this.currentRep.minBodyHorizontalMargin = Math.min(
        this.currentRep.minBodyHorizontalMargin,
        bodyHorizontalRatio - requiredHorizontalRatio,
      );
    }

    const repetitionsBefore = this.repetitions.length;
    this.advance(elbowAngle, plankReady, frame.timestampMs);
    appendCompletedRepFeedback(this.repetitions, repetitionsBefore, feedback, PUSH_UP_FEEDBACK);

    return this.result(feedback, true, elbowAngle);
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

  private readKinematics(frame: PoseFrame) {
    const landmarks = frame.landmarks;
    const cfg = this.config;
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const rElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const lWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    const leftOk =
      visible(lShoulder, cfg.minConfidence) &&
      visible(lElbow, cfg.minConfidence) &&
      visible(lWrist, cfg.minConfidence) &&
      visible(lHip, cfg.minConfidence) &&
      visible(lAnkle, cfg.minConfidence);
    const rightOk =
      visible(rShoulder, cfg.minConfidence) &&
      visible(rElbow, cfg.minConfidence) &&
      visible(rWrist, cfg.minConfidence) &&
      visible(rHip, cfg.minConfidence) &&
      visible(rAnkle, cfg.minConfidence);

    const sideOptions = [
      leftOk ? sideKinematics(lShoulder!, lElbow!, lWrist!, lHip!, lAnkle!, cfg.bodyHorizontalMinRatio) : null,
      rightOk ? sideKinematics(rShoulder!, rElbow!, rWrist!, rHip!, rAnkle!, cfg.bodyHorizontalMinRatio) : null,
    ].filter((value): value is PushUpKinematics => value !== null);
    const bestSide = sideOptions.sort((a, b) => b.bodyHorizontalRatio - a.bodyHorizontalRatio)[0];

    if (bestSide && bestSide.bodyHorizontalRatio >= cfg.bodyHorizontalMinRatio) {
      if (leftOk && rightOk) {
        const leftAngle = angleBetweenDegrees(lShoulder!, lElbow!, lWrist!);
        const rightAngle = angleBetweenDegrees(rShoulder!, rElbow!, rWrist!);
        bestSide.elbowAngle = (leftAngle + rightAngle) / 2;
        bestSide.elbowAsymmetry = Math.abs(leftAngle - rightAngle);
      }
      return bestSide;
    }

    const front = frontKinematics(frame.worldLandmarks, cfg);
    return front ?? bestSide ?? invalidKinematics(cfg.bodyHorizontalMinRatio);
  }

  private evaluateIssues(
    elbowAngle: number,
    hipDeviation: number,
    elbowAsymmetry: number,
    bodyHorizontal: boolean,
    feedback: FrameFeedback[],
  ): void {
    const cfg = this.config;
    const codes: string[] = [];

    if (!bodyHorizontal) push(codes, feedback, "body-not-horizontal", PUSH_UP_FEEDBACK);
    if (this.phase === PushUpPhase.SETUP && !bodyHorizontal) push(codes, feedback, "plank-required", PUSH_UP_FEEDBACK);
    if (hipDeviation < -cfg.hipSagMaxDrop) push(codes, feedback, "hips-too-low", PUSH_UP_FEEDBACK);
    if (hipDeviation > cfg.hipRiseMaxRise) push(codes, feedback, "hips-too-high", PUSH_UP_FEEDBACK);
    if (elbowAsymmetry > cfg.elbowSymmetryMaxDelta) push(codes, feedback, "elbows-asymmetric", PUSH_UP_FEEDBACK);
    if (this.phase === PushUpPhase.DOWN && elbowAngle > cfg.elbowDownMax + 15) {
      push(codes, feedback, "elbows-not-bent", PUSH_UP_FEEDBACK);
    }
    if (Math.abs(hipDeviation) > cfg.hipSagMaxDrop * 1.5) {
      push(codes, feedback, "unstable", PUSH_UP_FEEDBACK);
    }

    if (codes.length === 0 && (this.phase === PushUpPhase.UP || this.phase === PushUpPhase.SETUP)) {
      push(codes, feedback, "good", PUSH_UP_FEEDBACK);
    }

    if (this.currentRep) {
      for (const code of codes) this.currentRep.issueCodes.add(code);
    }
  }

  private advance(elbowAngle: number, plankReady: boolean, ts: number): void {
    const cfg = this.config;
    const target = this.nextPhase(elbowAngle, plankReady);
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

  private nextPhase(elbowAngle: number, plankReady: boolean): PushUpPhase {
    const cfg = this.config;
    switch (this.phase) {
      case PushUpPhase.SETUP:
        return plankReady ? PushUpPhase.UP : PushUpPhase.SETUP;
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
        return PushUpPhase.SETUP;
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
        maxHipSag: 0,
        maxHipRise: 0,
        maxHipAbsDeviation: 0,
        minBodyHorizontalMargin: 1,
        maxElbowAsymmetry: 0,
        reachedDown: false,
        issueCodes: new Set<string>(),
        valid: false,
      };
    }

    if (to === PushUpPhase.DOWN && this.currentRep) {
      this.currentRep.reachedDown = true;
    }

    if (to === PushUpPhase.COMPLETE) {
      if (this.currentRep?.reachedDown) this.completeRep(ts);
      else this.currentRep = null;
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
    const elbowsAligned = rep.maxElbowAsymmetry <= cfg.elbowSymmetryMaxDelta;
    const hipsAligned = rep.maxHipSag <= cfg.hipSagMaxDrop && rep.maxHipRise <= cfg.hipRiseMaxRise;
    const stayedHorizontal = rep.minBodyHorizontalMargin >= 0;
    rep.valid = bentEnough && elbowsAligned && hipsAligned && stayedHorizontal && tempoMs >= cfg.tempoFastMs;

    if (rep.valid) {
      this.validReps += 1;
    } else {
      this.invalidReps += 1;
      if (!bentEnough) rep.issueCodes.add("elbows-not-bent");
      if (!elbowsAligned) rep.issueCodes.add("elbows-asymmetric");
      if (rep.maxHipSag > cfg.hipSagMaxDrop) rep.issueCodes.add("hips-too-low");
      if (rep.maxHipRise > cfg.hipRiseMaxRise) rep.issueCodes.add("hips-too-high");
      if (!stayedHorizontal) rep.issueCodes.add("body-not-horizontal");
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
        rangeScore: round(scoreFromRange(rep.minElbowAngle, cfg.elbowDownMax + 35, cfg.elbowDownMax, true)),
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

  private abortIncompleteRep(): void {
    this.currentRep = null;
    this.phase = PushUpPhase.SETUP;
    this.pendingPhase = null;
    this.pendingCount = 0;
    this.orientationLossFrames = 0;
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

  private result(feedback: FrameFeedback[], trackingValid: boolean, elbowAngle = 180): ExerciseFrameResult {
    return {
      phase: this.phase,
      repCount: this.repCount,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      feedback,
      trackingValid,
      liveMetric: { label: "Sudut siku", value: round(elbowAngle) },
    };
  }
}

function visible(lm: NormalizedLandmark | undefined, min: number): boolean {
  return !!lm && lm.visibility >= min;
}

function invalidKinematics(requiredHorizontalRatio: number): PushUpKinematics {
  return {
    trackingValid: false,
    elbowAngle: 180,
    hipDeviation: 0,
    elbowAsymmetry: 0,
    bodyHorizontalRatio: 0,
    requiredHorizontalRatio,
  };
}

function sideKinematics(
  shoulder: NormalizedLandmark,
  elbow: NormalizedLandmark,
  wrist: NormalizedLandmark,
  hip: NormalizedLandmark,
  ankle: NormalizedLandmark,
  requiredHorizontalRatio: number,
): PushUpKinematics {
  const bodyLength = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y) || 1;
  const dx = ankle.x - shoulder.x;
  const dy = ankle.y - shoulder.y;
  const t = ((hip.x - shoulder.x) * dx + (hip.y - shoulder.y) * dy) / (bodyLength * bodyLength);
  const projectedX = shoulder.x + t * dx;
  const projectedY = shoulder.y + t * dy;
  const deviation = Math.hypot(hip.x - projectedX, hip.y - projectedY) / bodyLength;
  return {
    trackingValid: true,
    elbowAngle: angleBetweenDegrees(shoulder, elbow, wrist),
    hipDeviation: hip.y > projectedY ? -deviation : deviation,
    elbowAsymmetry: 0,
    bodyHorizontalRatio: Math.abs(dx) / bodyLength,
    requiredHorizontalRatio,
  };
}

function frontKinematics(
  worldLandmarks: NormalizedLandmark[] | undefined,
  config: PushUpConfig,
): PushUpKinematics | null {
  if (!worldLandmarks || worldLandmarks.length < 33) return null;
  const required = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_ELBOW,
    POSE_LANDMARKS.RIGHT_ELBOW,
    POSE_LANDMARKS.LEFT_WRIST,
    POSE_LANDMARKS.RIGHT_WRIST,
  ];
  if (!required.every((index) => visible(worldLandmarks[index], config.minConfidence))) return null;

  const shoulder = pairedWorldPoint(
    worldLandmarks,
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    config.minConfidence,
  );
  const hip = pairedWorldPoint(
    worldLandmarks,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
    config.minConfidence,
  );
  const ankle = pairedWorldPoint(
    worldLandmarks,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.RIGHT_ANKLE,
    config.minConfidence,
  );
  if (!shoulder || !hip || !ankle) return null;

  const leftElbow = angleBetweenDegrees3D(
    worldLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]!,
    worldLandmarks[POSE_LANDMARKS.LEFT_ELBOW]!,
    worldLandmarks[POSE_LANDMARKS.LEFT_WRIST]!,
  );
  const rightElbow = angleBetweenDegrees3D(
    worldLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]!,
    worldLandmarks[POSE_LANDMARKS.RIGHT_ELBOW]!,
    worldLandmarks[POSE_LANDMARKS.RIGHT_WRIST]!,
  );
  const bodyLength = distance3D(shoulder, ankle);
  if (bodyLength < 0.35) return null;

  return {
    trackingValid: true,
    elbowAngle: (leftElbow + rightElbow) / 2,
    hipDeviation: signedPointLineDeviation3D(hip, shoulder, ankle),
    elbowAsymmetry: Math.abs(leftElbow - rightElbow),
    bodyHorizontalRatio: Math.hypot(ankle.x - shoulder.x, ankle.z - shoulder.z) / bodyLength,
    requiredHorizontalRatio: config.frontBodyHorizontalMinRatio,
  };
}

function pairedWorldPoint(
  landmarks: NormalizedLandmark[],
  leftIndex: number,
  rightIndex: number,
  minConfidence: number,
): NormalizedLandmark | null {
  const left = visible(landmarks[leftIndex], minConfidence) ? landmarks[leftIndex] : undefined;
  const right = visible(landmarks[rightIndex], minConfidence) ? landmarks[rightIndex] : undefined;
  if (left && right) {
    return {
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
      z: (left.z + right.z) / 2,
      visibility: Math.min(left.visibility, right.visibility),
    };
  }
  return left ?? right ?? null;
}

function distance3D(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function signedPointLineDeviation3D(
  point: NormalizedLandmark,
  start: NormalizedLandmark,
  end: NormalizedLandmark,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  if (lengthSquared === 0) return 1;
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy + (point.z - start.z) * dz) / lengthSquared;
  const projected = {
    x: start.x + t * dx,
    y: start.y + t * dy,
    z: start.z + t * dz,
    visibility: point.visibility,
  };
  const deviation = distance3D(point, projected) / Math.sqrt(lengthSquared);
  return point.y > projected.y ? -deviation : deviation;
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
