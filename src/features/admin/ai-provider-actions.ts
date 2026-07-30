"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateStructuredCompletion } from "@/features/ai-coach/client";
import {
  dailyRecommendationContentSchema,
  dailyRecommendationJsonSchema,
  sessionCoachContentSchema,
  sessionCoachJsonSchema,
  teacherClassContentSchema,
  teacherClassJsonSchema,
} from "@/features/ai-coach/schemas";
import { decryptAICredential, encryptAICredential } from "@/lib/ai/credentials";
import { getAIConfig, type AIConfig } from "@/lib/ai/config";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import { requireAdminOrThrow } from "./guard";
import type { AdminResult } from "./actions";

const providerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nama provider minimal 2 karakter.").max(60),
  baseUrl: z.string().url("Base URL tidak valid.").max(300),
  apiKey: z.string().trim().max(500).optional(),
  model: z.string().trim().min(1, "Model wajib diisi.").max(120),
  priority: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

const healthOutputSchema = z.object({
  status: z.literal("ok"),
  message: z.string().min(2).max(120),
});
const healthJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "message"],
  properties: {
    status: { type: "string", enum: ["ok"] },
    message: { type: "string", maxLength: 120 },
  },
} as const;

export async function saveAIProviderAction(input: z.infer<typeof providerSchema>): Promise<AdminResult> {
  const parsed = providerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const admin = await requireAdminOrThrow();
    const service = getSupabaseServiceRole();
    const { data: before } = parsed.data.id
      ? await service.from("ai_providers").select("*").eq("id", parsed.data.id).maybeSingle()
      : { data: null };
    if (parsed.data.id && !before) return { error: "Provider AI tidak ditemukan." };

    const apiKey = parsed.data.apiKey || (before ? decryptAICredential(before.api_key_encrypted) : "");
    if (!apiKey) return { error: "API key wajib diisi untuk provider baru." };
    const encryptedKey = parsed.data.apiKey ? encryptAICredential(parsed.data.apiKey) : before!.api_key_encrypted;
    const initialFormat = before?.response_format ?? "json_schema";
    const config = providerConfig(parsed.data, apiKey, initialFormat);
    const startedAt = Date.now();
    const health = await probeProvider(config);
    const latency = Date.now() - startedAt;
    const now = new Date().toISOString();
    const values = {
      name: parsed.data.name,
      base_url: config.baseUrl,
      api_key_encrypted: encryptedKey,
      model: parsed.data.model,
      response_format: health?.responseFormat ?? initialFormat,
      priority: parsed.data.priority,
      is_active: parsed.data.isActive,
      health_status: health ? "healthy" as const : "unhealthy" as const,
      consecutive_failures: health ? 0 : (before?.consecutive_failures ?? 0) + 1,
      last_checked_at: now,
      last_success_at: health ? now : before?.last_success_at ?? null,
      last_latency_ms: latency,
      last_error: health ? null : "Koneksi gagal atau output tidak sesuai kontrak KITMOTION.",
      created_by: before?.created_by ?? admin.id,
    };

    let providerId = parsed.data.id;
    if (providerId) {
      const { error } = await service.from("ai_providers").update(values).eq("id", providerId);
      if (error) return { error: `Gagal menyimpan provider: ${error.message}` };
    } else {
      const { data, error } = await service.from("ai_providers").insert(values).select("id").single();
      if (error) return { error: `Gagal menyimpan provider: ${error.message}` };
      providerId = data.id;
    }

    await invalidateAIInsightCache();
    await auditProvider(admin.id, before ? "ai_provider.update" : "ai_provider.create", providerId!, before ? sanitizeProvider(before) : null, {
      name: values.name,
      base_url: values.base_url,
      model: values.model,
      priority: values.priority,
      is_active: values.is_active,
      health_status: values.health_status,
      response_format: values.response_format,
    });
    revalidatePath("/admin/ai");
    return {
      ok: true,
      message: health
        ? `Provider aktif (${health.responseFormat}, ${latency} ms).`
        : "Provider disimpan, tetapi health check gagal. Provider tidak akan diprioritaskan sampai tes berhasil.",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal menyimpan provider AI." };
  }
}

