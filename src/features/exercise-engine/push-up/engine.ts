import type {
  ExerciseConfig,
  ExerciseEngine,
  ExerciseFrameResult,
  ExerciseSessionMetrics,
  FrameFeedback,
  NormalizedLandmark,
  PoseCameraMode,
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
import { readFrontArmGeometry } from "./geometry";

interface PushUpRep {
  startedAtMs: number;
  completedAtMs: number;
  minElbowAngle: number;
  maxHipSag: number;
  maxHipRise: number;
  maxHipAbsDeviation: number;
  minBodyHorizontalMargin: number;
  maxElbowAsymmetry: number;
  minWorstElbowAngle: number;
  keptLegsStraight: boolean;
  reachedDown: boolean;
  issueCodes: Set<string>;
  valid: boolean;
  cameraMode: PoseCameraMode;
  elbowDownMax: number;
  elbowIndividualDownMax: number;
  elbowUpMin: number;
  elbowSymmetryMaxDelta: number;
}

interface PushUpKinematics {
  trackingValid: boolean;
  elbowAngle: number;
  hipDeviation: number;
  elbowAsymmetry: number;
  bodyHorizontalRatio: number;
  requiredHorizontalRatio: number;
  legStraight: boolean;
  cameraMode: PoseCameraMode;
  leftElbowAngle: number;
  rightElbowAngle: number;
  elbowDownMax: number;
  elbowIndividualDownMax: number;
  elbowUpMin: number;
  elbowSymmetryMaxDelta: number;
  trackingMessage?: string;
}

type PushUpTransitionContext = Pick<
  PushUpKinematics,
  | "cameraMode"
  | "leftElbowAngle"
  | "rightElbowAngle"
  | "elbowDownMax"
  | "elbowIndividualDownMax"
  | "elbowUpMin"
  | "elbowSymmetryMaxDelta"
>;

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
  private trackingLossFrames = 0;

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
    this.trackingLossFrames = 0;
  }

  interruptTracking(): void {
    this.abortIncompleteRep();
    this.trackingLossFrames = 0;
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
      legStraight,
      cameraMode,
      leftElbowAngle,
      rightElbowAngle,
      elbowDownMax,
      elbowIndividualDownMax,
      elbowUpMin,
      elbowSymmetryMaxDelta,
      trackingMessage,
    } = this.readKinematics(frame);

    if (!trackingValid) {
      this.trackingLossFrames += 1;
      if (this.trackingLossFrames >= this.config.trackingGraceFrames) {
        this.abortIncompleteRep();
      }
      return this.result([], false, elbowAngle, {
        cameraMode,
        leftElbowAngle,
        rightElbowAngle,
        trackingMessage: trackingMessage ?? "Kedua bahu, siku, dan tangan belum terbaca stabil.",
      });
    }
    this.trackingLossFrames = 0;

    const bodyHorizontal = bodyHorizontalRatio >= requiredHorizontalRatio;
    const plankReady = bodyHorizontal
      && legStraight
      && hipDeviation >= -this.config.hipSagMaxDrop
      && hipDeviation <= this.config.hipRiseMaxRise
      && elbowAngle >= elbowUpMin - 5;
    const feedback: FrameFeedback[] = [];
    this.evaluateIssues(
      elbowAngle,
      hipDeviation,
      elbowAsymmetry,
      elbowSymmetryMaxDelta,
      elbowDownMax,
      bodyHorizontal,
      legStraight,
      feedback,
    );

    if (this.phase === PushUpPhase.SETUP) {
      this.advance(elbowAngle, plankReady, frame.timestampMs, {
        cameraMode,
        leftElbowAngle,
        rightElbowAngle,
        elbowDownMax,
        elbowIndividualDownMax,
        elbowUpMin,
        elbowSymmetryMaxDelta,
      });
      return this.result(feedback, true, elbowAngle, {
        cameraMode,
        leftElbowAngle,
        rightElbowAngle,
        trackingMessage: plankReady
          ? undefined
          : "Kunci posisi plank atas dengan kedua siku lurus.",
        bodyAligned: bodyHorizontal && legStraight,
      });
    }

    if (!bodyHorizontal || !legStraight) {
      this.orientationLossFrames += 1;
      if (this.orientationLossFrames >= this.config.debounceFrames) this.abortIncompleteRep();
      return this.result(feedback, true, elbowAngle, {
        cameraMode,
        leftElbowAngle,
        rightElbowAngle,
        trackingMessage: cameraMode === "side"
          ? "Luruskan lutut dan garis tubuh dari bahu sampai kaki."
          : "Kembali ke posisi plank. Gerakan lengan saat berdiri tidak dihitung.",
        bodyAligned: false,
      });
    }
    this.orientationLossFrames = 0;

    if (this.currentRep) {
      this.currentRep.minElbowAngle = Math.min(this.currentRep.minElbowAngle, elbowAngle);
      this.currentRep.maxHipSag = Math.max(this.currentRep.maxHipSag, Math.max(0, -hipDeviation));
      this.currentRep.maxHipRise = Math.max(this.currentRep.maxHipRise, Math.max(0, hipDeviation));
      this.currentRep.maxHipAbsDeviation = Math.max(this.currentRep.maxHipAbsDeviation, Math.abs(hipDeviation));
      this.currentRep.maxElbowAsymmetry = Math.max(this.currentRep.maxElbowAsymmetry, elbowAsymmetry);
      this.currentRep.minWorstElbowAngle = Math.min(
        this.currentRep.minWorstElbowAngle,
        Math.max(leftElbowAngle, rightElbowAngle),
      );
      this.currentRep.minBodyHorizontalMargin = Math.min(
        this.currentRep.minBodyHorizontalMargin,
        bodyHorizontalRatio - requiredHorizontalRatio,
      );
      this.currentRep.keptLegsStraight = this.currentRep.keptLegsStraight && legStraight;
    }

    const repetitionsBefore = this.repetitions.length;
    this.advance(elbowAngle, plankReady, frame.timestampMs, {
      cameraMode,
      leftElbowAngle,
      rightElbowAngle,
      elbowDownMax,
      elbowIndividualDownMax,
      elbowUpMin,
      elbowSymmetryMaxDelta,
    });
    appendCompletedRepFeedback(this.repetitions, repetitionsBefore, feedback, PUSH_UP_FEEDBACK);

    return this.result(feedback, true, elbowAngle, {
      cameraMode,
      leftElbowAngle,
      rightElbowAngle,
      bodyAligned: bodyHorizontal && legStraight,
    });
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
    const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    const leftOk =
      visible(lShoulder, cfg.minConfidence) &&
      visible(lElbow, cfg.minConfidence) &&
      visible(lWrist, cfg.minConfidence) &&
      visible(lHip, cfg.minConfidence) &&
      visible(lKnee, cfg.minConfidence) &&
      visible(lAnkle, cfg.minConfidence);
    const rightOk =
      visible(rShoulder, cfg.minConfidence) &&
      visible(rElbow, cfg.minConfidence) &&
      visible(rWrist, cfg.minConfidence) &&
      visible(rHip, cfg.minConfidence) &&
      visible(rKnee, cfg.minConfidence) &&
      visible(rAnkle, cfg.minConfidence);

    const sideOptions = [
      leftOk
        ? sideKinematics(lShoulder!, lElbow!, lWrist!, lHip!, lKnee!, lAnkle!, cfg)
        : null,
      rightOk
        ? sideKinematics(rShoulder!, rElbow!, rWrist!, rHip!, rKnee!, rAnkle!, cfg)
        : null,
    ].filter((value): value is PushUpKinematics => value !== null);
    const bestSide = sideOptions.sort((a, b) => b.bodyHorizontalRatio - a.bodyHorizontalRatio)[0];

    const front = frontArmKinematics(landmarks, frame.worldLandmarks, cfg);
    if (frame.cameraMode === "front") {
      return front ?? invalidKinematics(
        0,
        "front",
        "Kedua bahu, siku, dan tangan harus terlihat bersamaan.",
        cfg,
      );
    }

    if (bestSide && leftOk && rightOk) {
      const leftAngle = angleBetweenDegrees(lShoulder!, lElbow!, lWrist!);
      const rightAngle = angleBetweenDegrees(rShoulder!, rElbow!, rWrist!);
      bestSide.elbowAngle = (leftAngle + rightAngle) / 2;
      bestSide.leftElbowAngle = leftAngle;
      bestSide.rightElbowAngle = rightAngle;
      bestSide.elbowAsymmetry = Math.abs(leftAngle - rightAngle);
    }

    if (frame.cameraMode === "side") {
      return bestSide ?? invalidKinematics(
        cfg.bodyHorizontalMinRatio,
        "side",
        "Bahu, siku, tangan, pinggul, lutut, dan kaki pada satu sisi harus terlihat.",
        cfg,
      );
    }

    if (front?.trackingValid) return front;
    if (bestSide && bestSide.bodyHorizontalRatio >= cfg.bodyHorizontalMinRatio) return bestSide;
    return bestSide ?? invalidKinematics(
      cfg.bodyHorizontalMinRatio,
      "side",
      "Tubuh belum terbaca lengkap.",
      cfg,
    );
  }

  private evaluateIssues(
    elbowAngle: number,
    hipDeviation: number,
    elbowAsymmetry: number,
    elbowSymmetryMaxDelta: number,
    elbowDownMax: number,
    bodyHorizontal: boolean,
    legStraight: boolean,
    feedback: FrameFeedback[],
  ): void {
    const cfg = this.config;
    const codes: string[] = [];

    if (!bodyHorizontal) push(codes, feedback, "body-not-horizontal", PUSH_UP_FEEDBACK);
    if (this.phase === PushUpPhase.SETUP && !bodyHorizontal) push(codes, feedback, "plank-required", PUSH_UP_FEEDBACK);
    if (!legStraight) push(codes, feedback, "knees-bent", PUSH_UP_FEEDBACK);
    if (hipDeviation < -cfg.hipSagMaxDrop) push(codes, feedback, "hips-too-low", PUSH_UP_FEEDBACK);
    if (hipDeviation > cfg.hipRiseMaxRise) push(codes, feedback, "hips-too-high", PUSH_UP_FEEDBACK);
    if (elbowAsymmetry > elbowSymmetryMaxDelta) push(codes, feedback, "elbows-asymmetric", PUSH_UP_FEEDBACK);
    if (this.phase === PushUpPhase.DOWN && elbowAngle > elbowDownMax + 15) {
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

  private advance(
    elbowAngle: number,
    plankReady: boolean,
    ts: number,
    context: PushUpTransitionContext,
  ): void {
    const target = this.nextPhase(
      elbowAngle,
      plankReady,
      context.elbowDownMax,
      context.elbowUpMin,
      context.cameraMode,
    );
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
    if (this.pendingCount < this.config.debounceFrames) return;

    this.commitTransition(this.pendingPhase, elbowAngle, ts, context);
    this.pendingPhase = null;
    this.pendingCount = 0;
  }

  private nextPhase(
    elbowAngle: number,
    plankReady: boolean,
    elbowDownMax: number,
    elbowUpMin: number,
    cameraMode: PoseCameraMode,
  ): PushUpPhase {
    const downThreshold = elbowDownMax + (cameraMode === "front" ? 0.5 : 0);
    switch (this.phase) {
      case PushUpPhase.SETUP:
        return plankReady ? PushUpPhase.UP : PushUpPhase.SETUP;
      case PushUpPhase.UP:
        return elbowAngle < elbowUpMin - 10 ? PushUpPhase.DESCENDING : PushUpPhase.UP;
      case PushUpPhase.DESCENDING:
        if (elbowAngle <= downThreshold) return PushUpPhase.DOWN;
        if (this.currentRep && elbowAngle > this.currentRep.minElbowAngle + 20) return PushUpPhase.ASCENDING;
        return PushUpPhase.DESCENDING;
      case PushUpPhase.DOWN:
        return elbowAngle > elbowDownMax + 15 ? PushUpPhase.ASCENDING : PushUpPhase.DOWN;
      case PushUpPhase.ASCENDING:
        return elbowAngle >= elbowUpMin - 1 ? PushUpPhase.COMPLETE : PushUpPhase.ASCENDING;
      case PushUpPhase.COMPLETE:
        return PushUpPhase.UP;
      default:
        return PushUpPhase.SETUP;
    }
  }

  private commitTransition(
    to: PushUpPhase,
    elbowAngle: number,
    ts: number,
    context: PushUpTransitionContext,
  ): void {
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
        minWorstElbowAngle: Math.max(context.leftElbowAngle, context.rightElbowAngle),
        keptLegsStraight: true,
        reachedDown: false,
        issueCodes: new Set<string>(),
        valid: false,
        cameraMode: context.cameraMode,
        elbowDownMax: context.elbowDownMax,
        elbowIndividualDownMax: context.elbowIndividualDownMax,
        elbowUpMin: context.elbowUpMin,
        elbowSymmetryMaxDelta: context.elbowSymmetryMaxDelta,
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
    const averageDepthTolerance = rep.cameraMode === "front" ? 0.5 : 5;
    const bentEnough = rep.minElbowAngle <= rep.elbowDownMax + averageDepthTolerance
      && rep.minWorstElbowAngle <= rep.elbowIndividualDownMax;
    const elbowsAligned = rep.maxElbowAsymmetry <= rep.elbowSymmetryMaxDelta;
    const hipsAligned = rep.maxHipSag <= cfg.hipSagMaxDrop && rep.maxHipRise <= cfg.hipRiseMaxRise;
    const stayedHorizontal = rep.minBodyHorizontalMargin >= 0;
    rep.valid = bentEnough
      && elbowsAligned
      && hipsAligned
      && stayedHorizontal
      && rep.keptLegsStraight
      && tempoMs >= cfg.tempoFastMs;

    if (rep.valid) {
      this.validReps += 1;
    } else {
      this.invalidReps += 1;
      if (!bentEnough) rep.issueCodes.add("elbows-not-bent");
      if (!elbowsAligned) rep.issueCodes.add("elbows-asymmetric");
      if (rep.maxHipSag > cfg.hipSagMaxDrop) rep.issueCodes.add("hips-too-low");
      if (rep.maxHipRise > cfg.hipRiseMaxRise) rep.issueCodes.add("hips-too-high");
      if (!stayedHorizontal) rep.issueCodes.add("body-not-horizontal");
      if (!rep.keptLegsStraight) rep.issueCodes.add("knees-bent");
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
        rangeScore: round(scoreFromRange(
          rep.minElbowAngle,
          rep.elbowDownMax + 35,
          rep.elbowDownMax,
          true,
        )),
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

  private result(
    feedback: FrameFeedback[],
    trackingValid: boolean,
    elbowAngle = 180,
    diagnostics?: ExerciseFrameResult["diagnostics"],
  ): ExerciseFrameResult {
    return {
      phase: this.phase,
      repCount: this.repCount,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      feedback,
      trackingValid,
      liveMetric: { label: "Sudut siku", value: round(elbowAngle) },
      diagnostics,
    };
  }
}

function visible(lm: NormalizedLandmark | undefined, min: number): boolean {
  return !!lm && lm.visibility >= min;
}

function invalidKinematics(
  requiredHorizontalRatio: number,
  cameraMode: PoseCameraMode,
  trackingMessage: string,
  config: PushUpConfig,
): PushUpKinematics {
  return {
    trackingValid: false,
    elbowAngle: 180,
    hipDeviation: 0,
    elbowAsymmetry: 0,
    bodyHorizontalRatio: 0,
    requiredHorizontalRatio,
    legStraight: false,
    cameraMode,
    leftElbowAngle: 180,
    rightElbowAngle: 180,
    elbowDownMax: cameraMode === "front" ? config.frontElbowDownMax : config.elbowDownMax,
    elbowIndividualDownMax: cameraMode === "front"
      ? config.frontElbowIndividualDownMax
      : config.elbowDownMax + 5,
    elbowUpMin: cameraMode === "front" ? config.frontElbowUpMin : config.elbowUpMin,
    elbowSymmetryMaxDelta: cameraMode === "front"
      ? config.frontElbowSymmetryMaxDelta
      : config.elbowSymmetryMaxDelta,
    trackingMessage,
  };
}

function sideKinematics(
  shoulder: NormalizedLandmark,
  elbow: NormalizedLandmark,
  wrist: NormalizedLandmark,
  hip: NormalizedLandmark,
  knee: NormalizedLandmark,
  ankle: NormalizedLandmark,
  config: PushUpConfig,
): PushUpKinematics {
  const bodyLength = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y) || 1;
  const dx = ankle.x - shoulder.x;
  const dy = ankle.y - shoulder.y;
  const t = ((hip.x - shoulder.x) * dx + (hip.y - shoulder.y) * dy) / (bodyLength * bodyLength);
  const projectedX = shoulder.x + t * dx;
  const projectedY = shoulder.y + t * dy;
  const deviation = Math.hypot(hip.x - projectedX, hip.y - projectedY) / bodyLength;
  const elbowAngle = angleBetweenDegrees(shoulder, elbow, wrist);
  return {
    trackingValid: true,
    elbowAngle,
    hipDeviation: hip.y > projectedY ? -deviation : deviation,
    elbowAsymmetry: 0,
    bodyHorizontalRatio: Math.abs(dx) / bodyLength,
    requiredHorizontalRatio: config.bodyHorizontalMinRatio,
    legStraight: angleBetweenDegrees(hip, knee, ankle) >= config.kneeStraightMin,
    cameraMode: "side",
    leftElbowAngle: elbowAngle,
    rightElbowAngle: elbowAngle,
    elbowDownMax: config.elbowDownMax,
    elbowIndividualDownMax: config.elbowDownMax + 5,
    elbowUpMin: config.elbowUpMin,
    elbowSymmetryMaxDelta: config.elbowSymmetryMaxDelta,
  };
}

function frontArmKinematics(
  landmarks: NormalizedLandmark[],
  worldLandmarks: NormalizedLandmark[] | undefined,
  config: PushUpConfig,
): PushUpKinematics | null {
  const geometry = readFrontArmGeometry(landmarks, config.minConfidence);
  if (!geometry?.trackingValid) return null;
  const torsoDepthRatio = readFrontTorsoDepthRatio(worldLandmarks, config.minConfidence);
  return {
    trackingValid: true,
    elbowAngle: geometry.elbowAngle,
    hipDeviation: 0,
    elbowAsymmetry: geometry.elbowAsymmetry,
    bodyHorizontalRatio: torsoDepthRatio ?? 1,
    requiredHorizontalRatio: torsoDepthRatio === null ? 0 : 0.55,
    // Legs are occluded in this mode, not known to be bent. Readiness already
    // locked a front plank before the active session entered this fallback.
    legStraight: true,
    cameraMode: "front",
    leftElbowAngle: geometry.leftElbowAngle,
    rightElbowAngle: geometry.rightElbowAngle,
    elbowDownMax: config.frontElbowDownMax,
    elbowIndividualDownMax: config.frontElbowIndividualDownMax,
    elbowUpMin: config.frontElbowUpMin,
    elbowSymmetryMaxDelta: config.frontElbowSymmetryMaxDelta,
  };
}

function readFrontTorsoDepthRatio(
  worldLandmarks: NormalizedLandmark[] | undefined,
  minConfidence: number,
): number | null {
  if (!worldLandmarks) return null;
  const leftShoulder = worldLandmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = worldLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const hips = [
    worldLandmarks[POSE_LANDMARKS.LEFT_HIP],
    worldLandmarks[POSE_LANDMARKS.RIGHT_HIP],
  ].filter((landmark): landmark is NormalizedLandmark => visible(landmark, minConfidence));
  if (
    !visible(leftShoulder, minConfidence)
    || !visible(rightShoulder, minConfidence)
    || hips.length === 0
  ) {
    return null;
  }

  const shoulderY = (leftShoulder!.y + rightShoulder!.y) / 2;
  const shoulderZ = (leftShoulder!.z + rightShoulder!.z) / 2;
  const hipY = avg(hips.map((landmark) => landmark.y));
  const hipZ = avg(hips.map((landmark) => landmark.z));
  const verticalSpan = Math.abs(hipY - shoulderY);
  const depthSpan = Math.abs(hipZ - shoulderZ);
  return depthSpan / Math.max(Math.hypot(depthSpan, verticalSpan), 0.001);
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
