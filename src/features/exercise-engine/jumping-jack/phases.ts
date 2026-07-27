/** Jumping jack state-machine phases (prd.md §10.2). */
export const JumpingJackPhase = {
  CLOSED: "closed",
  OPENING: "opening",
  OPEN: "open",
  CLOSING: "closing",
  COMPLETE: "complete",
} as const;

export type JumpingJackPhase = (typeof JumpingJackPhase)[keyof typeof JumpingJackPhase];
