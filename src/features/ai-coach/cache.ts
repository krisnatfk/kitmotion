import { createHash } from "node:crypto";
import type { z } from "zod";
import type { Json } from "@/types/database.types";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { AIInsightSource } from "./types";

export type CachedInsight<T> = {
  data: T;
  source: AIInsightSource;
  model: string | null;
  generatedAt: string;
};

export function insightCacheKey(prefix: string, input: unknown): string {
  const hash = createHash("sha256").update(stableStringify(input)).digest("hex").slice(0, 24);
  return `${prefix}:${hash}`;
}

export async function readCachedInsight<T>({
  ownerUserId,
  kind,
  cacheKey,
  schema,
}: {
  ownerUserId: string;
  kind: "session_coach" | "daily_recommendation" | "teacher_class";
  cacheKey: string;
  schema: z.ZodType<T>;
}): Promise<CachedInsight<T> | null> {
  try {
    const admin = getSupabaseServiceRole();
    const { data, error } = await admin
      .from("ai_insights")
      .select("content, source, model, updated_at, expires_at")
      .eq("owner_user_id", ownerUserId)
      .eq("kind", kind)
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error || !data || (data.expires_at && data.expires_at <= new Date().toISOString())) return null;
    const parsed = schema.safeParse(data.content);
    if (!parsed.success) return null;
    return {
      data: parsed.data,
      source: data.source === "ai" ? "ai" : "fallback",
      model: data.model,
      generatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function writeCachedInsight<T>({
  ownerUserId,
  kind,
  cacheKey,
  content,
  source,
  provider,
  model,
  promptVersion,
  sessionId,
  classroomId,
  expiresAt,
}: {
  ownerUserId: string;
  kind: "session_coach" | "daily_recommendation" | "teacher_class";
  cacheKey: string;
  content: T;
  source: AIInsightSource;
  provider: string | null;
  model: string | null;
  promptVersion: string;
  sessionId?: string | null;
  classroomId?: string | null;
  expiresAt?: string | null;
}): Promise<void> {
  try {
    const admin = getSupabaseServiceRole();
    const { error } = await admin.from("ai_insights").upsert({
      owner_user_id: ownerUserId,
      kind,
      cache_key: cacheKey,
      session_id: sessionId ?? null,
      classroom_id: classroomId ?? null,
      content: content as Json,
      source,
      provider,
      model,
      prompt_version: promptVersion,
      expires_at: expiresAt ?? null,
    }, { onConflict: "owner_user_id,kind,cache_key", ignoreDuplicates: false });
    if (error) return;
  } catch {
    // The insight remains usable for the current response when the optional
    // cache table has not been migrated yet.
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
