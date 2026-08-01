import { scoreFromRange } from "./angles";
import type { FeedbackSummary, NormalizedLandmark, RepRecord } from "./types";

export function isVisible(
  landmark: NormalizedLandmark | undefined,
  minimumConfidence: number,
): landmark is NormalizedLandmark {
  return Boolean(landmark && landmark.visibility >= minimumConfidence);
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function tempoScore(tempoMs: number, fastMs: number, slowMs: number): number {
  const idealMinimum = fastMs * 2;
  if (tempoMs >= idealMinimum && tempoMs <= slowMs) return 100;
  if (tempoMs < idealMinimum) return scoreFromRange(tempoMs, fastMs, idealMinimum);
  return scoreFromRange(tempoMs, slowMs, slowMs * 1.5, true);
}

export function consistencyScore(repetitions: RepRecord[]): number {
  if (repetitions.length === 0) return 0;
  if (repetitions.length === 1) return 100;
  const scores = repetitions.map((rep) => rep.metrics.formScore);
  const mean = average(scores);
  const variance = average(scores.map((score) => (score - mean) ** 2));
  return scoreFromRange(Math.sqrt(variance), 30, 0, true);
}

export type FeedbackMeta = Record<
  string,
  { severity: "info" | "warning" | "critical"; message: string }
>;

export type FeedbackCounter = Map<
  string,
  { count: number; first: number; last: number }
>;

export function recordFeedbackCodes(
  counter: FeedbackCounter,
  codes: Iterable<string>,
  startedOffsetMs: number,
  completedOffsetMs: number,
): void {
  for (const code of codes) {
    if (code === "good") continue;
    const current = counter.get(code);
    if (current) {
      current.count += 1;
      current.last = completedOffsetMs;
    } else {
      counter.set(code, { count: 1, first: startedOffsetMs, last: completedOffsetMs });
    }
  }
}

export function feedbackSummary(
  counter: FeedbackCounter,
  feedback: FeedbackMeta,
): FeedbackSummary[] {
  return [...counter.entries()].map(([code, occurrence]) => {
    const meta = feedback[code] ?? { severity: "info" as const, message: code };
    return {
      code,
      severity: meta.severity,
      message: meta.message,
      occurrenceCount: occurrence.count,
      firstOffsetMs: occurrence.first,
      lastOffsetMs: occurrence.last,
    };
  });
}
