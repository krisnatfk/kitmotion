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
import { SIT_UP_DEFAULT_CONFIG, parseSitUpConfig, type SitUpConfig } from "./config";
import { SIT_UP_FEEDBACK } from "./feedback";

type SitUpPhase = "down" | "rising" | "top" | "lowering";

interface SitUpKinematics {
  trackingValid: boolean;
  hipAngle: number;
  kneeAngle: number;
  backAngle: number;
  chestKneeRatio: number;
}

interface ActiveRep {
  startedAtMs: number;
  minHipAngle: number;
  minChestKneeRatio: number;
  minBackAngle: number;
  minKneeAngle: number;
  maxKneeAngle: number;
  reachedTop: boolean;
  issueCodes: Set<string>;
}

export class SitUpEngine implements ExerciseEngine {
  private config: SitUpConfig = SIT_UP_DEFAULT_CONFIG;
  private phase: SitUpPhase = "down";
  private repetitions: RepRecord[] = [];
  private validReps = 0;
  private invalidReps = 0;
  private currentRep: ActiveRep | null = null;
  private pendingPhase: SitUpPhase | null = null;
  private pendingFrames = 0;
  private feedbackCounts: FeedbackCounter = new Map();
  private startMs = 0;
  private lastFrameMs = 0;

  initialize(config: ExerciseConfig): void {
    this.config = parseSitUpConfig(config);
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
    const kinematics = readSitUpKinematics(frame.landmarks, this.config);
    if (!kinematics.trackingValid) {
      this.abortIncompleteRep();
      return this.result([], false, kinematics.hipAngle);
    }

    this.updateRepExtremes(kinematics);
    const feedback = this.liveFeedback(kinematics);
    this.advance(kinematics, frame.timestampMs);
    return this.result(feedback, true, kinematics.hipAngle);
  }

  finalize(): ExerciseSessionMetrics {
    const valid = this.repetitions.filter((rep) => rep.isValid);
    return {
      totalReps: this.repetitions.length,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      repetitions: this.repetitions,
      feedbackSummary: feedbackSummary(this.feedbackCounts, SIT_UP_FEEDBACK),
      formScore: roundScore(average(valid.map((rep) => rep.metrics.formScore))),
      rangeScore: roundScore(average(valid.map((rep) => rep.metrics.rangeScore))),
      consistencyScore: roundScore(consistencyScore(valid)),
      tempoScore: roundScore(average(valid.map((rep) => tempoScore(
        rep.metrics.tempoMs,
        this.config.tempoFastMs,
        this.config.tempoSlowMs,
      )))),
      stabilityScore: roundScore(average(valid.map((rep) => rep.metrics.stabilityScore))),
      durationMs: this.startMs ? this.lastFrameMs - this.startMs : 0,
    };
  }

  private updateRepExtremes(kinematics: SitUpKinematics): void {
    const rep = this.currentRep;
    if (!rep) return;
    rep.minHipAngle = Math.min(rep.minHipAngle, kinematics.hipAngle);
    rep.minChestKneeRatio = Math.min(rep.minChestKneeRatio, kinematics.chestKneeRatio);
    rep.minBackAngle = Math.min(rep.minBackAngle, kinematics.backAngle);
    rep.minKneeAngle = Math.min(rep.minKneeAngle, kinematics.kneeAngle);
    rep.maxKneeAngle = Math.max(rep.maxKneeAngle, kinematics.kneeAngle);
  }

  private liveFeedback(kinematics: SitUpKinematics): FrameFeedback[] {
    const codes: string[] = [];
    if (kinematics.kneeAngle < this.config.kneeBentMin || kinematics.kneeAngle > this.config.kneeBentMax) {
      codes.push("knees-wrong-angle");
    }
    if (this.phase === "rising" || this.phase === "top") {
      if (kinematics.hipAngle <= this.config.hipTopMax + 20 && kinematics.chestKneeRatio > this.config.chestKneeMaxRatio) {
        codes.push("chest-not-close");
      }
      if (kinematics.backAngle < this.config.backStraightMin) codes.push("back-not-straight");
    }
    if (this.phase === "top" && codes.length === 0) codes.push("good");
    for (const code of codes) this.currentRep?.issueCodes.add(code);
    return codes.flatMap((code) => {
      const meta = SIT_UP_FEEDBACK[code];
      return meta ? [{ code, ...meta }] : [];
    });
  }