export async function testAIProviderAction(providerId: string): Promise<AdminResult> {
  const id = z.string().uuid().safeParse(providerId);
  if (!id.success) return { error: "ID provider tidak valid." };
  try {
    const admin = await requireAdminOrThrow();
    const service = getSupabaseServiceRole();
    const { data: row, error } = await service.from("ai_providers").select("*").eq("id", id.data).single();
    if (error || !row) return { error: "Provider AI tidak ditemukan." };
    const config = providerConfig({ name: row.name, baseUrl: row.base_url, model: row.model }, decryptAICredential(row.api_key_encrypted), row.response_format);
    const startedAt = Date.now();
    const health = await probeProvider(config);
    const latency = Date.now() - startedAt;
    const now = new Date().toISOString();
    await service.from("ai_providers").update({
      health_status: health ? "healthy" : "unhealthy",
      consecutive_failures: health ? 0 : row.consecutive_failures + 1,
      response_format: health?.responseFormat ?? row.response_format,
      last_checked_at: now,
      last_success_at: health ? now : row.last_success_at,
      last_latency_ms: latency,
      last_error: health ? null : "Koneksi gagal atau output tidak sesuai kontrak KITMOTION.",
    }).eq("id", row.id);
    await auditProvider(admin.id, "ai_provider.test", row.id, null, { success: Boolean(health), latency_ms: latency });
    revalidatePath("/admin/ai");
    return health
      ? { ok: true, message: `Provider aktif (${health.responseFormat}, ${latency} ms).` }
      : { error: "Provider merespons tidak valid. Periksa endpoint, API key, model, atau kuota." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tes provider gagal." };
  }
}

export async function testAIProviderFeaturesAction(providerId: string): Promise<AdminResult> {
  const id = z.string().uuid().safeParse(providerId);
  if (!id.success) return { error: "ID provider tidak valid." };
  try {
    const admin = await requireAdminOrThrow();
    const service = getSupabaseServiceRole();
    const { data: row, error } = await service.from("ai_providers").select("*").eq("id", id.data).single();
    if (error || !row) return { error: "Provider AI tidak ditemukan." };
    const config = providerConfig({ name: row.name, baseUrl: row.base_url, model: row.model }, decryptAICredential(row.api_key_encrypted), row.response_format);
    const startedAt = Date.now();
    const featureTest = await probeFeatureContracts(config);
    const latency = Date.now() - startedAt;
    const now = new Date().toISOString();
    await service.from("ai_providers").update({
      health_status: featureTest ? "healthy" : "unhealthy",
      consecutive_failures: featureTest ? 0 : row.consecutive_failures + 1,
      response_format: featureTest?.responseFormat ?? row.response_format,
      last_checked_at: now,
      last_success_at: featureTest ? now : row.last_success_at,
      last_latency_ms: latency,
      last_error: featureTest ? null : "Satu atau lebih kontrak fitur AI tidak valid.",
    }).eq("id", row.id);
    await auditProvider(admin.id, "ai_provider.feature_test", row.id, null, { success: Boolean(featureTest), latency_ms: latency });
    revalidatePath("/admin/ai");
    return featureTest
      ? { ok: true, message: `Semua kontrak aktif: Coach + Riwayat, Rekomendasi, dan Insight Guru (${latency} ms).` }
      : { error: "Provider belum lulus seluruh kontrak fitur KITMOTION." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tes fitur AI gagal." };
  }
}

export async function setAIProviderActiveAction(providerId: string, isActive: boolean): Promise<AdminResult> {
  const id = z.string().uuid().safeParse(providerId);
  if (!id.success) return { error: "ID provider tidak valid." };
  try {
    const admin = await requireAdminOrThrow();
    const service = getSupabaseServiceRole();
    const { error } = await service.from("ai_providers").update({ is_active: isActive }).eq("id", id.data);
    if (error) return { error: error.message };
    await invalidateAIInsightCache();
    await auditProvider(admin.id, isActive ? "ai_provider.enable" : "ai_provider.disable", id.data, null, { is_active: isActive });
    revalidatePath("/admin/ai");
    return { ok: true, message: isActive ? "Provider diaktifkan." : "Provider dinonaktifkan." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal mengubah provider." };
  }
}

export async function deleteAIProviderAction(providerId: string): Promise<AdminResult> {
  const id = z.string().uuid().safeParse(providerId);
  if (!id.success) return { error: "ID provider tidak valid." };
  try {
    const admin = await requireAdminOrThrow();
    const service = getSupabaseServiceRole();
    const { data: before } = await service.from("ai_providers").select("*").eq("id", id.data).maybeSingle();
    const { error } = await service.from("ai_providers").delete().eq("id", id.data);
    if (error) return { error: error.message };
    await invalidateAIInsightCache();
    await auditProvider(admin.id, "ai_provider.delete", id.data, before ? sanitizeProvider(before) : null, null);
    revalidatePath("/admin/ai");
    return { ok: true, message: "Provider dihapus." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal menghapus provider." };
  }
}

export async function importEnvironmentAIProviderAction(): Promise<AdminResult> {
  try {
    const admin = await requireAdminOrThrow();
    const config = getAIConfig();
    if (!config || !config.apiKey) return { error: "Provider environment belum lengkap." };
    const service = getSupabaseServiceRole();
    const { data: existing } = await service
      .from("ai_providers")
      .select("id")
      .eq("base_url", config.baseUrl)
      .eq("model", config.model)
      .maybeSingle();
    if (existing) return { error: "Provider dengan endpoint dan model ini sudah ada di registry." };

    const startedAt = Date.now();
    const health = await probeProvider(config);
    const latency = Date.now() - startedAt;
    const now = new Date().toISOString();
    const { data, error } = await service.from("ai_providers").insert({
      name: `${config.model} ENV`,
      base_url: config.baseUrl,
      api_key_encrypted: encryptAICredential(config.apiKey),
      model: config.model,
      response_format: health?.responseFormat ?? config.responseFormat,
      priority: 100,
      is_active: true,
      health_status: health ? "healthy" : "unhealthy",
      consecutive_failures: health ? 0 : 1,
      last_checked_at: now,
      last_success_at: health ? now : null,
      last_latency_ms: latency,
      last_error: health ? null : "Koneksi gagal atau output tidak sesuai kontrak KITMOTION.",
      created_by: admin.id,
    }).select("id").single();
    if (error) return { error: `Gagal mengimpor provider: ${error.message}` };
    await invalidateAIInsightCache();
    await auditProvider(admin.id, "ai_provider.import_env", data.id, null, {
      base_url: config.baseUrl,
      model: config.model,
      health_status: health ? "healthy" : "unhealthy",
    });
    revalidatePath("/admin/ai");
    return health
      ? { ok: true, message: `Provider ENV berhasil diimpor (${latency} ms).` }
      : { ok: true, message: "Provider ENV diimpor, tetapi health check gagal." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal mengimpor provider environment." };
  }
}

export async function testEnvironmentAIProviderAction(): Promise<AdminResult> {
  try {
    await requireAdminOrThrow();
    const config = getAIConfig();
    if (!config) return { error: "Provider environment belum lengkap." };
    const startedAt = Date.now();
    const health = await probeProvider(config);
    const latency = Date.now() - startedAt;
    return health
      ? { ok: true, message: `Environment fallback aktif (${health.responseFormat}, ${latency} ms).` }
      : { error: "Environment fallback tidak merespons dengan output yang valid." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tes environment fallback gagal." };
  }
}

function providerConfig(
  input: { name: string; baseUrl: string; model: string },
  apiKey: string,
  responseFormat: "json_schema" | "json_object",
): AIConfig {
  const config = getAIConfig({
    AI_PROVIDER: input.name,
    AI_API_KEY: apiKey,
    AI_BASE_URL: input.baseUrl,
    AI_MODEL: input.model,
    AI_TIMEOUT_MS: "10000",
    AI_RESPONSE_FORMAT: responseFormat,
  });
  if (!config) throw new Error("Konfigurasi provider tidak lengkap.");
  return config;
}

async function probeProvider(config: AIConfig) {
  return generateStructuredCompletion({
    schemaName: "kitmotion_provider_health",
    schema: healthOutputSchema,
    jsonSchema: healthJsonSchema,
    systemPrompt: "Keluarkan hanya JSON valid. Jangan gunakan markdown.",
    input: { instruction: "Konfirmasi layanan aktif dengan status ok dan pesan singkat bahasa Indonesia." },
    timeoutMs: 10_000,
    providerConfig: config,
  });
}

async function probeFeatureContracts(config: AIConfig): Promise<{ responseFormat: "json_schema" | "json_object" } | null> {
  const session = await generateStructuredCompletion({
    schemaName: "kitmotion_session_coach_test",
    schema: sessionCoachContentSchema,
    jsonSchema: sessionCoachJsonSchema,
    systemPrompt: "Buat ringkasan latihan siswa SMA dalam bahasa Indonesia. Gunakan hanya JSON sesuai schema.",
    input: { exercise: "Squat", validReps: 8, invalidReps: 2, score: 78, feedback: ["Lutut perlu lebih stabil."] },
    timeoutMs: 10_000,
    providerConfig: config,
  });
  if (!session) return null;
  const detectedConfig = { ...config, responseFormat: session.responseFormat };
  const recommendation = await generateStructuredCompletion({
    schemaName: "kitmotion_daily_recommendation_test",
    schema: dailyRecommendationContentSchema,
    jsonSchema: dailyRecommendationJsonSchema,
    systemPrompt: "Pilih tepat satu slug dari daftar dan keluarkan JSON bahasa Indonesia sesuai schema.",
    input: { availableExercises: ["squat", "jumping-jack", "push-up"], recentSessions: [{ exerciseSlug: "squat", score: 78 }] },
    timeoutMs: 10_000,
    providerConfig: detectedConfig,
  });
  if (!recommendation || !["squat", "jumping-jack", "push-up"].includes(recommendation.data.exerciseSlug)) return null;
  const teacher = await generateStructuredCompletion({
    schemaName: "kitmotion_teacher_class_test",
    schema: teacherClassContentSchema,
    jsonSchema: teacherClassJsonSchema,
    systemPrompt: "Analisis data kelas agregat tanpa identitas siswa. Keluarkan JSON bahasa Indonesia sesuai schema.",
    input: { totalStudents: 20, studentsWithActivity: 14, totalSessions: 28, averageScore: 76, commonIssue: "Rentang gerak belum penuh." },
    timeoutMs: 10_000,
    providerConfig: detectedConfig,
  });
  return teacher ? { responseFormat: session.responseFormat } : null;
}

async function invalidateAIInsightCache() {
  const service = getSupabaseServiceRole();
  await service.from("ai_insights").delete().eq("source", "ai");
}

async function auditProvider(adminId: string, action: string, entityId: string, before: unknown, after: unknown) {
  const service = getSupabaseServiceRole();
  await service.from("admin_audit_logs").insert({
    admin_user_id: adminId,
    action,
    entity_type: "ai_provider",
    entity_id: entityId,
    before_data: (before ?? null) as Json,
    after_data: (after ?? null) as Json,
  });
}

function sanitizeProvider(row: { name: string; base_url: string; model: string; priority: number; is_active: boolean; health_status: string; response_format: string }) {
  return {
    name: row.name,
    base_url: row.base_url,
    model: row.model,
    priority: row.priority,
    is_active: row.is_active,
    health_status: row.health_status,
    response_format: row.response_format,
  };
}
