/**
 * Centralized, typed access to environment variables.
 *
 * Reads return empty strings (not throws) when unset, so `next build` succeeds
 * with placeholder env. Runtime callers that genuinely need Supabase check
 * `env.isSupabaseConfigured` and surface a friendly error if false.
 */

function read(value: string | undefined): string {
  return value && value.trim() !== "" ? value : "";
}

export const env = {
  // NEXT_PUBLIC variables must use static property access so Next.js can
  // replace them in browser bundles. `process.env[name]` stays empty there.
  appUrl: read(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000",
  appEnv: read(process.env.NEXT_PUBLIC_APP_ENV) || "development",
  isProduction: read(process.env.NEXT_PUBLIC_APP_ENV) === "production",

  supabaseUrl: read(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: read(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  serviceRoleKey: read(process.env.SUPABASE_SERVICE_ROLE_KEY),

  mediapipeModelPath:
    read(process.env.NEXT_PUBLIC_MEDIAPIPE_MODEL_PATH) ||
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  mediapipeWasmPath:
    read(process.env.NEXT_PUBLIC_MEDIAPIPE_WASM_PATH) ||
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",

  mapTileUrl:
    read(process.env.NEXT_PUBLIC_MAP_TILE_URL) ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

  /** IoT feature flag. MUST stay false for the application-first MVP. */
  iotIntegrationEnabled: read(process.env.NEXT_PUBLIC_IOT_INTEGRATION_ENABLED) === "true",

  get isSupabaseConfigured(): boolean {
    return this.supabaseUrl !== "" && this.supabaseAnonKey !== "";
  },

  get isServiceRoleConfigured(): boolean {
    return this.isSupabaseConfigured && this.serviceRoleKey !== "";
  },
} as const;
