/**
 * Centralized, typed access to environment variables.
 *
 * Reads return empty strings (not throws) when unset, so `next build` succeeds
 * with placeholder env. Runtime callers that genuinely need Supabase check
 * `env.isSupabaseConfigured` and surface a friendly error if false.
 */

function read(name: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : "";
}

export const env = {
  appUrl: read("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
  appEnv: read("NEXT_PUBLIC_APP_ENV") || "development",
  isProduction: read("NEXT_PUBLIC_APP_ENV") === "production",

  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),

  mediapipeModelPath:
    read("NEXT_PUBLIC_MEDIAPIPE_MODEL_PATH") ||
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  mediapipeWasmPath:
    read("NEXT_PUBLIC_MEDIAPIPE_WASM_PATH") ||
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",

  /** IoT feature flag. MUST stay false for the application-first MVP. */
  iotIntegrationEnabled: read("NEXT_PUBLIC_IOT_INTEGRATION_ENABLED") === "true",

  get isSupabaseConfigured(): boolean {
    return this.supabaseUrl !== "" && this.supabaseAnonKey !== "";
  },

  get isServiceRoleConfigured(): boolean {
    return this.isSupabaseConfigured && this.serviceRoleKey !== "";
  },
} as const;
