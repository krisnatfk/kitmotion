import { angleBetweenDegrees, scoreFromRange } from "../core/angles";
import {
  average,
  consistencyScore,
  feedbackSummary,
  isVisible,
  recordFeedbackCodes,
  roundScore,
  tempoScore,
  type FeedbackCounter,
} from "../core/engine-utils";
import { POSE_LANDMARKS } from "../core/landmarks";
import type {
  ExerciseConfig,
  ExerciseEngine,
  ExerciseFrameResult,
  ExerciseSessionMetrics,
  FrameFeedback,
  NormalizedLandmark,
  PoseFrame,
  RepRecord,
} from "../core/types";
import { PULL_UP_DEFAULT_CONFIG, parsePullUpConfig, type PullUpConfig } from "./config";
import { PULL_UP_FEEDBACK } from "./feedback";

type PullUpPhase = "down" | "ascending" | "top" | "descending";

export interface PullUpKinematics {
  trackingValid: boolean;
  leftElbowAngle: number;
  rightElbowAngle: number;
  averageElbowAngle: number;
  elbowAsymmetry: number;
  chinClearanceRatio: number;
  handsHeightRatio: number;
  bodySwingRatio: number;
}

interface ActiveRep {
  startedAtMs: number;
  minElbowAngle: number;
  maxElbowAsymmetry: number;
  maxChinClearanceRatio: number;
  maxBodySwingRatio: number;
  reachedTop: boolean;
  issueCodes: Set<string>;
}

export class PullUpEngine implements ExerciseEngine {
  private config: PullUpConfig = PULL_UP_DEFAULT_CONFIG;
  private phase: PullUpPhase = "down";
  private repetitions: RepRecord[] = [];
  private validReps = 0;
  private invalidReps = 0;
  private currentRep: ActiveRep | null = null;
  private pendingPhase: PullUpPhase | null = null;
  private pendingFrames = 0;
  private feedbackCounts: FeedbackCounter = new Map();
  private startMs = 0;
  private lastFrameMs = 0;

  initialize(config: ExerciseConfig): void {
    this.config = parsePullUpConfig(config);
    this.reset();
  }

  reset(): void {
    this.phase = "down";
    this.repetitions = [];
    this.validReps = 0;
    this.invalidReps = 0;
    this.currentRep = null;
    this.pendingPhase = null;
    this.pendingFrames = 0;
    this.feedbackCounts.clear();
    this.startMs = 0;
    this.lastFrameMs = 0;
  }

  interruptTracking(): void {
    this.abortIncompleteRep();
  }

  processFrame(frame: PoseFrame): ExerciseFrameResult {
    if (this.startMs === 0) this.startMs = frame.timestampMs;
    this.lastFrameMs = frame.timestampMs;
    const kinematics = readPullUpKinematics(frame.landmarks, this.config);
    if (!kinematics.trackingValid) {
      this.abortIncompleteRep();
      return this.result([], false, kinematics);
    }
    this.updateRep(kinematics);
    const feedback = this.liveFeedback(kinematics);
    this.advance(kinematics, frame.timestampMs);
    return this.result(feedback, true, kinematics);
  }

  finalize(): ExerciseSessionMetrics {
    const valid = this.repetitions.filter((rep) => rep.isValid);
    return {
      totalReps: this.repetitions.length,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      repetitions: this.repetitions,
      feedbackSummary: feedbackSummary(this.feedbackCounts, PULL_UP_FEEDBACK),
      formScore: roundScore(average(valid.map((rep) => rep.metrics.formScore))),
      rangeScore: roundScore(average(valid.map((rep) => rep.metrics.rangeScore))),
      consistencyScore: roundScore(consistencyScore(valid)),
      tempoScore: roundScore(average(valid.map((rep) => tempoScore(rep.metrics.tempoMs, this.config.tempoFastMs, this.config.tempoSlowMs)))),
      stabilityScore: roundScore(average(valid.map((rep) => rep.metrics.stabilityScore))),
      durationMs: this.startMs ? this.lastFrameMs - this.startMs : 0,
    };
  }

