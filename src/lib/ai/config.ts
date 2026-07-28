/**
 * Server-only configuration contract for the optional generative AI coach.
 *
 * Do not import this module from Client Components. None of these variables use
 * NEXT_PUBLIC, so credentials are never intentionally exposed to the browser.
 */

export interface AIConfig {
  provider: string;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

const DEFAULT_PROVIDER = "openai-compatible";
const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;

type EnvSource = Readonly<Record<string, string | undefined>>;

function value(source: EnvSource, name: string): string {
  return source[name]?.trim() ?? "";
}

function normalizeBaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("AI_BASE_URL harus menggunakan HTTPS, kecuali server AI lokal.");
  }
  return url.toString().replace(/\/$/, "");
}

function parseTimeout(rawTimeout: string): number {
  if (!rawTimeout) return DEFAULT_TIMEOUT_MS;
  const timeout = Number.parseInt(rawTimeout, 10);
  if (!Number.isFinite(timeout) || timeout < MIN_TIMEOUT_MS || timeout > MAX_TIMEOUT_MS) {
    throw new Error(`AI_TIMEOUT_MS harus antara ${MIN_TIMEOUT_MS} dan ${MAX_TIMEOUT_MS}.`);
  }
  return timeout;
}

/** Returns null while the optional AI coach has not been configured. */
export function getAIConfig(source: EnvSource = process.env): AIConfig | null {
  const baseUrl = value(source, "AI_BASE_URL");
  const model = value(source, "AI_MODEL");
  if (!baseUrl && !model) return null;
  if (!baseUrl) throw new Error("AI_BASE_URL belum diisi.");
  if (!model) throw new Error("AI_MODEL belum diisi.");

  return {
    provider: value(source, "AI_PROVIDER") || DEFAULT_PROVIDER,
    apiKey: value(source, "AI_API_KEY") || null,
    baseUrl: normalizeBaseUrl(baseUrl),
    model,
    timeoutMs: parseTimeout(value(source, "AI_TIMEOUT_MS")),
  };
}

export function isAIConfigured(source: EnvSource = process.env): boolean {
  try {
    return getAIConfig(source) !== null;
  } catch {
    return false;
  }
}
