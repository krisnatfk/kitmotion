import type { ExerciseConfig } from "@/features/exercise-engine/core/types";

/** Progressively raises session volume while keeping changes small and predictable. */
export function targetRepsForLevel(baseTarget: number | null, level: number): number | null {
  if (baseTarget == null) return null;
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.min(100, baseTarget + Math.floor((safeLevel - 1) / 2) * 2);
}

/** Tighten form tolerance gradually; milestone challenges remain the strictest gate. */
export function exerciseConfigForLevel(
  engineKey: string,
  config: ExerciseConfig,
  level: number,
): ExerciseConfig {
  const tier = Math.min(5, Math.floor(Math.max(1, level) / 10));
  if (tier === 0) return config;
  const next = { ...config } as Record<string, unknown>;
  if (engineKey === "push-up") {
    next.hipSagMaxDrop = tighten(Number(next.hipSagMaxDrop ?? 0.12), tier, 0.07);
    next.hipRiseMaxRise = tighten(Number(next.hipRiseMaxRise ?? 0.12), tier, 0.07);
    next.elbowSymmetryMaxDelta = tighten(Number(next.elbowSymmetryMaxDelta ?? 18), tier, 10);
  }
  if (engineKey === "jumping-jack") {
    next.symmetryMaxDelta = tighten(Number(next.symmetryMaxDelta ?? 0.15), tier, 0.08);
    next.coordinationMaxDelta = tighten(Number(next.coordinationMaxDelta ?? 0.35), tier, 0.2);
    next.armHeightMinRatio = Math.min(0.5, Number(next.armHeightMinRatio ?? 0.3) + tier * 0.03);
  }
  if (engineKey === "squat") {
    const kneeDownMax = Number(next.kneeDownMax ?? 105);
    next.kneeDownMax = Math.max(90, kneeDownMax - tier * 2);
  }
  return next;
}

function tighten(value: number, tier: number, floor: number): number {
  return Math.max(floor, value * (1 - tier * 0.08));
}
