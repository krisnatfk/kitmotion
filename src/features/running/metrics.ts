import type { RunPoint } from "./types";

const EARTH_RADIUS_METERS = 6_371_000;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  from: Pick<RunPoint, "lat" | "lng">,
  to: Pick<RunPoint, "lat" | "lng">,
): number {
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const fromLatitude = radians(from.lat);
  const toLatitude = radians(to.lat);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function routeDistanceMeters(points: RunPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current || previous.segment !== current.segment) continue;
    total += haversineDistanceMeters(previous, current);
  }
  return total;
}

export function elevationGainMeters(points: RunPoint[]): number {
  let gain = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current || previous.segment !== current.segment) continue;
    if (previous.altitude == null || current.altitude == null) continue;
    const difference = current.altitude - previous.altitude;
    if (difference >= 1.5 && difference <= 30) gain += difference;
  }
  return gain;
}

export function paceSecondsPerKilometer(
  durationSeconds: number,
  distanceMeters: number,
): number | null {
  if (durationSeconds <= 0 || distanceMeters < 20) return null;
  return Math.round(durationSeconds / (distanceMeters / 1000));
}

export function bestPaceSecondsPerKilometer(points: RunPoint[]): number | null {
  let best: number | null = null;
  for (let startIndex = 0; startIndex < points.length; startIndex += 1) {
    const start = points[startIndex];
    if (!start) continue;
    let distance = 0;
    for (let endIndex = startIndex + 1; endIndex < points.length; endIndex += 1) {
      const previous = points[endIndex - 1];
      const current = points[endIndex];
      if (!previous || !current || current.segment !== start.segment) break;
      distance += haversineDistanceMeters(previous, current);
      if (distance < 100) continue;
      const duration = current.elapsedSeconds - start.elapsedSeconds;
      const pace = paceSecondsPerKilometer(duration, distance);
      if (pace != null && pace >= 120 && pace <= 3600) best = best == null ? pace : Math.min(best, pace);
      break;
    }
  }
  return best;
}

export interface RunSplit {
  kilometer: number;
  durationSeconds: number;
  paceSeconds: number;
}

export function calculateKilometerSplits(points: RunPoint[]): RunSplit[] {
  const splits: RunSplit[] = [];
  let totalDistance = 0;
  let splitStartElapsed = points[0]?.elapsedSeconds ?? 0;
  let nextMarker = 1000;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current || previous.segment !== current.segment) continue;
    const segmentDistance = haversineDistanceMeters(previous, current);
    const distanceBeforeSegment = totalDistance;
    totalDistance += segmentDistance;
    while (totalDistance >= nextMarker && segmentDistance > 0) {
      const fraction = (nextMarker - distanceBeforeSegment) / segmentDistance;
      const crossingElapsed = previous.elapsedSeconds +
        Math.max(0, Math.min(1, fraction)) * (current.elapsedSeconds - previous.elapsedSeconds);
      const duration = Math.max(1, Math.round(crossingElapsed - splitStartElapsed));
      splits.push({ kilometer: splits.length + 1, durationSeconds: duration, paceSeconds: duration });
      splitStartElapsed = crossingElapsed;
      nextMarker += 1000;
    }
  }
  return splits;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function formatPace(secondsPerKilometer: number | null): string {
  if (secondsPerKilometer == null || !Number.isFinite(secondsPerKilometer)) return "—";
  const seconds = Math.max(0, Math.round(secondsPerKilometer));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatDistance(distanceMeters: number): string {
  return (Math.max(0, distanceMeters) / 1000).toFixed(2);
}
