import { getAIConfig } from "@/lib/ai/config";
import { getSupabaseServiceRole } from "@/lib/supabase/server";

export type AdminAIProviderRow = {
  id: string | null;
  name: string;
  baseUrl: string;
  model: string;
  responseFormat: "json_schema" | "json_object";
  priority: number;
  isActive: boolean;
  healthStatus: "unchecked" | "healthy" | "degraded" | "unhealthy";
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastLatencyMs: number | null;
  lastError: string | null;
  source: "database" | "environment";
};

export async function adminGetAIProviderRegistry(): Promise<{ providers: AdminAIProviderRow[]; error: string | null }> {
  const service = getSupabaseServiceRole();
  const { data, error } = await service
    .from("ai_providers")
    .select("id, name, base_url, model, response_format, priority, is_active, health_status, consecutive_failures, last_checked_at, last_success_at, last_latency_ms, last_error")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  const providers: AdminAIProviderRow[] = (error ? [] : data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    model: row.model,
    responseFormat: row.response_format,
    priority: row.priority,
    isActive: row.is_active,
    healthStatus: row.health_status,
    consecutiveFailures: row.consecutive_failures,
    lastCheckedAt: row.last_checked_at,
    lastSuccessAt: row.last_success_at,
    lastLatencyMs: row.last_latency_ms,
    lastError: row.last_error,
    source: "database",
  }));

  try {
    const config = getAIConfig();
    if (config) {
      providers.push({
        id: null,
        name: "Environment fallback",
        baseUrl: config.baseUrl,
        model: config.model,
        responseFormat: config.responseFormat,
        priority: 9999,
        isActive: true,
        healthStatus: "unchecked",
        consecutiveFailures: 0,
        lastCheckedAt: null,
        lastSuccessAt: null,
        lastLatencyMs: null,
        lastError: null,
        source: "environment",
      });
    }
  } catch {
    // Invalid environment fallback is omitted from the admin registry.
  }

  return {
    providers,
    error: error ? `Registry provider AI belum siap: ${error.message}` : null,
  };
}
