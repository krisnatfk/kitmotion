import { getAIConfig, type AIConfig } from "@/lib/ai/config";
import { decryptAICredential } from "@/lib/ai/credentials";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type ProviderRow = Database["public"]["Tables"]["ai_providers"]["Row"];

export type RuntimeAIProvider = AIConfig & {
  id: string | null;
  name: string;
  source: "database" | "environment";
};

export async function listRuntimeAIProviders(): Promise<RuntimeAIProvider[]> {
  const providers: RuntimeAIProvider[] = [];
  let unhealthyRows: ProviderRow[] = [];

  try {
    const service = getSupabaseServiceRole();
    const { data, error } = await service
      .from("ai_providers")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error) {
      const rows = (data ?? []) as ProviderRow[];
      unhealthyRows = rows.filter((row) => row.health_status === "unhealthy");
      await appendDatabaseProviders(providers, rows.filter((row) => row.health_status !== "unhealthy"));
    }
  } catch {
    // The environment provider remains available before the optional registry
    // migration is installed or while Supabase is temporarily unavailable.
  }

  try {
    const config = getAIConfig();
    if (config && !providers.some((item) => item.baseUrl === config.baseUrl && item.model === config.model)) {
      providers.push({
        ...config,
        id: null,
        name: "Environment fallback",
        source: "environment",
      });
    }
  } catch {
    // Invalid environment configuration must not disable database providers.
  }

  // Only retry providers marked unhealthy when no healthy database provider
  // and no environment fallback is available.
  if (providers.length === 0 && unhealthyRows.length > 0) {
    await appendDatabaseProviders(providers, unhealthyRows);
  }

  return providers;
}

async function appendDatabaseProviders(target: RuntimeAIProvider[], rows: ProviderRow[]): Promise<void> {
  for (const row of rows) {
    try {
      target.push({
        id: row.id,
        name: row.name,
        source: "database",
        provider: row.name,
        apiKey: decryptAICredential(row.api_key_encrypted),
        baseUrl: row.base_url.replace(/\/$/, ""),
        model: row.model,
        timeoutMs: 7_000,
        responseFormat: row.response_format,
      });
    } catch {
      await recordAIProviderHealth(row.id, false, null, "Credential tidak dapat didekripsi.");
    }
  }
}

export async function recordAIProviderHealth(
  providerId: string | null,
  success: boolean,
  latencyMs: number | null,
  errorMessage?: string,
  responseFormat?: "json_schema" | "json_object",
): Promise<void> {
  if (!providerId) return;
  try {
    const service = getSupabaseServiceRole();
    if (success) {
      await service.from("ai_providers").update({
        health_status: "healthy",
        consecutive_failures: 0,
        last_checked_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_latency_ms: latencyMs,
        last_error: null,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }).eq("id", providerId);
      return;
    }

    const { data } = await service
      .from("ai_providers")
      .select("consecutive_failures")
      .eq("id", providerId)
      .maybeSingle();
    const failures = (data?.consecutive_failures ?? 0) + 1;
    await service.from("ai_providers").update({
      health_status: failures >= 2 ? "unhealthy" : "degraded",
      consecutive_failures: failures,
      last_checked_at: new Date().toISOString(),
      last_latency_ms: latencyMs,
      last_error: (errorMessage || "Respons AI tidak valid.").slice(0, 300),
    }).eq("id", providerId);
  } catch {
    // Health telemetry must never break the user-facing AI fallback.
  }
}
