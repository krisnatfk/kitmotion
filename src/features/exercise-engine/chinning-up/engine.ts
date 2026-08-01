import { scoreFromRange } from "../core/angles";
import { average, feedbackSummary, roundScore, type FeedbackCounter } from "../core/engine-utils";
import type {
  ExerciseConfig,
  ExerciseEngine,
  ExerciseFrameResult,
  ExerciseSessionMetrics,
  FrameFeedback,
  PoseFrame,
} from "../core/types";
import { readPullUpKinematics, type PullUpKinematics } from "../pull-up/engine";
import {
  CHINNING_UP_DEFAULT_CONFIG,
  parseChinningUpConfig,
  type ChinningUpConfig,
} from "./config";
import { CHINNING_UP_FEEDBACK } from "./feedback";

export class ChinningUpEngine implements ExerciseEngine {
  private config: ChinningUpConfig = CHINNING_UP_DEFAULT_CONFIG;
  private validDurationMs = 0;
  private startMs = 0;
  private lastFrameMs = 0;
  private lastValidFrameMs = 0;
  private previousIssues = new Set<string>();
  private issueStartedAt = new Map<string, number>();
  private feedbackCounts: FeedbackCounter = new Map();
  private formSamples: number[] = [];
  private rangeSamples: number[] = [];
  private stabilitySamples: number[] = [];
  private phase: "holding" | "adjust" = "adjust";

  initialize(config: ExerciseConfig): void {
    this.config = parseChinningUpConfig(config);
    this.reset();
  }

  reset(): void {
    this.validDurationMs = 0;
    this.startMs = 0;
    this.lastFrameMs = 0;
    this.lastValidFrameMs = 0;
    this.previousIssues.clear();
    this.issueStartedAt.clear();
    this.feedbackCounts.clear();
    this.formSamples = [];
    this.rangeSamples = [];
    this.stabilitySamples = [];
    this.phase = "adjust";
  }

  interruptTracking(): void {
    this.closeIssueEpisodes(this.lastFrameMs);
    this.lastValidFrameMs = 0;
    this.phase = "adjust";
  }

  processFrame(frame: PoseFrame): ExerciseFrameResult {
    if (this.startMs === 0) this.startMs = frame.timestampMs;
    this.lastFrameMs = frame.timestampMs;
    const kinematics = readPullUpKinematics(frame.landmarks, this.config);
    if (!kinematics.trackingValid) {
      this.interruptTracking();
      return this.result([], false, kinematics);
    }

    const codes = this.issueCodes(kinematics);
    const valid = codes.length === 0;
    this.phase = valid ? "holding" : "adjust";
    if (valid) {
      if (this.lastValidFrameMs > 0) {
        this.validDurationMs += Math.min(
          frame.timestampMs - this.lastValidFrameMs,
          this.config.maximumFrameGapMs,
        );
      }
      this.lastValidFrameMs = frame.timestampMs;
      this.formSamples.push(scoreFromRange(kinematics.elbowAsymmetry, this.config.elbowSymmetryMaxDelta, 0, true));
      this.rangeSamples.push((
        scoreFromRange(kinematics.averageElbowAngle, this.config.elbowHoldMax + 30, this.config.elbowHoldMax, true)
        + scoreFromRange(kinematics.chinClearanceRatio, -0.2, Math.max(0.1, this.config.chinAboveHandsMarginRatio + 0.1))
      ) / 2);
      this.stabilitySamples.push(scoreFromRange(kinematics.bodySwingRatio, this.config.bodySwingMaxRatio, 0, true));
    } else {
      this.lastValidFrameMs = 0;
    }
    this.trackIssueEpisodes(codes, frame.timestampMs);
    const feedbackCodes = valid ? ["good"] : codes;
    const feedback = feedbackCodes.flatMap((code) => {
      const meta = CHINNING_UP_FEEDBACK[code];
      return meta ? [{ code, ...meta }] : [];
    });
    return this.result(feedback, true, kinematics);
  }

  finalize(): ExerciseSessionMetrics {
    this.closeIssueEpisodes(this.lastFrameMs);
    const quality = average(this.formSamples);
    const range = average(this.rangeSamples);
    const stability = average(this.stabilitySamples);
    return {
      totalReps: 0,
      validReps: 0,
      invalidReps: 0,
      repetitions: [],
      feedbackSummary: feedbackSummary(this.feedbackCounts, CHINNING_UP_FEEDBACK),
      formScore: roundScore(quality),
      rangeScore: roundScore(range),
      consistencyScore: this.formSamples.length > 0 ? roundScore(quality) : 0,
      tempoScore: this.validDurationMs > 0 ? 100 : 0,
      stabilityScore: roundScore(stability),
      durationMs: this.startMs ? this.lastFrameMs - this.startMs : 0,
      validDurationMs: this.validDurationMs,
    };
  }

  private issueCodes(kinematics: PullUpKinematics): string[] {
    const codes: string[] = [];
    if (kinematics.chinClearanceRatio < this.config.chinAboveHandsMarginRatio) codes.push("chin-below-bar");
    if (kinematics.averageElbowAngle > this.config.elbowHoldMax) codes.push("elbows-too-open");
    if (kinematics.elbowAsymmetry > this.config.elbowSymmetryMaxDelta) codes.push("elbows-asymmetric");
    if (kinematics.bodySwingRatio > this.config.bodySwingMaxRatio) codes.push("swinging");
    return codes;
  }

  private trackIssueEpisodes(codes: string[], timestampMs: number): void {
    const next = new Set(codes);
    for (const code of next) {
      if (!this.previousIssues.has(code)) this.issueStartedAt.set(code, timestampMs);
    }
    for (const code of this.previousIssues) {
      if (!next.has(code)) this.closeIssue(code, timestampMs);
    }
    this.previousIssues = next;
  }

  private closeIssueEpisodes(timestampMs: number): void {
    for (const code of this.previousIssues) this.closeIssue(code, timestampMs);
    this.previousIssues.clear();
  }

  private closeIssue(code: string, timestampMs: number): void {
    const startedAt = this.issueStartedAt.get(code) ?? timestampMs;
    const startedOffset = Math.max(0, startedAt - this.startMs);
    const completedOffset = Math.max(startedOffset, timestampMs - this.startMs);
    const current = this.feedbackCounts.get(code);
    if (current) {
      current.count += 1;
      current.last = completedOffset;
    } else {
      this.feedbackCounts.set(code, { count: 1, first: startedOffset, last: completedOffset });
    }
    this.issueStartedAt.delete(code);
  }

  private result(
    feedback: FrameFeedback[],
    trackingValid: boolean,
    kinematics: PullUpKinematics,
  ): ExerciseFrameResult {
    return {
      phase: this.phase,
      repCount: 0,
      validReps: 0,
      invalidReps: 0,
      feedback,
      trackingValid,
      validDurationMs: this.validDurationMs,
      liveMetric: { label: "Sudut siku", value: kinematics.averageElbowAngle },
      diagnostics: {
        cameraMode: "front",
        leftElbowAngle: kinematics.leftElbowAngle,
        rightElbowAngle: kinematics.rightElbowAngle,
      },
    };
  }
}