  private updateRep(kinematics: PullUpKinematics): void {
    if (!this.currentRep) return;
    this.currentRep.minElbowAngle = Math.min(this.currentRep.minElbowAngle, kinematics.averageElbowAngle);
    this.currentRep.maxElbowAsymmetry = Math.max(this.currentRep.maxElbowAsymmetry, kinematics.elbowAsymmetry);
    this.currentRep.maxChinClearanceRatio = Math.max(this.currentRep.maxChinClearanceRatio, kinematics.chinClearanceRatio);
    this.currentRep.maxBodySwingRatio = Math.max(this.currentRep.maxBodySwingRatio, kinematics.bodySwingRatio);
  }

  private liveFeedback(kinematics: PullUpKinematics): FrameFeedback[] {
    const codes: string[] = [];
    if ((this.phase === "ascending" || this.phase === "top")
      && kinematics.averageElbowAngle <= this.config.elbowTopMax + 20
      && kinematics.chinClearanceRatio < this.config.chinAboveHandsMarginRatio) {
      codes.push("chin-below-bar");
    }
    if (kinematics.elbowAsymmetry > this.config.elbowSymmetryMaxDelta) codes.push("elbows-asymmetric");
    if (kinematics.bodySwingRatio > this.config.bodySwingMaxRatio) codes.push("swinging");
    if (this.phase === "top" && codes.length === 0) codes.push("good");
    for (const code of codes) this.currentRep?.issueCodes.add(code);
    return codes.flatMap((code) => {
      const meta = PULL_UP_FEEDBACK[code];
      return meta ? [{ code, ...meta }] : [];
    });
  }

  private advance(kinematics: PullUpKinematics, timestampMs: number): void {
    const isHanging = kinematics.averageElbowAngle >= this.config.elbowHangMin
      && kinematics.handsHeightRatio >= this.config.handsAboveShoulderMinRatio;
    const isTop = kinematics.averageElbowAngle <= this.config.elbowTopMax
      && kinematics.chinClearanceRatio >= this.config.chinAboveHandsMarginRatio;
    let target = this.phase;
    if (this.phase === "down" && !isHanging) target = "ascending";
    else if (this.phase === "ascending" && isTop) target = "top";
    else if (this.phase === "ascending" && isHanging) target = "down";
    else if (this.phase === "top" && !isTop) target = "descending";
    else if (this.phase === "descending" && isHanging) target = "down";

    if (target === this.phase) {
      this.pendingPhase = null;
      this.pendingFrames = 0;
      return;
    }
    if (target !== this.pendingPhase) {
      this.pendingPhase = target;
      this.pendingFrames = 1;
      return;
    }
    this.pendingFrames += 1;
    if (this.pendingFrames < this.config.debounceFrames) return;
    this.commitTransition(target, timestampMs, kinematics);
    this.pendingPhase = null;
    this.pendingFrames = 0;
  }

  private commitTransition(to: PullUpPhase, timestampMs: number, kinematics: PullUpKinematics): void {
    const from = this.phase;
    this.phase = to;
    if (from === "down" && to === "ascending") {
      this.currentRep = {
        startedAtMs: timestampMs,
        minElbowAngle: kinematics.averageElbowAngle,
        maxElbowAsymmetry: kinematics.elbowAsymmetry,
        maxChinClearanceRatio: kinematics.chinClearanceRatio,
        maxBodySwingRatio: kinematics.bodySwingRatio,
        reachedTop: false,
        issueCodes: new Set(),
      };
    }
    if (to === "top" && this.currentRep) {
      this.currentRep.reachedTop = true;
      this.completeRep(timestampMs);
    }
    if (from === "ascending" && to === "down") this.currentRep = null;
  }

