"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import {
  bestPaceSecondsPerKilometer,
  elevationGainMeters,
  haversineDistanceMeters,
  paceSecondsPerKilometer,
  routeDistanceMeters,
} from "./metrics";
import { applyRunRewards } from "./rewards";
import { finalizeRunSchema, type FinalizeRunInput } from "./schema";
import type { RunPoint } from "./types";

export type FinalizeRunResult = {
  runId: string;
  distanceMeters: number;
  durationSeconds: number;
  averagePace: number | null;
  bestPace: number | null;
  xpAwarded: number;
  newLevel: number;
};

export async function finalizeRun(
  input: FinalizeRunInput,
): Promise<FinalizeRunResult | { error: string }> {
  const parsed = finalizeRunSchema.safeParse(input);
  if (!parsed.success) return { error: "Data aktivitas lari tidak valid. Silakan coba simpan kembali." };

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi login berakhir. Silakan masuk kembali." };

  const admin = getSupabaseServiceRole();
  const { data: existing } = await admin
    .from("running_sessions")
    .select("id, distance_meters, duration_seconds, average_pace_seconds_per_km, best_pace_seconds_per_km")
    .eq("user_id", user.id)
    .eq("client_session_id", parsed.data.clientSessionId)
    .single();
  if (existing) {
    const { data: progress } = await admin.from("user_progress").select("current_level").eq("user_id", user.id).single();
    return {
      runId: existing.id,
      distanceMeters: Number(existing.distance_meters),
      durationSeconds: existing.duration_seconds,
      averagePace: existing.average_pace_seconds_per_km,
      bestPace: existing.best_pace_seconds_per_km,
      xpAwarded: 0,
      newLevel: progress?.current_level ?? 1,
    };
  }

  const route = sanitizeRoute(parsed.data.route);
  if (route.length === 0) return { error: "Belum ada titik GPS yang dapat disimpan." };
  const distanceMeters = Math.round(routeDistanceMeters(route) * 100) / 100;
  const averagePace = paceSecondsPerKilometer(parsed.data.durationSeconds, distanceMeters);
  const bestPace = bestPaceSecondsPerKilometer(route) ?? averagePace;
  const elevationGain = Math.round(elevationGainMeters(route) * 100) / 100;
  const caloriesEstimate = Math.max(0, Math.round((distanceMeters / 1000) * 60));
  const completedAt = new Date().toISOString();

  const { data: row, error } = await admin.from("running_sessions").insert({
    user_id: user.id,
    client_session_id: parsed.data.clientSessionId,
    status: "completed",
    started_at: parsed.data.startedAt,
    completed_at: completedAt,
    duration_seconds: parsed.data.durationSeconds,
    distance_meters: distanceMeters,
    average_pace_seconds_per_km: averagePace,
    best_pace_seconds_per_km: bestPace,
    elevation_gain_meters: elevationGain,
    calories_estimate: caloriesEstimate,
    route: route as unknown as Json,
    metadata: { tracker_version: "gps-v1", point_count: route.length },
  }).select("id").single();
  if (error || !row) return { error: `Gagal menyimpan aktivitas lari: ${error?.message ?? "unknown"}` };

  let reward = { xpAwarded: 0, newLevel: 1 };
  try {
    reward = await applyRunRewards(admin, {
      runId: row.id,
      userId: user.id,
      distanceMeters,
      durationSeconds: parsed.data.durationSeconds,
      completedAt,
    });
  } catch {
    // The GPS activity is more important than an optional reward. A reward
    // failure must never delete a successfully stored route.
  }

  revalidatePath("/running");
  revalidatePath("/history");
  revalidatePath("/dashboard");
  return {
    runId: row.id,
    distanceMeters,
    durationSeconds: parsed.data.durationSeconds,
    averagePace,
    bestPace,
    ...reward,
  };
}

function sanitizeRoute(points: RunPoint[]): RunPoint[] {
  const accepted: RunPoint[] = [];
  for (const point of points) {
    if (point.accuracy > 100) continue;
    const previous = accepted[accepted.length - 1];
    if (previous && previous.segment === point.segment) {
      const seconds = (point.timestamp - previous.timestamp) / 1000;
      if (seconds <= 0) continue;
      const speed = haversineDistanceMeters(previous, point) / seconds;
      if (speed > 15) continue;
    }
    accepted.push(point);
  }
  return accepted;
}
