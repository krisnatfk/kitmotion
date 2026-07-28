import type { RunPoint } from "./types";

/** A close street-level view that still gives the runner useful context. */
export const LIVE_FOLLOW_ZOOM = 18;
export const RESULT_MAX_ZOOM = 20;

/**
 * A coarse first GPS fix can sit far outside the rest of an otherwise accurate
 * route and force Leaflet to zoom out. Prefer the accurate majority for camera
 * framing while keeping every accepted point available to draw the route.
 */
export function selectViewportPoints(points: RunPoint[]): RunPoint[] {
  if (points.length < 3) return points;
  const bestAccuracy = Math.min(...points.map((point) => point.accuracy));
  const accuracyLimit = Math.min(50, Math.max(30, bestAccuracy * 2));
  const accurate = points.filter((point) => point.accuracy <= accuracyLimit);
  return accurate.length >= Math.min(3, Math.ceil(points.length / 2))
    ? accurate
    : points;
}
