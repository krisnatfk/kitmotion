import { getSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { RunPoint } from "./types";

export type RunningSessionRow = Database["public"]["Tables"]["running_sessions"]["Row"];

export interface RunningSession extends RunningSessionRow {
  parsedRoute: RunPoint[];
}

export async function listRuns(limit = 20): Promise<RunningSessionRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("running_sessions")
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRun(runId: string): Promise<RunningSession | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("running_sessions")
    .select("*")
    .eq("id", runId)
    .single();
  if (!data) return null;
  return { ...data, parsedRoute: parseRoute(data.route) };
}

export function parseRoute(value: unknown): RunPoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter((point): point is RunPoint => {
    if (!point || typeof point !== "object") return false;
    const item = point as Partial<RunPoint>;
    return typeof item.lat === "number" && typeof item.lng === "number" &&
      typeof item.timestamp === "number" && typeof item.elapsedSeconds === "number" &&
      typeof item.accuracy === "number" && typeof item.segment === "number";
  });
}
