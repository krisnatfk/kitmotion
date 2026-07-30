/** Push-up state-machine phases (prd.md §10.3). */
export const PushUpPhase = {
  SETUP: "setup",
  UP: "up",
  DESCENDING: "descending",
  DOWN: "down",
  ASCENDING: "ascending",
  COMPLETE: "complete",
} as const;

export type PushUpPhase = (typeof PushUpPhase)[keyof typeof PushUpPhase];