  private completeRep(timestampMs: number): void {
    const rep = this.currentRep;
    if (!rep?.reachedTop) {
      this.currentRep = null;
      return;
    }
    const tempoMs = timestampMs - rep.startedAtMs;
    const symmetrical = rep.maxElbowAsymmetry <= this.config.elbowSymmetryMaxDelta;
    const stable = rep.maxBodySwingRatio <= this.config.bodySwingMaxRatio;
    const valid = rep.maxChinClearanceRatio >= this.config.chinAboveHandsMarginRatio
      && symmetrical
      && stable
      && tempoMs >= this.config.tempoFastMs;
    if (!symmetrical) rep.issueCodes.add("elbows-asymmetric");
    if (!stable) rep.issueCodes.add("swinging");
    if (tempoMs < this.config.tempoFastMs) rep.issueCodes.add("tempo-fast");
    if (valid) this.validReps += 1;
    else this.invalidReps += 1;
    const startedOffset = rep.startedAtMs - this.startMs;
    const completedOffset = timestampMs - this.startMs;
    this.repetitions.push({
      repNumber: this.repetitions.length + 1,
      startedOffsetMs: startedOffset,
      completedOffsetMs: completedOffset,
      isValid: valid,
      metrics: {
        formScore: roundScore((
          scoreFromRange(rep.maxElbowAsymmetry, this.config.elbowSymmetryMaxDelta, 0, true)
          + scoreFromRange(rep.maxBodySwingRatio, this.config.bodySwingMaxRatio, 0, true)
        ) / 2),
        rangeScore: roundScore((
          scoreFromRange(rep.minElbowAngle, this.config.elbowHangMin, this.config.elbowTopMax, true)
          + scoreFromRange(rep.maxChinClearanceRatio, -0.2, Math.max(0.1, this.config.chinAboveHandsMarginRatio + 0.1))
        ) / 2),
        tempoMs,
        stabilityScore: roundScore(scoreFromRange(rep.maxBodySwingRatio, this.config.bodySwingMaxRatio, 0, true)),
        issueCodes: [...rep.issueCodes],
      },
    });
    recordFeedbackCodes(this.feedbackCounts, rep.issueCodes, startedOffset, completedOffset);
    this.currentRep = null;
  }

  private abortIncompleteRep(): void {
    this.currentRep = null;
    this.phase = "down";
    this.pendingPhase = null;
    this.pendingFrames = 0;
  }

  private result(feedback: FrameFeedback[], trackingValid: boolean, kinematics: PullUpKinematics): ExerciseFrameResult {
    return {
      phase: this.phase,
      repCount: this.repetitions.length,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      feedback,
      trackingValid,
      liveMetric: { label: "Sudut siku", value: kinematics.averageElbowAngle },
      diagnostics: {
        cameraMode: "front",
        leftElbowAngle: kinematics.leftElbowAngle,
        rightElbowAngle: kinematics.rightElbowAngle,
      },
    };
  }
}

export function readPullUpKinematics(
  landmarks: NormalizedLandmark[],
  config: Pick<PullUpConfig, "minConfidence">,
): PullUpKinematics {
  const indices = [
    POSE_LANDMARKS.MOUTH_LEFT, POSE_LANDMARKS.MOUTH_RIGHT,
    POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW,
    POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ];
  if (!indices.every((index) => isVisible(landmarks[index], config.minConfidence))) {
    return {
      trackingValid: false,
      leftElbowAngle: 0,
      rightElbowAngle: 0,
      averageElbowAngle: 0,
      elbowAsymmetry: 0,
      chinClearanceRatio: -1,
      handsHeightRatio: 0,
      bodySwingRatio: 0,
    };
  }
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]!;
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]!;
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW]!;
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW]!;
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]!;
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]!;
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]!;
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]!;
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]!;
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]!;
  const shoulder = midpoint(leftShoulder, rightShoulder);
  const hip = midpoint(leftHip, rightHip);
  const ankle = midpoint(leftAnkle, rightAnkle);
  const torsoHeight = Math.hypot(hip.x - shoulder.x, hip.y - shoulder.y) || 1;
  const wristY = (leftWrist.y + rightWrist.y) / 2;
  const mouthY = (
    landmarks[POSE_LANDMARKS.MOUTH_LEFT]!.y
    + landmarks[POSE_LANDMARKS.MOUTH_RIGHT]!.y
  ) / 2;
  const leftElbowAngle = angleBetweenDegrees(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = angleBetweenDegrees(rightShoulder, rightElbow, rightWrist);
  return {
    trackingValid: true,
    leftElbowAngle,
    rightElbowAngle,
    averageElbowAngle: (leftElbowAngle + rightElbowAngle) / 2,
    elbowAsymmetry: Math.abs(leftElbowAngle - rightElbowAngle),
    chinClearanceRatio: (wristY - mouthY) / torsoHeight,
    handsHeightRatio: (shoulder.y - wristY) / torsoHeight,
    bodySwingRatio: pointLineDistance(hip, shoulder, ankle) / Math.max(
      Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y),
      torsoHeight,
    ),
  };
}

function midpoint(a: NormalizedLandmark, b: NormalizedLandmark): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointLineDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / length;
}
