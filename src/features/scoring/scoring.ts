import { clamp } from "@/lib/utils";

/** Scoring version (prd.md §11, rules.md §10.3). Old sessions keep their version. */
export const SCORING_VERSION = "cam-v1";

/** Component weights (prd.md §11). Camera-only in this phase. */
export const SCORE_WEIGHTS = {
  form: 40,
  range: 25,
  consistency: 15,
  tempo: 10,
  stability: 10,
} as const;

export interface SubScores {
  formScore: number;
  rangeScore: number;
  consistencyScore: number;
  tempoScore: number;
  stabilityScore: number;
}

export type Grade = "A" | "B" | "C" | "D" | "E";

/** Map a 0–100 score to a grade (prd.md §12). */
export function gradeForScore(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
}

export interface FinalScoreResult {
  formScore: number;
  rangeScore: number;
  consistencyScore: number;
  tempoScore: number;
  stabilityScore: number;
  finalScore: number;
  grade: Grade;
}

/**
 * Server-authoritative final score. Each sub-score is clamped to [0,100]
 * (never trusts a client value out of range) then weighted by SCORE_WEIGHTS.
 * Returns 0 when no reps were performed (FR-075: not from a single frame, but
 * also not from zero reps).
 */
export function computeFinalScore(sub: Partial<SubScores>): FinalScoreResult {
  const formScore = clamp(Number.isFinite(sub.formScore) ? (sub.formScore as number) : 0, 0, 100);
  const rangeScore = clamp(Number.isFinite(sub.rangeScore) ? (sub.rangeScore as number) : 0, 0, 100);
  const consistencyScore = clamp(
    Number.isFinite(sub.consistencyScore) ? (sub.consistencyScore as number) : 0,
    0,
    100,
  );
  const tempoScore = clamp(Number.isFinite(sub.tempoScore) ? (sub.tempoScore as number) : 0, 0, 100);
  const stabilityScore = clamp(
    Number.isFinite(sub.stabilityScore) ? (sub.stabilityScore as number) : 0,
    0,
    100,
  );

  const total =
    (formScore * SCORE_WEIGHTS.form +
      rangeScore * SCORE_WEIGHTS.range +
      consistencyScore * SCORE_WEIGHTS.consistency +
      tempoScore * SCORE_WEIGHTS.tempo +
      stabilityScore * SCORE_WEIGHTS.stability) /
    100;

  const finalScore = clamp(Math.round(total * 100) / 100, 0, 100);
  return {
    formScore,
    rangeScore,
    consistencyScore,
    tempoScore,
    stabilityScore,
    finalScore,
    grade: gradeForScore(finalScore),
  };
}
