import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { RunPoint } from "./types";

export type RunningSessionRow = Database["public"]["Tables"]["running_sessions"]["Row"];

export interface RunningSession extends RunningSessionRow {
  parsedRoute: RunPoint[];
}

async function currentRunningActor() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, admin: getSupabaseServiceRole() };
}

export async function listRuns(limit = 20): Promise<RunningSessionRow[]> {
  const actor = await currentRunningActor();
  if (!actor) return [];

  const { data, error } = await actor.admin
    .from("running_sessions")
    .select("*")
    .eq("user_id", actor.user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Riwayat lari gagal dimuat.");
  return data ?? [];
}

export async function getRun(runId: string): Promise<RunningSession | null> {
  const actor = await currentRunningActor();
  if (!actor) return null;

  const { data } = await actor.admin
    .from("running_sessions")
    .select("*")
    .eq("id", runId)
    .eq("user_id", actor.user.id)
    .eq("status", "completed")
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
