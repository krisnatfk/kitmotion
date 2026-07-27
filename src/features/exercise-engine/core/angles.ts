import type { NormalizedLandmark } from "./types";

/**
 * Interior angle (degrees) at point `b` formed by points a-b-c, projected onto
 * the image plane (x, y). Returns a value in [0, 180]. MediaPipe's z is not
 * metric, so 2D projection is used for joint angles.
 */
export function angleBetweenDegrees(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;

  const dot = abX * cbX + abY * cbY;
  const cross = abX * cbY - abY * cbX;
  const angle = Math.atan2(Math.abs(cross), dot); // 0..π

  return (angle * 180) / Math.PI;
}

/** Midpoint of two landmarks. */
export function midpoint(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Angle of a line (from `from` to `to`) relative to the screen-vertical axis,
 * in degrees. 0 = perfectly upright, positive = leaning right. Used to detect
 * torso lean. Image y grows downward, so "up" is negative y.
 */
export function leanFromVerticalDegrees(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Angle from the downward vertical (0,1). Torso from hip(up) to shoulder(down)?
  // We pass shoulder->hip so dy>0 means upright torso.
  const angle = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (angle * 180) / Math.PI;
}

/** Clamp + linear map from one range to another, returning a 0..100 score. */
export function scoreFromRange(
  value: number,
  goodMin: number,
  goodMax: number,
  invert = false,
): number {
  const clamped = Math.min(Math.max(value, Math.min(goodMin, goodMax)), Math.max(goodMin, goodMax));
  const t = (clamped - Math.min(goodMin, goodMax)) / (Math.max(goodMin, goodMax) - Math.min(goodMin, goodMax) || 1);
  const score = (invert ? 1 - t : t) * 100;
  return Math.min(Math.max(score, 0), 100);
}