  private advance(kinematics: SitUpKinematics, timestampMs: number): void {
    const hysteresisDown = this.phase === "down" ? 0 : 10;
    const hysteresisTop = this.phase === "top" ? 5 : 0;
    const isDown = kinematics.hipAngle >= this.config.hipDownMin - hysteresisDown;
    const isTop = kinematics.hipAngle <= this.config.hipTopMax + hysteresisTop
      && kinematics.chestKneeRatio <= this.config.chestKneeMaxRatio * 1.15;
    let target = this.phase;
    if (this.phase === "down" && !isDown) target = "rising";
    else if (this.phase === "rising" && isTop) target = "top";
    else if (this.phase === "rising" && isDown) target = "down";
    else if (this.phase === "top" && !isTop) target = "lowering";
    else if (this.phase === "lowering" && isDown) target = "down";

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

  private commitTransition(to: SitUpPhase, timestampMs: number, kinematics: SitUpKinematics): void {
    const from = this.phase;
    this.phase = to;
    if (from === "down" && to === "rising") {
      this.currentRep = {
        startedAtMs: timestampMs,
        minHipAngle: kinematics.hipAngle,
        minChestKneeRatio: kinematics.chestKneeRatio,
        minBackAngle: kinematics.backAngle,
        minKneeAngle: kinematics.kneeAngle,
        maxKneeAngle: kinematics.kneeAngle,
        reachedTop: false,
        issueCodes: new Set(),
      };
    }
    if (to === "top" && this.currentRep) {
      this.currentRep.reachedTop = true;
      this.completeRep(timestampMs);
    }
    if (from === "rising" && to === "down") this.currentRep = null;
  }

  private completeRep(timestampMs: number): void {
    const rep = this.currentRep;
    if (!rep?.reachedTop) {
      this.currentRep = null;
      return;
    }
    const tempoMs = timestampMs - rep.startedAtMs;
    const backStraight = rep.minBackAngle >= this.config.backStraightMin;
    const kneesCorrect = rep.minKneeAngle >= this.config.kneeBentMin
      && rep.maxKneeAngle <= this.config.kneeBentMax;
    const valid = rep.minHipAngle <= this.config.hipTopMax
      && rep.minChestKneeRatio <= this.config.chestKneeMaxRatio
      && backStraight
      && kneesCorrect
      && tempoMs >= this.config.tempoFastMs;
    if (!backStraight) rep.issueCodes.add("back-not-straight");
    if (!kneesCorrect) rep.issueCodes.add("knees-wrong-angle");
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
          scoreFromRange(rep.minBackAngle, this.config.backStraightMin - 30, 180)
          + scoreFromRange(Math.abs(90 - (rep.minKneeAngle + rep.maxKneeAngle) / 2), 35, 0, true)
        ) / 2),
        rangeScore: roundScore((
          scoreFromRange(rep.minHipAngle, this.config.hipDownMin, this.config.hipTopMax, true)
          + scoreFromRange(rep.minChestKneeRatio, this.config.chestKneeMaxRatio * 1.5, this.config.chestKneeMaxRatio, true)
        ) / 2),
        tempoMs,
        stabilityScore: roundScore(scoreFromRange(rep.minBackAngle, this.config.backStraightMin - 30, 180)),
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

  private result(feedback: FrameFeedback[], trackingValid: boolean, hipAngle: number): ExerciseFrameResult {
    return {
      phase: this.phase,
      repCount: this.repetitions.length,
      validReps: this.validReps,
      invalidReps: this.invalidReps,
      feedback,
      trackingValid,
      liveMetric: { label: "Sudut pinggul", value: hipAngle },
      diagnostics: { cameraMode: "side" },
    };
  }
}

export function readSitUpKinematics(
  landmarks: NormalizedLandmark[],
  config: SitUpConfig,
): SitUpKinematics {
  const sides = [
    { ear: POSE_LANDMARKS.LEFT_EAR, shoulder: POSE_LANDMARKS.LEFT_SHOULDER, hip: POSE_LANDMARKS.LEFT_HIP, knee: POSE_LANDMARKS.LEFT_KNEE, ankle: POSE_LANDMARKS.LEFT_ANKLE },
    { ear: POSE_LANDMARKS.RIGHT_EAR, shoulder: POSE_LANDMARKS.RIGHT_SHOULDER, hip: POSE_LANDMARKS.RIGHT_HIP, knee: POSE_LANDMARKS.RIGHT_KNEE, ankle: POSE_LANDMARKS.RIGHT_ANKLE },
  ];
  const side = sides.find((candidate) => Object.values(candidate).every((index) => isVisible(landmarks[index], config.minConfidence)));
  if (!side) return { trackingValid: false, hipAngle: 0, kneeAngle: 0, backAngle: 0, chestKneeRatio: Infinity };
  const ear = landmarks[side.ear]!;
  const shoulder = landmarks[side.shoulder]!;
  const hip = landmarks[side.hip]!;
  const knee = landmarks[side.knee]!;
  const ankle = landmarks[side.ankle]!;
  const torsoLength = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y) || 1;
  return {
    trackingValid: true,
    hipAngle: angleBetweenDegrees(shoulder, hip, knee),
    kneeAngle: angleBetweenDegrees(hip, knee, ankle),
    backAngle: angleBetweenDegrees(ear, shoulder, hip),
    chestKneeRatio: Math.hypot(shoulder.x - knee.x, shoulder.y - knee.y) / torsoLength,
  };
}
