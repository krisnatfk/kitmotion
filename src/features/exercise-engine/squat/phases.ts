/** Squat state-machine phases (prd.md §10.1). */
export const SquatPhase = {
  READY: "ready",
  DESCENDING: "descending",
  BOTTOM: "bottom",
  ASCENDING: "ascending",
  COMPLETE: "complete",
} as const;

export type SquatPhase = (typeof SquatPhase)[keyof typeof SquatPhase];

export const SQUAT_PHASES: readonly SquatPhase[] = [
  SquatPhase.READY,
  SquatPhase.DESCENDING,
  SquatPhase.BOTTOM,
  SquatPhase.ASCENDING,
  SquatPhase.COMPLETE,
] as const;
