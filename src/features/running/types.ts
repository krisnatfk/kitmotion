export interface RunPoint {
  lat: number;
  lng: number;
  timestamp: number;
  elapsedSeconds: number;
  accuracy: number;
  altitude: number | null;
  segment: number;
}

export type RunTrackerStatus =
  | "idle"
  | "locating"
  | "active"
  | "paused"
  | "finished";

export interface RunSummary {
  clientSessionId: string;
  startedAt: string;
  durationSeconds: number;
  route: RunPoint[];
}
