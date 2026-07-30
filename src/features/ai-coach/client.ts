import type { z } from "zod";
import { getAIConfig, type AIConfig } from "@/lib/ai/config";
import { listRuntimeAIProviders, recordAIProviderHealth } from "./provider-store";

type JsonSchema = Readonly<Record<string, unknown>>;

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export type StructuredCompletion<T> = {
  data: T;
  model: string;
  provider: string;
  responseFormat: "json_schema" | "json_object";
  generatedAt: string;
};

export async function generateStructuredCompletion<T>({
  schemaName,
  schema,
  jsonSchema,
  systemPrompt,
  input,
  timeoutMs,
  providerConfig,
}: {
  schemaName: string;
  schema: z.ZodType<T>;
  jsonSchema: JsonSchema;
  systemPrompt: string;
  input: unknown;
  timeoutMs?: number;
  providerConfig?: AIConfig;
}): Promise<StructuredCompletion<T> | null> {
  let config;
  try {
    config = providerConfig ?? getAIConfig();
  } catch {
    console.warn(`[AI] ${schemaName} dilewati karena konfigurasi server tidak valid.`);
    return null;
  }
  if (!config) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(config.timeoutMs, timeoutMs ?? config.timeoutMs));

  try {
    let responseMode: "json_schema" | "json_object" = config.responseFormat;
    let transientRetries = 0;
    let requestCount = 0;

    while (requestCount < 4) {
      requestCount += 1;
      const usesJsonObject = responseMode === "json_object";
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: usesJsonObject
                ? `${systemPrompt}\nKeluarkan hanya JSON valid yang mengikuti schema ini: ${JSON.stringify(jsonSchema)}`
                : systemPrompt,
            },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: usesJsonObject
            ? { type: "json_object" }
            : {
                type: "json_schema",
                json_schema: {
                  name: schemaName,
                  strict: true,
                  schema: jsonSchema,
                },
              },
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({})) as ChatCompletionResponse;
      if (!response.ok) {
        if (responseMode === "json_schema" && isUnsupportedSchemaResponse(response.status, payload.error?.message)) {
          responseMode = "json_object";
          transientRetries = 0;
          continue;
        }
        const retryable = [429, 502, 503, 504].includes(response.status);
        if (retryable && transientRetries === 0) {
          transientRetries += 1;
          await delay(350);
          continue;
        }
        console.warn(`[AI] ${schemaName} gagal (${response.status}): ${payload.error?.message ?? "respons tidak valid"}`);
        return null;
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsedJson = JSON.parse(stripCodeFence(content)) as unknown;
      const parsed = schema.safeParse(parsedJson);
      if (!parsed.success) {
        console.warn(`[AI] ${schemaName} tidak lolos validasi output.`);
        return null;
      }

      return {
        data: parsed.data,
        model: config.model,
        provider: config.provider,
        responseFormat: responseMode,
        generatedAt: new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "timeout" : "request error";
    console.warn(`[AI] ${schemaName} gagal: ${reason}.`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStructuredCompletionWithFailover<T>(
  input: Parameters<typeof generateStructuredCompletion<T>>[0],
): Promise<StructuredCompletion<T> | null> {
  const providers = await listRuntimeAIProviders();
  for (const provider of providers) {
    const startedAt = Date.now();
    const completion = await generateStructuredCompletion({
      ...input,
      providerConfig: provider,
    });
    if (completion) {
      await recordAIProviderHealth(provider.id, true, Date.now() - startedAt, undefined, completion.responseFormat);
      return completion;
    }
    await recordAIProviderHealth(provider.id, false, Date.now() - startedAt);
  }
  return null;
}

function isUnsupportedSchemaResponse(status: number, message?: string): boolean {
  if (status !== 400) return false;
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("response_format")
    || normalized.includes("json_schema")
    || normalized.includes("unavailable");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}
